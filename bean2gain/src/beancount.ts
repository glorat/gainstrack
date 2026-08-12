// GPL-2.0-only — see ../LICENSE and ../README.md.
//
// beancount in the browser: Pyodide plus the wheel, running the same `dump.py` the CLI runs.
//
// Everything is served from this origin — the interpreter, the standard library, the wheel and its
// dependencies — so after the first visit there is no network in the path at all, and no ledger
// ever leaves the tab.

import dumpPySource from '../python/dump.py?raw';
import {
  BOOTSTRAP,
  DUMP_PY_IN_WASM,
  dumpArgv,
  OUTPUT_IN_WASM,
  runDumpCode,
  type RuntimeInfo,
} from './dumpProgram.ts';
import { isDumpDocument, type DumpDocument } from './schema.ts';

/**
 * The manifest `scripts/assets.ts` writes: the one runtime URL that never moves.
 *
 * The distribution itself lives under a version-named directory, so that an upgrade changes every
 * asset's URL and no cache can serve last release's interpreter to this release's bundle. Which
 * directory that is has to be discovered, and this is where.
 */
const MANIFEST_URL = `${import.meta.env.BASE_URL}pyodide/manifest.json`;

interface Manifest {
  version: string;
  /** Path of the current distribution, relative to the app: `pyodide/<version>/`. */
  base: string;
  files: string[];
}

async function manifest(): Promise<Manifest> {
  const response = await fetch(MANIFEST_URL);
  if (!response.ok) {
    throw new Error(`cannot read ${MANIFEST_URL} (HTTP ${response.status})`);
  }
  return (await response.json()) as Manifest;
}

/**
 * Load the interpreter fresh, bypassing the per-page cache.
 *
 * The site wants one interpreter; a test wants one per case, and wants to say where the assets
 * live. Everything real goes through `beancount()` below.
 */
export { load as loadBeancount };

/** The directory the ledger and its includes are written to inside the WASM filesystem. */
const LEDGER_DIR = '/ledger';

export interface LedgerFile {
  /** Path relative to the ledger directory; may contain `/` for an included subdirectory. */
  name: string;
  content: string;
}

export interface DumpRequest {
  files: LedgerFile[];
  /** Which of `files` is the top-level ledger. Defaults to the first. */
  entry?: string;
  /** Pretty-print with this indent. Omitted means the compact single-line form. */
  indent?: number;
}

export interface DumpResult {
  /** The document as text, which is what a caller across the boundary should be handed. */
  json: string;
  document: DumpDocument;
  millis: number;
  stdout: string;
  stderr: string;
}

export interface LoadOptions {
  onStatus?: (message: string) => void;
  /**
   * Where the pyodide distribution is served from. Defaults to whatever the manifest names.
   *
   * Overridable so a Node run can point at the assembled directory and exercise this exact code
   * path — the browser's answers are only worth anything if something checks them.
   */
  pyodideBase?: string;
}

export interface Beancount {
  readonly info: RuntimeInfo;
  dump(request: DumpRequest): Promise<DumpResult>;
}

let pending: Promise<Beancount> | undefined;

/** Load the interpreter, at most once per page. */
export function beancount(options: LoadOptions = {}): Promise<Beancount> {
  pending ??= load(options).catch((error: unknown) => {
    // A failed load must not poison the page forever — a reload of the wheel may well succeed
    // where the first attempt hit a half-populated cache.
    pending = undefined;
    throw error;
  });
  return pending;
}

