// Transaction expansion for the commands that produce postings directly (not via the
// CommandNeedsAccounts toTransfers path): trade, unit, and balance adjustments. Shared by
// BalanceState (running fold) and TransactionState (the txs ledger).

import { LocalDate } from '@js-joda/core';
import { expenseAcctId as expAcctId, securityAccountId, cashAccountId } from 'src/lib/gen/account';
import * as Acct from 'src/lib/gen/accountId';
import { AdjCmd, BalCmd, TradeCmd, UnitCmd } from 'src/lib/gen/commands';
import { GAmount } from 'src/lib/gen/money';
import { GPosting, posting } from 'src/lib/gen/posting';
import { AccountLookup, GTransfer, makeTransfer, transferToTransaction, transferToTransfers } from 'src/lib/gen/transfer';

export interface RawTx { postDate: string; description: string; postings: GPosting[]; }

function minusDay(date: string): string {
  return LocalDate.parse(date).minusDays(1).toString();
}

/** SecurityPurchase.toTransaction. */
export function tradeToTx(cmd: TradeCmd): RawTx {
  const expense = cmd.price.scale(cmd.security.number).neg().sub(cmd.commission); // -price*qty - commission
  const postings: GPosting[] = [
    posting(cashAccountId(cmd.accountId, cmd.price.ccy), expense),
    posting(securityAccountId(cmd.accountId, cmd.security.ccy), cmd.security, cmd.price),
  ];
  if (!cmd.commission.isZero) postings.push(posting(expAcctId(cmd.accountId, cmd.price.ccy), cmd.commission));
  const verb = cmd.security.number.greaterThan(0) ? 'BUY' : 'SELL';
  return { postDate: cmd.date, description: `${verb} ${cmd.security.toString()} @${cmd.price.toString()}`, postings };
}

/** UnitTrustBalance.toTransaction given the prior unit balance. Returns undefined when no change. */
export function unitToTx(cmd: UnitCmd, oldBalance: GAmount, lookup: AccountLookup): RawTx | undefined {
  const newUnits = cmd.security.sub(oldBalance);
  if (newUnits.isZero) return undefined;
  if (newUnits.number.abs().lessThan('0.0000001')) throw new Error('BUG: Internal FX handling gone wrong in UnitTrustBalance');

  const account = lookup(cmd.accountId);
  const incomeAccountId = Acct.convertTypeWithSubAccount(cmd.accountId, 'Income', cmd.price.ccy);
  let adjAccount: string;
  if (oldBalance.isZero || cmd.security.isZero) {
    adjAccount = account?.options.multiAsset && !account.options.automaticReinvestment ? cmd.accountId : incomeAccountId;
  } else {
    adjAccount = incomeAccountId;
  }
  const tfr = makeTransfer(adjAccount, cmd.accountId, cmd.date, cmd.price.scale(newUnits.number), newUnits);
  return transferToTransaction(transferToTransfers(tfr, lookup)[0]);
}

/** BalanceAdjustment.toTransfers given the prior value. `adjDate` is the adjustment date
 *  (= the command date for `adj`, the command date + 1 for `bal`); the transfer posts the day before. */
export function adjustmentTransfers(
  accountId: string, adjAccount: string, balance: GAmount, oldValue: GAmount, adjDate: string, lookup: AccountLookup,
): GTransfer[] {
  const newUnits = balance.sub(oldValue);
  if (newUnits.isZero) return [];
  const tfr = makeTransfer(adjAccount, accountId, minusDay(adjDate), newUnits, newUnits);
  return transferToTransfers(tfr, lookup);
}

/** The adjustment date for an adj/bal command (bal's underlying adjustment is the next day). */
export function adjustmentDate(cmd: AdjCmd | BalCmd): string {
  return cmd.kind === 'bal' ? LocalDate.parse(cmd.date).plusDays(1).toString() : cmd.date;
}
