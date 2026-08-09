// Metamorphic test: the whole-file export must not change what the ledger MEANS.
//
// The export regroups commands under their main account and sorts those groups by account id,
// so `export(text)` is a genuine reordering of the input — a different, equally valid spelling
// of the same ledger. Generating from it must therefore land on the same state. This is a much
// stronger statement than the round-trip test in gainstrackExport.spec.ts, which only checks
// that no command is lost or mutated: this one exercises the whole multi-pass generator and
// would catch an order-sensitivity anywhere in it.
//
// It also needs no oracle, so unlike the golden tests it keeps working after Scala is gone.
//
// WHAT MAY LEGITIMATELY MOVE: several `AllState` fields are collections whose ORDER is an
// accident of command order rather than part of the meaning — Scala builds them from `Set`s,
// which is why the golden specs already compare them keyed or sorted. Those are canonicalized
// here. Everything else is compared as-is, including every number.
//
// Transactions are compared as a multiset: the export can reorder commands that share a date,
// which legitimately reorders their transactions. Comparing them as a sequence would assert
// something that is not true and not required. Losing, duplicating or altering one still fails.

import * as fs from 'fs';
import * as path from 'path';
import { GainstrackParser } from 'src/lib/GainstrackParser';
import { generate, GeneratedState } from 'src/lib/gen/GainstrackGenerator';
import { toGainstrackFile } from 'src/lib/export/gainstrackExport';
import { FIXTURE_NAMES } from 'src/lib/__tests__/fixtureNames';

const FIXTURES = path.join(__dirname, 'fixtures');

function exportOf(text: string): string {
  const parser = new GainstrackParser();
  parser.parseString(text);
  return toGainstrackFile(parser.getTypedCommands());
}

/** Deterministic key order for plain objects, so a differently-ordered map compares equal. */
function sortKeys<T>(obj: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.keys(obj).sort().map(k => [k, obj[k]]));
}

function canonical(g: GeneratedState) {
  return {
    // Order is Set-iteration order in Scala and command order in TS: not meaningful either way.
    accounts: [...g.accounts].sort((a, b) => a.accountId.localeCompare(b.accountId)),
    assetState: [...g.assetState].sort((a, b) => String(a.asset).localeCompare(String(b.asset))),
    priceState: { ccys: [...g.priceState.ccys].sort(), prices: sortKeys(g.priceState.prices) },
    balances: sortKeys(g.balances),
    tradeFx: { ...g.tradeFx, data: sortKeys(g.tradeFx.data) },
    fxMapper: sortKeys(g.fxMapper),
    proxyMapper: sortKeys(g.proxyMapper),
    ccys: [...g.ccys].sort(),
    baseCcy: g.baseCcy,
    // `originIndex` points into the command list, which the export deliberately reorders, so the
    // index differs while meaning the same command. Everything else about the tx is compared.
    txs: g.txs.map(({ originIndex, ...tx }) => JSON.stringify(tx)).sort(),
  };
}

describe('generate() is invariant under the whole-file export', () => {
  for (const name of FIXTURE_NAMES) {
    test(name, () => {
      const text = fs.readFileSync(path.join(FIXTURES, `${name}.gainstrack`), 'utf8');
      expect(canonical(generate(exportOf(text)))).toEqual(canonical(generate(text)));
    });
  }

  const local = path.join(FIXTURES, 'local', 'glorat.gainstrack');
  (fs.existsSync(local) ? test : test.skip)('private ledger', () => {
    const text = fs.readFileSync(local, 'utf8');
    expect(canonical(generate(exportOf(text)))).toEqual(canonical(generate(text)));
  });
});

describe('the transaction set survives the export exactly', () => {
  // Stated separately from the invariance test above so a regression says WHICH thing broke:
  // a changed count is a lost or duplicated transaction, which is a different bug from a
  // changed value inside one.
  for (const name of FIXTURE_NAMES) {
    test(`${name}: same number of transactions and postings`, () => {
      const text = fs.readFileSync(path.join(FIXTURES, `${name}.gainstrack`), 'utf8');
      const before = generate(text);
      const after = generate(exportOf(text));
      expect(after.txs.length).toBe(before.txs.length);
      const postings = (g: GeneratedState) => g.txs.reduce((n, t) => n + t.postings.length, 0);
      expect(postings(after)).toBe(postings(before));
    });
  }
});
