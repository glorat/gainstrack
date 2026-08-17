import { describe, it, expect } from 'vitest';
import { LocalDate } from '@js-joda/core';
import { generateAllStateSafe } from '../../gen/GainstrackGenerator';
import { AllStateEx } from '../../AllStateEx';
import { incomeStatement, balanceSheet, changesInEquity, trialBalance, sectionTrees } from '..';

// A small self-contained ledger — no private data, always runs. It exercises every path the FS
// builders take: gross revenue, a cash expense, an accrued (non-cash) expense, a share issue, and a
// year-end close into retained earnings. The Haoxue real-figure tie-out lives in client/local/.
const LEDGER = `option "operating_currency" "SGD"

2025-01-01 open Assets:Bank SGD
  cashEquivalent: true
2025-01-01 open Income:Sales SGD
  fundingAccount: Assets:Bank
2025-01-01 open Expenses:Rent SGD
  fundingAccount: Assets:Bank
2025-01-01 open Expenses:Wages SGD
  fundingAccount: Assets:Bank
2025-01-01 open Equity:ShareCapital SGD
2025-01-01 open Liabilities:Payable SGD

2025-01-05 tfr Equity:ShareCapital Assets:Bank 1000.00 SGD
2025-02-01 earn Sales Assets:Bank 500.00 SGD
2025-03-01 spend Rent Assets:Bank 120.00 SGD
2025-03-15 spend Wages Liabilities:Payable 80.00 SGD
2025-12-31 close
`;

const FROM = LocalDate.parse('2025-01-01');
const TO = LocalDate.parse('2025-12-31');

function makeEx(): AllStateEx {
  const { state, errors } = generateAllStateSafe(LEDGER);
  if (!state) throw new Error(`ledger did not generate: ${errors.map(e => e.message).join('; ')}`);
  return new AllStateEx(state);
}

describe('statement figure builders', () => {
  const ex = makeEx();
  const fx = ex.tradeFxConverter();

  it('income statement: revenue and expenses read positive, profit = revenue − expenses', () => {
    const is = incomeStatement(ex, FROM, TO, fx);
    expect(is.totalRevenue).toBe(500);
    expect(is.totalExpenses).toBe(200); // Rent 120 + Wages 80
    expect(is.profitBeforeTax).toBe(300);

    const rent = is.expenses.find(l => l.account === 'Expenses:Rent');
    const wages = is.expenses.find(l => l.account === 'Expenses:Wages');
    expect(rent?.amount).toBe(120);
    expect(wages?.amount).toBe(80);
    expect(is.revenue.find(l => l.account === 'Income:Sales')?.amount).toBe(500);
  });

  it('balance sheet: assets = liabilities + equity, with the close reflected in equity', () => {
    const bs = balanceSheet(ex, TO, fx);
    expect(bs.totalAssets).toBe(1380); // 1000 shares + 500 sales − 120 rent (wages were accrued)
    expect(bs.totalLiabilities).toBe(80);
    expect(bs.totalEquity).toBe(1300); // share capital 1000 + retained earnings 300
    expect(bs.totalAssets).toBe(bs.totalLiabilities + bs.totalEquity);

    expect(bs.assets.find(l => l.account === 'Assets:Bank')?.amount).toBe(1380);
    expect(bs.liabilities.find(l => l.account === 'Liabilities:Payable')?.amount).toBe(80);
  });

  it('changes in equity: share issue and retained result roll forward from zero', () => {
    const ce = changesInEquity(ex, FROM, TO, fx);
    const share = ce.rows.find(r => r.account === 'Equity:ShareCapital');
    const retained = ce.rows.find(r => r.account.startsWith('Equity:Retained'));
    expect(share).toMatchObject({ opening: 0, movement: 1000, closing: 1000 });
    expect(retained).toMatchObject({ opening: 0, movement: 300, closing: 300 });
    expect(ce.totalClosing).toBe(1300);
  });

  it('trial balance (pre-close): debits equal credits', () => {
    const tb = trialBalance(ex, TO, fx);
    expect(tb.totalDebit).toBe(1580); // Bank 1380 + Rent 120 + Wages 80
    expect(tb.totalCredit).toBe(1580); // Sales 500 + Payable 80 + ShareCapital 1000
    expect(tb.imbalance).toBe(0);
    // pre-close basis: the P&L accounts still show and retained earnings sits at opening (absent)
    expect(tb.rows.find(r => r.account.startsWith('Equity:Retained'))).toBeUndefined();
    expect(tb.rows.find(r => r.account === 'Income:Sales')?.credit).toBe(500);
  });
});

