import * as fs from 'fs';
import * as path from 'path';
import { GainstrackParser } from 'src/lib/GainstrackParser';
import { AccountCommandDTO } from 'src/lib/assetdb/models';

const FIXTURES = path.join(__dirname, 'fixtures');

// Resource files dumped by the Scala harness (DumpParserDTOs) as golden DTOs.
const GOLDENS = ['basic', 'unit', 'src', 'div', 'balbug', 'james', 'noequity', 'multiadj'];

// Normalize a DTO for comparison: drop empty arrays and null/undefined (json4s omits `None`;
// the GlobalCommand emits comments:[]), and round numbers so Scala BigDecimal (34 digits) vs
// JS float (17 digits) match.
//
// `description` IS compared — it is not merely display: PLExplain groups activity rows by it
// (`groupBy(p => allCmds[p.originIndex].description)`), so a drifting template silently merges
// or splits P&L explain rows.
function normalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    const arr = value.map(normalize).filter(v => v !== undefined);
    return arr;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // `comments` only ever leak into the GlobalCommand's serialized options (no other DTO
      // carries them); the TS parser discards comment lines entirely, which is a known gap.
      if (k === 'comments') continue;
      const nv = normalize(v);
      if (nv === undefined || nv === null) continue;
      if (Array.isArray(nv) && nv.length === 0) continue;
      out[k] = nv;
    }
    return out;
  }
  if (typeof value === 'number') return Math.round(value * 1e12) / 1e12;
  return value;
}

function parse(text: string): AccountCommandDTO[] {
  const parser = new GainstrackParser();
  parser.parseString(text);
  return parser.getCommands();
}

describe('GainstrackParser golden parity (vs Scala toDTO)', () => {
  for (const name of GOLDENS) {
    test(`${name}.gainstrack matches Scala-produced commands`, () => {
      const text = fs.readFileSync(path.join(FIXTURES, `${name}.gainstrack`), 'utf8');
      const golden = JSON.parse(fs.readFileSync(path.join(FIXTURES, `${name}.commands.json`), 'utf8'));

      const actual = parse(text);
      expect(actual.length).toBe(golden.length);
      expect(normalize(actual)).toEqual(normalize(golden));
    });
  }
});

