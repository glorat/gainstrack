// The command → transfers → postings engine. Ports `Transfer` plus the `toTransfers` of the
// CommandNeedsAccounts types (tfr/earn/spend/fund/yield). This drives BOTH account discovery
// (CommandAccountExpander) and the transaction ledger (TransactionState).

import * as Acct from 'src/lib/gen/accountId';
import { GAccount, yieldAssetAccountId, yieldIncomeAccountId } from 'src/lib/gen/account';
import { EarnCmd, FundCmd, GCommand, SpendCmd, TfrCmd, YieldCmd } from 'src/lib/gen/commands';
import { D, GAmount } from 'src/lib/gen/money';
import { GPosting, posting } from 'src/lib/gen/posting';

export type AccountLookup = (id: string) => GAccount | undefined;

export interface GTransfer {
  source: string;
  dest: string;
  date: string;
  sourceValue: GAmount;
  targetValue: GAmount;
  description: string;
}

const DEFAULT_FUND_ACCOUNT = 'Equity:Opening';

function fxRate(sv: GAmount, tv: GAmount): import('decimal.js').default {
  return tv.number.div(sv.number);
}

/** Mirrors Transfer.apply: both legs non-zero; builds the description. */
export function makeTransfer(source: string, dest: string, date: string, sv: GAmount, tv: GAmount): GTransfer {
  if (tv.number.isZero() || sv.number.isZero()) throw new Error('Transfer amount must be non-zero');
  const sameCcy = sv.ccy === tv.ccy;
  const fxDesc = sameCcy ? '' : `@${D(1).div(fxRate(sv, tv)).toFixed(6)}`;
  const description = `Transfer ${sv.toString()} ${source} -> ${dest}${fxDesc}`;
  return { source, dest, date, sourceValue: sv, targetValue: tv, description };
}

/** Transfer.toTransfers — multiAsset sub-account routing + automaticReinvestment second leg. */
export function transferToTransfers(t: GTransfer, lookup: AccountLookup): GTransfer[] {
  const targetAccount = lookup(t.dest);
  if (!targetAccount) throw new Error(`${t.dest} dest account does not exist`);
  const sourceAccount = lookup(t.source);
  if (!sourceAccount) throw new Error(`${t.source} source account does not exist`);

  const sourceAccountId = sourceAccount.options.multiAsset ? Acct.subAccount(t.source, t.sourceValue.ccy) : t.source;
  const targetFundingAccountId = targetAccount.options.multiAsset ? Acct.subAccount(t.dest, t.targetValue.ccy) : t.dest;
  const tfr: GTransfer = { ...t, source: sourceAccountId, dest: targetFundingAccountId };

  if (targetAccount.assetId === t.targetValue.ccy && targetAccount.options.automaticReinvestment) {
    if (!targetAccount.options.multiAsset) throw new Error(`${targetAccount.accountId} must be multiAsset to have automaticReinvestment`);
    const tfrOut = makeTransfer(targetFundingAccountId, Acct.convertType(targetFundingAccountId, 'Income'), t.date, t.targetValue, t.targetValue);
    return [tfr, tfrOut];
  }
  return [tfr];
}

/** Transfer.toTransaction — two postings (source -value, dest +value @ 1/fxRate). */
export function transferToTransaction(t: GTransfer): { postDate: string; description: string; postings: GPosting[] } {
  const inv = D(1).div(fxRate(t.sourceValue, t.targetValue));
  const price = new GAmount(inv, t.sourceValue.ccy);
  return {
    postDate: t.date,
    description: t.description,
    postings: [posting(t.source, t.sourceValue.neg()), posting(t.dest, t.targetValue, price)],
  };
}

// ---- per-command toTransfers (CommandNeedsAccounts) -------------------------

function find2(lookup: AccountLookup, a: string, b: string): GAccount | undefined {
  return lookup(a) ?? lookup(b);
}

