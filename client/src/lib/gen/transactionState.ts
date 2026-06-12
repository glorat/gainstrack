// Transaction ledger, ported from `TransactionState.scala`. Folds the commands into balanced
// transactions (assigning origin index), reading BalanceState for unit prior balances and a
// running tx-balance for adjustment prior values. Produces `AllState.txs`.

import { Transaction as DTOTransaction } from 'src/lib/assetdb/models';
import * as Acct from 'src/lib/gen/accountId';
import { GAccountState } from 'src/lib/gen/accountState';
import type { GBalanceState } from 'src/lib/gen/balanceState';
import { GCommand } from 'src/lib/gen/commands';
import { adjustmentDate, adjustmentTransfers, RawTx, tradeToTx, unitToTx } from 'src/lib/gen/expand';
import { LocalDate } from '@js-joda/core';
import { GAmount, ZERO } from 'src/lib/gen/money';
import { commandToTransfers, isCommandNeedsAccounts, transferToTransaction } from 'src/lib/gen/transfer';
import { GTransaction, txToDTO } from 'src/lib/gen/transaction';

function minusDay(date: string): string {
  return LocalDate.parse(date).minusDays(1).toString();
}

export function buildTransactions(commands: GCommand[], acct: GAccountState, balanceState: GBalanceState): DTOTransaction[] {
  const running = new Map<string, GAmount>(); // running balance per account from accumulated txs
  const txs: GTransaction[] = [];
  let id = 0;

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
    if (cmd.kind === 'adj' || cmd.kind === 'bal') {
      const account = acct.find(cmd.accountId);
      const targetAccountId = account?.options.multiAsset ? Acct.subAccount(cmd.accountId, cmd.balance.ccy) : cmd.accountId;
      const oldValue = new GAmount(running.get(targetAccountId)?.number ?? ZERO, cmd.balance.ccy);
      const transfers = adjustmentTransfers(cmd.accountId, cmd.adjAccount, cmd.balance, oldValue, adjustmentDate(cmd), acct.lookup);
      return transfers.map(transferToTransaction);
    }
    return [];
  };

  commands.forEach((cmd, originIndex) => {
    for (const raw of rawTxsFor(cmd)) {
      id += 1;
      txs.push({ ...raw, originIndex, id });
      for (const p of raw.postings) {
        if (!p.value) continue;
        const prev = running.get(p.account)?.number ?? ZERO;
        running.set(p.account, new GAmount(prev.plus(p.value.number), p.value.ccy));
      }
    }
  });

  return txs.map(txToDTO);
}
