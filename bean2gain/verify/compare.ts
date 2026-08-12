#!/usr/bin/env node
// GPL-2.0-only — see ../LICENSE and ./README.md.
//
// The point of the whole exercise: run `dump.py` twice, once under CPython and once under WASM,
// and report every byte of disagreement.
//
//   node compare.ts ledger.beancount [more.beancount ...]
//   node compare.ts --python /path/to/python ledger.beancount
//   node compare.ts --max 50 ledger.beancount        # differences printed before truncating
//
// Exit status is 1 if any ledger differs, so it is usable as a check.

import { formatDifference } from './diff.ts';
import { defaultPythonCandidates, findNativePython, nativeInfo } from './native.ts';
import { compareLedger } from './parity.ts';
import { createDumpRuntime, type RuntimeInfo } from './runtime.ts';

interface Args {
  ledgers: string[];
  python?: string;
  root?: string;
  max: number;
  quiet: boolean;
}

function parse(argv: readonly string[]): Args {
  const args: Args = { ledgers: [], max: 20, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--python':
        args.python = argv[++i];
        break;
      case '--root':
        args.root = argv[++i];
        break;
      case '--max':
        args.max = Number(argv[++i]);
        break;
      case '-q':
      case '--quiet':
        args.quiet = true;
        break;
      case '-h':
      case '--help':
        process.stderr.write(
          'usage: node compare.ts [--python PATH] [--root DIR] [--max N] LEDGER...\n',
        );
        process.exit(0);
        break;
      default:
        if (arg.startsWith('-')) {
          process.stderr.write(`compare: unknown option ${arg}\n`);
          process.exit(2);
        }
        args.ledgers.push(arg);
    }
  }
  if (args.ledgers.length === 0) {
    process.stderr.write('compare: no ledgers given\n');
    process.exit(2);
  }
  return args;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function describeRuntime(label: string, info: RuntimeInfo): string {
  const packages = Object.entries(info.packages)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, version]) => `${name} ${version}`)
    .join(', ');
  return [
    `${label}`,
    `  beancount ${info.beancount} · python ${info.python} · ${info.platform}`,
    `  pyodide   ${info.pyodide}`,
    packages ? `  deps      ${packages}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

const args = parse(process.argv.slice(2));
const note = (message: string) => {
  if (!args.quiet) process.stderr.write(`${message}\n`);
};

const python = args.python ?? (await findNativePython(defaultPythonCandidates()));
if (!python) {
  process.stderr.write(
    [
      'compare: no python with beancount found.',
      'Pass --python, set BEAN_PYTHON, or create the venv beside this file:',
      '',
      '  uv venv --python 3.13 .venv && uv pip install --python .venv/bin/python beancount==3.2.0',
      '',
    ].join('\n'),
  );
  process.exit(2);
}

const runtime = await createDumpRuntime({ onStatus: note });

const native = await nativeInfo(python);
process.stdout.write(`${describeRuntime(`native   ${python}`, native)}\n\n`);
process.stdout.write(`${describeRuntime('wasm     pyodide', runtime.info)}\n\n`);

// A beancount version mismatch would make every subsequent difference uninterpretable, so say so
// rather than letting the reader assume the runtime is to blame.
if (native.beancount !== runtime.info.beancount) {
  process.stdout.write(
    `!! beancount versions differ (${native.beancount} vs ${runtime.info.beancount}) — ` +
      'differences below are not attributable to the runtime\n\n',
  );
}

// Neither timing below is a benchmark: the native figure includes starting a process and
// importing beancount, the WASM figure excludes the interpreter boot that already happened above.
// They are here to show the order of magnitude, not to rank the two.
let failures = 0;
for (const ledger of args.ledgers) {
  const result = await compareLedger(runtime, python, ledger, { root: args.root });
  const { native: n, wasm: w } = result;

  process.stdout.write(`${result.ledger}\n`);
  process.stdout.write(
    `  ${n.entries} entries, ${plural(n.errors, 'loader error')}, ` +
      `${(n.bytes / 1024).toFixed(0)} KiB of JSON\n`,
  );
  process.stdout.write(`  native ${n.millis.toFixed(0)} ms · wasm ${w.millis.toFixed(0)} ms\n`);

  if (result.equal) {
    process.stdout.write('  identical\n\n');
    continue;
  }

  failures++;
  process.stdout.write(`  ${result.differences.length} DIFFERENCES\n`);
  for (const difference of result.differences.slice(0, args.max)) {
    process.stdout.write(`    ${formatDifference(difference, ['native', 'wasm'])}\n`);
  }
  if (result.differences.length > args.max) {
    process.stdout.write(`    ... and ${result.differences.length - args.max} more\n`);
  }
  process.stdout.write('\n');
}

runtime.destroy();

process.stdout.write(
  failures === 0
    ? `all ${plural(args.ledgers.length, 'ledger')} identical\n`
    : `${failures} of ${plural(args.ledgers.length, 'ledger')} differ\n`,
);
process.exit(failures === 0 ? 0 : 1);