function earnToTransfers(cmd: EarnCmd, lookup: AccountLookup): GTransfer[] {
  const incomeAccount = find2(lookup, cmd.accountId, Acct.subAccount(cmd.accountId, cmd.value.ccy));
  if (!incomeAccount) throw new Error(`Income account ${cmd.accountId} is not defined`);
  const targetAccountId = cmd.target ?? incomeAccount.options.fundingAccount;
  if (!targetAccountId) throw new Error(`Cannot earn from ${incomeAccount.accountId} without a fundingAccount`);
  if (!lookup(targetAccountId)) throw new Error(`Target account ${targetAccountId} does not exist`);
  return transferToTransfers(makeTransfer(incomeAccount.accountId, targetAccountId, cmd.date, cmd.value, cmd.value), lookup);
}

function spendToTransfers(cmd: SpendCmd, lookup: AccountLookup): GTransfer[] {
  const expenseAccount = find2(lookup, cmd.accountId, Acct.subAccount(cmd.accountId, cmd.value.ccy));
  if (!expenseAccount) throw new Error(`Expense account ${cmd.accountId} is not defined`);
  const sourceAccountId = cmd.other ?? expenseAccount.options.fundingAccount;
  if (!sourceAccountId) throw new Error(`Cannot spend from ${expenseAccount.accountId} without a fundingAccount`);
  if (!lookup(sourceAccountId)) throw new Error(`Target account ${sourceAccountId} does not exist`);
  return transferToTransfers(makeTransfer(sourceAccountId, expenseAccount.accountId, cmd.date, cmd.value, cmd.value), lookup);
}

function fundToTransfers(cmd: FundCmd, lookup: AccountLookup): GTransfer[] {
  const targetAccount = lookup(cmd.accountId);
  if (!targetAccount) throw new Error(`${cmd.accountId} fund target does not exist`);
  const sourceAccountId = cmd.source ?? targetAccount.options.fundingAccount ?? DEFAULT_FUND_ACCOUNT;
  return transferToTransfers(makeTransfer(sourceAccountId, cmd.accountId, cmd.date, cmd.change, cmd.change), lookup);
}

function yieldToTransfers(cmd: YieldCmd, lookup: AccountLookup): GTransfer[] {
  const account = lookup(cmd.accountId);
  if (!account) throw new Error(`Account ${cmd.accountId} is not defined`);
  const assetAccount = lookup(yieldAssetAccountId(cmd));
  if (!assetAccount) throw new Error(`Asset account ${yieldAssetAccountId(cmd)} is not defined`);
  const targetAccountId = cmd.target ?? (account.options.multiAsset
    ? cmd.accountId
    : (assetAccount.options.fundingAccount ?? yieldAssetAccountId(cmd)));
  if (!lookup(targetAccountId)) throw new Error(`Target account ${targetAccountId} does not exist`);
  return transferToTransfers(makeTransfer(yieldIncomeAccountId(cmd), targetAccountId, cmd.date, cmd.value, cmd.value), lookup);
}

/** Expand a CommandNeedsAccounts command into transfers. */
export function commandToTransfers(cmd: GCommand, lookup: AccountLookup): GTransfer[] {
  switch (cmd.kind) {
    case 'tfr': return transferToTransfers(makeTransfer(cmd.source, cmd.dest, cmd.date, cmd.sourceValue, cmd.targetValue), lookup);
    case 'earn': return earnToTransfers(cmd, lookup);
    case 'spend': return spendToTransfers(cmd, lookup);
    case 'fund': return fundToTransfers(cmd, lookup);
    case 'yield': return yieldToTransfers(cmd, lookup);
    default: return [];
  }
}

export function isCommandNeedsAccounts(cmd: GCommand): boolean {
  return cmd.kind === 'tfr' || cmd.kind === 'earn' || cmd.kind === 'spend' || cmd.kind === 'fund' || cmd.kind === 'yield';
}

export type { TfrCmd };
