import { LocalDate } from '@js-joda/core';
import { AllStateEx } from '../AllStateEx';
import { SingleFXConverter } from '../fx';
import { TreeTableDTO } from '../assetdb/models';
import { balanceTreeTable } from '../TreeTable';
import { sectionTrees } from './sectionTrees';

export { sectionTrees } from './sectionTrees';
export type { SectionTrees } from './sectionTrees';

/**
 * Figure builders for the primary financial statements. Each returns numbers keyed by account id
 * plus the grouping-independent subtotals — no captions, no current/non-current split (those are the
 * renderer's job). They sit on top of `sectionTrees`, so the browser pages and the headless CLI
 * agree by construction.
 *
 * Sign convention: amounts are normalised to natural statement presentation — revenue, expenses,
 * assets, liabilities and equity all read positive when they carry their normal balance. A
 * sub-account holding the *opposite* balance (e.g. a director current account in debit under
 * Liabilities) therefore comes out negative, which is the signal the renderer uses to reclassify it
 * (a "due to director" liability vs a "due from director" receivable). The trial balance is the one
 * report that keeps raw debit/credit signs, because proving debits = credits is its whole purpose.
 *
 * Every figure is expressed in the ledger's base currency: the builders convert with 'global', so a
 * multi-currency ledger's foreign/security holdings are valued in base (chaining through pivots).
 * One consequence to be aware of, not a defect: a portfolio carried at market can leave the trial
 * balance with a non-zero imbalance equal to the unrealised gain/FX translation, since holdings are
 * valued at market while their cost sits in equity — that residual is a real figure, not a dropped
 * posting.
 */

// Financial statements have ONE presentation currency (the base), so the builders always convert
// with 'global' — every position is valued in `baseCcy`, chaining through pivots where needed (a
// USD-priced holding in a GBP book values as VTI→USD→GBP). The conversion strategy is deliberately
// NOT a parameter: 'parent'/'units' would leave lines in mixed currencies/units that cannot be
// summed into a base-currency total. (The store keeps 'parent' for its multi-currency TREE view,
// which is a different thing — see sectionTrees.)
const STATEMENT_CONVERSION = 'global';

export interface Line {
  account: string;
  shortName: string;
  amount: number;
}

export interface IncomeStatement {
  fromDate: string;
  toDate: string;
  baseCcy: string;
  revenue: Line[];
  expenses: Line[];
  totalRevenue: number;
  totalExpenses: number;
  profitBeforeTax: number;
}

