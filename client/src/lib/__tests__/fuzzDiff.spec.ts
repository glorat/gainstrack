// Differential test over a generated corpus: 300 machine-written ledgers, each run through both
// implementations and compared on every artifact the port is responsible for.
//
// This exists because the hand-written fixtures test the language as a person thought to write
// it. They contain what someone chose to demonstrate — and every bug found in this port so far
// lived in a combination nobody had chosen: an adjustment's narration, a reinvestment leg
// inheriting its description, a unit statement that moved no units. The generated corpus is not
// smarter than the fixtures, it is just indifferent, and indifference is what finds those.
//
// Corpus and goldens are both checked in (see dumpFuzzCorpus.spec.ts). Scala is being retired;
// after it goes, these goldens are the last surviving record of what it did, and this file turns
// from a parity test into a regression test without any change.
//
// Regenerating:
//   pnpm run fixtures:fuzz
//   sbt -DdumpFixtures=1 "core/testOnly com.gainstrack.core.test.DumpFuzzGoldens"

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { GainstrackParser } from 'src/lib/GainstrackParser';
import { buildCommands } from 'src/lib/gen/commands';
import { buildAccountState } from 'src/lib/gen/accountState';
import { GBalanceState } from 'src/lib/gen/balanceState';
import { buildBeancountCommands } from 'src/lib/gen/transactionState';
import { generate, GeneratedState } from 'src/lib/gen/GainstrackGenerator';
import { toGainstrackFile } from 'src/lib/export/gainstrackExport';
import { beancountSections } from 'src/lib/export/beancountExport';
import { stripScale } from 'src/lib/__tests__/scale';

const DIR = path.join(__dirname, 'fixtures', 'fuzz');
const GOLDEN = path.join(DIR, 'fuzz.expected.json.gz');

interface Golden {
  id: string;
  parse: 'ok' | 'error' | 'crash';
  generate?: 'ok' | 'error';
  commands?: unknown[];
  txsFull?: { id: number; postDate: string; description: string; postings: unknown[] }[];
  accounts?: { accountId: string }[];
  txs?: unknown[];
  balances?: Record<string, unknown>;
  priceState?: { ccys: string[]; prices: Record<string, unknown> };
  assetState?: { asset: string }[];
  fxMapper?: Record<string, string>;
  proxyMapper?: Record<string, string>;
  ccys?: string[];
  baseCcy?: string;
  tradeFx?: { baseCcy: string; data: Record<string, unknown> };
  beancount?: { accounts: string[]; commands: string[] };
  export?: string;
}

/**
 * Shared normalization. Numbers compare by value (Scala carries 34 significant digits, JS 17),
 * rendered numbers inside strings lose trailing-zero scale, and absent-vs-null is not a
 * difference worth a failing test. Nothing structural is touched.
 */
function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined || v === null) continue;
      // `comments` is the source comment text carried for round-tripping, not part of the
      // command's meaning — excluded here as it is in GainstrackParserDiff.spec.ts.
      if (k === 'comments') continue;
      const nv = normalize(v);
      // Absent and empty-but-present are the same statement; Scala emits `[]` where the TS DTO
      // simply omits the key. A genuinely different array still differs after this.
      if (Array.isArray(nv) && nv.length === 0) continue;
      out[k] = nv;
    }
    return out;
  }
  if (typeof value === 'number') return Math.round(value * 1e6) / 1e6;
  if (typeof value === 'string') return stripScale(value);
  return value;
}

const sortKeys = <T,>(o: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.keys(o).sort().map(k => [k, o[k]]));

/** Key-order-independent identity, for comparing an object against a set of candidates. */
const canon = (v: unknown): string =>
  JSON.stringify(v, (_k, val) =>
    (val && typeof val === 'object' && !Array.isArray(val) ? sortKeys(val as Record<string, unknown>) : val));

const keyBy = <T,>(xs: T[], k: (x: T) => string): Record<string, T> =>
  Object.fromEntries(xs.map(x => [k(x), x]));

