#!/usr/bin/env node
// GPL-2.0-only — see ../LICENSE and ./README.md.
//
// Generate a corpus with `bean-example`, using the WASM beancount rather than an installed one.
//
// A dozen hand-written fixtures cover the directive types; they do not cover a decade of a
// plausible person's finances, which is where a numeric divergence would actually show up. This
// produces that, on any machine with node and nothing else — the ledger is only *input* to the
// comparison, so it does not matter which runtime wrote it.
//
//   node example.ts -o __tests__/fixtures/generated/example.beancount

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDumpRuntime } from './runtime.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT = resolve(HERE, '__tests__/fixtures/generated/example.beancount');
const OUT_IN_WASM = '/example.beancount';

interface Args {
  output: string;
  seed: number;
  begin?: string;
  end?: string;
}

function parse(argv: readonly string[]): Args {
  const args: Args = { output: DEFAULT_OUTPUT, seed: 0 };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '-o':
      case '--output':
        args.output = resolve(argv[++i]);
        break;
      case '-s':
      case '--seed':
        args.seed = Number(argv[++i]);
        break;
      case '--date-begin':
        args.begin = argv[++i];
        break;
      case '--date-end':
        args.end = argv[++i];
        break;
      default:
        process.stderr.write(
          'usage: node example.ts [-o OUT] [-s SEED] [--date-begin YYYY-MM-DD] [--date-end YYYY-MM-DD]\n',
        );
        process.exit(2);
    }
  }
  return args;
}

const args = parse(process.argv.slice(2));
const runtime = await createDumpRuntime({ onStatus: (m) => process.stderr.write(`${m}\n`) });

const argv = ['--seed', String(args.seed), '-o', OUT_IN_WASM];
if (args.begin) argv.push('--date-begin', args.begin);
if (args.end) argv.push('--date-end', args.end);

// `bean-example` is a click command; `standalone_mode=False` stops click calling sys.exit, which
// under Pyodide would take the interpreter down with it.
await runtime.runPython(`
import json
from beancount.scripts.example import main
main(json.loads(${JSON.stringify(JSON.stringify(argv))}), standalone_mode=False)
`);

const ledger = runtime.readFile(OUT_IN_WASM);
runtime.destroy();

await mkdir(dirname(args.output), { recursive: true });
await writeFile(args.output, ledger, 'utf8');
process.stderr.write(`wrote ${args.output} (${(ledger.length / 1024).toFixed(0)} KiB)\n`);