// A parent account can hold its OWN postings while also having a child (manually nested accounts do
// this). Emitting only childless leaves would drop the parent's own balance from the line items while
// the total (root subtree) still includes it, so rows would stop reconciling — own-balance emission
// keeps the parent as its own line.
describe('a parent account that also holds its own postings', () => {
  const NESTED = `option "operating_currency" "USD"

2020-01-01 open Assets:Wallet USD
2020-01-01 open Assets:Wallet:Cash USD
2020-01-01 open Income:Gift USD
  fundingAccount: Assets:Wallet
2020-01-01 open Equity:Opening USD

2020-01-01 bal Assets:Wallet:Cash 30 USD Equity:Opening
2020-06-01 earn Gift Assets:Wallet 70 USD`;
  const { state, errors } = generateAllStateSafe(NESTED);
  if (!state) throw new Error(`ledger did not generate: ${errors.map(e => e.message).join('; ')}`);
  const ex = new AllStateEx(state);
  const fx = ex.tradeFxConverter();
  const AT = LocalDate.parse('2020-12-31');

  it('emits the parent as its own line, and lines reconcile to the total', () => {
    const bs = balanceSheet(ex, AT, fx);
    expect(bs.assets.find(l => l.account === 'Assets:Wallet')?.amount).toBe(70);
    expect(bs.assets.find(l => l.account === 'Assets:Wallet:Cash')?.amount).toBe(30);
    const sum = Math.round(bs.assets.reduce((s, l) => s + l.amount, 0) * 100) / 100;
    expect(sum).toBe(bs.totalAssets);
  });

  it('trial balance stays balanced', () => {
    expect(trialBalance(ex, AT, fx).imbalance).toBe(0);
  });
});

// Regression for the review finding: the flattened builders must express every line and total in the
// BASE currency. Under the store's per-account ('parent') conversion a foreign/security holding stays
// in its own currency or units, so summing across lines is meaningless. A GBP-base ledger holding a
// USD-priced stock (VTI) must value VTI in GBP by chaining VTI→USD→GBP — no direct GBP/VTI rate.
describe('multi-currency statements are expressed in the base currency', () => {
  const MC = `option "operating_currency" "GBP"

2020-01-01 open Assets:Brokerage USD
  multiAsset: true
2020-01-01 open Equity:Opening GBP

2020-01-01 price USD 0.8 GBP
2020-01-01 fund Assets:Brokerage 1000 USD
2020-06-01 trade Assets:Brokerage 5 VTI @100 USD C0 USD`;
  const { state, errors } = generateAllStateSafe(MC);
  if (!state) throw new Error(`ledger did not generate: ${errors.map(e => e.message).join('; ')}`);
  const ex = new AllStateEx(state);
  const fx = ex.tradeFxConverter();
  const AT = LocalDate.parse('2020-12-31');

  it('values a USD-priced holding in the GBP base, and lines reconcile', () => {
    const bs = balanceSheet(ex, AT, fx);
    // 5 VTI × 100 USD × 0.8 GBP/USD = 400 GBP, chained through USD.
    expect(bs.assets.find(l => l.account === 'Assets:Brokerage:VTI')?.amount).toBe(400);
    expect(bs.totalAssets).toBe(800);
    const sum = Math.round(bs.assets.reduce((s, l) => s + l.amount, 0) * 100) / 100;
    expect(sum).toBe(bs.totalAssets);
  });

  it('trial balance balances when cost equals market (no unrealised gain)', () => {
    expect(trialBalance(ex, AT, fx).imbalance).toBe(0);
  });
});

// Regression: date bounding must be opt-in. The Pinia store shares sectionTrees for its Balance
// Sheet / Income Statement, and its old behaviour passed ALL postings (using the date for FX only).
// Bounding on that shared path silently drops future-dated postings from existing app views, so the
// store path stays unbounded while the headless builders opt in to as-of/period bounding.
describe('date bounding is opt-in (store path stays unbounded)', () => {
  const FUT = `option "operating_currency" "USD"

2020-01-01 open Assets:Bank USD
  cashEquivalent: true
2020-01-01 open Income:Sales USD
  fundingAccount: Assets:Bank
2020-01-01 open Equity:ShareCapital USD

2020-06-01 earn Sales Assets:Bank 100.00 USD
2999-01-01 earn Sales Assets:Bank 500.00 USD`;
  const { state, errors } = generateAllStateSafe(FUT);
  if (!state) throw new Error(`ledger did not generate: ${errors.map(e => e.message).join('; ')}`);
  const ex = new AllStateEx(state);
  const fx = ex.tradeFxConverter();
  const AS_OF = LocalDate.parse('2021-01-01'); // before the 2999 posting
  const incomeBalance = (n?: { assetBalance: { number: number }[] }) =>
    Math.round((n?.assetBalance ?? []).reduce((s, b) => s + b.number, 0) * 100) / 100;

  it('the store path (default, unbounded) includes a future-dated posting', () => {
    const trees = sectionTrees(ex, AS_OF, 'parent', fx); // no bounding options → store behaviour
    // Income is credit-normal: both earns (100 + 500) → −600, the future one included.
    expect(incomeBalance(trees.Income)).toBe(-600);
  });

  it('the builder path (bounded) excludes the future posting as-of', () => {
    const is = incomeStatement(ex, LocalDate.parse('2020-01-01'), AS_OF, fx);
    expect(is.totalRevenue).toBe(100);
  });
});
