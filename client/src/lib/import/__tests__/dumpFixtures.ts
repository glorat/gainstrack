// Builders for dump documents, shared by the import specs.
//
// These are what beancount's loader PRODUCES, not what a user writes: amounts are already
// interpolated, `pad` has already become a `P`-flagged transaction, and costs are already booked.
// Writing them by hand is the only way to test the import without a beancount install.

import { DumpDocument, DumpEntry, DumpPosting } from '../beancountDump';

export function doc(entries: DumpEntry[], options: Record<string, unknown> = {}): DumpDocument {
  return { schema: 1, source: 'test.beancount', options, errors: [], entries };
}

/** The fields every entry carries. Spread into inline entries for the types with no builder. */
export const meta = { meta: {}, location: { file: null, line: null } };

export function open(date: string, account: string, ...currencies: string[]): DumpEntry {
  return { type: 'open', date, account, currencies, booking: null, ...meta };
}

export function post(
  account: string,
  number: string,
  currency: string,
  extra: Partial<DumpPosting> = {},
): DumpPosting {
  return { account, units: { number, currency }, cost: null, price: null, flag: null, meta: {}, ...extra };
}

export function tx(
  date: string,
  narration: string,
  postings: DumpPosting[],
  extra: Record<string, unknown> = {},
): DumpEntry {
  return {
    type: 'transaction', date, flag: '*', payee: null, narration,
    tags: [], links: [], postings, ...meta, ...extra,
  } as DumpEntry;
}
