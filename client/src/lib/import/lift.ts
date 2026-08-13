// Beancount -> gainstrack, the LIFTING half.
//
// Lowering (`beancountImport.ts`) turns every transaction into a raw `tx`, which is faithful and
// intent-free. This file puts the intent back where it can be recognized without guessing, so
// the reports that read intent — contribution analysis, P&L explain, the investment views — have
// something to read.
//
// Three rules govern every pass here:
//
//   1. **Balances are invariant.** A lift may change how a transaction is SPELT, never what it
//      does. `beancountImportOracle.spec.ts` re-runs the whole balance comparison against the
//      original beancount ledger on the lifted output, so a rule that moves a number fails.
//   2. **No account is renamed.** Renaming is a ledger-wide transformation with its own failure
//      modes (collisions, and every other posting to that account changing meaning). It is not
//      something a per-transaction rewrite may do as a side effect. This is also why `trade` and
//      `yield` are NOT lifted — see the note at the bottom of this file.
//   3. **Nothing is silently lost.** A lifted command's description is generated, so the user's
//      payee/narration would vanish; it is kept as a comment on the command instead, which
//      round-trips through the parser and serializer.
//
// Each rule is independently disableable via `LiftOptions`, because "which rule broke it" is the
// only question worth being able to answer quickly.

import { Amount } from 'src/lib/assetdb/models';
import { GainstrackParser, Parsed, ParsedPosting } from 'src/lib/GainstrackParser';
import { toGainstrackWithComments } from 'src/lib/toGainstrack';
import { ImportReport, ImportResult } from './beancountImport';

export interface LiftOptions {
  /** 2-posting Assets/Liabilities pairs -> `tfr` (two-amount form when the currencies differ). */
  tfr?: boolean;
  /** Income -> asset -> `earn`. */
  earn?: boolean;
  /** Asset -> Expenses -> `spend`. */
  spend?: boolean;
  /** Equity -> asset -> `fund`. */
  fund?: boolean;
}

const ALL: Required<LiftOptions> = { tfr: true, earn: true, spend: true, fund: true };

function root(accountId: string): string {
  const idx = accountId.indexOf(':');
  return idx < 0 ? accountId : accountId.slice(0, idx);
}

function parentOf(accountId: string): string | undefined {
  const idx = accountId.lastIndexOf(':');
  return idx > 0 ? accountId.slice(0, idx) : undefined;
}

function shortName(accountId: string): string {
  return accountId.slice(accountId.lastIndexOf(':') + 1);
}

/** The literal as written, so the lifted command re-renders the user's own number. */
function raw(p: ParsedPosting): string {
  return p.raws?.value ?? String(p.value.number);
}

function abs(literal: string): string {
  return literal.startsWith('-') ? literal.slice(1) : literal;
}

function amt(p: ParsedPosting): string {
  return `${raw(p)} ${p.value.ccy}`;
}

function absAmt(p: ParsedPosting): string {
  return `${abs(raw(p))} ${p.value.ccy}`;
}

/**
 * Undo the lowering's multi-currency routing.
 *
 * Lowering splits an account that holds several currencies into `X:CCY` sub-accounts, because
 * gainstrack ties one account to one asset. The intent-carrying commands do that routing
 * themselves (`Transfer.toTransfers` appends `:ccy` for a multiAsset account), so a lifted
 * command must name the PARENT or the routing would apply twice and post to `X:USD:USD`.
 *
 * Deliberately derived from the account state rather than from the importer's fold map: this is
 * exactly gainstrack's own routing rule, so it stays correct for a hand-written ledger too. It
 * cannot collide with a real `X:CCY` account, because lowering refuses to make `X` multiAsset
 * when one exists.
 */
function unrouter(commands: Parsed[]): (accountId: string, ccy: string) => string {
  const multiAsset = new Set(
    commands
      .filter(p => p.kind === 'open' && (p.dto.options as { multiAsset?: boolean })?.multiAsset === true)
      .map(p => p.dto.accountId),
  );
  return (accountId: string, ccy: string) => {
    const parent = parentOf(accountId);
    return parent !== undefined && shortName(accountId) === ccy && multiAsset.has(parent) ? parent : accountId;
  };
}

interface Leg {
  /** The account as the lifted COMMAND must name it (parent, where lowering routed by currency). */
  account: string;
  posting: ParsedPosting;
  value: Amount;
}

/**
 * A `tx` is a candidate only if it is an unambiguous two-legged movement.
 *
 * Everything excluded here is excluded because the intent genuinely cannot be read off the
 * postings: three legs could be a split payment or a trade with commission; a cost basis makes
 * the face values not the thing that balances; a zero leg has no direction.
 */
function candidate(p: Parsed, unroute: (a: string, c: string) => string): [Leg, Leg] | undefined {
  const postings = p.postings ?? [];
  if (postings.length !== 2) return undefined;
  if (postings.some(pp => pp.cost !== undefined)) return undefined;
  if (postings.some(pp => pp.value.number === 0)) return undefined;
  const [a, b] = postings;
  if ((a.value.number > 0) === (b.value.number > 0)) return undefined;
  const leg = (pp: ParsedPosting): Leg => ({ account: unroute(pp.account, pp.value.ccy), posting: pp, value: pp.value });
  // Negative leg first throughout: every gainstrack command below is written source-then-target.
  return a.value.number < 0 ? [leg(a), leg(b)] : [leg(b), leg(a)];
}

