// GPL-2.0-only — see ../LICENSE and ../README.md.
//
// The Python driver, shared by the browser app and the Node verification harness.
//
// Neither of them reimplements `dump.py`: they both write that file into the Emscripten
// filesystem and execute it through `runpy` with a `sys.argv` a shell could have produced. That is
// the whole basis for claiming the two runtimes agree — `verify/` then checks the claim against a
// native CPython.

/** Where `dump.py` is written inside the WASM filesystem. */
export const DUMP_PY_IN_WASM = '/dump.py';

/** Where `dump.py` is told to write its document. Read back out through the FS, not stdout. */
export const OUTPUT_IN_WASM = '/dump-output.json';

/** The packages whose versions could plausibly explain a difference between two runs. */
export const DEPENDENCIES = ['click', 'python-dateutil', 'regex', 'six'] as const;

/**
 * Runs once per interpreter, before anything imports beancount.
 *
 * The environment variable has to be set here rather than at dump time: `beancount.loader` reads it
 * when it is imported, and it turns off a cache that would otherwise pickle a parsed ledger next to
 * the source file — a write into the user's data in Node, and a stale answer in either runtime.
 */
export const BOOTSTRAP = `
import os, sys
os.environ["BEANCOUNT_DISABLE_LOAD_CACHE"] = "1"
import json, beancount, importlib.metadata as md

def _version(name):
    try:
        return md.version(name)
    except Exception:
        return None

json.dumps({
    "beancount": beancount.__version__,
    "python": sys.version.split()[0],
    "platform": sys.platform,
    "packages": {n: v for n, v in ((n, _version(n)) for n in ${JSON.stringify(DEPENDENCIES)}) if v},
})
`;

/**
 * Execute `dump.py` as `__main__` with the given argv.
 *
 * argv crosses into Python as a JSON string rather than a JS array: an array arrives as a JsProxy,
 * which is not a list and cannot be assigned to `sys.argv`.
 */
export function runDumpCode(argv: readonly string[]): string {
  return `
import json, runpy, sys
sys.argv = json.loads(${JSON.stringify(JSON.stringify(argv))})
try:
    runpy.run_path(${JSON.stringify(DUMP_PY_IN_WASM)}, run_name="__main__")
except SystemExit as exc:
    if exc.code not in (0, None):
        raise
`;
}

/** The argv a shell would pass for "dump this ledger to that file". */
export function dumpArgv(ledgerPath: string, indent?: number): string[] {
  const argv = ['dump.py', ledgerPath, '-o', OUTPUT_IN_WASM];
  if (indent !== undefined) argv.push('--indent', String(indent));
  return argv;
}

/** What the bootstrap reports about the interpreter it is running in. */
export interface RuntimeInfo {
  beancount: string;
  python: string;
  platform: string;
  pyodide: string;
  packages: Record<string, string>;
}
