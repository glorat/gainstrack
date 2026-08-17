import { LocalDate } from '@js-joda/core';
import { AllStateEx } from '../AllStateEx';
import { SingleFXConverter } from '../fx';
import { TreeTableDTO } from '../assetdb/models';
import { balanceTreeTable } from '../TreeTable';

/**
 * The five statement roots as balance trees, as-of a date. This is the shape the SPA store holds
 * as `store.balances` (aliased there as `AccountBalances`) and the base every figure builder in
 * this folder walks. Extracted from the store so the browser reports and the headless CLI share
 * ONE definition of the root mapping and the pre-close rule below.
 */
export interface SectionTrees {
  Assets?: TreeTableDTO;
  Liabilities?: TreeTableDTO;
  Equities?: TreeTableDTO;
  Income?: TreeTableDTO;
  Expenses?: TreeTableDTO;
}

/**
 * Build the five statement-root balance trees as-of `asOf`.
 *
 * The subtle, correctness-critical bit is the `preClose` filter: an income statement reports
 * activity *before* the books were closed, and a `close` command moves that activity into equity —
 * so including its postings under Income/Expenses would net those trees to zero. Assets, Liabilities
 * and Equity use every posting; Income and Expenses exclude the close legs. This rule must live in
 * exactly one place, which is here.
 */
export interface SectionTreesOptions {
  /**
   * Exclude postings dated after `asOf` from the balances. Off by default: the Pinia store shares
   * this function and its long-standing behaviour is to include every posting (using `asOf` only for
   * FX conversion), so bounding must be opt-in or existing balance-sheet/income-statement views
   * would silently drop future-dated postings. The headless statement builders opt in, since an
   * as-of/period report must not count activity after its date.
   */
  boundByDate?: boolean;
}

export function sectionTrees(
  ex: AllStateEx,
  asOf: LocalDate,
  conversion: string,
  fx: SingleFXConverter,
  options: SectionTreesOptions = {},
): SectionTrees {
  const accounts = ex.state.accounts;
  const baseCcy = ex.state.baseCcy;
  const cmds = ex.state.commands;
  // balanceTreeTable uses `date` only for FX conversion, not to bound which postings count. When a
  // caller wants an as-of report, bound the postings here; the store leaves this off (unbounded).
  const asOfStr = asOf.toString();
  const allPostingsEx = options.boundByDate
    ? ex.allPostingsEx().filter(p => p.date <= asOfStr)
    : ex.allPostingsEx();

  const forCategory = (cat: string, postings = allPostingsEx) =>
    balanceTreeTable(cat, asOf, baseCcy, conversion, accounts, postings, fx);

  const preClose = allPostingsEx.filter(p => cmds[p.originIndex]?.commandType !== 'close');

  return {
    Assets: forCategory('Assets'),
    Liabilities: forCategory('Liabilities'),
    Expenses: forCategory('Expenses', preClose),
    Income: forCategory('Income', preClose),
    Equities: forCategory('Equity'),
  };
}
