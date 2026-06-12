// Account passes: AccountState fold (pass 1) + CommandAccountExpander (pass 2) + interpolation.
// Ports `AccountState.scala` and `CommandAccountExpander.scala`. Produces `AllState.accounts`.

import { AccountDTO } from 'src/lib/assetdb/models';
import * as Acct from 'src/lib/gen/accountId';
import {
  GAccount, acctSubAccount, cashAccountId, defaultOptions, expenseAcctId, incomeAcctId,
  mkAccount, securityAccountId, tradeRequiredAccounts, unitRequiredAccounts, yieldIncomeAccountId, yieldRequiredAccounts,
} from 'src/lib/gen/account';
import { GCommand } from 'src/lib/gen/commands';
import { GAmount } from 'src/lib/gen/money';
import { AccountLookup, commandToTransfers, isCommandNeedsAccounts, makeTransfer, transferToTransaction, transferToTransfers } from 'src/lib/gen/transfer';

const MIN_DATE = '-999999999-01-01';

export class GAccountState {
  constructor(
    readonly accounts: Map<string, GAccount> = new Map(),
    public baseCurrency = 'USD',
  ) {}

  find(id: string): GAccount | undefined {
    return this.accounts.get(id);
  }

  get lookup(): AccountLookup {
    return (id: string) => this.accounts.get(id);
  }

  private add(...accts: GAccount[]): void {
    for (const a of accts) if (!this.accounts.has(a.accountId)) this.accounts.set(a.accountId, a);
  }

  // ---- pass 1: build accounts directly created/auto-vivified by commands ----
  handle(cmd: GCommand): void {
    switch (cmd.kind) {
      case 'global':
        this.baseCurrency = cmd.operatingCurrency;
        break;
      case 'open':
        this.accounts.set(cmd.accountId, mkAccount(cmd.date, cmd.accountId, cmd.assetId, cmd.options));
        break;
      case 'trade': {
        const base = this.requireAccount(cmd.accountId);
        if (!this.accounts.has(cashAccountId(cmd.accountId, cmd.price.ccy))) {
          this.add(...tradeRequiredAccounts(cmd, base));
          // base account learns its income/expense sub-accounts
          const opts = { ...base.options, incomeAccount: incomeAcctId(cmd.accountId, cmd.price.ccy), expenseAccount: expenseAcctId(cmd.accountId, cmd.price.ccy) };
          this.accounts.set(base.accountId, { ...base, options: opts });
        }
        if (!this.accounts.has(securityAccountId(cmd.accountId, cmd.security.ccy))) {
          this.add(acctSubAccount(base, cmd.security.ccy));
        }
        break;
      }
      case 'unit': {
        const base = this.requireAccount(cmd.accountId);
        if (!this.accounts.has(cashAccountId(cmd.accountId, cmd.price.ccy))) this.add(...unitRequiredAccounts(cmd, base));
        if (!this.accounts.has(securityAccountId(cmd.accountId, cmd.security.ccy))) this.add(acctSubAccount(base, cmd.security.ccy));
        break;
      }
      case 'yield': {
        const base = this.requireAccount(cmd.accountId);
        if (!this.accounts.has(yieldIncomeAccountId(cmd))) this.add(...yieldRequiredAccounts(cmd, base));
        break;
      }
      default:
        break;
    }
  }

  private requireAccount(id: string): GAccount {
    const a = this.accounts.get(id);
    if (!a) throw new Error(`${id} is not an open account`);
    return a;
  }

  // ---- pass 2 helper: add a sub-account inferred from a posting target ------
  withInferredAccount(acctId: string): void {
    const parentId = Acct.parentAccountId(acctId);
    if (parentId === undefined) return;
    const parent = this.accounts.get(parentId);
    if (!parent) return;
    if (!parent.options.multiAsset) {
      throw new Error(`Attempting to transfer to ${parent.accountId} is not multi-asset so cannot handle ${Acct.shortName(acctId)}`);
    }
    this.add(acctSubAccount(parent, Acct.shortName(acctId)));
  }

  // ---- finalize: add root + ensure all parents exist -----------------------
  withInterpolatedAccounts(): GAccountState {
    const out = new GAccountState(new Map(this.accounts), this.baseCurrency);
    // root
    out.accounts.set('', mkAccount(MIN_DATE, '', this.baseCurrency, defaultOptions({ placeholder: true, generatedAccount: true })));
    const parents = new Set<string>();
    for (const a of this.accounts.values()) {
      const p = Acct.parentAccountId(a.accountId);
      if (p !== undefined) parents.add(p);
    }
    for (const p of parents) out.ensureExists(p);
    return out;
  }

  private ensureExists(accountId: string): void {
    if (this.accounts.has(accountId)) return;
    const parentId = Acct.parentAccountId(accountId);
    if (parentId === undefined) throw new Error(`'${accountId}' is missing parent`);
    this.ensureExists(parentId);
    const parent = this.accounts.get(parentId)!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    this.accounts.set(accountId, mkAccount(parent.date, accountId, parent.assetId, defaultOptions({ generatedAccount: true })));
  }

  toAccountDTOs(): AccountDTO[] {
    return [...this.accounts.values()].map(a => accountToDTO(a));
  }
}

function accountToDTO(a: GAccount): AccountDTO {
  // Drop undefined optional account-ref fields (json4s omits None).
  const options: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(a.options)) if (v !== undefined) options[k] = v;
  return { date: a.date, accountId: a.accountId, ccy: a.assetId, options } as unknown as AccountDTO;
}

// Discover posting accounts for adj/bal using a fake non-zero balance (mirrors the expander).
function adjBalToTransfers(cmd: GCommand, lookup: AccountLookup) {
  if (cmd.kind !== 'adj' && cmd.kind !== 'bal') return [];
  // Scala discovers accounts with `balance + 9999` (a guaranteed non-zero); only the routing
  // (ccy + multiAsset) matters here, so any non-zero amount in balance.ccy works.
  const fake = new GAmount(cmd.balance.number.minus(9999), cmd.balance.ccy);
  return transferToTransfers(makeTransfer(cmd.adjAccount, cmd.accountId, cmd.date, fake, fake), lookup);
}

/** Run both passes; return the expanded (pre-interpolation) account state. */
export function buildAccountState(commands: GCommand[]): GAccountState {
  // Pass 1
  const state = new GAccountState();
  for (const cmd of commands) state.handle(cmd);

  // Pass 2: discover inferred accounts from each command's posting targets.
  for (const cmd of commands) {
    let transfers;
    if (isCommandNeedsAccounts(cmd)) transfers = commandToTransfers(cmd, state.lookup);
    else if (cmd.kind === 'adj' || cmd.kind === 'bal') transfers = adjBalToTransfers(cmd, state.lookup);
    else continue;

    const acctIds = transfers
      .map(t => transferToTransaction(t))
      .flatMap(tx => tx.postings.map(p => p.account))
      .filter(id => !state.accounts.has(id));
    for (const id of acctIds) state.withInferredAccount(id);
  }
  return state;
}
