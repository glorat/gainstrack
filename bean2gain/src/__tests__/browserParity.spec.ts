// GPL-2.0-only — see ../../LICENSE.
//
// The site's own code path, checked against a native CPython beancount.
//
// `verify/` compares `dump.py` under Node-Pyodide against native. This is the same comparison one
// layer up: it drives `src/beancount.ts` — the module the browser loads — against the interpreter
// and wheels that `pnpm run assets` assembled into `public/pyodide/`, and holds its answers to the
// oracle. Without it, "the browser gives the same numbers" would be an inference across a step
// nothing tested.
//
// What it does *not* do is fetch those assets over HTTP: Pyodide under Node resolves `indexURL`
// with `path.join`, which mangles a URL, so the only way to point it at a server is to be a
// browser. Serving them is therefore checked by hand (`pnpm run dev`), and what is checked here is
// everything else — that the assembled directory is complete, and that the answers match.
//
// Skips cleanly with no python, per the repo's convention for oracle-backed specs.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { FILENAME } from 'beancount-wasm/inline/v3';
import { loadBeancount, type Beancount } from '../beancount.ts';
import { diff, formatDifference, normalize } from '../../verify/diff.ts';
import {
  defaultPythonCandidates,
  findNativePython,
  nativeDump,
  nativeInfo,
} from '../../verify/native.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, '..', '..');
const PUBLIC = join(PROJECT, 'public');
const MANIFEST = join(PUBLIC, 'pyodide', 'manifest.json');
const FIXTURES = join(PROJECT, 'verify', '__tests__', 'fixtures');

/**
 * The assembled distribution, located the way the browser locates it.
 *
 * The interpreter lives under a version-named directory so that an upgrade cannot be served from a
 * stale cache; `manifest.json` is what names it. Reading it here rather than hard-coding the layout
 * means this spec breaks if the build and the app ever disagree about where the runtime is.
 */
function assembled(): { base: string; version: string } | undefined {
  if (!existsSync(MANIFEST)) return undefined;
  const { version, base } = JSON.parse(readFileSync(MANIFEST, 'utf8')) as {
    version: string;
    base: string;
  };
  const dir = join(PUBLIC, base);
  return existsSync(join(dir, 'pyodide.asm.wasm')) ? { base: `${dir}/`, version } : undefined;
}

const ASSETS = assembled();

interface Case {
  name: string;
  /** Paths under `verify/__tests__/fixtures`, the first being the top-level ledger. */
  files: string[];
}

const LEDGERS: Case[] = [
  { name: 'simple', files: ['simple.beancount'] },
  { name: 'booking', files: ['booking.beancount'] },
  { name: 'kitchen-sink', files: ['kitchen-sink/main.beancount', 'kitchen-sink/prices.beancount'] },
];

// Built by `pnpm run assets`, which `test:unit` runs first — so this should only be false if
// someone invoked vitest directly. Saying so beats timing out somewhere inside Pyodide.
const assetsReady = ASSETS !== undefined;

const python = await findNativePython(defaultPythonCandidates());
const nativeVersion = python ? (await nativeInfo(python)).beancount : undefined;

// The version in the wheel's own file name, read without booting an interpreter. A python holding
// a *different* beancount says nothing about the browser — that is a misconfigured machine, and
// skipping loudly beats a wall of meaningless differences.
const wheelVersion = FILENAME.split('-')[1];
const comparable = nativeVersion !== undefined && nativeVersion === wheelVersion;

