// Parity of the TS `toGainstrack` port against the Scala oracle (DumpToGainstrack.scala).
//
// The goldens are `getCommands.map(_.toGainstrackWithComments)` — exactly the Seq[Seq[String]]
// persisted as `cmdStrs` and carried by every event appended to the Firestore stream. This must
// match byte-for-byte: a divergence here corrupts ledgers, it does not merely look wrong.

import * as fs from 'fs';
import * as path from 'path';
import { GainstrackParser } from 'src/lib/GainstrackParser';
import { toCommandBlocks } from 'src/lib/toGainstrack';

const FIXTURES = path.join(__dirname, 'fixtures');
const LOCAL = path.join(FIXTURES, 'local');
const GOLDENS = ['basic', 'unit', 'src', 'div', 'balbug', 'james', 'noequity', 'multiadj'];

function blocksFor(text: string): string[][] {
  const parser = new GainstrackParser();
  parser.parseString(text);
  return toCommandBlocks(parser.getTypedCommands());
}

describe('toGainstrack parity with Scala', () => {
  for (const name of GOLDENS) {
    test(`${name}.gainstrack command blocks`, () => {
      const text = fs.readFileSync(path.join(FIXTURES, `${name}.gainstrack`), 'utf8');
      const golden: string[][] = JSON.parse(fs.readFileSync(path.join(FIXTURES, `${name}.blocks.json`), 'utf8'));
      expect(blocksFor(text)).toEqual(golden);
    });
  }

  const localLedger = path.join(LOCAL, 'glorat.gainstrack');
  const localGolden = path.join(LOCAL, 'glorat.blocks.json');
  const hasLocal = fs.existsSync(localLedger) && fs.existsSync(localGolden);

  (hasLocal ? test : test.skip)('private ledger command blocks', () => {
    const golden: string[][] = JSON.parse(fs.readFileSync(localGolden, 'utf8'));
    expect(blocksFor(fs.readFileSync(localLedger, 'utf8'))).toEqual(golden);
  });
});

describe('round trip', () => {
  // The property the write path depends on: re-parsing serialized output must yield the same
  // commands, so an edit-save cycle never mutates untouched commands.
  for (const name of GOLDENS) {
    test(`${name}.gainstrack survives parse -> serialize -> parse`, () => {
      const text = fs.readFileSync(path.join(FIXTURES, `${name}.gainstrack`), 'utf8');
      const once = blocksFor(text);
      const twice = blocksFor(once.flat().join('\n') + '\n');
      expect(twice).toEqual(once);
    });
  }
});

describe('serialization details that must not drift', () => {
  const one = (src: string) => blocksFor(src)[0];

  test('booleans emit `name:true` with no space; accounts emit `name: value`', () => {
    expect(one('2019-01-01 open Assets:Inv GBP\n  multiAsset: true\n  fundingAccount: Assets:Bank'))
      .toEqual(['2019-01-01 open Assets:Inv GBP', '  fundingAccount: Assets:Bank', '  multiAsset:true']);
  });

  test('false booleans are omitted entirely', () => {
    expect(one('2019-01-01 open Assets:Inv GBP\n  multiAsset: false')).toEqual(['2019-01-01 open Assets:Inv GBP']);
  });

  test('amount scale is preserved from the source literal', () => {
    expect(one('2019-01-01 open Assets:Bank USD\n2019-01-02 bal Assets:Bank 2000.00 USD Equity:Opening')[0])
      .toBe('2019-01-01 open Assets:Bank USD');
    expect(blocksFor('2019-01-01 adj Assets:Bank 265000.0 GBP Equity:Opening')[0])
      .toEqual(['2019-01-01 adj Assets:Bank 265000.0 GBP Equity:Opening']);
  });

  test('tfr omits the target leg only when both legs are identical', () => {
    expect(one('2019-01-01 tfr Assets:A Assets:B 100 USD')).toEqual(['2019-01-01 tfr Assets:A Assets:B 100 USD']);
    expect(one('2019-01-02 tfr Assets:A Assets:B 40000 HKD 5084.91 USD'))
      .toEqual(['2019-01-02 tfr Assets:A Assets:B 40000 HKD 5084.91 USD']);
  });

  test('trade omits a zero commission', () => {
    expect(one('2010-01-01 trade Assets:B 10 IVV @12.3 USD')).toEqual(['2010-01-01 trade Assets:B 10 IVV @12.3 USD']);
    expect(one('2010-01-01 trade Assets:B 10 IVV @12.3 USD C5 USD'))
      .toEqual(['2010-01-01 trade Assets:B 10 IVV @12.3 USD C5 USD']);
  });

  test('earn/spend echo the tag as written, not the derived account', () => {
    expect(one('2019-01-01 earn Income:Salary 100 USD')).toEqual(['2019-01-01 earn Income:Salary 100 USD']);
    expect(one('2019-01-01 earn Salary 100 USD')).toEqual(['2019-01-01 earn Salary 100 USD']);
  });

  test('commodity tags are sorted and de-duplicated, not source order', () => {
    expect(one('1900-01-01 commodity VWRD\n  tags: global,equity,equity\n  ticker: VWRD.LON'))
      .toEqual(['1900-01-01 commodity VWRD', '  tags: equity,global', '  ticker: VWRD.LON']);
  });

  test('comments are retained and re-emitted with `; `', () => {
    expect(one('; bought the dip\n# second line\n2019-01-01 open Assets:Bank USD'))
      .toEqual(['; bought the dip', '; second line', '2019-01-01 open Assets:Bank USD']);
  });

  test('a default USD operating currency emits nothing', () => {
    expect(blocksFor('option "operating_currency" "USD"\n2019-01-01 open Assets:Bank USD'))
      .toEqual([['2019-01-01 open Assets:Bank USD']]);
    expect(blocksFor('option "operating_currency" "GBP"\n2019-01-01 open Assets:Bank GBP')[0])
      .toEqual(['option "operating_currency" "GBP"']);
  });
});
