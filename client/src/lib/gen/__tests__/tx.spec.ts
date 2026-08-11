// The `tx` command — gainstrack's raw multi-posting transaction.
//
// `tx` is TypeScript-only, like `close`: there is no Scala counterpart, so none of the
// differential machinery in `__tests__/` can say anything about it. Everything it does that
// matters therefore has to be asserted here, in the same spirit as `invariants.spec.ts` —
// deliberate choices pinned so they cannot be reversed by accident.
//
// The choices, and why each is a choice rather than an inevitability:
//
//   - postings sum to zero EXACTLY, by weight (cost basis, else price-converted, else face).
//     Beancount tolerates a small residue; we refuse it, and the importer is responsible for
//     making the residue explicit before it reaches the engine.
//   - amounts are built from the source LITERAL, not the parsed float, so a lot cost with more
//     precision than a float can hold still balances.
//   - a posting line must be indented. An unindented line is an error, never a silent leg.
//   - the description is the user's, verbatim. Every other command derives one.

import { GainstrackParser } from 'src/lib/GainstrackParser';
import { generate, generateAllStateSafe } from 'src/lib/gen/GainstrackGenerator';
import { toGainstrackFile } from 'src/lib/export/gainstrackExport';
import { toBeancountFile } from 'src/lib/export/beancountExport';

/** A ledger with the accounts a raw tx needs, plus whatever the test appends. */
function ledger(...lines: string[]): string {
  return [
    '2019-01-01 open Assets:Bank USD',
    '2019-01-01 open Expenses:Tax USD',
    '2019-01-01 open Income:Salary USD',
    ...lines,
    '',
  ].join('\n');
}

const PAYCHECK = ledger(
  '2019-02-01 tx "ACME Corp | Salary January"',
  '  Assets:Bank 4500 USD',
  '  Expenses:Tax 1500 USD',
  '  Income:Salary -6000 USD',
);

function errorsOf(text: string): string[] {
  return generateAllStateSafe(text).errors.map(e => e.message);
}

describe('a tx produces exactly the postings it states', () => {
  test('three legs, in order, with the user\'s description', () => {
    const state = generate(PAYCHECK);
    expect(state.txs).toHaveLength(1);
    const tx = state.txs[0];
    expect(tx.postDate).toBe('2019-02-01');
    expect(tx.postings.map(p => [p.account, p.value.number, p.value.ccy])).toEqual([
      ['Assets:Bank', 4500, 'USD'],
      ['Expenses:Tax', 1500, 'USD'],
      ['Income:Salary', -6000, 'USD'],
    ]);
  });

  test('the description survives into the beancount export', () => {
    // The ONLY place a description is observable end to end. `AllState.txs` drops it, which is
    // how four description bugs hid for as long as they did (see txsFull.spec.ts).
    expect(toBeancountFile(PAYCHECK)).toContain('2019-02-01 * "ACME Corp | Salary January"');
  });

  test('BalanceState and the postings agree', () => {
    const state = generate(PAYCHECK);
    // Last point in the series, not the first — an `open` seeds the account at zero the day
    // before, so the first point is always 0.
    const at = (id: string) => Object.entries(state.balances[id].series).sort().at(-1)![1];
    expect(at('Assets:Bank')).toBe(4500);
    expect(at('Expenses:Tax')).toBe(1500);
    expect(at('Income:Salary')).toBe(-6000);
  });
});

describe('the zero-sum rule', () => {
  test('an unbalanced tx is rejected, naming the residue', () => {
    const errors = errorsOf(ledger(
      '2019-02-01 tx "off by one"',
      '  Assets:Bank 4500 USD',
      '  Income:Salary -4499 USD',
    ));
    expect(errors.join('\n')).toContain('does not balance: 1 USD');
  });

  test('a cost basis balances against the cash leg', () => {
    // 10 AAPL {150 USD} weighs 1500 USD, so the -1500 USD cash leg squares it. Without the
    // cost the ledger would be 1500 USD out AND 10 AAPL out.
    const text = [
      '2019-01-01 open Assets:Bank USD',
      '2019-01-01 open Assets:Broker USD',
      '  multiAsset: true',
      '2019-02-01 tx "buy AAPL"',
      '  Assets:Bank -1500 USD',
      '  Assets:Broker:AAPL 10 AAPL {150 USD}',
      '',
    ].join('\n');
    expect(errorsOf(text)).toEqual([]);
    expect(toBeancountFile(text)).toContain('Assets:Broker:AAPL 10 AAPL {150 USD}');
  });

  test('a price converts the leg for balancing purposes', () => {
    const text = [
      '2019-01-01 open Assets:Usd USD',
      '2019-01-01 open Assets:Eur EUR',
      '2019-02-01 tx "fx"',
      '  Assets:Usd -1250 USD',
      '  Assets:Eur 1000 EUR @1.25 USD',
      '',
    ].join('\n');
    expect(errorsOf(text)).toEqual([]);
  });

  test('a lone posting is rejected — one leg cannot be double entry', () => {
    expect(errorsOf(ledger('2019-02-01 tx "solo"', '  Assets:Bank 0 USD')).join('\n'))
      .toContain('needs at least two postings');
  });

  test('exactness is not float exactness', () => {
    // 20 significant digits: `Number` rounds these to the same value, so a float-based sum
    // would call this balanced. decimal.js does not, and the literal is what we parse.
    const errors = errorsOf(ledger(
      '2019-02-01 tx "beyond float64"',
      '  Assets:Bank 10000000000.00000000001 USD',
      '  Income:Salary -10000000000.00000000002 USD',
    ));
    expect(errors.join('\n')).toContain('does not balance');
  });

  test('and a ledger beancount accepts is not rejected for rounding', () => {
    // The mirror image: numbers a float cannot represent, but which do sum to zero. Building
    // GAmounts from `Amount.number` instead of the literal makes this fail.
    expect(errorsOf(ledger(
      '2019-02-01 tx "exact"',
      '  Assets:Bank 0.1 USD',
      '  Expenses:Tax 0.2 USD',
      '  Income:Salary -0.3 USD',
    ))).toEqual([]);
  });
});

