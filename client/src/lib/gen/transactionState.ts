// Transaction ledger, ported from `TransactionState.scala`. Folds the commands into balanced
// transactions (assigning origin index), reading BalanceState for unit prior balances and a
// running tx-balance for adjustment prior values. Produces `AllState.txs`.

import { Transaction as DTOTransaction } from 'src/lib/assetdb/models';
import * as Acct from 'src/lib/gen/accountId';
import { GAccountState } from 'src/lib/gen/accountState';
import { closingTx } from 'src/lib/gen/closing';
import type { GBalanceState } from 'src/lib/gen/balanceState';
import { AdjCmd, BalCmd, GCommand } from 'src/lib/gen/commands';
import { adjustmentDate, adjustmentTransfers, RawTx, tradeToTx, unitToTx } from 'src/lib/gen/expand';
import { LocalDate } from '@js-joda/core';
import type Decimal from 'decimal.js';
import { GAmount, ZERO } from 'src/lib/gen/money';
import { commandToTransfers, isCommandNeedsAccounts, transferToTransaction } from 'src/lib/gen/transfer';
import { GTransaction, txToDTO } from 'src/lib/gen/transaction';

function minusDay(date: string): string {
  return LocalDate.parse(date).minusDays(1).toString();
}

/**
 * One entry of Scala's `TransactionState.cmds` — the interleaved `Seq[BeancountCommand]`.
 *
 * `AllState.txs` keeps only the transactions (Scala `collect { case tx: Transaction }`), but the
 * beancount export needs the whole stream in command order: price observations and balance
 * assertions become `price` and `balance` directives.
 */
export type BeancountCmd =
  | { kind: 'tx'; tx: GTransaction }
  | { kind: 'price'; date: string; asset: string; price: GAmount }
  | { kind: 'balance'; date: string; accountId: string; balance: GAmount };

export function buildTransactions(commands: GCommand[], acct: GAccountState, balanceState: GBalanceState): DTOTransaction[] {
  return buildBeancountCommands(commands, acct, balanceState)
    .filter((c): c is { kind: 'tx'; tx: GTransaction } => c.kind === 'tx')
    .map(c => txToDTO(c.tx));
}

export function buildBeancountCommands(commands: GCommand[], acct: GAccountState, balanceState: GBalanceState): BeancountCmd[] {
  // Running balance per account from the transactions accumulated so far, kept PER CURRENCY.
  // Scala holds `Map[AccountId, PositionSet]` and reads it with `getBalance(ccy)`; an account can
  // legitimately hold several currencies (a transfer posts the source currency into a plain
  // target account), and collapsing them into one number makes an adjustment's prior value the
  // sum of unrelated currencies.
  const running = new Map<string, Map<string, Decimal>>();
  const runningBalance = (accountId: string, ccy: string): Decimal =>
    running.get(accountId)?.get(ccy) ?? ZERO;
  const txs: GTransaction[] = [];
  const stream: BeancountCmd[] = [];
  let id = 0;

  /** The account an adj/bal actually moves and asserts on — the sub-account when multiAsset. */
  const targetAccountFor = (cmd: AdjCmd | BalCmd): string => {
    const account = acct.find(cmd.accountId);
    return account?.options.multiAsset ? Acct.subAccount(cmd.accountId, cmd.balance.ccy) : cmd.accountId;
  };

  const rawTxsFor = (cmd: GCommand): RawTx[] => {
    if (isCommandNeedsAccounts(cmd)) {
      return commandToTransfers(cmd, acct.lookup).map(transferToTransaction);
    }
    if (cmd.kind === 'trade') return [tradeToTx(cmd)];
    if (cmd.kind === 'unit') {
      const secAcct = Acct.subAccount(cmd.accountId, cmd.security.ccy);
      const oldBalance = balanceState.getBalance(secAcct, minusDay(cmd.date), cmd.security.ccy);
      const tx = unitToTx(cmd, oldBalance, acct.lookup);
      return tx ? [tx] : [];
    }
    if (cmd.kind === 'close') {
      // Reads the transactions accumulated so far, so it closes exactly what precedes it.
      const tx = closingTx(cmd, txs);
      return tx ? [tx] : [];
    }
    if (cmd.kind === 'adj' || cmd.kind === 'bal') {
      const targetAccountId = targetAccountFor(cmd);

      // `TransactionState.process(BalanceAdjustment)` cross-checks the two passes against each
      // other: BalanceState has already folded this adjustment in, so reading the balance back
      // out must return exactly what was asserted. It does not when a ledger states two
      // conflicting balances for the same account and date — the later one wins in BalanceState
      // while the earlier is still asserted here. Without this check the generator silently
      // produces a ledger whose transactions do not add up to its own balance assertions.
      const setValue = balanceState.getAccountBalance(targetAccountId, minusDay(adjustmentDate(cmd)));
      if (!setValue.number.eq(cmd.balance.number) || setValue.ccy !== cmd.balance.ccy) {
        throw new Error(`TransactionState Internal logic fail ${cmd.balance.number} != ${setValue.number}`);
      }

      const oldValue = new GAmount(runningBalance(targetAccountId, cmd.balance.ccy), cmd.balance.ccy);
      const transfers = adjustmentTransfers(cmd.accountId, cmd.adjAccount, cmd.balance, oldValue, adjustmentDate(cmd), acct.lookup);
      return transfers.map(transferToTransaction);
    }
    return [];
  };

  commands.forEach((cmd, originIndex) => {
    const raws = rawTxsFor(cmd);
    for (const raw of raws) {
      id += 1;
      const tx: GTransaction = { ...raw, originIndex, id };
      txs.push(tx);
      stream.push({ kind: 'tx', tx });
      for (const p of raw.postings) {
        if (!p.value) continue;
        let byCcy = running.get(p.account);
        if (!byCcy) { byCcy = new Map(); running.set(p.account, byCcy); }
        byCcy.set(p.value.ccy, (byCcy.get(p.value.ccy) ?? ZERO).plus(p.value.number));
      }
    }

    // Scala emits these alongside the transactions, in command order.
    if (cmd.kind === 'price') {
      stream.push({ kind: 'price', date: cmd.date, asset: cmd.assetId, price: cmd.price });
    } else if (cmd.kind === 'unit' && raws.length === 0) {
      // `UnitTrustBalance.toBeancountCommand`: a statement showing no change in units is not a
      // no-op — it still observed a price on that date, so Scala emits a price directive.
      stream.push({ kind: 'price', date: cmd.date, asset: cmd.security.ccy, price: cmd.price });
    } else if (cmd.kind === 'adj' || cmd.kind === 'bal') {
      // `BalanceAdjustment.toBeancounts` appends the assertion AFTER any adjusting transfers,
      // and asserts on the multiAsset sub-account when there is one. Its date is the
      // adjustment date (a `bal` asserts the morning after), not the transfer date.
      stream.push({
        kind: 'balance',
        date: adjustmentDate(cmd),
        accountId: targetAccountFor(cmd),
        balance: cmd.balance,
      });
    }
  });

  return stream;
}
