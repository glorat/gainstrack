// GPL-2.0-only — see ../LICENSE and ../README.md.
//
// Runs the unmodified `../python/dump.py` inside Pyodide, under Node.
//
// This is the verification half, not the site: it exists so the browser's answers can be checked
// against a native CPython beancount. Both halves drive the interpreter through
// `src/dumpProgram.ts`, so what the site runs and what is verified here are the same program.

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPyodide, type PyodideInterface } from 'pyodide';
import { installBeancount } from 'beancount-wasm/runtime';
import {
  BOOTSTRAP,
  DUMP_PY_IN_WASM,
  dumpArgv,
  OUTPUT_IN_WASM,
  runDumpCode,
  type RuntimeInfo,
} from '../src/dumpProgram.ts';

const HERE = dirname(fileURLToPath(import.meta.url));

/** The script under test. One file, three runtimes — native, here, and the browser bundle. */
export const DUMP_PY = resolve(HERE, '..', 'python', 'dump.py');

/** Where the host ledger directory appears inside the Emscripten filesystem. */
export const MOUNT = '/ledger';

export interface DumpRuntime {
  /** Versions of the things that could plausibly explain a difference. */
  readonly info: RuntimeInfo;
  /**
   * Run `dump.py` against a ledger on the host filesystem and return the JSON text it wrote.
   *
   * `root` is the directory mounted into the WASM filesystem; `include` directives are resolved
   * inside it, so a ledger that includes files above its own directory needs `root` set to a
   * common ancestor.
   */
  dump(ledgerPath: string, options?: DumpOptions): Promise<DumpOutcome>;
  /**
   * Escape hatch for the corpus generator, which needs `bean-example` out of the same wheel.
   * Not part of the dump path — nothing in the comparison goes through here.
   */
  runPython(code: string): Promise<unknown>;
  /** Read a file back out of the WASM filesystem. */
  readFile(path: string): string;
  destroy(): void;
}

export type { RuntimeInfo };

export interface DumpOptions {
  root?: string;
  indent?: number;
}

export interface DumpOutcome {
  json: string;
  /** Anything the script or the loader printed. beancount warns on stderr and keeps going. */
  stdout: string;
  stderr: string;
  millis: number;
}

export interface CreateOptions {
  /** 'v3' (default) or 'v2'; the package ships a wheel for each. */
  version?: 'v2' | 'v3';
  onStatus?: (message: string) => void;
}

/**
 * Boot Pyodide, install the beancount wheel and load `dump.py` into it.
 *
 * Costs about two seconds and tens of megabytes, so hold onto the result: `dump()` is reusable and
 * the interpreter is the expensive part, not the ledger.
 */
export async function createDumpRuntime(options: CreateOptions = {}): Promise<DumpRuntime> {
  const { version = 'v3', onStatus } = options;

  const out: string[] = [];
  const err: string[] = [];

  onStatus?.('loading pyodide');
  const pyodide = await loadPyodide({
    // Left to itself, Pyodide locates its own assets by parsing a stack trace. Under Vitest,
    // source-map support rewrites that trace to Pyodide's *TypeScript sources*, which the
    // published package does not contain, and the load fails looking for `src/js/pyodide.asm.wasm`.
    // Resolving the package explicitly is immune to that.
    indexURL: assetDirectory(),
    stdout: (line) => out.push(line),
    stderr: (line) => err.push(line),
  });

  onStatus?.(`installing beancount ${version}`);
  // `inline: 'only'` uses the wheel embedded in the beancount-wasm package rather than fetching it
  // from a CDN — the dependencies still come over the network on a cold cache, but the thing being
  // tested does not, so the harness cannot silently test a different beancount than it reports.
  await installBeancount(pyodide as unknown as Parameters<typeof installBeancount>[0], {
    version,
    inline: 'only',
    onStatus,
  });

  const probed = JSON.parse(
    (await pyodide.runPythonAsync(BOOTSTRAP)) as unknown as string,
  ) as Omit<RuntimeInfo, 'pyodide'>;

  pyodide.FS.writeFile(DUMP_PY_IN_WASM, await readFile(DUMP_PY, 'utf8'));

  let mounted: string | undefined;
  const unmount = () => {
    if (mounted === undefined) return;
    pyodide.FS.unmount(MOUNT);
    mounted = undefined;
  };

  return {
    info: { ...probed, pyodide: pyodide.version },

    async dump(ledgerPath, dumpOptions = {}) {
      const ledger = resolve(ledgerPath);
      const root = resolve(dumpOptions.root ?? dirname(ledger));
      const within = relative(root, ledger);
      if (within.startsWith('..') || within.startsWith(sep)) {
        throw new Error(`ledger ${ledger} is not inside root ${root}`);
      }

      if (mounted !== root) {
        unmount();
        mkdirp(pyodide, MOUNT);
        pyodide.mountNodeFS(MOUNT, root);
        mounted = root;
      }

      out.length = 0;
      err.length = 0;

      const started = performance.now();
      await pyodide.runPythonAsync(
        runDumpCode(dumpArgv(posixJoin(MOUNT, within), dumpOptions.indent)),
      );
      const millis = performance.now() - started;

      const json = pyodide.FS.readFile(OUTPUT_IN_WASM, { encoding: 'utf8' }) as unknown as string;
      pyodide.FS.unlink(OUTPUT_IN_WASM);

      return { json, stdout: out.join('\n'), stderr: err.join('\n'), millis };
    },

    runPython(code) {
      return pyodide.runPythonAsync(code);
    },

    readFile(path) {
      return pyodide.FS.readFile(path, { encoding: 'utf8' }) as unknown as string;
    },

    destroy() {
      unmount();
      // Pyodide holds a whole interpreter heap; without this a run over several ledgers in one
      // process keeps every one of them alive.
      pyodide.runPython('import gc; gc.collect()');
    },
  };
}

/** The directory holding pyodide.asm.wasm and the Python standard library, whoever is importing us. */
function assetDirectory(): string {
  // `createRequire` rather than `import.meta.resolve`, which Vite's SSR transform does not provide.
  return dirname(createRequire(import.meta.url).resolve('pyodide/package.json'));
}

function mkdirp(pyodide: PyodideInterface, path: string): void {
  let current = '';
  for (const part of path.split('/').filter(Boolean)) {
    current += `/${part}`;
    if (!pyodide.FS.analyzePath(current).exists) pyodide.FS.mkdir(current);
  }
}

/** The WASM filesystem is POSIX even when the host is not. */
function posixJoin(base: string, hostRelative: string): string {
  return `${base}/${hostRelative.split(sep).join('/')}`;
}

/** Read a ledger's directory as the mount root unless one was named. */
export function defaultRoot(ledgerPath: string): string {
  return dirname(resolve(ledgerPath));
}
