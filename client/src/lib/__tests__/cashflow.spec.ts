// The cash flow statement. Inline ledgers throughout, deliberately: `cashEquivalent` and
// `cashflowClass` are TypeScript-only options that Scala's parser rejects, so a tagged ledger can
// never be added to `fixtureNames.ts` — there would be no golden to dump it against.

import { LocalDate } from '@js-joda/core';
import { buildTagResolver, cashflowStatement, CashflowStatement, defaultClassOf, verbClassOf } from 'src/lib/cashflow';
import { generateAllStateSafe } from 'src/lib/gen/GainstrackGenerator';
import { AllStateEx } from 'src/lib/AllStateEx';

const FROM = LocalDate.parse('2020-01-01');
const TO = LocalDate.parse('2020-12-31');

/** Generate a ledger and run the statement over it. Throws loudly rather than returning junk. */
function statementFor(text: string, from = FROM, to = TO): CashflowStatement {
  const { state, errors } = generateAllStateSafe(text);
  if (!state) throw new Error(`ledger did not generate: ${errors.map(e => e.message).join('; ')}`);
  const ex = new AllStateEx(state);
  // The ledger's own `price` directives are the rate source, via the same trade-FX chain the
  // reports use. Note it INTERPOLATES between price points, so a multi-currency test wanting an
  // exact rate at a period boundary has to quote one on that date.
  return cashflowStatement(ex.allTxs(), state.commands, state.accounts, state.baseCcy, from, to, ex.tradeFxConverter());
}

function totalOf(s: CashflowStatement, cls: string): number {
  return s.sections.find(x => x.cashflowClass === cls)!.total;
}

describe('tag resolution', () => {
  const LEDGER = `option "operating_currency" "USD"
2019-01-01 open Equity:Opening USD
  multiAsset:true
2019-01-01 open Assets:Bank USD
  cashEquivalent:true
2019-01-01 open Assets:Bank:Escrow USD
  cashEquivalent:false
2019-01-01 open Assets:Property USD
  cashflowClass: investing
`;

  const accounts = () => {
    const { state } = generateAllStateSafe(LEDGER);
    return state!.accounts;
  };

  test('a tag covers descendants that declared nothing', () => {
    // The point of inheritance: nobody wrote `Assets:Bank:Current`, but it resolves as cash.
    expect(buildTagResolver(accounts()).isCash('Assets:Bank:Current')).toBe(true);
  });

  test('an explicit false on a child carves it out of a tagged parent', () => {
    const r = buildTagResolver(accounts());
    expect(r.isCash('Assets:Bank')).toBe(true);
    expect(r.isCash('Assets:Bank:Escrow')).toBe(false);
    // and the carve-out is itself inherited downward
    expect(r.isCash('Assets:Bank:Escrow:Held')).toBe(false);
  });

  test('untagged accounts are not cash', () => {
    expect(buildTagResolver(accounts()).isCash('Assets:Property')).toBe(false);
    expect(buildTagResolver(accounts()).isCash('Expenses:Food')).toBe(false);
  });

  test('declaredCashAccounts reports only what was declared true', () => {
    expect(buildTagResolver(accounts()).declaredCashAccounts).toEqual(['Assets:Bank']);
  });

  test('cashflowClass inherits the same way', () => {
    expect(buildTagResolver(accounts()).classOf('Assets:Property:House')).toBe('investing');
    expect(buildTagResolver(accounts()).classOf('Expenses:Food')).toBeUndefined();
  });
});

describe('the root-based default', () => {
  test('classifies by account root when nothing is tagged', () => {
    expect(defaultClassOf('Expenses:Food')).toBe('operating');
    expect(defaultClassOf('Income:Salary')).toBe('operating');
    expect(defaultClassOf('Equity:Opening')).toBe('financing');
    expect(defaultClassOf('Assets:Property')).toBe('investing');
    expect(defaultClassOf('Liabilities:Mortgage')).toBe('investing');
  });

  test('never infers `adjustment`', () => {
    // Holding a flow out of the activity subtotals is always something the user asked for. If the
    // default could infer it, a mistyped account would silently vanish from the statement.
    const roots = ['Assets', 'Liabilities', 'Equity', 'Income', 'Expenses', 'Nonsense'];
    expect(roots.map(r => defaultClassOf(`${r}:X`))).not.toContain('adjustment');
  });
});

