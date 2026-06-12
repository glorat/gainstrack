// Account model + the auto-vivified sub-accounts that trades/units/yields create.
// Ports `AccountCreation`'s helpers and each command's `createRequiredAccounts`.

import * as Acct from 'src/lib/gen/accountId';
import { GAccountOptions, TradeCmd, UnitCmd, YieldCmd } from 'src/lib/gen/commands';

export interface GAccount {
  date: string;
  accountId: string;
  assetId: string;
  options: GAccountOptions;
}

export function defaultOptions(overrides: Partial<GAccountOptions> = {}): GAccountOptions {
  return {
    tradingAccount: false,
    description: '',
    multiAsset: false,
    automaticReinvestment: false,
    generatedAccount: false,
    hidden: false,
    placeholder: false,
    ...overrides,
  };
}

export function mkAccount(date: string, accountId: string, assetId: string, options: GAccountOptions): GAccount {
  return { date, accountId, assetId, options };
}

// ---- AccountCreation helpers (on a base account) ---------------------------

export function acctSubAccount(base: GAccount, assetId: string): GAccount {
  // require(base.options.multiAsset) — enforced by callers/Scala; kept lenient here.
  return mkAccount(base.date, Acct.subAccount(base.accountId, assetId), assetId, defaultOptions({ generatedAccount: true }));
}

export function acctRelatedSubAccount(base: GAccount, accountType: string, assetId: string): GAccount {
  return mkAccount(base.date, Acct.convertTypeWithSubAccount(base.accountId, accountType, assetId), assetId, defaultOptions({ generatedAccount: true }));
}

export function defaultExpenseAccount(base: GAccount): GAccount {
  return mkAccount(base.date, Acct.convertType(base.accountId, 'Expenses'), base.assetId, defaultOptions({ multiAsset: true, generatedAccount: true }));
}

export function defaultIncomeAccount(base: GAccount): GAccount {
  return mkAccount(base.date, Acct.convertType(base.accountId, 'Income'), base.assetId, defaultOptions({ multiAsset: true, generatedAccount: true }));
}

// ---- derived account ids ----------------------------------------------------

export function cashAccountId(accountId: string, priceCcy: string): string {
  return Acct.subAccount(accountId, priceCcy);
}
export function securityAccountId(accountId: string, securityCcy: string): string {
  return Acct.subAccount(accountId, securityCcy);
}
export function incomeAcctId(accountId: string, priceCcy: string): string {
  return Acct.convertTypeWithSubAccount(accountId, 'Income', priceCcy);
}
export function expenseAcctId(accountId: string, priceCcy: string): string {
  return Acct.convertTypeWithSubAccount(accountId, 'Expenses', priceCcy);
}

// ---- createRequiredAccounts -------------------------------------------------

function requireMultiAsset(base: GAccount): void {
  if (!base.options.multiAsset) throw new Error(`${base.accountId} must be multiAsset`);
}

export function tradeRequiredAccounts(cmd: TradeCmd, base: GAccount): GAccount[] {
  requireMultiAsset(base);
  const expenseCcy = cmd.commission.isZero ? base.assetId : cmd.commission.ccy;
  return [
    acctSubAccount(base, cmd.price.ccy),
    acctRelatedSubAccount(base, 'Income', cmd.price.ccy),
    acctRelatedSubAccount(base, 'Expenses', expenseCcy),
    defaultExpenseAccount(base),
    defaultIncomeAccount(base),
  ];
}

export function unitRequiredAccounts(cmd: UnitCmd, base: GAccount): GAccount[] {
  requireMultiAsset(base);
  const pc = cmd.price.ccy;
  const copyWith = (accountId: string, assetId: string, opts: GAccountOptions) => mkAccount(base.date, accountId, assetId, opts);
  return [
    copyWith(cashAccountId(cmd.accountId, pc), pc, { ...base.options, multiAsset: false, generatedAccount: true }),
    copyWith(incomeAcctId(cmd.accountId, pc), pc, { ...base.options, multiAsset: false, generatedAccount: true }),
    copyWith(expenseAcctId(cmd.accountId, pc), pc, { ...base.options, multiAsset: false, generatedAccount: true }),
    copyWith(Acct.convertType(cmd.accountId, 'Expenses'), base.assetId, defaultOptions({ multiAsset: true, generatedAccount: true })),
    copyWith(Acct.convertType(cmd.accountId, 'Income'), base.assetId, defaultOptions({ multiAsset: true, generatedAccount: true })),
  ];
}

// yield: assetAccountId / incomeAccountId derivations
export function yieldAssetAccountId(cmd: YieldCmd): string {
  return cmd.asset ? Acct.subAccount(cmd.accountId, cmd.asset) : cmd.accountId;
}
export function yieldIncomeAccountId(cmd: YieldCmd): string {
  return cmd.asset
    ? Acct.convertTypeWithSubAccount(cmd.accountId, 'Income', cmd.asset)
    : Acct.convertType(yieldAssetAccountId(cmd), 'Income');
}

export function yieldRequiredAccounts(cmd: YieldCmd, base: GAccount): GAccount[] {
  const incomeAcct = mkAccount(base.date, yieldIncomeAccountId(cmd), cmd.value.ccy, defaultOptions({ generatedAccount: true }));
  if (base.options.multiAsset) {
    const targetAccount = mkAccount(base.date, Acct.subAccount(cmd.accountId, cmd.value.ccy), cmd.value.ccy, defaultOptions({ generatedAccount: true }));
    return [incomeAcct, targetAccount];
  }
  return [incomeAcct];
}