describe.skipIf(!assetsReady)('the browser module', () => {
  let engine: Beancount;

  beforeAll(async () => {
    // The directory the site deploys, nothing else on the path: if `pnpm run assets` left a wheel
    // out, this is where it shows up.
    engine = await loadBeancount({ pyodideBase: ASSETS!.base });
  });

  it('serves the interpreter from a version-named directory', () => {
    // Unversioned paths are how a cache-first service worker strands a visitor on last release's
    // interpreter; `serviceWorker.spec.ts` covers the other half of that.
    expect(ASSETS!.base).toContain(`/${ASSETS!.version}/`);
  });

  it('loads beancount 3 from the assembled distribution', () => {
    expect(engine.info.beancount).toMatch(/^3\./);
    expect(engine.info.platform).toBe('emscripten');
    // The wheel's file name is what micropip parses the package version out of; if it ever stopped
    // describing the wheel beside it, installs would land under the wrong name.
    expect(engine.info.beancount).toBe(wheelVersion);
  });

  it('converts a pasted ledger', async () => {
    const result = await engine.dump({
      files: [{ name: 'l.beancount', content: '2024-01-01 open Assets:Cash USD\n' }],
    });
    expect(result.document.entries).toHaveLength(1);
    expect(result.document.errors).toHaveLength(0);
  });

  it('resolves includes between the files it was handed', async () => {
    const result = await engine.dump({
      files: [
        { name: 'main.beancount', content: 'include "prices.beancount"\n' },
        { name: 'prices.beancount', content: '2024-01-01 price ACME 10.00 USD\n' },
      ],
      entry: 'main.beancount',
    });
    expect(result.document.entries).toHaveLength(1);
  });

  it('forgets the previous ledger between conversions', async () => {
    await engine.dump({
      files: [
        { name: 'main.beancount', content: 'include "extra.beancount"\n' },
        { name: 'extra.beancount', content: '2024-01-01 price ACME 10.00 USD\n' },
      ],
      entry: 'main.beancount',
    });

    // The include is now dangling. If the first run's file were still in the filesystem this would
    // quietly succeed, and someone's second conversion would carry data out of their first.
    const result = await engine.dump({
      files: [{ name: 'main.beancount', content: 'include "extra.beancount"\n' }],
      entry: 'main.beancount',
    });
    expect(result.document.errors.map((error) => error.message).join(' ')).toMatch(/extra/);
  });

  it('refuses a file name that would escape the ledger directory', async () => {
    await expect(
      engine.dump({ files: [{ name: '../escape.beancount', content: '' }] }),
    ).rejects.toThrow(/unsafe/);
  });

  it('reports a failing balance assertion instead of raising', async () => {
    const result = await engine.dump({
      files: [
        {
          name: 'l.beancount',
          content: '2024-01-01 open Assets:Cash USD\n2024-01-02 balance Assets:Cash 5.00 USD\n',
        },
      ],
    });
    expect(result.document.errors.some((e) => e.message.includes('Balance failed'))).toBe(true);
  });

  describe.skipIf(!comparable)('against native CPython', () => {
    it.each(LEDGERS)('$name is byte-identical', async ({ files }) => {
      const browser = await engine.dump({
        files: files.map((path) => ({
          name: path.split('/').pop()!,
          content: readFileSync(join(FIXTURES, path), 'utf8'),
        })),
        entry: files[0].split('/').pop(),
      });
      const native = await nativeDump(python!, join(FIXTURES, files[0]));

      // Where the ledger was loaded from is the one difference that is not a disagreement.
      // Everything else — resolved lot costs, interpolated amounts, inferred tolerances, the text
      // of loader errors — has to match to the digit.
      const roots = [join(FIXTURES, 'kitchen-sink'), FIXTURES, '/ledger'];
      const differences = diff(
        normalize(JSON.parse(native.json), { roots }),
        normalize(JSON.parse(browser.json), { roots }),
      );

      expect(
        differences
          .slice(0, 20)
          .map((difference) => formatDifference(difference, ['native', 'browser']))
          .join('\n'),
        `${differences.length} differences`,
      ).toBe('');
    });
  });
});

// A skip here is not a neutral outcome: the browser specs are the only thing standing behind the
// claim that the shipped path matches native beancount, so a green run without them says much less
// than it looks like it says. `test:unit` assembles the distribution first, which means reaching
// this state at all is a mistake — and it fails rather than whispers. Set BEAN2GAIN_SKIP_BROWSER=1
// to say you meant it.
describe('the browser specs', () => {
  it('are not silently skipped', () => {
    if (process.env.BEAN2GAIN_SKIP_BROWSER === '1') return;
    expect(
      assetsReady,
      'the pyodide distribution is missing — run `pnpm run assets`, or set BEAN2GAIN_SKIP_BROWSER=1',
    ).toBe(true);
  });
});

if (!assetsReady) {
  process.stderr.write(
    '\nthe pyodide distribution is missing — run `pnpm run assets`; browser specs skipped\n',
  );
} else if (!comparable) {
  process.stderr.write(
    python
      ? `\nbrowser/native comparison skipped: ${python} has beancount ${nativeVersion}, the wheel is ${wheelVersion}\n`
      : '\nno python with beancount — browser/native comparison skipped\n',
  );
}