describe('classification', () => {
  const BASE = `option "operating_currency" "USD"
2019-01-01 open Equity:Opening USD
  multiAsset:true
2019-01-01 open Assets:Bank USD
  cashEquivalent:true
  multiAsset:true
2019-01-01 open Income:Salary USD
  multiAsset:true
2019-01-01 open Expenses:Food USD
  multiAsset:true
`;

  test('earn is an operating inflow, spend an operating outflow', () => {
    const s = statementFor(`${BASE}2020-03-01 earn Income:Salary Assets:Bank 6000 USD
2020-03-02 spend Expenses:Food Assets:Bank 200 USD
`);
    expect(totalOf(s, 'operating')).toBeCloseTo(5800, 6);
    expect(s.netFlows).toBeCloseTo(5800, 6);
  });

  test('a transaction touching no cash account produces no flow', () => {
    const s = statementFor(`${BASE}2019-01-01 open Assets:Other USD
2019-01-01 open Assets:Yet USD
2020-03-01 tfr Assets:Other Assets:Yet 100 USD
`);
    expect(s.netFlows).toBe(0);
    expect(s.sections.every(x => x.byAccount.length === 0)).toBe(true);
  });

  test('a transfer between two cash accounts nets to zero', () => {
    // Both legs are cash, so there is nothing to classify and nothing to eliminate — the
    // convention makes intra-cash movement cancel rather than needing an intent to spot it.
    const s = statementFor(`${BASE}2019-01-01 open Assets:Bank2 USD
  cashEquivalent:true
2020-03-01 earn Income:Salary Assets:Bank 6000 USD
2020-06-01 tfr Assets:Bank Assets:Bank2 1000 USD
`);
    expect(totalOf(s, 'operating')).toBeCloseTo(6000, 6);
    expect(s.netFlows).toBeCloseTo(6000, 6);
    expect(s.fxEffect).toBeCloseTo(0, 6);
  });

  test('an untagged asset purchase falls to investing via the root default', () => {
    const s = statementFor(`${BASE}2019-01-01 open Assets:Property USD
2020-03-01 earn Income:Salary Assets:Bank 6000 USD
2020-04-01 tfr Assets:Bank Assets:Property 5000 USD
`);
    expect(totalOf(s, 'investing')).toBeCloseTo(-5000, 6);
    expect(totalOf(s, 'operating')).toBeCloseTo(6000, 6);
  });

  test('a cashflowClass tag overrides the root default', () => {
    const s = statementFor(`${BASE}2019-01-01 open Liabilities:CreditCard USD
  cashflowClass: operating
2020-03-01 earn Income:Salary Assets:Bank 6000 USD
2020-04-01 tfr Assets:Bank Liabilities:CreditCard 500 USD
`);
    // Without the tag this would be investing (the Liabilities root default).
    expect(totalOf(s, 'operating')).toBeCloseTo(5500, 6);
    expect(totalOf(s, 'investing')).toBeCloseTo(0, 6);
  });
});

describe('the N-legged transaction', () => {
  test('a mortgage payment splits across operating and financing with no stated intent', () => {
    // The case the verbs cannot reach: three legs means a raw `tx`, which states no intent at all.
    // Each non-cash leg classifies itself, which is what the account convention buys.
    const s = statementFor(`option "operating_currency" "USD"
2019-01-01 open Equity:Opening USD
  multiAsset:true
2019-01-01 open Assets:Bank USD
  cashEquivalent:true
  multiAsset:true
2019-01-01 open Expenses:Interest USD
  cashflowClass: operating
2019-01-01 open Liabilities:Mortgage USD
  cashflowClass: financing
2020-05-01 tx "Mortgage payment"
  Assets:Bank -1000 USD
  Expenses:Interest 300 USD
  Liabilities:Mortgage 700 USD
`);
    expect(totalOf(s, 'operating')).toBeCloseTo(-300, 6);
    expect(totalOf(s, 'financing')).toBeCloseTo(-700, 6);
    expect(s.netFlows).toBeCloseTo(-1000, 6);
  });
});

