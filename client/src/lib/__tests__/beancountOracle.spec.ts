// Beancount as an INDEPENDENT oracle.
//
// Every other test in this directory compares the TS port against Scala. That proves the port
// reproduces Scala — including any bug Scala has, and there are some (see the duplicate-account
// note in fuzzDiff.spec.ts). It also has a shelf life: Scala is being decommissioned.
//
// Beancount is a mature, independently written double-entry engine that has never seen this
// codebase. Running our export through it checks things no parity test can:
//   - every generated transaction actually balances to zero;
//   - no account is posted to before it is opened;
//   - the `balance` assertions our export emits (from the user's own `bal`/`adj` commands) are
//     satisfied by the postings we generated for them.
//
// On top of that, this file appends a balance assertion for EVERY account, taken from
// `AllState.balances`. That matters because `balances` and `txs` are produced by two SEPARATE
// passes over the commands — BalanceState folds them into per-account series, TransactionState
// folds them into postings. Nothing else checks the two against each other end to end, and a
// disagreement is exactly the class of bug that shows correct-looking reports built on postings
// that do not add up. Beancount does the reconciliation, so the check does not depend on the
// arithmetic being tested.
//
// Requires the beancount CLI. Set BEAN_CHECK to its path, or have `bean-check` on PATH:
//   python3 -m venv .venv && .venv/bin/pip install beancount
//   BEAN_CHECK=.venv/bin/bean-check pnpm run test:unit -- beancountOracle

import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generate } from 'src/lib/gen/GainstrackGenerator';
import { toBeancountFile } from 'src/lib/export/beancountExport';
import { FIXTURE_NAMES } from 'src/lib/__tests__/fixtureNames';

const FIXTURES = path.join(__dirname, 'fixtures');

function findBeanCheck(): string | undefined {
  const configured = process.env.BEAN_CHECK;
  if (configured && fs.existsSync(configured)) return configured;
  const found = spawnSync('which', ['bean-check'], { encoding: 'utf8' });
  const p = found.stdout?.trim();
  return p && fs.existsSync(p) ? p : undefined;
}

const BEAN_CHECK = findBeanCheck();

/** How many generated ledgers to include. bean-check costs ~0.3s each, so this is bounded. */
const FUZZ_SAMPLE = 60;

/**
 * Whether a ledger is expressible in beancount at all.
 *
 * `open Assets:Bank GBP` in beancount CONSTRAINS the account to GBP; gainstrack has no such
 * rule, so `tfr Assets:EurAccount Assets:GbpAccount 100 EUR` posts EUR into a GBP account, which
 * beancount rejects as "Invalid currency". That is a limitation of the format mapping, identical
 * in Scala's export (the fuzz differential proves the two produce the same command stream), not
 * a defect in the port — so such ledgers are excluded rather than asserted and skipped silently.
 */
function beancountExpressible(state: ReturnType<typeof generate>): boolean {
  const declared = new Map(state.accounts.map(a => [a.accountId, a.ccy]));
  return state.txs.every(tx => tx.postings.every(p =>
    !p.value || declared.get(p.account) === undefined || declared.get(p.account) === p.value.ccy));
}

/**
 * Append a `balance` assertion per LEAF account, taken from the BalanceState series.
 *
 * Leaves only, because beancount's `balance` directive is inclusive of sub-accounts while
 * `AllState.balances` holds a per-account figure. Asserting a parent would compare a subtree
 * total against a single account's balance and fail for a reason that is not a bug. Every parent
 * is still covered transitively — its children are all asserted.
 *
 * Also restricted to accounts whose postings only ever used ONE currency: `BalanceState` keeps a
 * single running number per account (faithfully — Scala does the same), so for a mixed-currency
 * account that number sums unlike things and no single assertion can describe it.
 */
