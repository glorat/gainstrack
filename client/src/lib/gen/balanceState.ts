// Running per-account balance fold, ported from `BalanceState.scala`. Needed so the
// transaction ledger can resolve the prior values that `unit`/`adj`/`bal` depend on.

import { LocalDate } from '@js-joda/core';
import Decimal from 'decimal.js';
import { BalanceStateSeries } from 'src/lib/assetdb/models';
import { fromIntDate, isoToIntDate } from 'src/lib/SortedColumnMap';
import * as Acct from 'src/lib/gen/accountId';
import { GAccountState } from 'src/lib/gen/accountState';
import { GCommand } from 'src/lib/gen/commands';
import { adjustmentDate, adjustmentTransfers, RawTx, tradeToTx, unitToTx } from 'src/lib/gen/expand';
import { D, GAmount, ZERO } from 'src/lib/gen/money';
import { commandToTransfers, isCommandNeedsAccounts, transferToTransaction } from 'src/lib/gen/transfer';

interface Series { points: Array<[number, Decimal]>; ccy: string; }

function minusDay(date: string): string {
  return LocalDate.parse(date).minusDays(1).toString();
}

export class GBalanceState {
  private series = new Map<string, Series>();

  constructor(private readonly acct: GAccountState) {
    for (const a of acct.accounts.values()) this.series.set(a.accountId, { points: [], ccy: a.assetId });
  }

  private entry(accountId: string): Series {
    let s = this.series.get(accountId);
    if (!s) { s = { points: [], ccy: '' }; this.series.set(accountId, s); }
    return s;
  }

  // value at the largest key currently present (Scala series.lastOption)
  private latest(accountId: string): Decimal {
    const pts = this.entry(accountId).points;
    return pts.length ? pts[pts.length - 1][1] : ZERO;
  }

  private setPoint(accountId: string, key: number, value: Decimal): void {
    const pts = this.entry(accountId).points;
    const i = pts.findIndex(([k]) => k >= key);
    if (i < 0) pts.push([key, value]);
    else if (pts[i][0] === key) pts[i][1] = value;
    else pts.splice(i, 0, [key, value]);
  }

  // step interpolation: value as of the most recent point <= date, else 0
  getAccountValue(accountId: string, dateStr: string): Decimal {
    const s = this.series.get(accountId);
    if (!s || s.points.length === 0) return ZERO;
    const key = isoToIntDate(dateStr);
    let val = ZERO;
    let found = false;
    for (const [k, v] of s.points) {
      if (k <= key) { val = v; found = true; } else break;
    }
    return found ? val : ZERO;
  }

  /**
   * Scala `getAccountValue` wrapped in a caller-supplied currency. Only correct where Scala
   * likewise supplies the currency itself (the `unit` prior balance, which is denominated in
   * the security) — see `getAccountBalance` for the case where it must not be assumed.
   */
  getBalance(accountId: string, dateStr: string, ccy: string): GAmount {
    return new GAmount(this.getAccountValue(accountId, dateStr), ccy);
  }

  /**
   * Scala `BalanceState.getBalance`: denominated in the ACCOUNT's own currency, read off its
   * series — `val ccy = balances(account).ccy`.
   *
   * The distinction is load-bearing. An `adj`/`bal` states a balance in some currency, and the
   * adjustment is the difference between that and the current balance. If the prior value is
   * stamped with the currency the COMMAND used rather than the one the ACCOUNT is in, the
   * subtraction can never disagree, and a ledger asserting a SGD balance on a EUR account
   * silently produces a nonsense adjustment instead of being rejected.
   */
  getAccountBalance(accountId: string, dateStr: string): GAmount {
    const s = this.series.get(accountId);
    // Scala indexes the map directly, so an unknown account throws rather than defaulting.
    if (!s) throw new Error(`${accountId} must be populated`);
    return new GAmount(this.getAccountValue(accountId, dateStr), s.ccy);
  }

  private processTx(tx: RawTx): void {
    for (const p of tx.postings) {
      if (!p.value) continue;
      // `BalanceState.process(tx)`: every posted account must already have a series, which it
      // gets when the account is opened. Posting to one that has none means the account was
      // never opened and was not interpolated into existence either — `entry()` would quietly
      // conjure a series and the ledger would balance against an account that does not exist.
      if (!this.series.has(p.account)) throw new Error(`${p.account} must be populated`);
      const newBalance = p.value.number.plus(this.latest(p.account));
      this.setPoint(p.account, isoToIntDate(tx.postDate), newBalance);
    }
  }

  private handle(cmd: GCommand): void {
    if (cmd.kind === 'open') {
      this.setPoint(cmd.accountId, isoToIntDate(minusDay(cmd.date)), ZERO);
      return;
    }
    if (isCommandNeedsAccounts(cmd)) {
      commandToTransfers(cmd, this.acct.lookup).map(transferToTransaction).forEach(tx => this.processTx(tx));
      return;
    }
    if (cmd.kind === 'trade') { this.processTx(tradeToTx(cmd)); return; }
    if (cmd.kind === 'unit') {
      const secAcct = Acct.subAccount(cmd.accountId, cmd.security.ccy);
      const oldBalance = new GAmount(this.latest(secAcct), cmd.security.ccy);
      const tx = unitToTx(cmd, oldBalance, this.acct.lookup);
      if (tx) this.processTx(tx);
      return;
    }
    if (cmd.kind === 'adj' || cmd.kind === 'bal') {
      const account = this.acct.find(cmd.accountId);
      const targetAccountId = account?.options.multiAsset ? Acct.subAccount(cmd.accountId, cmd.balance.ccy) : cmd.accountId;
      const adjDate = adjustmentDate(cmd);
      const oldValue = this.getAccountBalance(targetAccountId, minusDay(adjDate));
      adjustmentTransfers(cmd.accountId, cmd.adjAccount, cmd.balance, oldValue, adjDate, this.acct.lookup)
        .map(transferToTransaction).forEach(tx => this.processTx(tx));
    }
  }

  // `AllState.balances`: every (expanded, pre-interpolation) account -> its date->value series.
  toBalancesDTO(): Record<string, BalanceStateSeries> {
    const out: Record<string, BalanceStateSeries> = {};
    for (const [accountId, s] of this.series) {
      const series: Record<string, number> = {};
      for (const [k, v] of s.points) {
        const d = fromIntDate(k);
        if (d) series[d.toString()] = v.toNumber();
      }
      out[accountId] = { series, ccy: s.ccy };
    }
    return out;
  }

  static build(commands: GCommand[], acct: GAccountState): GBalanceState {
    const bs = new GBalanceState(acct);
    for (const cmd of commands) bs.handle(cmd);
    return bs;
  }
}

export { D };
