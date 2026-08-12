// GPL-2.0-only — see ../LICENSE and ./README.md.
//
// The other half of the comparison: `dump.py` run by a CPython that has beancount installed the
// ordinary way. Nothing here is clever; it exists so the two runs are driven by the same code and
// differ only in which interpreter executes the script.

import { execFile } from 'node:child_process';
import { access, constants } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { DUMP_PY, type DumpOptions, type DumpOutcome, type RuntimeInfo } from './runtime.ts';

const run = promisify(execFile);

// Same reason as the WASM side: no pickle cache, so the run is reproducible and writes nothing
// into the ledger's directory.
const ENV = { ...process.env, BEANCOUNT_DISABLE_LOAD_CACHE: '1' };

/** Output limit for a dumped ledger. bean-example's output is ~10 MB of JSON; allow well past it. */
const MAX_BUFFER = 512 * 1024 * 1024;

const PROBE = `
import json, sys, beancount, importlib.metadata as md
def version(name):
    try:
        return md.version(name)
    except Exception:
        return None
print(json.dumps({
    "beancount": beancount.__version__,
    "python": sys.version.split()[0],
    "platform": sys.platform,
    "packages": {n: v for n, v in ((n, version(n)) for n in ("click", "python-dateutil", "regex", "six")) if v},
}))
`;

/**
 * Locate a python that can actually import beancount.
 *
 * Existence of the binary is not the test — a venv whose base interpreter has been upgraded away
 * leaves a python on disk that fails on every invocation, and a python without beancount is no use
 * either. Both read as "absent" so the harness skips rather than fails.
 */
export async function findNativePython(candidates: readonly string[]): Promise<string | undefined> {
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      await access(candidate, constants.X_OK);
    } catch {
      continue;
    }
    try {
      await run(candidate, ['-c', 'import beancount'], { env: ENV });
      return resolve(candidate);
    } catch {
      // Wrong python, or no beancount in it. Keep looking.
    }
  }
  return undefined;
}

/**
 * The candidates tried, in order, when none is named explicitly.
 *
 * Nothing here looks outside the project. A venv above it would belong to whatever this happens to
 * be checked out inside, which is not something a standalone converter should reach for.
 */
export function defaultPythonCandidates(): string[] {
  const here = fileURLToPath(new URL('.', import.meta.url));
  return [
    process.env.BEAN_PYTHON ?? '',
    resolve(here, '../.venv/bin/python'),
    '/usr/bin/python3',
  ].filter(Boolean);
}

export async function nativeInfo(python: string): Promise<RuntimeInfo> {
  const { stdout } = await run(python, ['-c', PROBE], { env: ENV });
  const probed = JSON.parse(stdout) as Omit<RuntimeInfo, 'pyodide'>;
  return { ...probed, pyodide: 'n/a (native CPython)' };
}

export async function nativeDump(
  python: string,
  ledgerPath: string,
  options: DumpOptions = {},
): Promise<DumpOutcome> {
  const argv = [DUMP_PY, resolve(ledgerPath)];
  if (options.indent !== undefined) argv.push('--indent', String(options.indent));

  const started = performance.now();
  // dump.py's only writer to stdout is the document itself, so stdout *is* the JSON; warnings from
  // the loader come out on stderr.
  const { stdout, stderr } = await run(python, argv, { env: ENV, maxBuffer: MAX_BUFFER });
  return { json: stdout, stdout: '', stderr, millis: performance.now() - started };
}
