// One case per row of the lowering mapping table, plus the lifting rules.
//
// The oracle spec in `tools/beancount-import/` is the stronger check, but it needs python and
// beancount and so it skips on most machines. These run everywhere, and they pin the individual
// decisions rather than the aggregate — when the oracle goes red, this file says which mapping
// is wrong. The dump documents they run on are built by `dumpFixtures.ts`.

import { DumpEntry } from '../beancountDump';
import { importBeancount } from '../beancountImport';
import { lift } from '../lift';
import { generateAllStateSafe } from 'src/lib/gen/GainstrackGenerator';
import { doc, meta, open, post, tx } from './dumpFixtures';

/** Lower, and return the text split into lines for readable assertions. */
function lower(entries: DumpEntry[], options?: Record<string, unknown>): string[] {
  return importBeancount(doc(entries, options)).text.split('\n').filter(l => l !== '');
}

const OPENS = [
  open('2019-01-01', 'Assets:Bank', 'USD'),
  open('2019-01-01', 'Assets:Other', 'USD'),
  open('2019-01-01', 'Income:Salary', 'USD'),
  open('2019-01-01', 'Expenses:Food', 'USD'),
  open('2019-01-01', 'Equity:Opening', 'USD'),
];

describe('lowering: the mapping table', () => {
  test('open with one currency is a direct open', () => {
    expect(lower([open('2019-01-01', 'Assets:Bank', 'USD')]))
      .toContain('2019-01-01 open Assets:Bank USD');
  });

  test('open with no currency falls back to the operating currency', () => {
    // Beancount declining to constrain the account tells us nothing about what it holds, and
    // nothing ever posts to it here, so the only defensible answer is the ledger's own default.
    expect(lower([open('2019-01-01', 'Assets:Bank')], { operating_currency: ['GBP'] }))
      .toContain('2019-01-01 open Assets:Bank GBP');
  });

  test('an account that really holds two currencies becomes multiAsset with routed postings', () => {
    const lines = lower([
      open('2019-01-01', 'Assets:Wallet'),
      open('2019-01-01', 'Expenses:Food', 'EUR'),
      open('2019-01-01', 'Equity:Opening'),
      tx('2019-01-02', 'seed', [post('Assets:Wallet', '100', 'USD'), post('Equity:Opening', '-100', 'USD')]),
      tx('2019-01-03', 'seed eur', [post('Assets:Wallet', '80', 'EUR'), post('Equity:Opening', '-80', 'EUR')]),
      tx('2019-01-04', 'lunch', [post('Expenses:Food', '10', 'EUR'), post('Assets:Wallet', '-10', 'EUR')]),
    ]);
    expect(lines).toContain('2019-01-01 open Assets:Wallet USD');
    expect(lines).toContain('  multiAsset:true');
    expect(lines).toContain('  Assets:Wallet:EUR -10 EUR');
    expect(lines).toContain('  Assets:Wallet:USD 100 USD');
  });

  test('the account fold is published for every split account, and is otherwise identity', () => {
    const result = importBeancount(doc([
      open('2019-01-01', 'Assets:Wallet'),
      open('2019-01-01', 'Equity:Opening'),
      tx('2019-01-02', 'a', [post('Assets:Wallet', '100', 'USD'), post('Equity:Opening', '-100', 'USD')]),
      tx('2019-01-03', 'b', [post('Assets:Wallet', '80', 'EUR'), post('Equity:Opening', '-80', 'EUR')]),
    ]));
    // Equity:Opening holds two currencies too, so both accounts split. Only non-identity
    // entries are listed — the verification harness relies on that to fold the two sides.
    expect(result.report.accountFold).toEqual({
      'Assets:Wallet:EUR': 'Assets:Wallet',
      'Assets:Wallet:USD': 'Assets:Wallet',
      'Equity:Opening:EUR': 'Equity:Opening',
      'Equity:Opening:USD': 'Equity:Opening',
    });
  });

  test('a transaction becomes a tx with payee and narration joined', () => {
    const lines = lower([...OPENS, tx('2019-02-01', 'Salary January', [
      post('Assets:Bank', '4500', 'USD'),
      post('Expenses:Food', '1500', 'USD'),
      post('Income:Salary', '-6000', 'USD'),
    ], { payee: 'ACME Corp' })]);
    expect(lines).toContain('2019-02-01 tx "ACME Corp | Salary January"');
    expect(lines).toContain('  Income:Salary -6000 USD');
  });

  test('a quote in the narration is sanitized rather than emitted raw', () => {
    // Emitting it would produce a file neither our parser nor beancount can read back.
    const lines = lower([...OPENS, tx('2019-02-01', 'say "hi"', [
      post('Assets:Bank', '1', 'USD'), post('Income:Salary', '-1', 'USD'),
    ])]);
    expect(lines).toContain('2019-02-01 tx "say hi"');
  });

  test('a cost survives as a lot basis, and the dropped lot identity is counted', () => {
    const result = importBeancount(doc([
      open('2019-01-01', 'Assets:Broker:AAPL', 'AAPL'),
      open('2019-01-01', 'Assets:Broker:Cash', 'USD'),
      tx('2019-02-01', 'buy', [
        post('Assets:Broker:AAPL', '10', 'AAPL', { cost: { number: '150', currency: 'USD', date: '2019-02-01', label: null } }),
        post('Assets:Broker:Cash', '-1500', 'USD'),
      ]),
    ]));
    expect(result.text).toContain('  Assets:Broker:AAPL 10 AAPL {150 USD}');
    expect(result.report.lossy['lot identity (date/label) dropped']).toBe(1);
  });

  test('a tolerated residue becomes an explicit posting rather than a loosened rule', () => {
    // 5.030 x 95.43 = 480.0129. Beancount carries the 0.0029; gainstrack refuses to, so the
    // ledger has to say where it went.
    const lines = lower([
      open('2019-01-01', 'Assets:Broker:VBMPX', 'VBMPX'),
      open('2019-01-01', 'Assets:Broker:Cash', 'USD'),
      tx('2019-02-01', 'reinvest', [
        post('Assets:Broker:VBMPX', '5.030', 'VBMPX', { cost: { number: '95.43', currency: 'USD', date: null, label: null } }),
        post('Assets:Broker:Cash', '-480.01', 'USD'),
      ]),
    ]);
    expect(lines).toContain('  Equity:Rounding:USD -0.0029 USD');
    expect(lines).toContain('2019-01-01 open Equity:Rounding USD');
  });

  test('pad + balance becomes one bal naming the pad source', () => {
    const lines = lower([
      open('2019-01-01', 'Assets:Bank', 'USD'),
      open('2019-01-01', 'Equity:Opening', 'USD'),
      { type: 'pad', date: '2019-01-01', account: 'Assets:Bank', source_account: 'Equity:Opening', ...meta },
      // What the loader synthesizes for that pad. It must NOT also become a tx, or the
      // adjustment lands twice.
      tx('2019-01-01', '(Padding inserted...)', [
        post('Assets:Bank', '500', 'USD'), post('Equity:Opening', '-500', 'USD'),
      ], { flag: 'P' }),
      { type: 'balance', date: '2019-02-01', account: 'Assets:Bank', amount: { number: '500', currency: 'USD' }, tolerance: null, diff: null, ...meta },
    ]);
    expect(lines).toContain('2019-01-31 bal Assets:Bank 500 USD Equity:Opening');
    expect(lines.filter(l => l.startsWith('2019-01-01 tx'))).toEqual([]);
  });

  test('a bare balance books to the inert adjustment account', () => {
    const lines = lower([
      open('2019-01-01', 'Assets:Bank', 'USD'),
      { type: 'balance', date: '2019-02-01', account: 'Assets:Bank', amount: { number: '0', currency: 'USD' }, tolerance: null, diff: null, ...meta },
    ]);
    expect(lines).toContain('2019-01-31 bal Assets:Bank 0 USD Equity:Adjustments');
  });

  test('the assertion date is shifted back a day', () => {
    // beancount asserts at the START of its date; a gainstrack `bal` states the balance the
    // following morning. The shift is the whole reason this row is in the table.
    const lines = lower([
      open('2019-01-01', 'Assets:Bank', 'USD'),
      { type: 'balance', date: '2019-03-01', account: 'Assets:Bank', amount: { number: '0', currency: 'USD' }, tolerance: null, diff: null, ...meta },
    ]);
    expect(lines.some(l => l.startsWith('2019-02-28 bal'))).toBe(true);
  });

  test('a failing assertion is reported, not quietly plugged', () => {
    const result = importBeancount(doc([
      open('2019-01-01', 'Assets:Bank', 'USD'),
      { type: 'balance', date: '2019-02-01', account: 'Assets:Bank', amount: { number: '5', currency: 'USD' }, tolerance: null, diff: { number: '5', currency: 'USD' }, ...meta },
    ]));
    expect(result.report.warnings.join('\n')).toContain('fails in beancount by 5 USD');
  });

  test("beancount's close is NOT gainstrack's close", () => {
    // gainstrack's `close` books income and expenses to equity — applying it here would rewrite
    // the ledger's equity. It is a comment or nothing.
    const lines = lower([open('2019-01-01', 'Assets:Bank', 'USD'), { type: 'close', date: '2019-03-01', account: 'Assets:Bank', ...meta }]);
    expect(lines.some(l => / close /.test(l) && !l.startsWith(';'))).toBe(false);
    expect(lines).toContain('; beancount close Assets:Bank');
  });

  test('tags, links and metadata are kept as comments and counted', () => {
    const lines = lower([...OPENS, tx('2019-02-01', 'lunch', [
      post('Expenses:Food', '10', 'USD'), post('Assets:Bank', '-10', 'USD'),
    ], { tags: ['trip'], links: ['abc'], meta: { statement: 'jan.pdf' } })]);
    expect(lines).toContain('; #trip');
    expect(lines).toContain('; ^abc');
    expect(lines).toContain('; statement: jan.pdf');
  });

  test('a currency gainstrack cannot name is commented rather than emitted', () => {
    const lines = lower([{ type: 'commodity', date: '2019-01-01', currency: 'USD.OLD', ...meta }]);
    expect(lines).toContain('; commodity USD.OLD (not expressible as a gainstrack asset id)');
  });

  test('a transaction beancount could not book is commented, not invented', () => {
    // A dump only contains a postingless transaction when booking failed: the loader reports the
    // error and drops the legs. There is nothing to convert, and a `tx` needs two postings, so
    // padding it out with zeroes would state that the transaction was fine when it was not.
    const result = importBeancount(doc([
      open('2019-01-01', 'Assets:Bank', 'USD'),
      tx('2019-02-01', 'Sell twelve', []),
    ]));
    expect(result.text).not.toContain('tx "Sell twelve"');
    expect(result.text).toContain('; 2019-02-01 Sell twelve: beancount could not book this');
    expect(result.report.lossy['transaction beancount could not book']).toBe(1);
    expect(result.report.warnings.some(w => w.includes('Sell twelve'))).toBe(true);
    // The point of the whole exercise: what is left still loads.
    expect(generateAllStateSafe(result.text).errors).toEqual([]);
  });

  test('an account nobody opened is opened, and said so', () => {
    const result = importBeancount(doc([
      open('2019-01-01', 'Assets:Bank', 'USD'),
      tx('2019-02-01', 'x', [post('Assets:Bank', '-10', 'USD'), post('Expenses:Mystery', '10', 'USD')]),
    ]));
    expect(result.text).toContain('2019-02-01 open Expenses:Mystery USD');
    expect(result.report.warnings.join('\n')).toContain('Expenses:Mystery was never opened');
  });

  test('renamed account roots are mapped back and reported', () => {
    const result = importBeancount(doc([open('2019-01-01', 'Activo:Banco', 'USD')], { name_assets: 'Activo' }));
    expect(result.text).toContain('2019-01-01 open Assets:Banco USD');
    expect(result.report.warnings.join('\n')).toContain('"Activo" renamed to "Assets"');
  });
});