function withCrossPassAssertions(text: string): { file: string; asserted: number } {
  const state = generate(text);
  const beancount = toBeancountFile(text);

  const ccysByAccount = new Map<string, Set<string>>();
  let lastDate = '1900-01-01';
  for (const tx of state.txs) {
    if (tx.postDate > lastDate) lastDate = tx.postDate;
    for (const p of tx.postings) {
      if (!p.value) continue;
      const set = ccysByAccount.get(p.account) ?? new Set<string>();
      set.add(p.value.ccy);
      ccysByAccount.set(p.account, set);
    }
  }

  // Assert the morning after the last activity, so every transaction is included.
  const d = new Date(`${lastDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  const assertDate = d.toISOString().slice(0, 10);

  const ids = Object.keys(state.balances);
  const isLeaf = (id: string) => !ids.some(other => other.startsWith(`${id}:`));

  const lines: string[] = [];
  for (const [accountId, series] of Object.entries(state.balances)) {
    if (accountId === '' || !series.ccy || !isLeaf(accountId)) continue;
    const used = ccysByAccount.get(accountId);
    if (used && (used.size > 1 || !used.has(series.ccy))) continue;
    const points = Object.entries(series.series).sort(([a], [b]) => a.localeCompare(b));
    const value = points.length ? points[points.length - 1][1] : 0;
    // 4dp gives beancount a tolerance of 0.00005, which absorbs the decimal.js/BigDecimal
    // representation difference without absorbing a real discrepancy.
    lines.push(`${assertDate} balance ${accountId} ${value.toFixed(4)} ${series.ccy}`);
  }

  return { file: `${beancount}\n${lines.join('\n')}\n`, asserted: lines.length };
}

function beanCheck(content: string, label: string): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gainstrack-bean-'));
  const file = path.join(dir, `${label}.beancount`);
  try {
    fs.writeFileSync(file, content, 'utf8');
    // bean-check prints diagnostics and exits non-zero; execFileSync throws, and the message is
    // what we want to see, so surface stdout rather than the exit status.
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

const ledgers: { label: string; path: string }[] = [
  ...FIXTURE_NAMES.map(n => ({ label: n, path: path.join(FIXTURES, `${n}.gainstrack`) })),
  { label: 'glorat', path: path.join(FIXTURES, 'local', 'glorat.gainstrack') },
  ...Array.from({ length: FUZZ_SAMPLE }, (_, i) => {
    const id = `valid-${String(i + 1).padStart(4, '0')}`;
    return { label: id, path: path.join(FIXTURES, 'fuzz', `${id}.gainstrack`) };
  }),
].filter(l => fs.existsSync(l.path));

const checked = ledgers
  .map(l => ({ ...l, text: fs.readFileSync(l.path, 'utf8') }))
  .map(l => ({ ...l, expressible: beancountExpressible(generate(l.text)) }));

describe.runIf(BEAN_CHECK !== undefined)('beancount accepts what we generate', () => {
  test('enough of the corpus is expressible to be worth running', () => {
    // Stated out loud rather than left implicit: a change that made everything inexpressible
    // would turn this whole file into a no-op that still reports green.
    const skipped = checked.filter(l => !l.expressible).map(l => l.label);
    console.info(`bean-check: ${checked.length - skipped.length} of ${checked.length} ledgers expressible` +
      (skipped.length ? `; skipped (currency not representable in beancount): ${skipped.join(', ')}` : ''));
    expect(checked.filter(l => l.expressible).length).toBeGreaterThanOrEqual(FIXTURE_NAMES.length);
  });

  for (const { label, text, expressible } of checked) {
    const it = expressible ? test : test.skip;

    it(`${label}: the export loads cleanly`, () => {
      // Transactions balance, accounts are opened before use, and our own bal/adj assertions
      // hold against the postings we produced for them.
      beanCheck(toBeancountFile(text), label);
    });

    it(`${label}: BalanceState agrees with the postings`, () => {
      const { file: content, asserted } = withCrossPassAssertions(text);
      expect(asserted).toBeGreaterThan(0);
      beanCheck(content, label);
    });
  }
});

describe.runIf(BEAN_CHECK === undefined)('beancount oracle', () => {
  test.skip('bean-check not found — see the header of this file to enable', () => undefined);
});
