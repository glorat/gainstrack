// Parity of the TS beancount export against the Scala oracle (DumpToBeancount.scala).
//
// Compared per section, because they warrant different strictness:
//  - headers and the COMMAND stream are ordered `Seq`s in Scala and must match exactly. The
//    command stream is the whole point of the file — transactions, price observations and
//    balance assertions interleaved in command order.
//  - the ACCOUNT block comes from `acctState.accounts`, a Scala `Set`, so its order is JVM
//    hash order: neither reproducible from TS nor meaningful. Compared as a set; the TS side
//    sorts by account id so its own output stays deterministic.

import * as fs from 'fs';
import * as path from 'path';
import { GainstrackParser } from 'src/lib/GainstrackParser';
import { buildCommands } from 'src/lib/gen/commands';
import { accountLines, beancountSections, toBeancountFile } from 'src/lib/export/beancountExport';
import { defaultOptions, GAccount } from 'src/lib/gen/account';
import { GAccountOptions } from 'src/lib/gen/commands';
import { FIXTURE_NAMES } from 'src/lib/__tests__/fixtureNames';
import { stripScale } from 'src/lib/__tests__/scale';

const FIXTURES = path.join(__dirname, 'fixtures');
const LOCAL = path.join(FIXTURES, 'local');
const GOLDENS = FIXTURE_NAMES;

interface Sections { headers: string[]; accounts: string[]; commands: string[] }

function sectionsFor(text: string): Sections {
  const parser = new GainstrackParser();
  parser.parseString(text);
  return beancountSections(buildCommands(parser.getTypedCommands()));
}

function compare(text: string, golden: Sections) {
  const actual = sectionsFor(text);
  expect(actual.headers).toEqual(golden.headers);
  expect([...actual.accounts].sort()).toEqual([...golden.accounts].sort());
  expect(actual.commands.map(stripScale)).toEqual(golden.commands.map(stripScale));
}

describe('beancount export parity with Scala', () => {
  for (const name of GOLDENS) {
    test(`${name}.gainstrack`, () => {
      const text = fs.readFileSync(path.join(FIXTURES, `${name}.gainstrack`), 'utf8');
      const golden: Sections = JSON.parse(fs.readFileSync(path.join(FIXTURES, `${name}.beancount.json`), 'utf8'));
      compare(text, golden);
    });
  }

  const localLedger = path.join(LOCAL, 'glorat.gainstrack');
  const localGolden = path.join(LOCAL, 'glorat.beancount.json');
  const hasLocal = fs.existsSync(localLedger) && fs.existsSync(localGolden);

  (hasLocal ? test : test.skip)('private ledger', () => {
    compare(fs.readFileSync(localLedger, 'utf8'), JSON.parse(fs.readFileSync(localGolden, 'utf8')));
  });
});

describe('the scale divergence stays bounded', () => {
  // `compare` normalizes trailing zeros away, which would also hide a NEW class of difference
  // appearing in the same lines. So assert what the residue actually is: every byte-level
  // mismatch must be trailing-zero scale and nothing else.
  const cases = GOLDENS.filter(n => fs.existsSync(path.join(FIXTURES, `${n}.beancount.json`)));

  for (const name of cases) {
    test(`${name}.gainstrack differs only in trailing zeros`, () => {
      const text = fs.readFileSync(path.join(FIXTURES, `${name}.gainstrack`), 'utf8');
      const golden: Sections = JSON.parse(fs.readFileSync(path.join(FIXTURES, `${name}.beancount.json`), 'utf8'));
      const actual = sectionsFor(text).commands;

      for (let i = 0; i < actual.length; i++) {
        if (actual[i] === golden.commands[i]) continue;
        // Same line once scale is normalized => the only difference was trailing zeros.
        expect(stripScale(actual[i])).toBe(stripScale(golden.commands[i]));
      }
    });
  }
});

describe('account directives', () => {
  // No fixture (nor the private ledger) opens a trading account, so this branch of
  // `AccountCreation.toBeancount` is invisible to the golden comparison AND to bean-check.
  // Asserted directly against the Scala source instead.
  const account = (options: Partial<GAccountOptions>): GAccount => ({
    date: '2019-01-01', accountId: 'Assets:Broker', assetId: 'USD',
    options: defaultOptions(options),
  });

  test('a plain account is a single open directive', () => {
    expect(accountLines(account({}))).toEqual(['2019-01-01 open Assets:Broker USD']);
  });

  test('a trading account also emits the book_conversions plugin', () => {
    expect(accountLines(account({ tradingAccount: true, incomeAccount: 'Income:Broker:USD' }))).toEqual([
      '2019-01-01 open Assets:Broker USD',
      'plugin "beancount.plugins.book_conversions" "Assets:Broker,Income:Broker:USD"',
    ]);
  });
});

describe('the assembled file', () => {
  test('is headers, then accounts, then commands, joined by newlines', () => {
    const text = fs.readFileSync(path.join(FIXTURES, 'basic.gainstrack'), 'utf8');
    const { headers, accounts, commands } = sectionsFor(text);
    expect(toBeancountFile(text)).toBe([...headers, ...accounts, ...commands].join('\n'));
  });

  test('declares the operating currency and the implicit_prices plugin', () => {
    // bean-check rejects the file without the plugin, since gainstrack relies on prices
    // implied by transactions rather than restating every one as a price directive.
    const out = toBeancountFile(fs.readFileSync(path.join(FIXTURES, 'basic.gainstrack'), 'utf8'));
    expect(out.split('\n').slice(0, 3)).toEqual([
      'option "title" "Gainstrack"',
      'option "operating_currency" "USD"',
      'plugin "beancount.plugins.implicit_prices"',
    ]);
  });
});
