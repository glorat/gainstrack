#!/usr/bin/env node
// GPL-2.0-only — see ../LICENSE and ./README.md.
//
// `dump.py` without a Python installation. Same arguments, same output; the interpreter is
// compiled to WebAssembly and shipped in node_modules.
//
//   node dumpWasm.ts ledger.beancount               # JSON to stdout
//   node dumpWasm.ts ledger.beancount -o out.json
//   node dumpWasm.ts ledger.beancount --indent 2

import { writeFile } from 'node:fs/promises';
import { createDumpRuntime } from './runtime.ts';

interface Args {
  ledger: string;
  output?: string;
  indent?: number;
  root?: string;
  quiet: boolean;
}

function parse(argv: readonly string[]): Args {
  const positional: string[] = [];
  const args: Partial<Args> = { quiet: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '-o':
      case '--output':
        args.output = argv[++i];
        break;
      case '--indent':
        args.indent = Number(argv[++i]);
        break;
      case '--root':
        args.root = argv[++i];
        break;
      case '-q':
      case '--quiet':
        args.quiet = true;
        break;
      case '-h':
      case '--help':
        usage();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('-')) fail(`unknown option ${arg}`);
        positional.push(arg);
    }
  }

  if (positional.length !== 1) fail('expected exactly one ledger path');
  return { ...(args as Args), ledger: positional[0] };
}

function usage(): void {
  process.stderr.write(
    [
      'usage: node dumpWasm.ts LEDGER [-o OUT.json] [--indent N] [--root DIR] [-q]',
      '',
      "  Runs ../dump.py under Pyodide. Output is byte-identical to the native script's,",
      '  which is what `node compare.ts` exists to check.',
      '',
      '  --root DIR  directory exposed to the WASM filesystem (default: the ledger’s own).',
      '              Needed when the ledger includes files outside its directory.',
      '',
    ].join('\n'),
  );
}

function fail(message: string): never {
  process.stderr.write(`dumpWasm: ${message}\n`);
  usage();
  process.exit(2);
}

const args = parse(process.argv.slice(2));
const note = (message: string) => {
  if (!args.quiet) process.stderr.write(`${message}\n`);
};

const runtime = await createDumpRuntime({ onStatus: note });
note(`beancount ${runtime.info.beancount} on python ${runtime.info.python} (${runtime.info.platform})`);

const outcome = await runtime.dump(args.ledger, { root: args.root, indent: args.indent });
runtime.destroy();

if (outcome.stderr) process.stderr.write(`${outcome.stderr}\n`);
note(`dumped in ${outcome.millis.toFixed(0)} ms`);

if (args.output) await writeFile(args.output, outcome.json, 'utf8');
else process.stdout.write(outcome.json);
