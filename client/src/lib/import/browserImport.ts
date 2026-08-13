// The beancount import as the browser runs it: convert, lower, lift, and then check the result
// against beancount itself before anyone is asked to keep it.
//
// The CLI has an oracle — `tools/beancount-import/__tests__/beancountImportOracle.spec.ts` loads
// the original ledger and the re-export through the same beancount and compares totals. A user
// importing through the website has no python and no test suite, and "trust the migration report"
// is not an answer when the subject is somebody's entire financial history. So the same check
// runs here, in front of them, using the converter that is already open:
//
//   ledger.beancount --convert--> dump --import--> gainstrack --export--> beancount --convert--> dump
//         |                                                                                       |
//         +--------------------------- totals compared, same loader --------------------------- +
//
// The second conversion is what makes this worth doing. It is beancount reading our output, so it
// catches the same things `bean-check` does — a transaction that does not balance, an account
// posted to before it opens, a balance assertion that no longer holds at its own date — none of
// which the totals comparison can see, because those are facts about intermediate dates.
//
// This module knows nothing about iframes. It takes a `DumpConverter`, which the bean2gain bridge
// happens to satisfy; a test satisfies it with a stub, and a future CLI or worker could satisfy
// it some other way.

import { toBeancountFile } from 'src/lib/export/beancountExport';
import { generateAllStateSafe } from 'src/lib/gen/GainstrackGenerator';
import type { ConvertResult, ConvertSummary, LedgerFile } from 'src/lib/bean2gain/bridge';
import { BalanceDifference, balancesOf, compareBalances, pluggedAmounts } from './balances';
import { DumpDocument, parseDump } from './beancountDump';
import { ImportReport, importBeancount } from './beancountImport';
import { lift } from './lift';

/** What this module needs from a beancount loader. `Bean2Gain` from the bridge satisfies it. */
export interface DumpConverter {
  convert(files: LedgerFile[], options?: { entry?: string }): Promise<ConvertResult>;
}

export interface Verification {
  /** True only if the import introduced nothing wrong. Errors in the SOURCE do not count. */
  ok: boolean;
  /**
   * Loader errors on the original ledger — problems that predate the import.
   *
   * Kept apart from everything else deliberately. A ledger beancount already complains about
   * still converts, and telling the user their own file was the problem is a different message
   * from telling them ours is.
   */
  sourceErrors: string[];
  /** Loader errors when beancount re-read what we produced. The strongest single signal here. */
  reexportErrors: string[];
  /** Every (account, currency) whose total moved. Empty is the answer that matters. */
  differences: BalanceDifference[];
  /** Amounts swept into `Equity:Adjustments` — an import balancing its own mistake. */
  plugged: string[];
  /** Errors from generating the imported ledger with gainstrack's own engine. */
  generatorErrors: string[];
}

export interface BrowserImportResult {
  /** The gainstrack ledger. What `saveSource` would be given. */
  text: string;
  report: ImportReport;
  /** What the converter said about the original ledger — entry counts, timings, its version. */
  summary: ConvertSummary;
  /** Absent when `verify: false`. */
  verification?: Verification;
}

export interface BrowserImportOptions {
  /** Which uploaded file is the top-level ledger. Defaults to the first. */
  entry?: string;
  /** Stop after lowering, before the lifting rules — tells a lowering bug from a lifting one. */
  raw?: boolean;
  /** Run the round trip back through beancount. On by default; it doubles the wait. */
  verify?: boolean;
  onStatus?: (message: string) => void;
}

export async function importFromBeancount(
  converter: DumpConverter,
  files: LedgerFile[],
  options: BrowserImportOptions = {},
): Promise<BrowserImportResult> {
  const { entry, raw = false, verify = true, onStatus = () => undefined } = options;

  if (files.length === 0) throw new Error('no ledger files to import');

  onStatus('Loading your ledger with beancount…');
  const converted = await converter.convert(files, { entry });
  const doc = parseDump(converted.json);

  onStatus('Converting to gainstrack…');
  const lowered = importBeancount(doc);
  const result = raw ? lowered : lift(lowered);

  if (!verify) return { text: result.text, report: result.report, summary: converted.summary };

  onStatus('Checking the result against beancount…');
  const verification = await verifyImport(converter, doc, result.text, result.report);
  return { text: result.text, report: result.report, summary: converted.summary, verification };
}

/**
 * Re-export what we produced, have beancount read it back, and compare.
 *
 * Exported so it can be driven on its own — with a ledger that came from somewhere else, or from
 * a spec that wants the check without the conversion in front of it.
 */
export async function verifyImport(
  converter: DumpConverter,
  original: DumpDocument,
  text: string,
  report: ImportReport,
): Promise<Verification> {
  const generatorErrors = generateAllStateSafe(text).errors.map(e => e.message);

  // `toBeancountFile` parses and generates internally, so a ledger that does not generate has no
  // export to check. Report what is known rather than throwing away the other findings.
  if (generatorErrors.length > 0) {
    return {
      ok: false,
      sourceErrors: balancesOf(original).errors,
      reexportErrors: [],
      differences: [],
      plugged: [],
      generatorErrors,
    };
  }

  const reexport = await converter.convert(
    [{ name: 'reexport.beancount', content: `${toBeancountFile(text)}\n` }],
  );
  const after = balancesOf(parseDump(reexport.json));
  const before = balancesOf(original);

  const differences = compareBalances(before, after, report);
  const plugged = pluggedAmounts(after);

  return {
    ok: after.errors.length === 0 && differences.length === 0 && plugged.length === 0,
    sourceErrors: before.errors,
    reexportErrors: after.errors,
    differences,
    plugged,
    generatorErrors,
  };
}
