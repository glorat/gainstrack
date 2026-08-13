// The browser import end to end, with a stub standing in for the converter.
//
// There is no beancount here — that is the point of the stub. What these pin is the orchestration
// and, above all, the verification: that the round trip runs, that a preserved ledger reports
// clean, and that each way an import can go wrong is actually noticed rather than swallowed. The
// conversion itself is pinned by `beancountImport.spec.ts` and, against a real beancount, by
// `tools/beancount-oracle/__tests__/beancountImportOracle.spec.ts`.

import type { ConvertResult, LedgerFile } from 'src/lib/bean2gain/bridge';
import { DumpDocument } from '../beancountDump';
import { DumpConverter, importFromBeancount, verifyImport } from '../browserImport';
import { doc, open, post, tx } from './dumpFixtures';

const SUMMARY = { entries: 0, errors: 0, byType: {}, millis: 1, beancount: '3.2.0' };

/**
 * A converter that answers with prepared documents, in order.
 *
 * Queued rather than keyed on the input because the two calls are asked different questions —
 * the first about the user's ledger, the second about our re-export — and a test wants to say
 * "and beancount reads THIS back" without owning a beancount to produce it.
 */
class StubConverter implements DumpConverter {
  readonly calls: { files: LedgerFile[]; entry?: string }[] = [];

  constructor(private readonly responses: DumpDocument[]) {}

  convert(files: LedgerFile[], options: { entry?: string } = {}): Promise<ConvertResult> {
    this.calls.push({ files, entry: options.entry });
    const next = this.responses.shift();
    if (!next) throw new Error('StubConverter: unexpected extra conversion');
    return Promise.resolve({ json: JSON.stringify(next), summary: { ...SUMMARY, entries: next.entries.length } });
  }
}

const LEDGER: LedgerFile[] = [{ name: 'main.beancount', content: '; the stub never reads this' }];

/** A ledger whose money is one salary payment into one bank account. */
function payslip(amount = '1000.00'): DumpDocument {
  return doc([
    open('2019-01-01', 'Assets:Bank', 'USD'),
    open('2019-01-01', 'Income:Salary', 'USD'),
    tx('2019-01-31', 'January', [
      post('Assets:Bank', amount, 'USD'),
      post('Income:Salary', `-${amount}`, 'USD'),
    ]),
  ]);
}

describe('importFromBeancount', () => {
  test('converts, lowers and lifts', async () => {
    const converter = new StubConverter([payslip(), payslip()]);
    const { text } = await importFromBeancount(converter, LEDGER);
    // An income -> asset movement is one of the rows lifting recognizes.
    expect(text).toContain('earn Income:Salary Assets:Bank 1000.00 USD');
  });

  test('raw stops after lowering', async () => {
    const converter = new StubConverter([payslip(), payslip()]);
    const { text } = await importFromBeancount(converter, LEDGER, { raw: true });
    expect(text).toContain('tx ');
    expect(text).not.toContain('earn ');
  });

  test('forwards the entry file to the converter', async () => {
    const converter = new StubConverter([payslip(), payslip()]);
    await importFromBeancount(converter, LEDGER, { entry: 'main.beancount' });
    expect(converter.calls[0].entry).toBe('main.beancount');
  });

  test('refuses an empty file list rather than asking the converter', async () => {
    const converter = new StubConverter([]);
    await expect(importFromBeancount(converter, [])).rejects.toThrow(/no ledger files/);
    expect(converter.calls).toHaveLength(0);
  });

  test('reports progress in the order the work happens', async () => {
    const converter = new StubConverter([payslip(), payslip()]);
    const seen: string[] = [];
    await importFromBeancount(converter, LEDGER, { onStatus: s => seen.push(s) });
    expect(seen).toHaveLength(3);
    expect(seen[2]).toMatch(/beancount/i);
  });

  test('verify: false skips the round trip entirely', async () => {
    const converter = new StubConverter([payslip()]);
    const result = await importFromBeancount(converter, LEDGER, { verify: false });
    expect(result.verification).toBeUndefined();
    expect(converter.calls).toHaveLength(1);
  });
});