describe('GainstrackParser per-command shape', () => {
  test('open with options', () => {
    const [c] = parse('2019-01-01 open Assets:HSBCCN CNY\n  fundingAccount: Assets:Bank\n  multiAsset: true');
    expect(c.accountId).toBe('Assets:HSBCCN');
    expect(c.commandType).toBe('open');
    expect(c.balance).toEqual({ number: 0, ccy: 'CNY' });
    expect(c.options).toMatchObject({ multiAsset: true, fundingAccount: 'Assets:Bank', automaticReinvestment: false });
  });

  // The cash flow tags. TypeScript-only: Scala's `applyOption` rejects both keys, so these are
  // asserted directly rather than through a fixture ledger — there could be no golden for one.
  describe('cash flow options', () => {
    test('cashEquivalent parses as a boolean, both ways', () => {
      const [t] = parse('2019-01-01 open Assets:Bank GBP\n  cashEquivalent: true');
      expect(t.options).toMatchObject({ cashEquivalent: true });
      const [f] = parse('2019-01-01 open Assets:Bank:Escrow GBP\n  cashEquivalent: false');
      expect(f.options).toMatchObject({ cashEquivalent: false });
    });

    test('cashflowClass accepts the three IAS 7 classes plus adjustment', () => {
      // `adjustment` is not an activity: it marks an account whose flows are real movements of cash
      // that belong outside the subtotals, which is how a suspense account is expressed.
      for (const c of ['operating', 'investing', 'financing', 'adjustment']) {
        expect(parse(`2019-01-01 open Assets:X GBP\n  cashflowClass: ${c}`)[0].options)
          .toMatchObject({ cashflowClass: c });
      }
    });

    test('an unrecognised cashflowClass is rejected rather than stored', () => {
      // A misspelt class would match no account at report time and fall through to the root-based
      // default — a wrong statement with no error anywhere. It has to fail at parse.
      const p = new GainstrackParser();
      expect(() => p.parseString('2019-01-01 open Assets:X GBP\n  cashflowClass: operatng')).toThrow();
      expect(p.parserErrors[0].message).toContain('cashflowClass must be one of');
    });

    test('neither option is present unless written', () => {
      // This is what keeps every existing golden intact: the DTO is byte-identical to before.
      const [c] = parse('2019-01-01 open Assets:Bank GBP');
      expect(c.options).not.toHaveProperty('cashEquivalent');
      expect(c.options).not.toHaveProperty('cashflowClass');
    });

    test('unknown account options still throw', () => {
      // The guard the `commodity` command deliberately lacks: an `open`'s options drive the
      // generator, so a typo must error rather than become inert metadata.
      const p = new GainstrackParser();
      expect(() => p.parseString('2019-01-01 open Assets:X GBP\n  fundingAcount: Assets:Bank')).toThrow();
      expect(p.parserErrors[0].message).toContain('Unknown account option');
    });
  });

  test('earn (simple + with target)', () => {
    expect(parse('2019-01-01 earn Salary 1000 USD')[0]).toMatchObject({
      accountId: 'Income:Salary', commandType: 'earn', change: { number: 1000, ccy: 'USD' },
    });
    expect(parse('2019-01-01 earn Salary Assets:Bank 1000 USD')[0]).toMatchObject({
      accountId: 'Income:Salary', otherAccount: 'Assets:Bank',
    });
  });

  test('spend prefixes Expenses', () => {
    expect(parse('2019-01-01 spend Food 30 USD')[0]).toMatchObject({
      accountId: 'Expenses:Food', commandType: 'spend', change: { number: 30, ccy: 'USD' },
    });
  });

  test('earn/spend accept the qualified form and reject the wrong root', () => {
    // Qualification is by first SEGMENT, so a tag rooted at an account type must be rooted at
    // the right one rather than nesting under it (`Income:Expenses:Food`).
    expect(parse('2019-01-01 earn Income:Salary 1000 USD')[0]).toMatchObject({ accountId: 'Income:Salary' });
    expect(parse('2019-01-01 spend Expenses:Food 30 USD')[0]).toMatchObject({ accountId: 'Expenses:Food' });
    // `IncomeTaxSG` starts with "Income" but its first segment is not an account type, so it is
    // a bare tag; `Salary:AcmeCo` is a bare tag that happens to contain a colon.
    expect(parse('2019-01-01 earn IncomeTaxSG 10 USD')[0]).toMatchObject({ accountId: 'Income:IncomeTaxSG' });
    expect(parse('2019-01-01 earn Salary:AcmeCo 10 USD')[0]).toMatchObject({ accountId: 'Income:Salary:AcmeCo' });

    for (const [line, msg] of [
      ['2019-01-01 earn Expenses:Food 100 USD', 'Expenses:Food is not an Income account'],
      ['2019-01-01 spend Income:Salary 100 USD', 'Income:Salary is not an Expenses account'],
      ['2019-01-01 earn Assets:Bank 100 USD', 'Assets:Bank is not an Income account'],
    ]) {
      const p = new GainstrackParser();
      expect(() => p.parseString(line)).toThrow();
      expect(p.parserErrors[0].message).toContain(msg);
    }
  });

  test('tfr emits change + fx-rate price + dest (matches Scala DTO, not targetChange)', () => {
    const [c] = parse('2019-01-02 tfr Assets:HSBCHK Assets:USD 40000 HKD 5084.91 USD');
    expect(c).toMatchObject({
      accountId: 'Assets:HSBCHK', otherAccount: 'Assets:USD', change: { number: 40000, ccy: 'HKD' },
    });
    expect(c.price!.ccy).toBe('HKD');
    expect(c.price!.number).toBeCloseTo(5084.91 / 40000, 8);
  });

  test('trade defaults commission to {0, priceCcy} when absent', () => {
    const [c] = parse('2010-01-01 trade Assets:Broker 10 IVV @12.3 USD');
    expect(c).toMatchObject({
      accountId: 'Assets:Broker', commandType: 'trade',
      change: { number: 10, ccy: 'IVV' }, price: { number: 12.3, ccy: 'USD' },
      commission: { number: 0, ccy: 'USD' },
    });
  });

  test('trade with commission', () => {
    const [c] = parse('2010-01-01 trade Assets:Broker 10 IVV @12.3 USD C5 USD');
    expect(c.commission).toEqual({ number: 5, ccy: 'USD' });
  });

  test('price uses root account + asset', () => {
    expect(parse('2019-01-01 price IVV 100 USD')[0]).toMatchObject({
      accountId: '', commandType: 'price', asset: 'IVV', price: { number: 100, ccy: 'USD' },
    });
  });

  test('unit / yield / fund / commodity', () => {
    expect(parse('2019-01-01 unit Assets:Inv 100 FTSE @2.1 GBP')[0]).toMatchObject({
      commandType: 'unit', balance: { number: 100, ccy: 'FTSE' }, price: { number: 2.1, ccy: 'GBP' },
    });
    expect(parse('2019-01-01 yield Assets:Inv FTSE 5 GBP')[0]).toMatchObject({
      commandType: 'yield', asset: 'FTSE', change: { number: 5, ccy: 'GBP' },
    });
    expect(parse('2019-01-01 fund Assets:Inv 1000 GBP')[0]).toMatchObject({
      commandType: 'fund', change: { number: 1000, ccy: 'GBP' },
    });
    const [com] = parse('1900-01-01 commodity VWRD\n  ticker: VWRD.LON\n  tags: equity,global');
    expect(com).toMatchObject({ commandType: 'commodity', asset: 'VWRD' });
    expect(com.options).toMatchObject({ ticker: 'VWRD.LON', tags: ['equity', 'global'], name: '' });
  });

  test('global option line', () => {
    const cmds = parse('option "operating_currency" "GBP"\n2019-01-01 open Assets:Bank GBP');
    const global = cmds.find(c => c.commandType === '');
    expect(global).toMatchObject({ accountId: '', options: { operatingCurrency: 'GBP' } });
  });
});

