// Port of `AccountCommand.toGainstrack` — commands back to gainstrack source text.
//
// This is the write path's foundation. The Firestore ledger stores `cmdStrs: Seq[Seq[String]]`
// (one command = one list of lines), and every event appended to the stream carries these
// strings, so a wrong serializer corrupts the ledger rather than merely displaying badly.
//
// Fidelity notes:
//  - Scala prints amounts as `BigDecimal.toPlainString`, preserving the source literal's scale
//    ("2000.00" stays "2000.00"). The parser keeps those literals in `Parsed.raws`, so a
//    parse -> serialize round trip is byte-exact. Commands built in the UI have no raws and
//    fall back to a plain rendering of the number.
//  - Option lines are NOT uniformly formatted in Scala: booleans emit `name:true` (no space),
//    everything else emits `name: value`. Both parse, but only one round-trips.

import { AccountCommandDTO, Amount } from 'src/lib/assetdb/models';
import { Kind, Parsed, ParsedPosting } from 'src/lib/GainstrackParser';

/** A command as stored: its command line plus any indented option lines. */
export type CommandBlock = string[];

function plainNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const s = String(n);
  if (!s.includes('e') && !s.includes('E')) return s;
  return n.toFixed(10).replace(/0+$/, '').replace(/\.$/, '');
}

function amt(a: Amount, raw?: string): string {
  return `${raw ?? plainNumber(a.number)} ${a.ccy}`;
}

// ---- option lines (mirrors CommandOptions.scala) ----------------------------

/** `boolStr` — emitted only when true, and deliberately WITHOUT a space after the colon. */
function boolStr(name: string, value: unknown): CommandBlock {
  return value === true ? [`  ${name}:true`] : [];
}

/**
 * `boolStrDefined` — emitted whenever the option is present, `false` included.
 *
 * `boolStr` above drops a false because every Scala-mirrored boolean defaults to false, so the
 * absent and false spellings mean the same thing. `cashEquivalent` is different: it resolves by
 * walking UP the account tree, so an explicit `false` on a child is the only way to carve it out
 * of a tagged parent. Dropping it here would silently re-include the account on the next save,
 * and since the Firestore stream stores the serialized text, that rewrite gets persisted.
 */
function boolStrDefined(name: string, value: unknown): CommandBlock {
  return typeof value === 'boolean' ? [`  ${name}:${value}`] : [];
}

/** `stringStr` — emitted only when set AND non-empty, with a space after the colon. */
function stringStr(name: string, value: unknown): CommandBlock {
  return typeof value === 'string' && value !== '' ? [`  ${name}: ${value}`] : [];
}

/**
 * `acctStr` — the account-valued options, which are `Option[AccountId]` in Scala and emit
 * whenever the Option is DEFINED, empty string included. `stringStr` would drop `Some("")`.
 *
 * The difference is reachable: `fundingAccount:` with nothing after the colon parses to
 * `Some("")`. Dropping it on the way out would silently rewrite the user's ledger, and since the
 * Firestore stream stores these strings, that rewrite is what gets persisted.
 */
function acctStr(name: string, value: unknown): CommandBlock {
  return typeof value === 'string' ? [`  ${name}: ${value}`] : [];
}

/** `setStr` — a Set, so blanks are dropped and the values are SORTED, not source order. */
function setStr(name: string, values: unknown): CommandBlock {
  if (!Array.isArray(values) || values.length === 0) return [];
  const items = (values as string[]).filter(v => v !== '').sort();
  return [`  ${name}: ${items.join(',')}`];
}

/**
 * AccountOptions.toGainstrack — field order is significant and matches the Scala source.
 *
 * The two cash flow options are appended AFTER the Scala-mirrored block rather than slotted into
 * it, so an untagged account serializes byte-identically to before and every export golden holds.
 */
function accountOptionLines(options: Record<string, unknown>): CommandBlock {
  return [
    ...acctStr('expenseAccount', options.expenseAccount),
    ...boolStr('tradingAccount', options.tradingAccount),
    ...acctStr('incomeAccount', options.incomeAccount),
    ...acctStr('fundingAccount', options.fundingAccount),
    ...boolStr('multiAsset', options.multiAsset),
    ...boolStr('automaticReinvestment', options.automaticReinvestment),
    ...boolStr('hidden', options.hidden),
    ...boolStr('placeholder', options.placeholder),
    ...boolStrDefined('cashEquivalent', options.cashEquivalent),
    ...stringStr('cashflowClass', options.cashflowClass),
  ];
}

/** CommodityOptions.toGainstrack — name, tags, ticker, then any custom keys. */
function commodityOptionLines(options: Record<string, unknown>): CommandBlock {
  const known = new Set(['name', 'tags', 'ticker']);
  const custom = Object.keys(options).filter(k => !known.has(k)).sort();
  return [
    ...stringStr('name', options.name),
    ...setStr('tags', options.tags),
    ...stringStr('ticker', options.ticker),
    ...custom.flatMap(k => stringStr(k, options[k])),
  ];
}

