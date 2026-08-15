// Typed command model for the generator, reconstructed from the parser's typed output
// (`Parsed`). Mirrors the Scala `AccountCommand` case classes but with decimal `GAmount`.

import { Amount as DTOAmount } from 'src/lib/assetdb/models';
import { Parsed, ParsedPosting, Kind } from 'src/lib/GainstrackParser';
import { CashflowTag } from 'src/lib/gen/cashflowClass';
import { GAmount } from 'src/lib/gen/money';
import { GPosting } from 'src/lib/gen/posting';

// Fields are guaranteed present per command kind by the parser (validated upstream).

export interface GAccountOptions {
  tradingAccount: boolean;
  description: string;
  multiAsset: boolean;
  automaticReinvestment: boolean;
  generatedAccount: boolean;
  hidden: boolean;
  placeholder: boolean;
  expenseAccount?: string;
  incomeAccount?: string;
  fundingAccount?: string;
  // The cash flow tags. Both are OPTIONAL and absent unless written, which is what keeps them off
  // every existing golden — see the note on `defaultAccountOptions` in the parser. They are also
  // TypeScript-only: Scala's `applyOption` rejects both keys, so no fixture ledger may use them.
  /** This account and its descendants are cash / cash equivalents. */
  cashEquivalent?: boolean;
  /** Flows against this account and its descendants classify here. */
  cashflowClass?: CashflowTag;
}

export interface OpenCmd { kind: 'open'; date: string; accountId: string; assetId: string; options: GAccountOptions; }
// `tag` is the income/expense tag exactly as written ("Salary", or "Income:Salary" if the user
// qualified it). Scala keeps it as `incomeTag`/`expenseTag` and narrates transactions with it,
// so it is not recoverable from the resolved `accountId`.
export interface EarnCmd { kind: 'earn'; date: string; accountId: string; value: GAmount; target?: string; tag: string; }
export interface SpendCmd { kind: 'spend'; date: string; accountId: string; value: GAmount; other?: string; tag: string; }
export interface TfrCmd { kind: 'tfr'; date: string; source: string; dest: string; sourceValue: GAmount; targetValue: GAmount; }
export interface TradeCmd { kind: 'trade'; date: string; accountId: string; security: GAmount; price: GAmount; commission: GAmount; }
export interface AdjCmd { kind: 'adj'; date: string; accountId: string; balance: GAmount; adjAccount: string; }
export interface BalCmd { kind: 'bal'; date: string; accountId: string; balance: GAmount; adjAccount: string; }
export interface PriceCmd { kind: 'price'; date: string; assetId: string; price: GAmount; }
export interface UnitCmd { kind: 'unit'; date: string; accountId: string; security: GAmount; price: GAmount; }
export interface FundCmd { kind: 'fund'; date: string; accountId: string; change: GAmount; source?: string; }
export interface YieldCmd { kind: 'yield'; date: string; accountId: string; asset?: string; value: GAmount; target?: string; }
export interface CommodityCmd { kind: 'commodity'; date: string; asset: string; options: Record<string, unknown>; }
export interface CloseCmd { kind: 'close'; date: string; accountId: string; }
/**
 * The raw multi-posting transaction — gainstrack's only command that carries postings verbatim
 * rather than deriving them from a stated intent.
 *
 * It exists so a beancount ledger can always be lowered into gainstrack: every other command
 * produces exactly two postings (or a fixed handful), so a paycheck with tax withheld, a split
 * payment, or a mortgage payment divided between interest and principal has no representation
 * at all. In the beancount example corpus 8.2% of transactions have more than two postings.
 *
 * The trade-off is real and deliberate: a `tx` states no intent, so the reports that read intent
 * (contribution analysis, P&L explain) see only the postings. Lifting raw txs back into `trade`
 * / `tfr` / `earn` etc. is the importer's job, not the engine's.
 */
export interface TxCmd { kind: 'tx'; date: string; description: string; postings: GPosting[]; }
export interface GlobalCmd { kind: 'global'; operatingCurrency: string; }

export type GCommand =
  | OpenCmd | EarnCmd | SpendCmd | TfrCmd | TradeCmd | AdjCmd | BalCmd
  | PriceCmd | UnitCmd | FundCmd | YieldCmd | CommodityCmd | CloseCmd | TxCmd | GlobalCmd;

function amt(a: DTOAmount): GAmount {
  return GAmount.of(a.number, a.ccy);
}

