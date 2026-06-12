import * as fs from 'fs';
import * as path from 'path';
import { generate } from 'src/lib/gen/GainstrackGenerator';

// Parity of the TS generator (Slice 1: accounts + txs) against the Scala `allState`, dumped
// per resource file by DumpGeneratorDTOs.scala. Accounts compared as an unordered set
// (Scala Set.toSeq order is non-deterministic); txs compared in order with numeric tolerance.

const FIXTURES = path.join(__dirname, '..', '..', '__tests__', 'fixtures');
const RESOURCES = ['basic', 'unit', 'src', 'div', 'balbug', 'james', 'noequity', 'multiadj'];

function readJson(name: string): any {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, name), 'utf8'));
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'description' || k === 'id') continue;
      const nv = normalize(v);
      if (nv === undefined || nv === null) continue;
      out[k] = nv;
    }
    return out;
  }
  if (typeof value === 'number') return Math.round(value * 1e6) / 1e6;
  return value;
}

function byAccountId(accounts: any[]): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  for (const a of accounts) m[a.accountId] = normalize(a);
  return m;
}

describe('GainstrackGenerator parity (TS vs Scala allState)', () => {
  for (const name of RESOURCES) {
    const text = fs.readFileSync(path.join(FIXTURES, `${name}.gainstrack`), 'utf8');

    test(`${name}: accounts`, () => {
      const golden = readJson(`${name}.accounts.json`);
      const actual = generate(text).accounts;
      expect(actual.length).toBe(golden.length);
      // unordered: compare keyed by accountId
      expect(byAccountId(actual)).toEqual(byAccountId(golden));
    });

    test(`${name}: txs`, () => {
      const golden = readJson(`${name}.txs.json`);
      const actual = generate(text).txs;
      expect(actual.length).toBe(golden.length);
      expect(normalize(actual)).toEqual(normalize(golden));
    });

    test(`${name}: balances`, () => {
      const golden = readJson(`${name}.balances.json`);
      const actual = generate(text).balances;
      expect(Object.keys(actual).sort()).toEqual(Object.keys(golden).sort());
      expect(normalize(actual)).toEqual(normalize(golden));
    });

    test(`${name}: priceState`, () => {
      const golden = readJson(`${name}.priceState.json`);
      const actual = generate(text).priceState;
      expect([...actual.ccys].sort()).toEqual([...golden.ccys].sort());
      expect(normalize(actual.prices)).toEqual(normalize(golden.prices));
    });

    test(`${name}: assetState`, () => {
      const golden = readJson(`${name}.assetState.json`);
      const actual = generate(text).assetState;
      expect(byAccountId(actual.map((a: any) => ({ ...a, accountId: a.asset })))).toEqual(
        byAccountId(golden.map((a: any) => ({ ...a, accountId: a.asset }))));
    });

    test(`${name}: fxMapper / proxyMapper / ccys`, () => {
      const out = generate(text);
      expect(out.fxMapper).toEqual(readJson(`${name}.fxMapper.json`));
      expect(out.proxyMapper).toEqual(readJson(`${name}.proxyMapper.json`));
      expect([...out.ccys].sort()).toEqual([...readJson(`${name}.ccys.json`)].sort());
    });

    test(`${name}: tradeFx`, () => {
      const golden = readJson(`${name}.tradeFx.json`);
      const actual = generate(text).tradeFx;
      expect(actual.baseCcy).toBe(golden.baseCcy);
      expect(Object.keys(actual.data).sort()).toEqual(Object.keys(golden.data).sort());
      expect(normalize(actual.data)).toEqual(normalize(golden.data));
    });
  }
});
