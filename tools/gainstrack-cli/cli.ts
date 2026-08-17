#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { GainstrackParser } from 'src/lib/GainstrackParser';
import { toGainstrackFile } from 'src/lib/export/gainstrackExport';
import { toBeancountFile } from 'src/lib/export/beancountExport';
import {
  loadLedger, inferPeriod, buildReport, buildBundle, flattenFigures, diffFigures,
  LedgerError, Period, ReportName,
} from './lib';

/**
 * gainstrack — headless CLI over the engine in client/src/lib.
 *
 *   gainstrack build <ledger>
 *   gainstrack report <income-statement|balance-sheet|changes-in-equity|cash-flow|trial-balance|all> <ledger> [--from D --to D --as-of D]
 *   gainstrack export <beancount|gainstrack> <ledger>
 *   gainstrack check <ledger> --expect figures.json [--from D --to D --as-of D]
 *
 * <ledger> is a path, or `-`/omitted to read stdin. JSON goes to stdout (or --output/-o FILE).
 * Dates default to the ledger's own earliest→latest posting span. Exit code is 1 on a ledger that
 * does not generate, and on a failed `check`.
 */

const USAGE = `Usage:
  gainstrack build <ledger>
  gainstrack report <income-statement|balance-sheet|changes-in-equity|cash-flow|trial-balance|all> <ledger> [--from D --to D --as-of D]
  gainstrack export <beancount|gainstrack> <ledger>
  gainstrack check <ledger> --expect figures.json [--from D --to D --as-of D]

Options:
  --from, --to, --as-of   ISO dates (default: ledger's earliest/latest posting)
  --expect <file>         expected figures JSON for \`check\`
  -o, --output <file>     write output here instead of stdout

Statement figures are always expressed in the ledger's base currency.`;

interface Args {
  positional: string[];
  from?: string;
  to?: string;
  asOf?: string;
  expect?: string;
  output?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--from': args.from = argv[++i]; break;
      case '--to': args.to = argv[++i]; break;
      case '--as-of': args.asOf = argv[++i]; break;
      case '--expect': args.expect = argv[++i]; break;
      case '-o': case '--output': args.output = argv[++i]; break;
      case '--': break;
      default:
        if (a.startsWith('--')) fail(`unknown option: ${a}`);
        args.positional.push(a);
    }
  }
  return args;
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function readLedger(path: string | undefined): string {
  if (!path || path === '-') return readFileSync(0, 'utf-8'); // fd 0 = stdin
  return readFileSync(path, 'utf-8');
}

function emit(value: unknown, output: string | undefined): void {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  if (output) writeFileSync(output, text + '\n');
  else process.stdout.write(text + '\n');
}

function periodFrom(ex: ReturnType<typeof loadLedger>, args: Args): Period {
  return inferPeriod(ex, { from: args.from, to: args.to, asOf: args.asOf });
}

function main(rawArgv: string[]): void {
  // `pnpm run gainstrack -- report …` forwards a literal `--` as the first token; drop it.
  const argv = rawArgv[0] === '--' ? rawArgv.slice(1) : rawArgv;
  const command = argv[0];
  const args = parseArgs(argv.slice(1));

  try {
    switch (command) {
      case 'build': {
        const ex = loadLedger(readLedger(args.positional[0]));
        const period = periodFrom(ex, args);
        emit({ period, baseCcy: ex.state.baseCcy, trialBalance: buildReport('trial-balance', ex, period) }, args.output);
        break;
      }
      case 'report': {
        const name = args.positional[0] as ReportName;
        const valid: ReportName[] = ['income-statement', 'balance-sheet', 'changes-in-equity', 'cash-flow', 'trial-balance', 'all'];
        if (!valid.includes(name)) fail(`unknown report: ${name}\n\n${USAGE}`);
        const ex = loadLedger(readLedger(args.positional[1]));
        emit(buildReport(name, ex, periodFrom(ex, args)), args.output);
        break;
      }
      case 'export': {
        const format = args.positional[0];
        const text = readLedger(args.positional[1]);
        loadLedger(text); // fail fast on a ledger that does not generate
        if (format === 'beancount') {
          emit(toBeancountFile(text), args.output);
        } else if (format === 'gainstrack') {
          const parser = new GainstrackParser();
          parser.parseString(text);
          emit(toGainstrackFile(parser.getTypedCommands()), args.output);
        } else {
          fail(`unknown export format: ${format} (want beancount|gainstrack)`);
        }
        break;
      }
      case 'check': {
        if (!args.expect) fail('check requires --expect <figures.json>');
        const ex = loadLedger(readLedger(args.positional[0]));
        const bundle = buildBundle(ex, periodFrom(ex, args));
        const expected = JSON.parse(readFileSync(args.expect, 'utf-8')) as Record<string, number>;
        const diffs = diffFigures(flattenFigures(bundle), expected);
        if (diffs.length) {
          process.stderr.write(`FAIL: ${diffs.length} figure(s) do not match ${args.expect}\n`);
          for (const d of diffs) {
            process.stderr.write(`  ${d.key}: expected ${d.expected}, got ${d.actual ?? '(missing)'}\n`);
          }
          process.exit(1);
        }
        process.stderr.write(`OK: ${Object.keys(expected).length} figure(s) match\n`);
        break;
      }
      case undefined: case '-h': case '--help':
        process.stdout.write(`${USAGE}\n`);
        break;
      default:
        fail(`unknown command: ${command}\n\n${USAGE}`);
    }
  } catch (err) {
    if (err instanceof LedgerError) fail(`ledger error:\n${err.message}`);
    throw err;
  }
}

main(process.argv.slice(2));
