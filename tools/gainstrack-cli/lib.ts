import { LocalDate } from '@js-joda/core';
import { generateAllStateSafe } from 'src/lib/gen/GainstrackGenerator';
import { AllStateEx } from 'src/lib/AllStateEx';
import {
  incomeStatement, balanceSheet, changesInEquity, trialBalance,
  IncomeStatement, BalanceSheet, ChangesInEquity, TrialBalance,
} from 'src/lib/statements';
import { cashflowStatement, CashflowStatement } from 'src/lib/cashflow';

/**
 * The composition + check logic behind the CLI, kept apart from argument parsing (cli.ts) so it can
 * be unit-tested directly. This module adds NO accounting logic: every figure comes from the engine
 * in client/src/lib. It only bundles those reports and diffs them against an expected map.
 */

export interface Period {
  from: string;
  to: string;
  asOf: string;
}

export interface StatementBundle {
  period: Period;
  baseCcy: string;
  incomeStatement: IncomeStatement;
  balanceSheet: BalanceSheet;
  changesInEquity: ChangesInEquity;
  cashFlow: CashflowStatement;
  trialBalance: TrialBalance;
}

export class LedgerError extends Error {}

/** Parse a ledger, throwing a LedgerError carrying every message if it does not generate. */
export function loadLedger(text: string): AllStateEx {
  const { state, errors } = generateAllStateSafe(text);
  if (!state) {
    throw new LedgerError(errors.map(e => e.message).join('\n') || 'ledger did not generate');
  }
  return new AllStateEx(state);
}

/** Default period bounds from the ledger itself: earliest → latest posting date (today if empty). */
export function inferPeriod(ex: AllStateEx, overrides: Partial<Period> = {}): Period {
  const dates = ex.allPostingsEx().map(p => p.date).sort();
  const from = overrides.from ?? dates[0] ?? LocalDate.now().toString();
  const to = overrides.to ?? dates[dates.length - 1] ?? LocalDate.now().toString();
  const asOf = overrides.asOf ?? to;
  return { from, to, asOf };
}

export function buildBundle(ex: AllStateEx, period: Period): StatementBundle {
  const fx = ex.tradeFxConverter();
  const from = LocalDate.parse(period.from);
  const to = LocalDate.parse(period.to);
  const asOf = LocalDate.parse(period.asOf);
  const s = ex.state;
  return {
    period,
    baseCcy: s.baseCcy,
    incomeStatement: incomeStatement(ex, from, to, fx),
    balanceSheet: balanceSheet(ex, asOf, fx),
    changesInEquity: changesInEquity(ex, from, to, fx),
    cashFlow: cashflowStatement(ex.allTxs(), s.commands, s.accounts, s.baseCcy, from, to, fx),
    trialBalance: trialBalance(ex, asOf, fx),
  };
}

export type ReportName =
  | 'income-statement' | 'balance-sheet' | 'changes-in-equity' | 'cash-flow' | 'trial-balance' | 'all';

export function buildReport(name: ReportName, ex: AllStateEx, period: Period): unknown {
  const bundle = buildBundle(ex, period);
  switch (name) {
    case 'income-statement': return bundle.incomeStatement;
    case 'balance-sheet': return bundle.balanceSheet;
    case 'changes-in-equity': return bundle.changesInEquity;
    case 'cash-flow': return bundle.cashFlow;
    case 'trial-balance': return bundle.trialBalance;
    case 'all': return bundle;
    default: throw new Error(`unknown report: ${name as string}`);
  }
}

/**
 * Flatten any report/bundle into a map of dotted key → number. Arrays of line items are keyed by
 * their `account` (so `balanceSheet.assets.Assets:Bank:SG` is stable regardless of ordering);
 * strings are dropped. This is the shape a `--expect figures.json` file pins against; it may pin a
 * subset — only the keys it lists are compared.
 */
export function flattenFigures(value: unknown, prefix = '', out: Record<string, number> = {}): Record<string, number> {
  if (typeof value === 'number') {
    out[prefix] = value;
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => {
      const hasAccount = item && typeof item === 'object' && 'account' in item;
      const key = hasAccount ? String((item as { account: unknown }).account) : String(i);
      const childPrefix = prefix ? `${prefix}.${key}` : key;
      // Collapse a plain line ({account, shortName, amount}) to `<prefix>.<account> = amount`;
      // multi-figure rows (trial balance debit/credit, equity opening/movement/closing) recurse.
      if (hasAccount && typeof (item as { amount?: unknown }).amount === 'number') {
        out[childPrefix] = (item as { amount: number }).amount;
      } else {
        flattenFigures(item, childPrefix, out);
      }
    });
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k === 'account' || k === 'shortName') continue; // identity fields, not figures
      flattenFigures(v, prefix ? `${prefix}.${k}` : k, out);
    }
  }
  return out;
}

export interface FigureDiff {
  key: string;
  expected: number;
  actual: number | undefined;
}

/** Compare actual figures to an expected subset. Returns the mismatches (empty = pass). */
export function diffFigures(
  actual: Record<string, number>,
  expected: Record<string, number>,
  tolerance = 0.005,
): FigureDiff[] {
  const diffs: FigureDiff[] = [];
  for (const [key, exp] of Object.entries(expected)) {
    const act = actual[key];
    if (act === undefined || Math.abs(act - exp) > tolerance) {
      diffs.push({ key, expected: exp, actual: act });
    }
  }
  return diffs;
}