// A non-cash leg is valued by its WEIGHT, the same rule `tx` balances against
// (`GPosting.weight`): cost basis if it has one, price-converted value if it has a price, face
// value otherwise. A leg's worth and what makes its transaction balance have to be the same
// number, or a transaction can balance while the split of its cash movement does not.
//
// Face value alone is not enough, because it is denominated in the security. Reaching a rate for
// `10 AAPL` means the FX chain, which only knows what a `price`, `trade` or `unit` command put
// there — and `positionSetFx` turns a missing rate into 0 rather than an error. So a costed leg
// valued that way is worth nothing, and the proportional split hands the entire cash movement to
// whichever leg does have a rate.
//
// This is reachable rather than theoretical. `lift.ts` refuses to lift any transaction carrying a
// cost basis, so an imported beancount ledger keeps its securities trades as raw `tx` by design.
describe('non-cash legs are valued by weight', () => {
  const HEAD = `option "operating_currency" "USD"
2019-01-01 open Equity:Opening USD
  multiAsset:true
2019-01-01 open Assets:Bank USD
  cashEquivalent:true
  multiAsset:true
2019-01-01 open Assets:Broker USD
  multiAsset:true
2019-01-01 open Expenses:Commission USD
2019-06-01 fund Assets:Bank Equity:Opening 10000 USD
`;

  test('a priced security splits correctly, which is the shape everything else is measured against', () => {
    const s = statementFor(`${HEAD}2020-03-01 price AAPL 100.00 USD
2020-03-01 tx "buy AAPL with commission"
  Assets:Bank -1005 USD
  Assets:Broker:AAPL 10 AAPL {100.00 USD}
  Expenses:Commission 5 USD
`);
    expect(totalOf(s, 'investing')).toBeCloseTo(-1000, 6);
    expect(totalOf(s, 'operating')).toBeCloseTo(-5, 6);
  });

  test('the cost basis carries the security leg when the FX chain has no rate for it', () => {
    // No `price AAPL` anywhere, which is the shape a beancount import produces. Valued by face
    // value the AAPL leg would be worth 0 and the whole 1,005 outflow would land on the
    // commission, turning a 1,000 investment into 1,005 of operating expense.
    const s = statementFor(`${HEAD}2020-03-01 tx "buy AAPL with commission"
  Assets:Bank -1005 USD
  Assets:Broker:AAPL 10 AAPL {100.00 USD}
  Expenses:Commission 5 USD
`);
    expect(totalOf(s, 'investing')).toBeCloseTo(-1000, 6);
    expect(totalOf(s, 'operating')).toBeCloseTo(-5, 6);

    // The totals come from the cash legs and so were right even when the split was wrong. That is
    // why reconciliation never caught this: it pins the sum and says nothing about the parts.
    expect(s.netFlows).toBeCloseTo(-1005, 6);
    expect(s.fxEffect).toBeCloseTo(0, 6);
    expect(s.closingCash - s.openingCash).toBeCloseTo(-1005, 6);
  });

  test('`@ price` carries the leg the same way', () => {
    // Beancount's other way of stating what a leg is worth, and second in the weight rule.
    const s = statementFor(`${HEAD}2020-03-01 tx "buy AAPL with commission"
  Assets:Bank -1005 USD
  Assets:Broker:AAPL 10 AAPL @100.00 USD
  Expenses:Commission 5 USD
`);
    expect(totalOf(s, 'investing')).toBeCloseTo(-1000, 6);
    expect(totalOf(s, 'operating')).toBeCloseTo(-5, 6);
  });

  test('a sale at a gain values the security leg at cost, not proceeds', () => {
    // Both a cost and a price, which is how a realised gain is written. Weight takes the cost, so
    // the 1,500 investing inflow is the basis recovered and the 500 gain classifies on its own
    // account rather than being folded into the security line.
    const s = statementFor(`${HEAD}2019-01-01 open Income:Gains USD
2019-07-01 tx "buy AAPL"
  Assets:Bank -1500 USD
  Assets:Broker:AAPL 10 AAPL {150.00 USD}
2020-03-01 tx "sell AAPL at a gain"
  Assets:Broker:AAPL -10 AAPL {150.00 USD} @200.00 USD
  Income:Gains -500 USD
  Assets:Bank 2000 USD
`);
    expect(totalOf(s, 'investing')).toBeCloseTo(1500, 6);
    expect(totalOf(s, 'operating')).toBeCloseTo(500, 6);
    expect(s.netFlows).toBeCloseTo(2000, 6);
  });

  test('a lone security leg is valued, not merely rescued by the even-split fallback', () => {
    // This one reported correctly even before weights, but by accident: every leg valued at 0, so
    // `legTotal === 0` sent it down the even-split branch, and an even split across one leg is the
    // whole movement. Now the leg is worth 1,000 and the ordinary proportional path handles it.
    const s = statementFor(`${HEAD}2020-03-01 tx "buy AAPL"
  Assets:Bank -1000 USD
  Assets:Broker:AAPL 10 AAPL {100.00 USD}
`);
    expect(totalOf(s, 'investing')).toBeCloseTo(-1000, 6);
    expect(totalOf(s, 'operating')).toBeCloseTo(0, 6);
  });
});

