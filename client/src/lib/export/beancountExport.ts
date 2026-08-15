// Port of `GainstrackGenerator.toBeancount` — the ledger as a Beancount file.
//
// Backs the "Export Beancount" download, previously served by Scala's ExportController.
//
// The file is three sections, in Scala's order:
//   1. headers (title, operating currency, implicit_prices plugin)
//   2. one `open` per account, plus a book_conversions plugin line per trading account
//   3. the transaction stream — `TransactionState.cmds`, which interleaves transactions,
//      price observations and balance assertions in command order
//
// Section 3 is the load-bearing one and is emitted in exactly Scala's sequence. Section 2 is
// NOT: Scala iterates `acctState.accounts`, a `Set`, so its order is JVM hash order — not
// reproducible from TypeScript and not meaningful to reproduce. Accounts are sorted by id
// instead, which is deterministic and diff-friendly. Beancount itself is order-insensitive for
// directives (it sorts by date on load), so this changes nothing about how the file loads.

import { GainstrackParser } from 'src/lib/GainstrackParser';
import { GAccount } from 'src/lib/gen/account';
import { buildAccountState } from 'src/lib/gen/accountState';
import { GBalanceState } from 'src/lib/gen/balanceState';
import { buildCommands, GCommand } from 'src/lib/gen/commands';
import { GAmount } from 'src/lib/gen/money';
import { GPosting } from 'src/lib/gen/posting';
import { GTransaction } from 'src/lib/gen/transaction';
import { BeancountCmd, buildBeancountCommands } from 'src/lib/gen/transactionState';

/** Scala renders every amount as `BigDecimal.toPlainString`, never exponential notation. */
function amt(a: GAmount): string {
  return `${a.number.toFixed()} ${a.ccy}`;
}

/**
 * Scala `Posting.toString`: account, then the amount, then an optional cost in braces and an
 * optional price after `@` (no space, deliberately).
 *
 * Cost is never actually populated — `Posting.withCost` has no call sites on either side — but
 * it is rendered here so a future cost-carrying posting exports correctly rather than silently
 * dropping its lot basis.
 */
function postingLine(p: GPosting): string {
  if (!p.value) return p.account;
  const cost = p.cost ? ` {${amt(p.cost)}}` : '';
  const price = p.price ? ` @${amt(p.price)}` : '';
  return `${p.account} ${amt(p.value)}${cost}${price}`;
}

function transactionLines(tx: GTransaction): string[] {
  return [`${tx.postDate} * "${tx.description}"`, ...tx.postings.map(p => `  ${postingLine(p)}`)];
}

function commandLines(cmd: BeancountCmd): string[] {
  switch (cmd.kind) {
    case 'tx':
      return transactionLines(cmd.tx);
    case 'price':
      return [`${cmd.date} price ${cmd.asset} ${amt(cmd.price)}`];
    case 'balance':
      return [`${cmd.date} balance ${cmd.accountId} ${amt(cmd.balance)}`];
  }
}

/**
 * The cash flow tags, as beancount `open` metadata.
 *
 * Gainstrack's convention IS beancount's convention — account metadata on the open directive,
 * reachable from BQL via `open_meta()` or the `#accounts` table — so an exported ledger carries it
 * across intact and fava can group on it. Untagged accounts emit nothing, which is what keeps
 * every byte-exact export golden valid.
 *
 * Beancount metadata keys must be lowercase and its booleans are `TRUE`/`FALSE`, so the names are
 * transliterated rather than copied.
 */
function cashflowMetaLines(a: GAccount): string[] {
  const lines: string[] = [];
  if (typeof a.options.cashEquivalent === 'boolean') {
    lines.push(`  cash-equivalent: ${a.options.cashEquivalent ? 'TRUE' : 'FALSE'}`);
  }
  if (a.options.cashflowClass !== undefined) {
    lines.push(`  cashflow-class: "${a.options.cashflowClass}"`);
  }
  return lines;
}

/** `AccountCreation.toBeancount` — the open directive, plus book_conversions for trading accounts. */
export function accountLines(a: GAccount): string[] {
  const open = `${a.date} open ${a.accountId} ${a.assetId}`;
  const meta = cashflowMetaLines(a);
  if (!a.options.tradingAccount) return [open, ...meta];
  return [open, ...meta, `plugin "beancount.plugins.book_conversions" "${a.accountId},${a.options.incomeAccount}"`];
}

export function headerLines(operatingCurrency: string): string[] {
  return [
    'option "title" "Gainstrack"',
    `option "operating_currency" "${operatingCurrency}"`,
    'plugin "beancount.plugins.implicit_prices"',
  ];
}

/** The three sections, kept separate so tests can compare each with the right strictness. */
export function beancountSections(commands: GCommand[]): { headers: string[]; accounts: string[]; commands: string[] } {
  const global = commands.find(c => c.kind === 'global');
  const acctState = buildAccountState(commands);
  const balanceState = GBalanceState.build(commands, acctState);

  // Scala uses the raw account set here, NOT `withInterpolatedAccounts` — the interpolated
  // parents are a reporting-tree concern and were never opened by the user.
  const accounts = [...acctState.accounts.values()]
    .sort((x, y) => (x.accountId < y.accountId ? -1 : x.accountId > y.accountId ? 1 : 0))
    .flatMap(accountLines);

  return {
    headers: headerLines(global?.operatingCurrency ?? acctState.baseCurrency),
    accounts,
    commands: buildBeancountCommands(commands, acctState, balanceState).flatMap(commandLines),
  };
}

/** Serialize gainstrack source text to a complete Beancount file. */
export function toBeancountFile(text: string): string {
  const parser = new GainstrackParser();
  parser.parseString(text);
  const { headers, accounts, commands } = beancountSections(buildCommands(parser.getTypedCommands()));
  // Scala joins every line with "\n" and adds no trailing newline.
  return [...headers, ...accounts, ...commands].join('\n');
}
