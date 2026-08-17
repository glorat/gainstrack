import { describe, it, expect } from 'vitest';
import { loadLedger, inferPeriod, buildBundle, buildReport, flattenFigures, diffFigures, LedgerError } from '../lib';

// A self-contained ledger (no private data) exercising the CLI's composition + check helpers. The
// statement figures themselves are proven in client/src/lib/statements; here we test the bundling,
// period inference, figure flattening and the golden-diff that `check` rests on.
const LEDGER = `option "operating_currency" "SGD"

2025-01-01 open Assets:Bank SGD
  cashEquivalent: true
2025-01-01 open Income:Sales SGD
  fundingAccount: Assets:Bank
2025-01-01 open Expenses:Rent SGD
  fundingAccount: Assets:Bank
2025-01-01 open Equity:ShareCapital SGD

2025-01-05 tfr Equity:ShareCapital Assets:Bank 1000.00 SGD
2025-02-01 earn Sales Assets:Bank 500.00 SGD
2025-03-01 spend Rent Assets:Bank 120.00 SGD
2025-12-31 close
`;

describe('gainstrack-cli helpers', () => {
  const ex = loadLedger(LEDGER);

  it('loadLedger throws LedgerError on a bad ledger', () => {
    expect(() => loadLedger('2025-01-01 not a real command')).toThrow(LedgerError);
  });

  it('inferPeriod spans the ledger, respecting overrides', () => {
    expect(inferPeriod(ex)).toEqual({ from: '2025-01-05', to: '2025-12-31', asOf: '2025-12-31' });
    expect(inferPeriod(ex, { from: '2025-01-01' }).from).toBe('2025-01-01');
  });

  it('buildBundle produces all five statements that internally tie', () => {
    const b = buildBundle(ex, inferPeriod(ex, { from: '2025-01-01' }));
    expect(b.incomeStatement.profitBeforeTax).toBe(380); // 500 revenue − 120 rent
    expect(b.balanceSheet.totalAssets).toBe(b.balanceSheet.totalLiabilities + b.balanceSheet.totalEquity);
    expect(b.trialBalance.imbalance).toBe(0);
    expect(b.changesInEquity.totalClosing).toBe(b.balanceSheet.totalEquity);
  });

  it('buildReport all matches buildBundle', () => {
    const period = inferPeriod(ex);
    expect(buildReport('all', ex, period)).toEqual(buildBundle(ex, period));
  });

  it('flattenFigures keys line items by account', () => {
    const flat = flattenFigures(buildBundle(ex, inferPeriod(ex, { from: '2025-01-01' })));
    expect(flat['incomeStatement.totalRevenue']).toBe(500);
    expect(flat['balanceSheet.assets.Assets:Bank']).toBe(1380);
    expect(flat['trialBalance.totalDebit']).toBe(flat['trialBalance.totalCredit']);
  });

  it('diffFigures passes an exact subset and flags a mismatch', () => {
    const flat = flattenFigures(buildBundle(ex, inferPeriod(ex, { from: '2025-01-01' })));
    expect(diffFigures(flat, { 'incomeStatement.totalRevenue': 500 })).toHaveLength(0);
    expect(diffFigures(flat, { 'incomeStatement.totalRevenue': 999 })).toHaveLength(1);
    expect(diffFigures(flat, { 'nope.missing': 1 })).toHaveLength(1);
  });
});
