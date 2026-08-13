// The arithmetic the browser verification rests on.
//
// `balancesOf` has to agree with `bean2gain/python/balances.py`, which is unit sums over
// transaction postings and nothing else — no market value, no cost basis, no non-transaction
// entry. Each test below pins one way that could quietly stop being true.

import { ImportReport } from '../beancountImport';
import { balancesOf, compareBalances, fold, pluggedAmounts } from '../balances';
import { doc, meta, post, tx } from './dumpFixtures';

/** Only `accountFold` is read by anything here; the rest of the report is scaffolding. */
function report(accountFold: Record<string, string> = {}): ImportReport {
  return {
    source: 'test.beancount', loaderErrors: [], lowered: {}, commented: {}, lossy: {},
    rawTransactions: 0, lifted: {}, accountFold, warnings: [],
  };
}

describe('balancesOf', () => {
  test('sums postings per account and currency', () => {
    const { balances } = balancesOf(doc([
      tx('2019-01-01', 'a', [post('Assets:Bank', '100', 'USD'), post('Equity:Opening', '-100', 'USD')]),
      tx('2019-01-02', 'b', [post('Assets:Bank', '25.50', 'USD'), post('Income:Salary', '-25.50', 'USD')]),
    ]));
    expect(balances).toEqual({
      'Assets:Bank': { USD: '125.5' },
      'Equity:Opening': { USD: '-100' },
      'Income:Salary': { USD: '-25.5' },
    });
  });

  test('keeps currencies apart within one account', () => {
    const { balances } = balancesOf(doc([
      tx('2019-01-01', 'a', [post('Assets:Wallet', '100', 'USD'), post('Equity:Opening', '-100', 'USD')]),
      tx('2019-01-02', 'b', [post('Assets:Wallet', '80', 'EUR'), post('Equity:Opening', '-80', 'EUR')]),
    ]));
    expect(balances['Assets:Wallet']).toEqual({ EUR: '80', USD: '100' });
  });

  test('ignores everything that is not a transaction', () => {
    // A `balance` directive states a total; counting it would double every asserted account.
    const { balances } = balancesOf(doc([
      tx('2019-01-01', 'a', [post('Assets:Bank', '100', 'USD'), post('Equity:Opening', '-100', 'USD')]),
      { type: 'balance', date: '2019-02-01', account: 'Assets:Bank', amount: { number: '100', currency: 'USD' }, tolerance: null, diff: null, ...meta },
      { type: 'price', date: '2019-02-01', currency: 'AAPL', amount: { number: '150', currency: 'USD' }, ...meta },
    ]));
    expect(balances).toEqual({ 'Assets:Bank': { USD: '100' }, 'Equity:Opening': { USD: '-100' } });
  });

  test('skips postings whose units beancount left unresolved', () => {
    // The loader interpolates elided amounts, so a null number means it genuinely could not —
    // adding it as zero would silently claim a total we do not know.
    const { balances } = balancesOf(doc([
      tx('2019-01-01', 'a', [
        post('Assets:Bank', '100', 'USD'),
        { account: 'Equity:Opening', units: null, cost: null, price: null, flag: null, meta: {} },
      ]),
    ]));
    expect(balances).toEqual({ 'Assets:Bank': { USD: '100' } });
  });

  test('carries the loader errors through', () => {
    const d = doc([]);
    d.errors = [{ message: 'Balance failed', file: 'l.beancount', line: 12 }];
    expect(balancesOf(d).errors).toEqual(['l.beancount:12: Balance failed']);
  });
});

describe('fold', () => {
  test('sums the per-currency sub-accounts back onto the beancount account', () => {
    const folded = fold(
      { 'Assets:Wallet:USD': { USD: '100' }, 'Assets:Wallet:EUR': { EUR: '80' } },
      report({ 'Assets:Wallet:USD': 'Assets:Wallet', 'Assets:Wallet:EUR': 'Assets:Wallet' }),
    );
    expect(folded).toEqual({ 'Assets:Wallet': { EUR: '80', USD: '100' } });
  });

  test('drops the plug accounts, which exist on only one side', () => {
    const folded = fold(
      { 'Assets:Bank': { USD: '100' }, 'Equity:Rounding:USD': { USD: '0.003' }, 'Equity:Adjustments': { USD: '5' } },
      report(),
    );
    expect(folded).toEqual({ 'Assets:Bank': { USD: '100' } });
  });

  test('drops accounts whose postings cancel out', () => {
    // One side will have the account and the other will not; for "did the money move" they agree.
    expect(fold({ 'Assets:Bank': { USD: '0' } }, report())).toEqual({});
  });
});

describe('compareBalances', () => {
  const before = balancesOf(doc([
    tx('2019-01-01', 'a', [post('Assets:Bank', '100.00', 'USD'), post('Equity:Opening', '-100.00', 'USD')]),
  ]));

  test('an import that preserved every total reports nothing', () => {
    const after = balancesOf(doc([
      // Same amounts, written at a different scale — which is what a round trip through
      // gainstrack's serializer and beancount's parser actually does to them.
      tx('2019-01-01', 'a', [post('Assets:Bank', '100', 'USD'), post('Equity:Opening', '-100', 'USD')]),
    ]));
    expect(compareBalances(before, after, report())).toEqual([]);
  });

  test('a moved amount is reported with both sides', () => {
    const after = balancesOf(doc([
      tx('2019-01-01', 'a', [post('Assets:Bank', '90', 'USD'), post('Equity:Opening', '-90', 'USD')]),
    ]));
    expect(compareBalances(before, after, report())).toEqual([
      { account: 'Assets:Bank', currency: 'USD', before: '100', after: '90' },
      { account: 'Equity:Opening', currency: 'USD', before: '-100', after: '-90' },
    ]);
  });

  test('an account the import lost entirely is reported', () => {
    expect(compareBalances(before, balancesOf(doc([])), report())).toEqual([
      { account: 'Assets:Bank', currency: 'USD', before: '100', after: null },
      { account: 'Equity:Opening', currency: 'USD', before: '-100', after: null },
    ]);
  });

  test('a split account compares equal once folded', () => {
    const after = balancesOf(doc([
      tx('2019-01-01', 'a', [post('Assets:Bank:USD', '100', 'USD'), post('Equity:Opening:USD', '-100', 'USD')]),
    ]));
    const r = report({ 'Assets:Bank:USD': 'Assets:Bank', 'Equity:Opening:USD': 'Equity:Opening' });
    expect(compareBalances(before, after, r)).toEqual([]);
  });
});

describe('pluggedAmounts', () => {
  test('reports a non-zero adjustment, which fold deliberately hides', () => {
    const after = balancesOf(doc([
      tx('2019-01-01', 'a', [post('Assets:Bank', '100', 'USD'), post('Equity:Adjustments', '-100', 'USD')]),
    ]));
    expect(pluggedAmounts(after)).toEqual(['Equity:Adjustments -100 USD']);
  });

  test('says nothing when the adjustments cancel out', () => {
    const after = balancesOf(doc([
      tx('2019-01-01', 'a', [post('Equity:Adjustments', '100', 'USD'), post('Assets:Bank', '-100', 'USD')]),
      tx('2019-01-02', 'b', [post('Equity:Adjustments', '-100', 'USD'), post('Assets:Bank', '100', 'USD')]),
    ]));
    expect(pluggedAmounts(after)).toEqual([]);
  });
});