describe('balance plugs classify by the account they plug to', () => {
  // No command is special-cased. Whether a plug is spending or an unexplained difference is a
  // property of the account it names, and the two kinds of bookkeeping express it by tagging.
  const ledger = (adjAccountOptions: string) => `option "operating_currency" "USD"
2019-01-01 open Equity:Opening USD
  multiAsset:true
2019-01-01 open Assets:Bank USD
  cashEquivalent:true
  multiAsset:true
2019-01-01 open Expenses:General USD
${adjAccountOptions}  multiAsset:true
2020-02-01 bal Assets:Bank 5000 USD Expenses:General
`;

  test('an untagged expense plug is operating spend, not a quarantined adjustment', () => {
    // The personal-finance case: `bal` is how the user records, and the difference IS their
    // unitemised spending. Holding it out of operating would leave the section nearly empty.
    const s = statementFor(ledger(''));
    expect(totalOf(s, 'operating')).toBeCloseTo(5000, 6);
    expect(s.adjustments).toBe(0);
    expect(s.fxEffect).toBeCloseTo(0, 6);
  });

  test('tagging the adjustment account holds it out of the subtotals', () => {
    // The company case: an unexplained difference must not be presented as an activity.
    const s = statementFor(ledger('  cashflowClass: adjustment\n'));
    expect(s.adjustments).toBeCloseTo(5000, 6);
    expect(s.adjustmentsByAccount).toEqual([{ account: 'Expenses:General:USD', value: 5000 }]);
    expect(s.sections.every(x => x.total === 0)).toBe(true);
    // still counted in the net change, so the plug does not leak into the FX line
    expect(s.fxEffect).toBeCloseTo(0, 6);
    expect(s.netFlows).toBeCloseTo(5000, 6);
  });

  test('a plug never produces a diagnostic — bal states no activity intent', () => {
    expect(statementFor(ledger('')).diagnostics).toEqual([]);
    expect(statementFor(ledger('  cashflowClass: adjustment\n')).diagnostics).toEqual([]);
  });

  test('fund and adj to the same account classify the same way', () => {
    // They produce identical postings, so keying on the verb would be arbitrary. This is the
    // inconsistency that removing the command special case fixed.
    const base = `option "operating_currency" "USD"
2019-01-01 open Equity:Opening USD
  multiAsset:true
2019-01-01 open Assets:Bank USD
  cashEquivalent:true
  multiAsset:true
`;
    const funded = statementFor(`${base}2020-02-01 fund Assets:Bank Equity:Opening 5000 USD\n`);
    const adjusted = statementFor(`${base}2020-02-01 bal Assets:Bank 5000 USD Equity:Opening\n`);
    expect(totalOf(funded, 'financing')).toBeCloseTo(5000, 6);
    expect(totalOf(adjusted, 'financing')).toBeCloseTo(5000, 6);
  });
});

