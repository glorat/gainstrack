// The import, verified against beancount itself.
//
// A migration tool has exactly one obligation: the numbers must survive. Everything else — how
// many raw txs are left, how pretty the file is — is preference. So this file does not test the
// importer against a golden file the importer's author wrote; it tests it against the engine the
// user is migrating away from, on both ends:
//
//   original.beancount --dump.py--> JSON --importer--> gainstrack --export--> re-export.beancount
//         |                                                                          |
//         +------------------ balances.py, same loader, both sides -------------------+
//
// Three properties, strongest first:
//
//   1. `bean-check` accepts the re-export. That is not a formality: it proves every transaction
//      we produced balances, no account is posted to before it is opened, and every balance
//      assertion carried over from the user's ledger still holds ON ITS ORIGINAL DATE. It is the
//      only check that covers the intermediate dates rather than the end state.
//   2. Per-(account, currency) totals match the original, after folding gainstrack's derived
//      sub-accounts back. This is the "did the money move" check.
//   3. The ledger generates at all — `generateAllStateSafe` reports no errors — so the import
//      cannot produce a file that is only correct in principle.
//
// Every property is asserted twice: once on the LOWERED output and once on the LIFTED output.
// Lifting is a rewrite that must not change meaning, and running both means a failure says which
// half broke rather than just that something did.
//
// Requires two things, both outside this package. A python with beancount:
//   python3 -m venv .venv && .venv/bin/pip install beancount
//   cd tools/beancount-oracle && BEAN_PYTHON=../../bean2gain/.venv/bin/python pnpm run test:unit
//
// ...and `dump.py` / `balances.py`, which live in the GPL-2.0-only bean2gain project because they
// import beancount and nothing on this side of the licence boundary may. That project is expected
// to be extracted into a repository of its own, so this looks for it rather than assuming it:
// `BEAN2GAIN_PYTHON_DIR` points at a checkout elsewhere, and without one the suite skips exactly
// as it does without a python. Losing the oracle is a real loss, but a red suite on a checkout
// that never had the sibling would be worse.

import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { toBeancountFile } from 'src/lib/export/beancountExport';
import { generateAllStateSafe } from 'src/lib/gen/GainstrackGenerator';
// `fold` is the browser import's, deliberately. It decides which differences are expected, and
// two copies of that rule would let the oracle keep passing while the in-app check drifted.
// `Balances` is the shape `balances.py` prints, which is why the same type describes both.
import { Balances, fold, pluggedAmounts } from 'src/lib/import/balances';
import { parseDump } from 'src/lib/import/beancountDump';
import { ImportResult, importBeancount } from 'src/lib/import/beancountImport';
import { lift } from 'src/lib/import/lift';

const SCRIPTS =
  process.env.BEAN2GAIN_PYTHON_DIR ?? path.join(__dirname, '..', '..', '..', 'bean2gain', 'python');
const FIXTURES = path.join(__dirname, 'fixtures');

/** Both scripts, or neither — a half-present sibling would fail one assertion in three. */
const SCRIPTS_PRESENT = ['dump.py', 'balances.py'].every((s) =>
  fs.existsSync(path.join(SCRIPTS, s)),
);

/**
 * A python that can actually import beancount, and the `bean-check` beside it.
 *
 * Same reasoning as `beancountOracle.spec.ts`: a stale install leaves working-looking entry
 * points on PATH that fail on every invocation, and selecting one turns this file red for a
 * reason that has nothing to do with the importer. Probe rather than test for existence.
 */
function findPython(): string | undefined {
  const works = (p: string) =>
    spawnSync(p, ['-c', 'import beancount'], { encoding: 'utf8' }).status === 0;
  const configured = process.env.BEAN_PYTHON;
  if (configured) {
    if (works(configured)) return configured;
    console.warn(`BEAN_PYTHON=${configured} cannot import beancount; skipping the import oracle`);
    return undefined;
  }
  const onPath = spawnSync('which', ['python3'], { encoding: 'utf8' }).stdout?.trim();
  return onPath && works(onPath) ? onPath : undefined;
}

const PYTHON = findPython();

function beanCheckFor(python: string): string | undefined {
  const candidate = process.env.BEAN_CHECK ?? path.join(path.dirname(python), 'bean-check');
  return fs.existsSync(candidate) && spawnSync(candidate, ['--version']).status === 0 ? candidate : undefined;
}

const BEAN_CHECK = PYTHON ? beanCheckFor(PYTHON) : undefined;
const ENABLED = PYTHON !== undefined && BEAN_CHECK !== undefined && SCRIPTS_PRESENT;

