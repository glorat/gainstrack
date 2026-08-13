// Per-(account, currency) posting totals, and the comparison that verifies an import.
//
// This is `bean2gain/python/balances.py` — the oracle the CLI test suite uses — recomputed from
// the dump document rather than by running beancount a second time. It is the same arithmetic on
// the same postings: beancount has already booked and interpolated everything by the time a dump
// exists, so summing `units` per (account, currency) is all `balances.py` does too.
//
// Doing it here is what lets the browser import verify itself. The check needs the ORIGINAL
// ledger and the re-export of what we produced, both loaded by beancount; over `postMessage` we
// can get both as dumps, but we cannot run a python script on the far side. So the totals are
// summed on this side and the property being asserted is unchanged: every account holds what it
// held, or the import is wrong.
//
// Units, not market value — the question is whether the import moved money, and a price that
// happens to differ would only add noise.

import Decimal from 'decimal.js';
import { DumpDocument } from './beancountDump';
import { ImportReport } from './beancountImport';

export interface Balances {
  /** What beancount's own loader said about the file. Non-empty means the ledger did not load. */
  errors: string[];
  /** account -> currency -> total, as a decimal string. Strings for the same reason the dump uses them. */
  balances: Record<string, Record<string, string>>;
}

/** Sum every transaction posting by (account, currency). Mirrors `balances.py` exactly. */
export function balancesOf(doc: DumpDocument): Balances {
  const sums = new Map<string, Map<string, Decimal>>();

  for (const entry of doc.entries) {
    if (entry.type !== 'transaction') continue;
    for (const posting of entry.postings) {
      if (posting.units?.number == null) continue;
      const byCcy = sums.get(posting.account) ?? new Map<string, Decimal>();
      sums.set(posting.account, byCcy);
      const ccy = posting.units.currency;
      byCcy.set(ccy, (byCcy.get(ccy) ?? new Decimal(0)).plus(posting.units.number));
    }
  }

  const balances: Record<string, Record<string, string>> = {};
  for (const account of [...sums.keys()].sort()) {
    const row: Record<string, string> = {};
    for (const ccy of [...sums.get(account)!.keys()].sort()) {
      row[ccy] = sums.get(account)!.get(ccy)!.toFixed();
    }
    balances[account] = row;
  }

  return {
    errors: doc.errors.map(e => `${e.file ?? '?'}:${e.line ?? '?'}: ${e.message}`),
    balances,
  };
}

/**
 * Collapse gainstrack's derived accounts back onto the beancount ones, so the two sides are
 * comparable at all.
 *
 * Two kinds of difference are expected and are not errors:
 *  - a multi-currency account becomes one `:CCY` sub-account per currency, which the importer
 *    publishes in `report.accountFold`. Summing the children recovers the original.
 *  - `Equity:Rounding` and `Equity:Adjustments` do not exist in the source at all. They are
 *    excluded here and checked separately by `pluggedAmounts` — excluding them silently would
 *    hide an import that balanced its own mistakes by pushing them into a plug account.
 */
export function fold(
  balances: Balances['balances'],
  report: ImportReport,
): Record<string, Record<string, string>> {
  const out = new Map<string, Map<string, Decimal>>();

  for (const [account, byCcy] of Object.entries(balances)) {
    const target = report.accountFold[account] ?? account;
    if (isPlug(target)) continue;
    const row = out.get(target) ?? new Map<string, Decimal>();
    out.set(target, row);
    for (const [ccy, amount] of Object.entries(byCcy)) {
      row.set(ccy, (row.get(ccy) ?? new Decimal(0)).plus(amount));
    }
  }

  // Zero rows are noise: an account whose postings cancel out is not the same fact as an account
  // with no postings, but for "did the money move" they are, and only one side will have it.
  const folded: Record<string, Record<string, string>> = {};
  for (const account of [...out.keys()].sort()) {
    const row: Record<string, string> = {};
    for (const [ccy, total] of [...out.get(account)!.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      if (!total.isZero()) row[ccy] = total.toFixed();
    }
    if (Object.keys(row).length > 0) folded[account] = row;
  }
  return folded;
}

function isPlug(account: string): boolean {
  return account.startsWith('Equity:Rounding') || account.startsWith('Equity:Adjustments');
}

export interface BalanceDifference {
  account: string;
  currency: string;
  /** What the original beancount ledger held. `null` when the account/currency is new. */
  before: string | null;
  /** What the imported ledger holds. `null` when the import lost it entirely. */
  after: string | null;
}

/** Every (account, currency) whose total changed. Empty means the money survived the import. */
export function compareBalances(
  before: Balances,
  after: Balances,
  report: ImportReport,
): BalanceDifference[] {
  const a = fold(before.balances, report);
  const b = fold(after.balances, report);
  const differences: BalanceDifference[] = [];

  const accounts = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  for (const account of accounts) {
    const rowA = a[account] ?? {};
    const rowB = b[account] ?? {};
    for (const currency of [...new Set([...Object.keys(rowA), ...Object.keys(rowB)])].sort()) {
      const l = rowA[currency];
      const r = rowB[currency];
      // Compared as decimals, not strings: `10` and `10.00` are the same amount, and the two
      // sides reach them by different routes (beancount's own scale vs decimal.js normalizing).
      if (l !== undefined && r !== undefined && new Decimal(l).equals(r)) continue;
      if (l === undefined && r === undefined) continue;
      differences.push({ account, currency, before: l ?? null, after: r ?? null });
    }
  }
  return differences;
}

/**
 * Non-zero totals in the accounts the import invents to absorb a difference.
 *
 * On a ledger beancount already accepts, every difference is zero, so anything here means the
 * import mis-stated something and then quietly balanced its own error. `compareBalances` cannot
 * see it, because `fold` excludes these accounts from both sides.
 */
export function pluggedAmounts(after: Balances): string[] {
  return Object.entries(after.balances)
    .filter(([account]) => account.startsWith('Equity:Adjustments'))
    .flatMap(([account, byCcy]) =>
      Object.entries(byCcy)
        .filter(([, total]) => !new Decimal(total).isZero())
        .map(([ccy, total]) => `${account} ${total} ${ccy}`),
    );
}