describe('the reconciliation invariant', () => {
  // The reason the account convention is the primary mechanism rather than the verbs: the total is
  // derived from the cash legs, so it cannot drift from the balance sheet. A non-zero fxEffect in
  // a SINGLE-CURRENCY ledger means a flow was dropped or double-counted.
  const LEDGER = `option "operating_currency" "USD"
2019-01-01 open Equity:Opening USD
  multiAsset:true
2019-01-01 open Assets:Bank USD
  cashEquivalent:true
  multiAsset:true
2019-01-01 open Assets:Bank2 USD
  cashEquivalent:true
2019-01-01 open Assets:Property USD
2019-01-01 open Income:Salary USD
  multiAsset:true
2019-01-01 open Expenses:Food USD
  multiAsset:true
2019-01-01 open Liabilities:Mortgage USD
  cashflowClass: financing
2019-01-01 open Equity:Suspense USD
  cashflowClass: adjustment
  multiAsset:true
2019-06-01 fund Assets:Bank Equity:Opening 10000 USD
2020-03-01 earn Income:Salary Assets:Bank 6000 USD
2020-03-02 spend Expenses:Food Assets:Bank 200 USD
2020-04-01 tfr Assets:Bank Assets:Property 5000 USD
2020-05-01 tfr Assets:Bank Assets:Bank2 1000 USD
2020-06-01 tx "Mortgage payment"
  Assets:Bank -1000 USD
  Expenses:Food 300 USD
  Liabilities:Mortgage 700 USD
2020-07-01 bal Assets:Bank2 2000 USD Equity:Suspense
`;

  test('flows plus adjustments equal the change in cash, with no FX residue', () => {
    const s = statementFor(LEDGER);
    expect(s.fxEffect).toBeCloseTo(0, 6);
    expect(s.closingCash - s.openingCash).toBeCloseTo(s.netFlows, 6);
  });

  test('the opening balance excludes pre-period funding', () => {
    // The 2019 `fund` is before the period, so it belongs to opening cash and not to financing.
    const s = statementFor(LEDGER);
    expect(s.openingCash).toBeCloseTo(10000, 6);
    expect(totalOf(s, 'financing')).toBeCloseTo(-700, 6);
  });

  test('a tagged suspense plug is held out of the subtotals but still counted', () => {
    const s = statementFor(LEDGER);
    // The plug is the DIFFERENCE, not the asserted figure: Assets:Bank2 already held 1000 from the
    // transfer above, so asserting 2000 moves 1000.
    expect(s.adjustments).toBeCloseTo(1000, 6);
    expect(s.adjustmentsByAccount.map(l => l.account)).toEqual(['Equity:Suspense:USD']);
    // and the reconciliation still holds with it there
    expect(s.closingCash - s.openingCash).toBeCloseTo(s.netFlows, 6);
  });

  test('sections sum to netFlows less adjustments', () => {
    const s = statementFor(LEDGER);
    const sections = s.sections.reduce((a, x) => a + x.total, 0);
    expect(sections + s.adjustments).toBeCloseTo(s.netFlows, 6);
  });
});