async function load({ onStatus, pyodideBase }: LoadOptions): Promise<Beancount> {
  onStatus?.('Loading Python…');

  const base = pyodideBase ?? `${import.meta.env.BASE_URL}${(await manifest()).base}`;

  // Both imports are dynamic: together they are most of this app's bytes, and a page that only
  // ever shows the explanation should not pay for them.
  const { loadPyodide } = await import('pyodide');
  const stdout: string[] = [];
  const stderr: string[] = [];

  const pyodide = await loadPyodide({
    indexURL: base,
    stdout: (line) => stdout.push(line),
    stderr: (line) => stderr.push(line),
  });

  onStatus?.('Installing beancount…');
  await installWheel(pyodide, onStatus);

  const info: RuntimeInfo = {
    ...(JSON.parse(await pyodide.runPythonAsync(BOOTSTRAP)) as Omit<RuntimeInfo, 'pyodide'>),
    pyodide: pyodide.version,
  };

  pyodide.FS.writeFile(DUMP_PY_IN_WASM, dumpPySource);
  onStatus?.(`beancount ${info.beancount} ready`);

  let written: string[] = [];

  return {
    info,

    async dump(request) {
      const files = request.files.filter((file) => file.name);
      if (files.length === 0) throw new Error('no ledger given');
      const entry = request.entry ?? files[0].name;
      if (!files.some((file) => file.name === entry)) {
        throw new Error(`entry file ${entry} is not among the files given`);
      }

      // Clear the previous ledger first: a stale include left behind would be picked up by the
      // next conversion and silently change its numbers.
      for (const path of written) {
        if (pyodide.FS.analyzePath(path).exists) pyodide.FS.unlink(path);
      }
      written = [];

      mkdirp(pyodide, LEDGER_DIR);
      for (const file of files) {
        const path = `${LEDGER_DIR}/${normalize(file.name)}`;
        mkdirp(pyodide, path.slice(0, path.lastIndexOf('/')));
        pyodide.FS.writeFile(path, file.content);
        written.push(path);
      }

      stdout.length = 0;
      stderr.length = 0;

      const started = performance.now();
      await pyodide.runPythonAsync(
        runDumpCode(dumpArgv(`${LEDGER_DIR}/${normalize(entry)}`, request.indent)),
      );
      const millis = performance.now() - started;

      const json = pyodide.FS.readFile(OUTPUT_IN_WASM, { encoding: 'utf8' }) as unknown as string;
      pyodide.FS.unlink(OUTPUT_IN_WASM);

      const document: unknown = JSON.parse(json);
      if (!isDumpDocument(document)) throw new Error('dump.py produced an unrecognised document');

      return { json, document, millis, stdout: stdout.join('\n'), stderr: stderr.join('\n') };
    },
  };
}

const WHEEL_DIR = '/tmp/wheel';

/**
 * Put the beancount wheel into the interpreter.
 *
 * `beancount-wasm` ships an `installBeancount` that does this, but reaching it pulls *both* of its
 * wheels into the build — the v2 one is a further megabyte that this app never loads. Importing
 * the v3 wheel directly and handing it to micropip is the same three steps without the dead
 * weight, and it puts the provenance of the wheel we distribute in one readable place.
 *
 * The bytes are embedded in the JavaScript rather than fetched: the wheel is the whole point of
 * the site, and a CDN in that path would mean the page could run a beancount other than the one it
 * reports. `deps=True` resolves click, regex, six and python-dateutil out of the pyodide
 * distribution served beside us — also this origin, also offline after the first visit.
 */
async function installWheel(
  pyodide: { FS: PyodideFS; loadPackage: (name: string) => Promise<unknown>; runPythonAsync: (code: string) => Promise<unknown> },
  onStatus?: (message: string) => void,
): Promise<void> {
  // FILENAME comes from the same module as the bytes, so the name micropip parses the package and
  // version out of cannot drift from the wheel it is parsing.
  const { FILENAME, getInlineWheelBytes } = await import('beancount-wasm/inline/v3');
  const path = `${WHEEL_DIR}/${FILENAME}`;
  mkdirp(pyodide, WHEEL_DIR);
  pyodide.FS.writeFile(path, getInlineWheelBytes());

  onStatus?.('Resolving dependencies…');
  await pyodide.loadPackage('micropip');
  await pyodide.runPythonAsync(`
import micropip
await micropip.install("emfs:${path}", deps=True)
`);
}

/** Reject absolute paths and `..` — a caller's filenames land in a filesystem. */
function normalize(name: string): string {
  const parts = name.split('/').filter((part) => part && part !== '.');
  if (parts.some((part) => part === '..')) throw new Error(`unsafe file name: ${name}`);
  return parts.join('/');
}

function mkdirp(pyodide: { FS: PyodideFS }, path: string): void {
  let current = '';
  for (const part of path.split('/').filter(Boolean)) {
    current += `/${part}`;
    if (!pyodide.FS.analyzePath(current).exists) pyodide.FS.mkdir(current);
  }
}

interface PyodideFS {
  analyzePath: (path: string) => { exists: boolean };
  mkdir: (path: string) => void;
  writeFile: (path: string, data: string | Uint8Array) => void;
}

/**
 * Fetch every asset the interpreter needs, so a later visit works with no network.
 *
 * The service worker caches whatever passes through it, so simply loading the runtime is enough —
 * this exists to let the page offer that as a deliberate act rather than a side effect.
 */
export async function warmOfflineCache(onStatus?: (message: string) => void): Promise<void> {
  onStatus?.('Downloading interpreter…');

  // Booting the runtime happens to fetch every one of these, but only the ones it needs *today*.
  // Walking the manifest instead means a dependency added later is still cached by this button
  // rather than silently turning the offline promise into a lie.
  const listed = await manifest().catch(() => undefined);

  for (const file of listed?.files ?? []) {
    await fetch(`${import.meta.env.BASE_URL}${listed!.base}${file}`).catch(() => undefined);
  }

  await beancount({ onStatus });
  onStatus?.('Ready to work offline.');
}