function python(script: string, ...args: string[]): string {
  return execFileSync(PYTHON!, [path.join(SCRIPTS, script), ...args], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
}

function balancesOf(file: string): Balances {
  return JSON.parse(python('balances.py', file)) as Balances;
}

function beanCheck(content: string, label: string): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gainstrack-import-'));
  try {
    const file = path.join(dir, `${label}.beancount`);
    fs.writeFileSync(file, content, 'utf8');
    try {
      const out = execFileSync(BEAN_CHECK!, [file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      expect(out.trim()).toBe('');
    } catch (e) {
      const err = e as { stdout?: string; stderr?: string };
      throw new Error(`bean-check rejected ${label}:\n${(err.stdout ?? '') + (err.stderr ?? '')}`, { cause: e });
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Load a gainstrack ledger through the beancount export and read its balances back. */
function balancesOfGainstrack(text: string, label: string): Balances {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gainstrack-import-'));
  try {
    const file = path.join(dir, `${label}.beancount`);
    fs.writeFileSync(file, `${toBeancountFile(text)}\n`, 'utf8');
    return balancesOf(file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const fixtures = fs.existsSync(FIXTURES)
  ? fs.readdirSync(FIXTURES).filter(f => f.endsWith('.beancount')).sort()
  : [];

// A real ledger, if this machine has one. Gitignored, per the private-data convention in
// CLAUDE.md, so a fresh clone simply has one fewer case.
const localDir = path.join(FIXTURES, 'local');
const localFixtures = fs.existsSync(localDir)
  ? fs.readdirSync(localDir).filter(f => f.endsWith('.beancount')).sort().map(f => path.join('local', f))
  : [];

describe.runIf(ENABLED)('beancount import round-trips through beancount', () => {
  for (const fixture of [...fixtures, ...localFixtures]) {
    const label = fixture.replace(/[/\\]/g, '-').replace(/\.beancount$/, '');
    const source = path.join(FIXTURES, fixture);

    // Done once per fixture rather than per assertion: the dump is a subprocess and the point of
    // the two variants is to compare them, not to re-derive them.
    let original: Balances;
    let lowered: ImportResult;
    let lifted: ImportResult;

    beforeAll(() => {
      original = balancesOf(source);
      lowered = importBeancount(parseDump(python('dump.py', source)));
      lifted = lift(lowered);
    });

    test(`${label}: the source loads cleanly, so a failure below is ours`, () => {
      expect(original.errors).toEqual([]);
    });

    for (const stage of ['lowered', 'lifted'] as const) {
      const result = () => (stage === 'lowered' ? lowered : lifted);

      test(`${label} (${stage}): generates with no errors`, () => {
        expect(generateAllStateSafe(result().text).errors).toEqual([]);
      });

      test(`${label} (${stage}): bean-check accepts the re-export`, () => {
        // Covers every balance assertion at its own date, which the totals comparison cannot.
        beanCheck(toBeancountFile(result().text), `${label}-${stage}`);
      });

      test(`${label} (${stage}): every account holds what it held`, () => {
        const { text, report } = result();
        const after = balancesOfGainstrack(text, `${label}-${stage}`);
        expect(after.errors).toEqual([]);
        expect(fold(after.balances, report)).toEqual(fold(original.balances, report));
      });

      test(`${label} (${stage}): nothing was swept into a plug account`, () => {
        // `Equity:Adjustments` absorbs the difference a `bal` could not otherwise explain. On a
        // ledger beancount already accepts that difference is zero, so a non-zero total here
        // means the import mis-stated a balance and quietly balanced its own error.
        const after = balancesOfGainstrack(result().text, `${label}-${stage}`);
        expect(pluggedAmounts(after)).toEqual([]);
      });
    }

    test(`${label}: lifting does not change the balances`, () => {
      // Stated on its own so a regression names the culprit: property 3 above would fail for
      // both stages if lowering were wrong, but only for `lifted` if a lifting rule were.
      const a = balancesOfGainstrack(lowered.text, `${label}-a`);
      const b = balancesOfGainstrack(lifted.text, `${label}-b`);
      expect(fold(b.balances, lifted.report)).toEqual(fold(a.balances, lowered.report));
    });
  }

  test('the corpus is not empty', () => {
    // A guard against this whole file silently becoming a no-op that still reports green.
    expect(fixtures.length).toBeGreaterThan(0);
  });
});

describe.runIf(!ENABLED)('beancount import oracle', () => {
  const reason = !SCRIPTS_PRESENT
    ? `bean2gain's python scripts not found at ${SCRIPTS} — set BEAN2GAIN_PYTHON_DIR`
    : 'python with beancount not found — see the header of this file';
  test.skip(`${reason} to enable`, () => undefined);
});