export interface BalanceSheet {
  asOf: string;
  baseCcy: string;
  assets: Line[];
  liabilities: Line[];
  equity: Line[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export interface EquityMovement {
  account: string;
  shortName: string;
  opening: number;
  movement: number;
  closing: number;
}

export interface ChangesInEquity {
  fromDate: string;
  toDate: string;
  baseCcy: string;
  rows: EquityMovement[];
  totalOpening: number;
  totalMovement: number;
  totalClosing: number;
}

export interface TrialBalanceRow {
  account: string;
  shortName: string;
  debit: number;
  credit: number;
}

export interface TrialBalance {
  asOf: string;
  baseCcy: string;
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  /** totalDebit − totalCredit; a balanced ledger yields 0. Non-zero means a leg was dropped. */
  imbalance: number;
}

function round2(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

/** Own-subtree base balance of a node (raw, debit-normal positive), summed across currencies. */
function nodeAmount(node?: TreeTableDTO): number {
  if (!node) return 0;
  return round2((node.assetBalance ?? []).reduce((sum, b) => sum + b.number, 0));
}

interface OwnBalance {
  account: string;
  shortName: string;
  own: number;
}

/**
 * Every account under a section root with its OWN balance (its subtree total minus its children's
 * subtree totals) — not just the childless leaves. A parent can hold real postings while also having
 * children (multiAsset/generated accounts do this), and its own balance is part of the root total;
 * emitting only leaves would drop it, so the line items would not reconcile to the totals. Nodes
 * whose own balance is zero (e.g. interpolated parents) are omitted. `includeRoot` controls whether
 * the section root itself is emitted: a presented statement never lists "Assets" as a line, but the
 * trial balance must count a (pathological) direct posting to a root so debits still equal credits.
 */
function ownBalances(root: TreeTableDTO | undefined, includeRoot: boolean): OwnBalance[] {
  const out: OwnBalance[] = [];
  if (!root) return out;
  const visit = (n: TreeTableDTO, isRoot: boolean) => {
    const own = round2(nodeAmount(n) - n.children.reduce((s, c) => s + nodeAmount(c), 0));
    if ((includeRoot || !isRoot) && own !== 0) {
      out.push({ account: n.name, shortName: n.shortName, own });
    }
    n.children.forEach(c => visit(c, false));
  };
  visit(root, true);
  return out;
}

type RootId = 'Assets' | 'Liabilities' | 'Equity' | 'Income' | 'Expenses';

/** Natural-balance sign per statement root: credit-normal roots are negated to read positive. */
function normalize(rootId: RootId, raw: number): number {
  const creditNormal = rootId === 'Income' || rootId === 'Liabilities' || rootId === 'Equity';
  return round2(creditNormal ? -raw : raw);
}

/** Income statement over [from, to]. Period flow = closing tree minus the tree the day before `from`. */
export function incomeStatement(
  ex: AllStateEx,
  from: LocalDate,
  to: LocalDate,
  fx: SingleFXConverter,
): IncomeStatement {
  const close = sectionTrees(ex, to, STATEMENT_CONVERSION, fx, { boundByDate: true });
  const open = sectionTrees(ex, from.minusDays(1), STATEMENT_CONVERSION, fx, { boundByDate: true });

  const flowLines = (
    rootId: 'Income' | 'Expenses',
    closeNode?: TreeTableDTO,
    openNode?: TreeTableDTO,
  ): Line[] => {
    const openByAccount = new Map(ownBalances(openNode, false).map(o => [o.account, o]));
    const lines: Line[] = [];
    const seen = new Set<string>();
    for (const o of ownBalances(closeNode, false)) {
      seen.add(o.account);
      lines.push({ account: o.account, shortName: o.shortName, amount: normalize(rootId, o.own - (openByAccount.get(o.account)?.own ?? 0)) });
    }
    // Accounts with activity only in the opening span (fully reversed by `to`) still need a line so
    // the rows reconcile to the period total.
    for (const o of openByAccount.values()) {
      if (!seen.has(o.account)) lines.push({ account: o.account, shortName: o.shortName, amount: normalize(rootId, -o.own) });
    }
    return lines;
  };

  const totalRevenue = normalize('Income', nodeAmount(close.Income) - nodeAmount(open.Income));
  const totalExpenses = normalize('Expenses', nodeAmount(close.Expenses) - nodeAmount(open.Expenses));

  return {
    fromDate: from.toString(),
    toDate: to.toString(),
    baseCcy: ex.state.baseCcy,
    revenue: flowLines('Income', close.Income, open.Income),
    expenses: flowLines('Expenses', close.Expenses, open.Expenses),
    totalRevenue,
    totalExpenses,
    profitBeforeTax: round2(totalRevenue - totalExpenses),
  };
}

/** Balance sheet as-of `asOf`. Leaf-level; the renderer does the current/non-current grouping. */
export function balanceSheet(
  ex: AllStateEx,
  asOf: LocalDate,
  fx: SingleFXConverter,
): BalanceSheet {
  const trees = sectionTrees(ex, asOf, STATEMENT_CONVERSION, fx, { boundByDate: true });
  const toLines = (rootId: RootId, node?: TreeTableDTO): Line[] =>
    ownBalances(node, false).map(o => ({ account: o.account, shortName: o.shortName, amount: normalize(rootId, o.own) }));
  return {
    asOf: asOf.toString(),
    baseCcy: ex.state.baseCcy,
    assets: toLines('Assets', trees.Assets),
    liabilities: toLines('Liabilities', trees.Liabilities),
    equity: toLines('Equity', trees.Equities),
    totalAssets: normalize('Assets', nodeAmount(trees.Assets)),
    totalLiabilities: normalize('Liabilities', nodeAmount(trees.Liabilities)),
    totalEquity: normalize('Equity', nodeAmount(trees.Equities)),
  };
}

/** Statement of changes in equity: per equity account, its opening/movement/closing over [from, to]. */
export function changesInEquity(
  ex: AllStateEx,
  from: LocalDate,
  to: LocalDate,
  fx: SingleFXConverter,
): ChangesInEquity {
  const closing = sectionTrees(ex, to, STATEMENT_CONVERSION, fx, { boundByDate: true }).Equities;
  const opening = sectionTrees(ex, from.minusDays(1), STATEMENT_CONVERSION, fx, { boundByDate: true }).Equities;

  // Union of accounts appearing at either end, so an account that opened non-zero and closed at zero
  // (or vice versa) still gets a row and the movements reconcile.
  const byAccount = new Map<string, { shortName: string; open: number; close: number }>();
  for (const o of ownBalances(opening, false)) byAccount.set(o.account, { shortName: o.shortName, open: o.own, close: 0 });
  for (const o of ownBalances(closing, false)) {
    const e = byAccount.get(o.account) ?? { shortName: o.shortName, open: 0, close: 0 };
    e.close = o.own;
    e.shortName = o.shortName;
    byAccount.set(o.account, e);
  }

  const rows: EquityMovement[] = [...byAccount.entries()].map(([account, e]) => {
    const opening_ = normalize('Equity', e.open);
    const closing_ = normalize('Equity', e.close);
    return { account, shortName: e.shortName, opening: opening_, movement: round2(closing_ - opening_), closing: closing_ };
  });

  return {
    fromDate: from.toString(),
    toDate: to.toString(),
    baseCcy: ex.state.baseCcy,
    rows,
    totalOpening: round2(rows.reduce((s, r) => s + r.opening, 0)),
    totalMovement: round2(rows.reduce((s, r) => s + r.movement, 0)),
    totalClosing: round2(rows.reduce((s, r) => s + r.closing, 0)),
  };
}

/**
 * Pre-closing trial balance as-of `asOf`: every posting-bearing account with its raw debit/credit
 * balance. Built on a single consistent basis (postings excluding the year-end `close`, so the P&L
 * accounts still show and retained earnings sits at opening), which is what makes debits = credits.
 */
export function trialBalance(
  ex: AllStateEx,
  asOf: LocalDate,
  fx: SingleFXConverter,
): TrialBalance {
  const cmds = ex.state.commands;
  const asOfStr = asOf.toString();
  // Bound postings by date here (balanceTreeTable uses `date` only for FX), then drop the close legs.
  const preClose = ex.allPostingsEx()
    .filter(p => p.date <= asOfStr)
    .filter(p => cmds[p.originIndex]?.commandType !== 'close');
  const roots = ['Assets', 'Liabilities', 'Equity', 'Income', 'Expenses'];

  const rows: TrialBalanceRow[] = roots.flatMap(root =>
    // includeRoot: a direct posting to a bare root would otherwise be dropped and break debits=credits.
    ownBalances(balanceTreeTable(root, asOf, ex.state.baseCcy, STATEMENT_CONVERSION, ex.state.accounts, preClose, fx), true)
      .map(o => ({ account: o.account, shortName: o.shortName, debit: o.own > 0 ? o.own : 0, credit: o.own < 0 ? -o.own : 0 })),
  );

  const totalDebit = round2(rows.reduce((s, r) => s + r.debit, 0));
  const totalCredit = round2(rows.reduce((s, r) => s + r.credit, 0));
  return {
    asOf: asOf.toString(),
    baseCcy: ex.state.baseCcy,
    rows,
    totalDebit,
    totalCredit,
    imbalance: round2(totalDebit - totalCredit),
  };
}
