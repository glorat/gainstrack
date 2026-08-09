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
  const running = new Map<string, GAmount>(); // running balance per account from accumulated txs
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
      const oldValue = new GAmount(running.get(targetAccountId)?.number ?? ZERO, cmd.balance.ccy);
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
        const prev = running.get(p.account)?.number ?? ZERO;
        running.set(p.account, new GAmount(prev.plus(p.value.number), p.value.ccy));
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
