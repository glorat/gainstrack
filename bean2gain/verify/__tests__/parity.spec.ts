// GPL-2.0-only — see ../../LICENSE and ../README.md.
//
// Two questions, in order of how much they cost to answer:
//
//   1. does `dump.py` run at all under WASM (no python needed — this is the half that always runs)
//   2. does it produce byte-identical output to a native CPython beancount (needs a python, skips
//      cleanly without one, per the repo's convention for oracle-backed specs)

import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { diff, formatDifference, normalize } from '../diff.ts';
import { defaultPythonCandidates, findNativePython, nativeInfo } from '../native.ts';
import { compareLedger } from '../parity.ts';
import { createDumpRuntime, MOUNT } from '../runtime.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, 'fixtures');

interface Ledger {
  name: string;
  path: string;
  /** Mounted directory; wider than the ledger's own when it includes files from elsewhere. */
  root?: string;
}

/**
 * Checked-in fixtures, plus anything generated or dropped in locally.
 *
 * Read at collection time, but only ever through `existsSync`/`readdirSync` on directories we
 * control — a missing directory yields no cases rather than throwing, which would take the whole
 * file down with it before a single test ran.
 */
function ledgers(): Ledger[] {
  const found: Ledger[] = [
    { name: 'simple', path: join(FIXTURES, 'simple.beancount') },
    { name: 'booking', path: join(FIXTURES, 'booking.beancount') },
    { name: 'kitchen-sink', path: join(FIXTURES, 'kitchen-sink', 'main.beancount') },
  ];

  for (const directory of ['generated', 'local']) {
    const at = join(FIXTURES, directory);
    if (!existsSync(at)) continue;
    for (const entry of readdirSync(at)) {
      if (!entry.endsWith('.beancount') && !entry.endsWith('.bean')) continue;
      found.push({ name: `${directory}/${entry}`, path: join(at, entry) });
    }
  }

  return found;
}

const CORPUS = ledgers();

// One interpreter for the file: booting Pyodide and installing the wheel costs a couple of seconds
// and tens of megabytes, and every test below wants the same one. Awaited at module scope so the
// skip decisions further down can be made from what it reports.
const runtime = await createDumpRuntime();
afterAll(() => runtime.destroy());

const python = await findNativePython(defaultPythonCandidates());
const nativeVersion = python ? (await nativeInfo(python)).beancount : undefined;

// A python holding a *different* beancount would produce a wall of differences that say nothing
// about the runtime. That is a misconfigured machine, not a regression, so it skips the way an
// absent python does — loudly, because a silent skip here reads as a pass.
const comparable = nativeVersion !== undefined && nativeVersion === runtime.info.beancount;

describe('normalize', () => {
  it('collapses every mention of either run’s ledger directory', () => {
    const native = {
      source: '/home/u/ledgers/main.beancount',
      entries: [{ location: { file: '/home/u/ledgers/inc/prices.beancount' } }],
      errors: [{ message: 'bad thing in /home/u/ledgers/main.beancount' }],
    };
    const wasm = {
      source: '/ledger/main.beancount',
      entries: [{ location: { file: '/ledger/inc/prices.beancount' } }],
      errors: [{ message: 'bad thing in /ledger/main.beancount' }],
    };
    const roots = ['/home/u/ledgers', '/ledger'];

    expect(diff(normalize(native, { roots }), normalize(wasm, { roots }))).toEqual([]);
  });

  it('does not paper over a difference that is not a path', () => {
    const roots = ['/ledger'];
    const differences = diff(
      normalize({ n: '1.005' }, { roots }),
      normalize({ n: '1.0050000001' }, { roots }),
    );
    expect(differences).toEqual([
      { path: 'n', kind: 'value', left: '1.005', right: '1.0050000001' },
    ]);
  });
});

describe('diff', () => {
  it('reports every disagreement, not just the first', () => {
    const differences = diff({ a: 1, b: 2, c: [1, 2] }, { a: 9, b: 8, c: [1, 3] });
    expect(differences.map((d) => d.path).sort()).toEqual(['a', 'b', 'c[1]']);
  });

  it('distinguishes a missing key from a differing one', () => {
    expect(
      diff({ a: 1 }, { b: 1 })
        .map((d) => d.kind)
        .sort(),
    ).toEqual(['extra', 'missing']);
  });

  it('reports a length mismatch and still compares the overlap', () => {
    const differences = diff([1, 2, 3], [1, 9]);
    expect(differences).toContainEqual({ path: '', kind: 'length', left: 3, right: 2 });
    expect(differences).toContainEqual({ path: '[1]', kind: 'value', left: 2, right: 9 });
  });
});

describe('dump.py under pyodide', () => {
  it('loads a beancount 3 wheel into a WASM interpreter', () => {
    expect(runtime.info.beancount).toMatch(/^3\./);
    expect(runtime.info.platform).toBe('emscripten');
  });

  it.each(CORPUS)('dumps $name', async ({ path, root }) => {
    const { json } = await runtime.dump(path, { root });
    const document = JSON.parse(json) as { schema: number; entries: unknown[] };
    expect(document.schema).toBe(1);
    expect(document.entries.length).toBeGreaterThan(0);
  });

  it('resolves include directives through the mounted filesystem', async () => {
    const { json } = await runtime.dump(join(FIXTURES, 'kitchen-sink', 'main.beancount'));
    const document = JSON.parse(json) as { entries: { location: { file: string } }[] };
    const files = new Set(document.entries.map((entry) => entry.location.file));
    expect([...files].some((file) => file.endsWith('prices.beancount'))).toBe(true);
  });

  it('reports a failing balance assertion instead of raising', async () => {
    const { json } = await runtime.dump(join(FIXTURES, 'kitchen-sink', 'main.beancount'));
    const document = JSON.parse(json) as { errors: { message: string }[] };
    expect(document.errors.some((error) => error.message.includes('Balance failed'))).toBe(true);
  });
});

describe.skipIf(!comparable)('parity with native CPython beancount', () => {
  it.each(CORPUS)('$name is byte-identical', async ({ path, root }) => {
    const result = await compareLedger(runtime, python!, path, { root });

    // Print the actual disagreements: an object diff of a megabyte of JSON is unreadable, and the
    // useful question on a failure is which fields moved, not which documents differ.
    const report = result.differences
      .slice(0, 20)
      .map((difference) => formatDifference(difference, ['native', 'wasm']))
      .join('\n');
    expect(report, `${result.differences.length} differences`).toBe('');
    expect(result.native.entries).toBe(result.wasm.entries);

    // The control on the control: equal documents are only interesting if the two really came from
    // different places. They record the path they were loaded from, and those cannot coincide.
    expect(result.wasm.source.startsWith(MOUNT)).toBe(true);
    expect(result.native.source).not.toBe(result.wasm.source);
  });
});

if (!comparable) {
  process.stderr.write(
    `\n${
      python
        ? `parity comparison skipped: ${python} has beancount ${nativeVersion}, ` +
          `the wheel is ${runtime.info.beancount}`
        : ['no python with beancount — parity comparison skipped. Tried:', ...defaultPythonCandidates().map((c) => `  ${resolve(c)}`)].join('\n')
    }\n`,
  );
}