describe('GainstrackParser sort (mirrors AccountCommand.sorted)', () => {
  test('open sorts before a same-day bal; global first', () => {
    const cmds = parse([
      '2019-01-02 bal Assets:Bank 100 GBP Equity:Opening',
      'option "operating_currency" "GBP"',
      '2019-01-01 open Assets:Bank GBP',
      '2019-01-01 open Equity:Opening GBP',
    ].join('\n'));
    expect(cmds.map(c => c.commandType)).toEqual(['', 'open', 'open', 'bal']);
  });
});

describe('GainstrackParser errors', () => {
  test('unknown keyword', () => {
    const p = new GainstrackParser();
    expect(() => p.parseString('2019-01-01 frobnicate Assets:Bank 1 GBP')).toThrow();
    expect(p.parserErrors[0].message).toContain('unknown command');
  });

  test('unparsable line', () => {
    const p = new GainstrackParser();
    expect(() => p.parseString('this is not valid gainstrack !!')).toThrow();
    expect(p.parserErrors[0].message).toContain('Unparsable');
  });

  test('merge conflict: duplicate unit same date/account/ccy', () => {
    const p = new GainstrackParser();
    const dup = '2019-01-01 unit Assets:Inv 100 FTSE @2.1 GBP';
    expect(() => p.parseString(`${dup}\n${dup}`)).toThrow();
    expect(p.parserErrors.some(e => e.message.includes('conflicts'))).toBe(true);
  });
});