/** One `tx` posting line: `  <account> <amount> [{cost}] [@price]`. */
function txPostingLine(p: ParsedPosting): string {
  const raws = p.raws ?? {};
  const cost = p.cost ? ` {${amt(p.cost, raws.cost)}}` : '';
  const price = p.price ? ` @${amt(p.price, raws.price)}` : '';
  return `  ${p.account} ${amt(p.value, raws.value)}${cost}${price}`;
}

// ---- per-command serialization ---------------------------------------------

function commandLines(p: Parsed): CommandBlock {
  const kind: Kind = p.kind;
  const d: AccountCommandDTO = p.dto;
  const raws = p.raws ?? {};
  const date = d.date;
  switch (kind) {
    case 'open':
      return [`${date} open ${d.accountId} ${d.balance!.ccy}`,
        ...accountOptionLines(d.options as Record<string, unknown>)];

    // Always written with the mandatory `Income:`/`Expenses:` prefix, even when the source
    // omitted it. The bare form still parses, so this is how a legacy ledger migrates itself.
    case 'earn': {
      const value = amt(d.change!, raws.change);
      return [d.otherAccount
        ? `${date} earn ${d.accountId} ${d.otherAccount} ${value}`
        : `${date} earn ${d.accountId} ${value}`];
    }

    case 'spend': {
      const value = amt(d.change!, raws.change);
      return [d.otherAccount
        ? `${date} spend ${d.accountId} ${d.otherAccount} ${value}`
        : `${date} spend ${d.accountId} ${value}`];
    }

    case 'tfr': {
      // Scala omits the target leg when both legs are the same Amount (number AND ccy).
      const src = amt(d.change!, raws.change);
      const tgt = p.tfrTarget ? amt(p.tfrTarget, raws.tfrTarget) : src;
      const base = `${date} tfr ${d.accountId} ${d.otherAccount} ${src}`;
      return [tgt === src ? base : `${base} ${tgt}`];
    }

    case 'trade': {
      const base = `${date} trade ${d.accountId} ${amt(d.change!, raws.change)} @${amt(d.price!, raws.price)}`;
      const comm = d.commission;
      return [comm && comm.number !== 0 ? `${base} C${amt(comm, raws.commission)}` : base];
    }

    case 'adj':
      return [`${date} adj ${d.accountId} ${amt(d.balance!, raws.balance)} ${d.otherAccount}`];

    case 'bal':
      return [`${date} bal ${d.accountId} ${amt(d.balance!, raws.balance)} ${d.otherAccount}`];

    case 'price':
      return [`${date} price ${d.asset} ${amt(d.price!, raws.price)}`];

    case 'unit':
      return [`${date} unit ${d.accountId} ${amt(d.balance!, raws.balance)} @${amt(d.price!, raws.price)}`];

    case 'fund': {
      const value = amt(d.change!, raws.change);
      return [d.otherAccount
        ? `${date} fund ${d.accountId} ${d.otherAccount} ${value}`
        : `${date} fund ${d.accountId} ${value}`];
    }

    case 'yield': {
      const value = amt(d.change!, raws.change);
      return [d.asset
        ? `${date} yield ${d.accountId} ${d.asset} ${value}`
        : `${date} yield ${d.accountId} ${value}`];
    }

    case 'commodity':
      return [`${date} commodity ${d.asset}`,
        ...commodityOptionLines(d.options as Record<string, unknown>)];

    case 'close':
      return [`${date} close ${d.accountId}`];

    case 'tx':
      // Two-space indent on the postings, matching the option lines above and beancount's own
      // convention. The parser requires the indent, so losing it here would produce a file that
      // no longer parses as the same ledger.
      return [`${date} tx "${p.txDescription ?? ''}"`, ...(p.postings ?? []).map(txPostingLine)];

    case 'global': {
      // GlobalCommand emits nothing at the default of USD, so a round trip drops the line.
      const ccy = (d.options as { operatingCurrency?: string }).operatingCurrency;
      return ccy && ccy !== 'USD' ? [`option "operating_currency" "${ccy}"`] : [];
    }
  }
}

/** One command's lines, without comments (Scala `toGainstrack`). */
export function toGainstrack(p: Parsed): CommandBlock {
  return commandLines(p);
}

/**
 * One command's lines with its comments prefixed (Scala `toGainstrackWithComments`).
 *
 * Note Scala always re-emits with `; `, so a comment originally written with `#` comes back as
 * `;`. This is the unit stored in the ledger's `cmdStrs`.
 */
export function toGainstrackWithComments(p: Parsed): CommandBlock {
  return [...(p.comments ?? []).map(c => `; ${c}`), ...toGainstrack(p)];
}

/** Every command as its own block, in the parser's sorted order. */
export function toCommandBlocks(commands: Parsed[]): CommandBlock[] {
  return commands.map(toGainstrackWithComments).filter(block => block.length > 0);
}