interface TsResult {
  parse: 'ok' | 'error' | 'crash';
  generate?: 'ok' | 'error';
  commands?: unknown[];
  state?: GeneratedState;
  txsFull?: { id: number; postDate: string; description: string; postings: unknown[] }[];
  beancount?: { accounts: string[]; commands: string[] };
  export?: string;
}

function runTs(text: string): TsResult {
  const parser = new GainstrackParser();
  try {
    parser.parseString(text);
  } catch {
    return { parse: parser.parserErrors.length > 0 ? 'error' : 'crash' };
  }
  const commands = parser.getCommands();
  try {
    const typed = parser.getTypedCommands();
    const built = buildCommands(typed);
    const acct = buildAccountState(built);
    const balanceState = GBalanceState.build(built, acct);
    const txsFull = buildBeancountCommands(built, acct, balanceState)
      .filter(c => c.kind === 'tx')
      .map(c => {
        const tx = (c as { tx: { id: number; postDate: string; description: string; postings: { toDTO(): unknown }[] } }).tx;
        return { id: tx.id, postDate: tx.postDate, description: tx.description, postings: tx.postings.map(p => p.toDTO()) };
      });
    return {
      parse: 'ok', generate: 'ok', commands,
      state: generate(text),
      txsFull,
      beancount: beancountSections(built),
      export: toGainstrackFile(typed),
    };
  } catch {
    return { parse: 'ok', generate: 'error', commands };
  }
}

function readGoldens(): Golden[] {
  if (!fs.existsSync(GOLDEN)) return [];
  return JSON.parse(zlib.gunzipSync(fs.readFileSync(GOLDEN)).toString('utf8'));
}

const goldens = readGoldens();

if (goldens.length === 0) {
  describe('generated-corpus differential', () => {
    test.skip('no goldens — see the header of this file for how to regenerate', () => undefined);
  });
}