describe('the verification round trip', () => {
  test('passes when beancount reads back the same totals', async () => {
    const converter = new StubConverter([payslip(), payslip()]);
    const { verification } = await importFromBeancount(converter, LEDGER);
    expect(verification).toMatchObject({ ok: true, differences: [], plugged: [], reexportErrors: [] });
  });

  test('sends our own re-export to be read back, not the user file again', async () => {
    const converter = new StubConverter([payslip(), payslip()]);
    await importFromBeancount(converter, LEDGER);
    expect(converter.calls).toHaveLength(2);
    const [reexport] = converter.calls[1].files;
    // A beancount file generated from the gainstrack we just produced — note the narration is
    // ours now, because `earn` derives its description. Only the postings have to survive.
    expect(reexport.name).toBe('reexport.beancount');
    expect(reexport.content).toContain('2019-01-01 open Assets:Bank USD');
    expect(reexport.content).toContain('  Assets:Bank 1000 USD');
  });

  test('fails, with both sides, when a total moved', async () => {
    // The second document is what beancount would report if the import had dropped a digit.
    const converter = new StubConverter([payslip('1000.00'), payslip('100.00')]);
    const { verification } = await importFromBeancount(converter, LEDGER);
    expect(verification?.ok).toBe(false);
    expect(verification?.differences).toEqual([
      { account: 'Assets:Bank', currency: 'USD', before: '1000', after: '100' },
      { account: 'Income:Salary', currency: 'USD', before: '-1000', after: '-100' },
    ]);
  });

  test('fails when beancount rejects the re-export', async () => {
    // The case the totals comparison cannot see: a balance assertion that no longer holds is an
    // error at its own date, and every account can still end up with the right total.
    const rejected = payslip();
    rejected.errors = [{ message: 'Balance failed for Assets:Bank', file: 'reexport.beancount', line: 9 }];
    const { verification } = await importFromBeancount(new StubConverter([payslip(), rejected]), LEDGER);
    expect(verification?.ok).toBe(false);
    expect(verification?.reexportErrors).toEqual(['reexport.beancount:9: Balance failed for Assets:Bank']);
  });

  test('fails when the import balanced its own mistake into a plug account', async () => {
    const plugged = doc([
      open('2019-01-01', 'Assets:Bank', 'USD'),
      open('2019-01-01', 'Equity:Adjustments', 'USD'),
      tx('2019-01-31', 'January', [
        post('Assets:Bank', '1000.00', 'USD'),
        post('Income:Salary', '-900.00', 'USD'),
        post('Equity:Adjustments', '-100.00', 'USD'),
      ]),
    ]);
    const { verification } = await importFromBeancount(new StubConverter([payslip(), plugged]), LEDGER);
    expect(verification?.ok).toBe(false);
    expect(verification?.plugged).toEqual(['Equity:Adjustments -100 USD']);
  });

  test('a source beancount already complained about is reported, but is not our failure', async () => {
    const source = payslip();
    source.errors = [{ message: 'Unbooked lot', file: 'main.beancount', line: 3 }];
    const { verification } = await importFromBeancount(new StubConverter([source, payslip()]), LEDGER);
    expect(verification?.sourceErrors).toEqual(['main.beancount:3: Unbooked lot']);
    expect(verification?.ok).toBe(true);
  });

  test('a ledger that will not generate is reported without a second conversion', async () => {
    // `toBeancountFile` generates internally, so there would be nothing to send anyway. Returning
    // the finding beats throwing: the user still gets the report and the ledger to look at.
    const converter = new StubConverter([]);
    const verification = await verifyImport(converter, payslip(), 'this is not a ledger\n', {
      source: 'x', loaderErrors: [], lowered: {}, commented: {}, lossy: {},
      rawTransactions: 0, lifted: {}, accountFold: {}, warnings: [],
    });
    expect(verification.ok).toBe(false);
    expect(verification.generatorErrors.length).toBeGreaterThan(0);
    expect(converter.calls).toHaveLength(0);
  });
});