describe('multi-currency', () => {
  // The IAS 7 "effect of exchange rate changes on cash held" line. Foreign cash held across a
  // period revalues without any posting, so it can only ever appear as a balancing figure — and
  // the cash-set definition produces it for free rather than as a separate computation.
  const LEDGER = `option "operating_currency" "USD"
2019-01-01 open Equity:Opening USD
  multiAsset:true
2019-01-01 open Assets:BankUSD USD
  cashEquivalent:true
  multiAsset:true
2019-01-01 open Assets:BankGBP GBP
  cashEquivalent:true
  multiAsset:true
2019-06-01 fund Assets:BankGBP Equity:Opening 1000 GBP
2020-01-01 price GBP 1.2 USD
2020-12-31 price GBP 1.5 USD
`;

  test('revaluation of foreign cash held appears as the FX effect and nowhere else', () => {
    // Prices sit ON the period boundaries: the converter interpolates linearly between price
    // points, so a rate quoted mid-period would not be the rate in force at the boundary.
    const s = statementFor(LEDGER);
    // GBP1000 held throughout: worth $1200 at the open, $1500 at the close. No posting explains
    // the $300, so it must land on the FX line rather than in any activity class.
    expect(s.openingCash).toBeCloseTo(1200, 6);
    expect(s.closingCash).toBeCloseTo(1500, 6);
    expect(s.netFlows).toBeCloseTo(0, 6);
    expect(s.fxEffect).toBeCloseTo(300, 6);
    expect(s.sections.every(x => x.total === 0)).toBe(true);
  });
});

describe('the verb cross-check', () => {
  test('verbClassOf has no opinion where the command states no intent', () => {
    expect(verbClassOf('trade')).toBe('investing');
    expect(verbClassOf('fund')).toBe('financing');
    expect(verbClassOf('spend')).toBe('operating');
    expect(verbClassOf('tfr')).toBeUndefined();
    expect(verbClassOf('tx')).toBeUndefined();
    expect(verbClassOf(undefined)).toBeUndefined();
  });

  test('a tag contradicting its verb is reported', () => {
    // `spend` means operating; the account says financing. One of them is wrong, and the whole
    // point is that a single-signal report could not tell.
    const s = statementFor(`option "operating_currency" "USD"
2019-01-01 open Equity:Opening USD
  multiAsset:true
2019-01-01 open Assets:Bank USD
  cashEquivalent:true
  multiAsset:true
2019-01-01 open Expenses:Odd USD
  cashflowClass: financing
  multiAsset:true
2020-03-01 spend Expenses:Odd Assets:Bank 100 USD
`);
    expect(s.diagnostics).toHaveLength(1);
    expect(s.diagnostics[0]).toMatchObject({
      date: '2020-03-01',
      // `Expenses:Odd` is multiAsset, so the posting lands on the generated `:USD` child that the
      // ledger never names — and the parent's tag still reaches it. That is the inheritance rule
      // doing the work an exact-match convention could not.
      account: 'Expenses:Odd:USD',
      tagClass: 'financing',
      verbClass: 'operating',
    });
    // the flow still counts, and counts where the TAG says — diagnostics review, they do not rewrite
    expect(totalOf(s, 'financing')).toBeCloseTo(-100, 6);
  });

  test('agreement produces no diagnostics', () => {
    const s = statementFor(`option "operating_currency" "USD"
2019-01-01 open Equity:Opening USD
  multiAsset:true
2019-01-01 open Assets:Bank USD
  cashEquivalent:true
  multiAsset:true
2019-01-01 open Expenses:Food USD
  multiAsset:true
2020-03-01 spend Expenses:Food Assets:Bank 100 USD
`);
    expect(s.diagnostics).toEqual([]);
  });
});

describe('nothing tagged', () => {
  test('reports an empty cash set rather than a zeroed statement', () => {
    const s = statementFor(`option "operating_currency" "USD"
2019-01-01 open Equity:Opening USD
  multiAsset:true
2019-01-01 open Assets:Bank USD
  multiAsset:true
2019-01-01 open Income:Salary USD
  multiAsset:true
2020-03-01 earn Income:Salary Assets:Bank 6000 USD
`);
    expect(s.declaredCashAccounts).toEqual([]);
    expect(s.netFlows).toBe(0);
    expect(s.openingCash).toBe(0);
    expect(s.closingCash).toBe(0);
  });
});