/**
 * A `tx` posting, built from the source LITERAL rather than the parsed float.
 *
 * Every other command routes its amounts through `Amount.number`, a JS float, which is fine
 * because Scala parity is defined against that same pipeline. A `tx` is different: its numbers
 * come out of a beancount ledger, where `decimal.Decimal` routinely carries more precision than
 * a float holds, and the zero-sum rule below is an exact comparison. Rounding first and then
 * demanding an exact zero would reject ledgers beancount itself accepts.
 */
function txPosting(p: ParsedPosting): GPosting {
  const a = (v: DTOAmount | undefined, raw: string | undefined): GAmount | undefined =>
    v === undefined ? undefined : GAmount.of(raw ?? v.number, v.ccy);
  return new GPosting(p.account, a(p.value, p.raws?.value)!, a(p.price, p.raws?.price), a(p.cost, p.raws?.cost));
}

/**
 * Beancount's balance rule: the postings' WEIGHTS sum to zero in every currency, where a
 * posting's weight is its cost basis if it has one, its converted value if it has a price, and
 * its face value otherwise. So `-1000 USD` against `10 AAPL {100 USD}` balances, and so does
 * `-1000 USD` against `800 EUR @1.25 USD`.
 *
 * Exact, with no tolerance. Beancount tolerates a small residue and books it away; we do not,
 * because the alternative is a ledger whose transactions quietly do not add up and whose reports
 * are therefore wrong by an amount nobody chose. The importer is responsible for turning a
 * tolerated beancount residue into an explicit posting before it gets here.
 */
function validateTx(date: string, description: string, postings: GPosting[]): void {
  if (postings.length < 2) {
    throw new Error(`${date} tx "${description}" needs at least two postings, got ${postings.length}`);
  }
  const byCcy = new Map<string, GAmount>();
  for (const p of postings) {
    const w = p.weight;
    byCcy.set(w.ccy, (byCcy.get(w.ccy) ?? GAmount.of(0, w.ccy)).add(w));
  }
  const unbalanced = [...byCcy.values()].filter(v => !v.isZero);
  if (unbalanced.length > 0) {
    throw new Error(`${date} tx "${description}" does not balance: ${unbalanced.map(v => v.toString()).join(', ')}`);
  }
}

/** Reconstruct a typed GCommand from one parser `Parsed`. */
function toGCommand(p: Parsed): GCommand {
  const d = p.dto;
  const kind: Kind = p.kind;
  switch (kind) {
    case 'open':
      return { kind, date: d.date, accountId: d.accountId, assetId: d.balance!.ccy, options: d.options as unknown as GAccountOptions };
    case 'earn':
      return { kind, date: d.date, accountId: d.accountId, value: amt(d.change!), target: d.otherAccount, tag: p.tag ?? d.accountId };
    case 'spend':
      return { kind, date: d.date, accountId: d.accountId, value: amt(d.change!), other: d.otherAccount, tag: p.tag ?? d.accountId };
    case 'tfr':
      return { kind, date: d.date, source: d.accountId, dest: d.otherAccount!, sourceValue: amt(d.change!), targetValue: amt(p.tfrTarget!) };
    case 'trade':
      return { kind, date: d.date, accountId: d.accountId, security: amt(d.change!), price: amt(d.price!), commission: amt(d.commission!) };
    case 'adj':
      return { kind, date: d.date, accountId: d.accountId, balance: amt(d.balance!), adjAccount: d.otherAccount! };
    case 'bal':
      return { kind, date: d.date, accountId: d.accountId, balance: amt(d.balance!), adjAccount: d.otherAccount! };
    case 'price':
      return { kind, date: d.date, assetId: d.asset!, price: amt(d.price!) };
    case 'unit':
      return { kind, date: d.date, accountId: d.accountId, security: amt(d.balance!), price: amt(d.price!) };
    case 'fund':
      return { kind, date: d.date, accountId: d.accountId, change: amt(d.change!), source: d.otherAccount };
    case 'yield':
      return { kind, date: d.date, accountId: d.accountId, asset: d.asset, value: amt(d.change!), target: d.otherAccount };
    case 'commodity':
      return { kind, date: d.date, asset: d.asset!, options: d.options as Record<string, unknown> };
    case 'close':
      return { kind, date: d.date, accountId: d.accountId };
    case 'tx': {
      const postings = (p.postings ?? []).map(txPosting);
      const description = p.txDescription ?? '';
      validateTx(d.date, description, postings);
      return { kind, date: d.date, description, postings };
    }
    case 'global':
      return { kind, operatingCurrency: (d.options as { operatingCurrency: string }).operatingCurrency };
  }
}

export function buildCommands(parsed: Parsed[]): GCommand[] {
  return parsed.map(toGCommand);
}
