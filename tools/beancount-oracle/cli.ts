// CLI entry point for the beancount import. Run from `tools/beancount-oracle/`:
//
//   python3 ../../bean2gain/python/dump.py ledger.beancount > ledger.json
//   pnpm run import ledger.json -o ledger.gainstrack
//
// or as one pipeline:
//
//   python3 ../../bean2gain/python/dump.py ledger.beancount | pnpm run import > ledger.gainstrack
//
// The migration report goes to STDERR precisely so the second form works: stdout is the ledger
// and nothing else, and a user who pipes it into a file still sees what did not survive.

import * as fs from 'fs';
import { parseDump } from 'src/lib/import/beancountDump';
import { formatReport, importBeancount } from 'src/lib/import/beancountImport';
import { lift } from 'src/lib/import/lift';

function readInput(path: string | undefined): string {
  if (path && path !== '-') return fs.readFileSync(path, 'utf8');
  return fs.readFileSync(0, 'utf8');
}

function main(argv: string[]): number {
  // `--` is dropped because `pnpm run import -- --raw` forwards it verbatim; leaving it
  // in makes the bare `--` look like the input filename.
  const args = argv.filter(a => a !== '--raw' && a !== '--');
  const raw = argv.includes('--raw');
  const outIdx = args.findIndex(a => a === '-o' || a === '--output');
  const output = outIdx >= 0 ? args[outIdx + 1] : undefined;
  // The `outIdx >= 0` guard matters: without it, `outIdx + 1` is 0 when there is no `-o`, and
  // the positional input argument gets filtered away — so `cli foo.json` silently waits on stdin.
  const input = args.filter((a, i) => outIdx < 0 || (i !== outIdx && i !== outIdx + 1))[0];

  const doc = parseDump(readInput(input));
  const lowered = importBeancount(doc);
  // Lowering alone is always correct and always intent-free. `--raw` stops here, which is what
  // the verification harness uses to tell a lowering bug apart from a lifting bug.
  const result = raw ? lowered : lift(lowered);

  if (output) fs.writeFileSync(output, result.text, 'utf8');
  else process.stdout.write(result.text);
  process.stderr.write(`${formatReport(result.report)}\n`);
  return result.report.loaderErrors.length > 0 ? 1 : 0;
}

process.exitCode = main(process.argv.slice(2));