const ASSETISH = new Set(['Assets', 'Liabilities']);

/** The lifted command line, or undefined to leave the transaction as a raw `tx`. */
function liftedLine(p: Parsed, unroute: (a: string, c: string) => string, opts: Required<LiftOptions>): { line: string; rule: string } | undefined {
  const legs = candidate(p, unroute);
  if (!legs) return undefined;
  const [from, to] = legs;
  const date = p.dto.date;
  const fromRoot = root(from.account);
  const toRoot = root(to.account);
  const sameCcy = from.value.ccy === to.value.ccy;

  // Income -> asset. The income leg is the negative one: money leaves the income account and
  // arrives in the asset account, which is precisely `earn`'s transfer.
  if (opts.earn && fromRoot === 'Income' && ASSETISH.has(toRoot) && sameCcy) {
    return { line: `${date} earn ${from.account} ${to.account} ${amt(to.posting)}`, rule: 'earn' };
  }

  // Asset -> Expenses.
  if (opts.spend && toRoot === 'Expenses' && ASSETISH.has(fromRoot) && sameCcy) {
    return { line: `${date} spend ${to.account} ${from.account} ${amt(to.posting)}`, rule: 'spend' };
  }

  // Equity -> asset. `fund` names the TARGET first, then the funding source.
  if (opts.fund && fromRoot === 'Equity' && ASSETISH.has(toRoot) && sameCcy) {
    return { line: `${date} fund ${to.account} ${from.account} ${amt(to.posting)}`, rule: 'fund' };
  }

  if (opts.tfr && ASSETISH.has(fromRoot) && ASSETISH.has(toRoot)) {
    // Cross-currency needs both legs stated; gainstrack derives the rate from the pair, which is
    // the same rate the posting's `@price` encoded (a two-posting transaction can only balance
    // if it is).
    const line = sameCcy
      ? `${date} tfr ${from.account} ${to.account} ${absAmt(from.posting)}`
      : `${date} tfr ${from.account} ${to.account} ${absAmt(from.posting)} ${amt(to.posting)}`;
    return { line, rule: sameCcy ? 'tfr' : 'tfr (cross-currency)' };
  }

  // Deliberately NOT lifted: Income <-> Expenses with no asset leg (a reclassification, which
  // no gainstrack command expresses), and anything touching Equity that is not funding an asset.
  return undefined;
}

/**
 * Rewrite recognizable raw transactions, and re-serialize.
 *
 * Serialization goes back through `toGainstrackWithComments`, the same function the ledger's
 * write path uses, so the output is a file the parser will read back identically rather than
 * something assembled by string concatenation here.
 */
export function lift(lowered: ImportResult, options: LiftOptions = {}): ImportResult {
  const opts = { ...ALL, ...options };
  const parser = new GainstrackParser();
  parser.parseString(lowered.text);
  const commands = parser.getTypedCommands();
  const unroute = unrouter(commands);

  const report: ImportReport = { ...lowered.report, lifted: { ...lowered.report.lifted } };
  const blocks: string[][] = [];

  for (const p of commands) {
    if (p.kind !== 'tx') {
      blocks.push(toGainstrackWithComments(p));
      continue;
    }
    const lifted = liftedLine(p, unroute, opts);
    if (!lifted) {
      blocks.push(toGainstrackWithComments(p));
      continue;
    }
    report.lifted[lifted.rule] = (report.lifted[lifted.rule] ?? 0) + 1;
    report.rawTransactions -= 1;
    const description = p.txDescription ?? '';
    // The lifted command generates its own description ("Earn 6000 USD Salary"), so the user's
    // payee/narration has nowhere to live. Kept as a comment: visible in the file and preserved
    // by every round trip, even though no report can query it. This is the cost of lifting, and
    // it is the reason each rule is disableable.
    blocks.push([
      ...(p.comments ?? []).map(c => `; ${c}`),
      ...(description ? [`; ${description}`] : []),
      lifted.line,
    ]);
  }

  return { text: `${blocks.flat().join('\n')}\n`, report };
}

// Not implemented, and the reason is worth stating rather than leaving as an absence:
//
// `trade` and `yield` both require the beancount accounts to already be in gainstrack's DERIVED
// shape — a multiAsset `Assets:Broker` whose cash leg is `Assets:Broker:USD`, whose security leg
// is `Assets:Broker:AAPL`, and whose commission lands in `Expenses:Broker:USD`. Real beancount
// ledgers name these things differently (`Assets:Broker:Cash`, `Expenses:Broker:Commission`), so
// recognizing a trade would mean RENAMING accounts across the whole ledger. That is a different
// transformation with its own failure modes — collisions, and every unrelated posting to the
// renamed account changing meaning — and it cannot be verified by the per-transaction balance
// check that keeps the rules above honest. It needs its own stage, its own fold map, and its own
// evidence that the renames are safe.