describe('posting lines attach only where they are meant to', () => {
  const parse = (text: string) => {
    const p = new GainstrackParser();
    p.parseLines(text.split('\n'));
    return p;
  };

  test('an unindented posting line is an error, not a silent leg', () => {
    // The dangerous failure: silently absorbing it would balance the books against a line the
    // user did not intend as part of this transaction.
    const p = parse([
      '2019-02-01 tx "paycheck"',
      '  Assets:Bank 4500 USD',
      'Income:Salary -4500 USD',
    ].join('\n'));
    expect(p.parserErrors.map(e => e.message).join('\n')).toContain('Unparsable');
    expect(p.getTypedCommands()[0].postings).toHaveLength(1);
  });

  test('a posting line with no tx before it is an error', () => {
    const p = parse('  Assets:Bank 4500 USD');
    expect(p.parserErrors).toHaveLength(1);
  });

  test('a malformed posting names itself', () => {
    const p = parse(['2019-02-01 tx "x"', '  Assets:Bank 4500'].join('\n'));
    expect(p.parserErrors[0].message).toContain('posting cannot be parsed');
  });

  test('a comment inside the block stays a comment', () => {
    const p = parse([
      '2019-02-01 tx "paycheck"',
      '  Assets:Bank 4500 USD',
      '  ; withheld at source',
      '  Income:Salary -4500 USD',
    ].join('\n'));
    expect(p.parserErrors).toEqual([]);
    expect(p.getTypedCommands()[0].postings).toHaveLength(2);
  });

  test('a quote in the description is rejected rather than corrupted', () => {
    // It would round-trip into an unparseable line in both the gainstrack and beancount
    // exports, neither of which escapes.
    const p = parse('2019-02-01 tx "say ""hi"""');
    expect(p.parserErrors[0].message).toContain('tx command cannot be parsed');
  });
});

describe('a tx round-trips', () => {
  test('through the gainstrack export, byte for byte where it matters', () => {
    const exported = toGainstrackFile(((): ReturnType<GainstrackParser['getTypedCommands']> => {
      const p = new GainstrackParser();
      p.parseString(PAYCHECK);
      return p.getTypedCommands();
    })());
    expect(exported).toContain([
      '2019-02-01 tx "ACME Corp | Salary January"',
      '  Assets:Bank 4500 USD',
      '  Expenses:Tax 1500 USD',
      '  Income:Salary -6000 USD',
    ].join('\n'));
  });

  test('and generating from the export lands on the same state', () => {
    const p = new GainstrackParser();
    p.parseString(PAYCHECK);
    const again = generate(toGainstrackFile(p.getTypedCommands()));
    const before = generate(PAYCHECK);
    expect(again.txs).toEqual(before.txs);
    expect(again.balances).toEqual(before.balances);
  });

  test('preserving a cost basis and a price', () => {
    const text = [
      '2019-01-01 open Assets:Usd USD',
      '2019-01-01 open Assets:Broker USD',
      '  multiAsset: true',
      '2019-02-01 tx "sell at a gain"',
      '  Assets:Broker:AAPL -10 AAPL {150.00 USD} @175.00 USD',
      '  Assets:Usd 1750.00 USD',
      '  Assets:Broker:USD -250.00 USD',
      '',
    ].join('\n');
    const p = new GainstrackParser();
    p.parseString(text);
    expect(toGainstrackFile(p.getTypedCommands()))
      .toContain('  Assets:Broker:AAPL -10 AAPL {150.00 USD} @175.00 USD');
  });
});