describe('lifting: what is recognized and what is deliberately not', () => {
  const liftedLines = (entries: DumpEntry[]) => lift(importBeancount(doc(entries))).text.split('\n');

  test('income into an asset becomes earn', () => {
    expect(liftedLines([...OPENS, tx('2019-02-01', 'pay', [
      post('Assets:Bank', '100', 'USD'), post('Income:Salary', '-100', 'USD'),
    ])])).toContain('2019-02-01 earn Income:Salary Assets:Bank 100 USD');
  });

  test('an asset into expenses becomes spend', () => {
    expect(liftedLines([...OPENS, tx('2019-02-01', 'lunch', [
      post('Expenses:Food', '10', 'USD'), post('Assets:Bank', '-10', 'USD'),
    ])])).toContain('2019-02-01 spend Expenses:Food Assets:Bank 10 USD');
  });

  test('equity into an asset becomes fund', () => {
    expect(liftedLines([...OPENS, tx('2019-02-01', 'seed', [
      post('Assets:Bank', '1000', 'USD'), post('Equity:Opening', '-1000', 'USD'),
    ])])).toContain('2019-02-01 fund Assets:Bank Equity:Opening 1000 USD');
  });

  test('asset to asset becomes tfr, and cross-currency uses the two-amount form', () => {
    const lines = liftedLines([
      open('2019-01-01', 'Assets:Usd', 'USD'),
      open('2019-01-01', 'Assets:Eur', 'EUR'),
      tx('2019-02-01', 'fx', [
        post('Assets:Eur', '1000', 'EUR', { price: { number: '1.25', currency: 'USD' } }),
        post('Assets:Usd', '-1250', 'USD'),
      ]),
    ]);
    expect(lines).toContain('2019-02-01 tfr Assets:Usd Assets:Eur 1250 USD 1000 EUR');
  });

  test('the narration is preserved as a comment on the lifted command', () => {
    // Lifting swaps the user's memo for a generated description, so the memo has to go
    // somewhere. It survives in the file even though no report can query it.
    expect(liftedLines([...OPENS, tx('2019-02-01', 'Weekly shop', [
      post('Expenses:Food', '10', 'USD'), post('Assets:Bank', '-10', 'USD'),
    ])])).toContain('; Weekly shop');
  });

  test('three legs stay a raw tx', () => {
    const lines = liftedLines([...OPENS, tx('2019-02-01', 'paycheck', [
      post('Assets:Bank', '4500', 'USD'),
      post('Expenses:Food', '1500', 'USD'),
      post('Income:Salary', '-6000', 'USD'),
    ])]);
    expect(lines).toContain('2019-02-01 tx "paycheck"');
  });

  test('a cost basis stays a raw tx — the face values are not what balances', () => {
    const lines = liftedLines([
      open('2019-01-01', 'Assets:Broker:AAPL', 'AAPL'),
      open('2019-01-01', 'Assets:Broker:Cash', 'USD'),
      tx('2019-02-01', 'buy', [
        post('Assets:Broker:AAPL', '10', 'AAPL', { cost: { number: '150', currency: 'USD', date: null, label: null } }),
        post('Assets:Broker:Cash', '-1500', 'USD'),
      ]),
    ]);
    expect(lines.some(l => l.startsWith('2019-02-01 tx'))).toBe(true);
  });

  test('an income-to-expense reclassification stays a raw tx', () => {
    // No gainstrack command moves money directly between the two, and inventing an asset leg
    // to make one fit would be a change of meaning.
    const lines = liftedLines([...OPENS, tx('2019-02-01', 'reclass', [
      post('Expenses:Food', '10', 'USD'), post('Income:Salary', '-10', 'USD'),
    ])]);
    expect(lines.some(l => l.startsWith('2019-02-01 tx'))).toBe(true);
  });

  test('each rule can be turned off on its own', () => {
    const lowered = importBeancount(doc([...OPENS, tx('2019-02-01', 'lunch', [
      post('Expenses:Food', '10', 'USD'), post('Assets:Bank', '-10', 'USD'),
    ])]));
    expect(lift(lowered, { spend: false }).text).toContain('2019-02-01 tx "lunch"');
    expect(lift(lowered, { spend: false }).report.lifted).toEqual({});
  });

  test('a lifted ledger still generates, and the raw-tx count is the metric', () => {
    const lowered = importBeancount(doc([...OPENS, tx('2019-02-01', 'lunch', [
      post('Expenses:Food', '10', 'USD'), post('Assets:Bank', '-10', 'USD'),
    ]), tx('2019-02-02', 'paycheck', [
      post('Assets:Bank', '4500', 'USD'),
      post('Expenses:Food', '1500', 'USD'),
      post('Income:Salary', '-6000', 'USD'),
    ])]));
    expect(lowered.report.rawTransactions).toBe(2);
    const lifted = lift(lowered);
    expect(lifted.report.rawTransactions).toBe(1);
    expect(generateAllStateSafe(lifted.text).errors).toEqual([]);
  });
});
