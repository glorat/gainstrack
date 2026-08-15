// The cash flow tag vocabulary, in its own module because both ends of an existing import arrow
// need it: `GainstrackParser` validates the option value, and `gen/commands` types the option.
// `commands.ts` already imports from the parser, so defining this in either would make a cycle
// around a runtime value.

/** The three IAS 7 activities. Each becomes a section of the statement, with its own subtotal. */
export const CASHFLOW_CLASSES = ['operating', 'investing', 'financing'] as const;
export type CashflowClass = typeof CASHFLOW_CLASSES[number];

/**
 * The fourth tag: flows here are real movements of cash that are NOT an activity.
 *
 * It exists so a `bal`/`adj` plug can be held out of the activity subtotals without the report
 * special-casing those commands. An adjustment account is just an account — tag it and its flows
 * are quarantined, whatever wrote them. That matters because `fund X Equity:Opening 100` and
 * `adj X 100 USD Equity:Opening` produce identical postings, so classifying them differently by
 * which verb happened to write them would be arbitrary.
 *
 * Whether you want it depends on how the books are kept, and that is a property of the accounts
 * rather than of the ledger: someone plugging to `Expenses:General` is asserting real spending they
 * chose not to itemise, while a company plugging to a suspense account has an unexplained
 * difference that must not be presented as an activity. Both are expressed by tagging.
 */
export const ADJUSTMENT_CLASS = 'adjustment';

/** Everything `cashflowClass:` accepts. */
export const CASHFLOW_TAGS = [...CASHFLOW_CLASSES, ADJUSTMENT_CLASS] as const;
export type CashflowTag = typeof CASHFLOW_TAGS[number];

export function isCashflowClass(tag: CashflowTag): tag is CashflowClass {
  return tag !== ADJUSTMENT_CLASS;
}