describe('generated-corpus differential (TS == Scala)', () => {
  test('corpus and goldens line up', () => {
    const onDisk = fs.readdirSync(DIR).filter(f => f.endsWith('.gainstrack'))
      .map(f => f.replace(/\.gainstrack$/, '')).sort();
    expect(onDisk).toEqual(goldens.map(g => g.id).sort());
  });

  // A summary rather than a silent pass: a corpus that has drifted to all-errors would still
  // "pass" every comparison below while testing almost nothing, and that should be visible.
  test('the corpus still exercises the success path', () => {
    const parsed = goldens.filter(g => g.parse === 'ok').length;
    const generated = goldens.filter(g => g.generate === 'ok').length;
    console.info(`corpus: ${goldens.length} ledgers, ${parsed} parse, ${generated} generate`);
    expect(generated).toBeGreaterThan(goldens.length / 2);
    expect(goldens.filter(g => g.parse !== 'ok').length).toBeGreaterThan(10);
  });

  for (const g of goldens) {
    describe(g.id, () => {
      const text = fs.readFileSync(path.join(DIR, `${g.id}.gainstrack`), 'utf8');
      const ts = runTs(text);

      test('parse outcome', () => {
        if (g.parse === 'crash') {
          // Scala throws something it never collected as a parser error. The TS port handles
          // these more gracefully; require only that it also rejects, never silently accepts.
          expect(ts.parse === 'error' || ts.parse === 'crash').toBe(true);
        } else {
          expect(ts.parse).toBe(g.parse);
        }
      });

      if (g.parse !== 'ok') return;

      test('commands', () => {
        expect(normalize(ts.commands)).toEqual(normalize(g.commands));
      });

      test('generate outcome', () => {
        expect(ts.generate).toBe(g.generate);
      });

      if (g.generate !== 'ok') return;

      test('transactions (with descriptions)', () => {
        expect(normalize(ts.txsFull)).toEqual(normalize(g.txsFull));
      });

      test('accounts', () => {
        // Scala holds accounts in a `Set[AccountCreation]` whose equality covers the OPTIONS as
        // well as the id, so the same account created twice by two paths with different options
        // lands in the set TWICE. 63 of the 217 generating ledgers in this corpus do exactly
        // that. Scala then resolves it with `accounts.map(a => a.accountId -> a).toMap`, which
        // keeps whichever the JVM's hash order happens to put last — i.e. Scala has no defined
        // answer here, and duplicates leak into `allState.accounts` for the UI to render twice.
        //
        // The TS port keys by account id and takes first-write-wins, so it cannot duplicate. That
        // is a deliberate improvement, not a divergence to fix, and reproducing Scala's answer
        // would mean reproducing JVM hash order. What IS required is that the TS entry is one of
        // the variants Scala produced — not some third thing.
        const tsAccounts = ts.state!.accounts;
        expect(new Set(tsAccounts.map(a => a.accountId)).size).toBe(tsAccounts.length);

        const variants = new Map<string, string[]>();
        for (const a of g.accounts!) {
          const list = variants.get(a.accountId) ?? [];
          list.push(canon(normalize(a)));
          variants.set(a.accountId, list);
        }
        expect([...new Set(tsAccounts.map(a => a.accountId))].sort()).toEqual([...variants.keys()].sort());

        for (const a of tsAccounts) {
          const mine = canon(normalize(a));
          const options = variants.get(a.accountId)!;
          // Exact equality when Scala was unambiguous; membership when it was not.
          expect({ id: a.accountId, matches: options.includes(mine) })
            .toEqual({ id: a.accountId, matches: true });
        }
      });

      test('balances', () => {
        expect(normalize(sortKeys(ts.state!.balances))).toEqual(normalize(sortKeys(g.balances!)));
      });

      test('priceState', () => {
        expect([...ts.state!.priceState.ccys].sort()).toEqual([...g.priceState!.ccys].sort());
        expect(normalize(sortKeys(ts.state!.priceState.prices)))
          .toEqual(normalize(sortKeys(g.priceState!.prices)));
      });

      test('assetState', () => {
        expect(normalize(keyBy(ts.state!.assetState as unknown as { asset: string }[], a => String(a.asset))))
          .toEqual(normalize(keyBy(g.assetState!, a => String(a.asset))));
      });

      test('fx mappers, ccys and baseCcy', () => {
        expect(normalize(sortKeys(ts.state!.fxMapper))).toEqual(normalize(sortKeys(g.fxMapper!)));
        expect(normalize(sortKeys(ts.state!.proxyMapper))).toEqual(normalize(sortKeys(g.proxyMapper!)));
        expect([...ts.state!.ccys].sort()).toEqual([...g.ccys!].sort());
        expect(ts.state!.baseCcy).toBe(g.baseCcy);
      });

      test('tradeFx', () => {
        expect(normalize(sortKeys(ts.state!.tradeFx.data)))
          .toEqual(normalize(sortKeys(g.tradeFx!.data as Record<string, unknown>)));
      });

      test('beancount export', () => {
        // Account directives compare as a SET, for two reasons. Scala's `accounts` is an
        // unordered `Set`, so its sequence is JVM hash order. And because that set can hold the
        // same account twice (see the `accounts` test above), Scala emits duplicate `open`
        // directives — which beancount rejects outright, so reproducing them would mean
        // producing a file bean-check refuses to load. Emitting each account once is required,
        // not optional, and is asserted directly below.
        const unique = (xs: string[]) => [...new Set(xs)].sort();
        expect(unique(ts.beancount!.accounts)).toEqual(unique(g.beancount!.accounts));
        expect(ts.beancount!.accounts.length).toBe(new Set(ts.beancount!.accounts).size);

        // The command stream is an ordered sequence and must match exactly.
        expect(ts.beancount!.commands.map(stripScale)).toEqual(g.beancount!.commands.map(stripScale));
      });

      test('gainstrack export', () => {
        // Byte-exact apart from scale: this is what the download button produces, and users
        // re-import it.
        expect(stripScale(ts.export!)).toBe(stripScale(g.export!));
      });
    });
  }
});
