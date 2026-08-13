// The JSON contract between bean2gain's `dump.py` and the importer.
//
// Everything upstream of this file is beancount's own loader, so includes, arithmetic, elided
// amounts, plugins, pad expansion and booking are all already done and are guaranteed to agree
// with what `bean-check` would say. Nothing here parses beancount syntax, and nothing here
// should ever start to — which is also what keeps this side free of beancount's licence.
//
// How the document arrives is not this file's business, and there are two ways: `dump.py` run
// against a local python (`tools/beancount-oracle/cli.ts`), or the same script under WASM on
// bean2gain's origin, answering over `postMessage` (`src/lib/bean2gain/bridge.ts`). Both produce
// the identical document, which is why the conversion below is written once.
//
// Numbers arrive as STRINGS. beancount computes in `decimal.Decimal`; a JSON number is a binary
// float, and a lot cost that has been through one no longer balances against the cash leg it
// came from. Keep them as strings until they reach `Decimal`.

/** Bumped in lockstep with `SCHEMA_VERSION` in dump.py. */
export const SUPPORTED_SCHEMA = 1;

export interface DumpAmount { number: string | null; currency: string }

export interface DumpCost {
  number: string | null;
  currency: string | null;
  /** The lot's acquisition date. Gainstrack's `{...}` has nowhere to put this — see the report. */
  date: string | null;
  label: string | null;
}

export interface DumpPosting {
  account: string;
  units: DumpAmount | null;
  cost: DumpCost | null;
  price: DumpAmount | null;
  flag: string | null;
  meta: Record<string, unknown>;
}

export interface DumpLocation { file: string | null; line: number | null }

interface DumpBase {
  date: string;
  meta: Record<string, unknown>;
  location: DumpLocation;
}

export interface DumpTransaction extends DumpBase {
  type: 'transaction';
  /**
   * `P` marks a transaction the LOADER synthesized to satisfy a `pad`. It is the only reliable
   * way to tell one from a transaction the user wrote, and the importer folds those back into
   * the `bal` command that gainstrack expresses the same idea with.
   */
  flag: string | null;
  payee: string | null;
  narration: string | null;
  tags: string[];
  links: string[];
  postings: DumpPosting[];
}

export interface DumpOpen extends DumpBase {
  type: 'open';
  account: string;
  currencies: string[];
  booking: string | null;
}

export interface DumpClose extends DumpBase { type: 'close'; account: string }
export interface DumpCommodity extends DumpBase { type: 'commodity'; currency: string }
export interface DumpPad extends DumpBase { type: 'pad'; account: string; source_account: string }

export interface DumpBalance extends DumpBase {
  type: 'balance';
  account: string;
  amount: DumpAmount | null;
  tolerance: string | null;
  /** Non-null means beancount itself considers the assertion FAILED, by this much. */
  diff: DumpAmount | null;
}

export interface DumpPrice extends DumpBase { type: 'price'; currency: string; amount: DumpAmount | null }
export interface DumpNote extends DumpBase { type: 'note'; account: string; comment: string }
export interface DumpDocument_ extends DumpBase { type: 'document'; account: string; filename: string }
export interface DumpEvent extends DumpBase { type: 'event'; event_type: string; description: string }
export interface DumpQuery extends DumpBase { type: 'query'; name: string; query_string: string }
export interface DumpCustom extends DumpBase { type: 'custom'; custom_type: string; values: unknown[] }
export interface DumpUnknown extends DumpBase { type: 'unknown'; python_type: string }

export type DumpEntry =
  | DumpTransaction | DumpOpen | DumpClose | DumpCommodity | DumpPad | DumpBalance
  | DumpPrice | DumpNote | DumpDocument_ | DumpEvent | DumpQuery | DumpCustom | DumpUnknown;

export interface DumpError { message: string; file: string | null; line: number | null }

export interface DumpDocument {
  schema: number;
  source: string;
  options: Record<string, unknown>;
  errors: DumpError[];
  entries: DumpEntry[];
}

/**
 * Parse and version-check a dump document.
 *
 * The version check is not ceremony: a future dump that renames a field would otherwise read as
 * a ledger in which nobody ever used that feature, and the import would quietly lose data while
 * reporting success.
 */
export function parseDump(json: string): DumpDocument {
  const doc = JSON.parse(json) as DumpDocument;
  if (doc?.schema !== SUPPORTED_SCHEMA) {
    throw new Error(
      `unsupported dump schema ${String(doc?.schema)}; this importer reads schema ${SUPPORTED_SCHEMA}. ` +
      'Re-run bean2gain/python/dump.py from the same checkout.',
    );
  }
  if (!Array.isArray(doc.entries)) throw new Error('dump document has no entries');
  return doc;
}

/** `operating_currency` is a beancount LIST option; the first entry is the primary one. */
export function operatingCurrency(doc: DumpDocument): string {
  const raw = doc.options.operating_currency;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'string') return raw[0];
  if (typeof raw === 'string' && raw !== '') return raw;
  return 'USD';
}
