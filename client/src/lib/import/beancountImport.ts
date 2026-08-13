// Beancount -> gainstrack, the LOWERING half.
//
// Import is decompilation, not translation. Gainstrack commands state an intent (`trade`,
// `yield`, `tfr`) and derive postings from it; beancount states postings and leaves the intent
// to the reader. Recovering intent is guesswork, so this file does not attempt it: every
// transaction becomes a raw `tx`, which is always faithful and never fails on coverage.
// Recognizing intent is a separate, individually verifiable step — see `lift.ts`.
//
// The consequence to keep in view: what comes out of here alone is a correct ledger with poor
// reporting, because the reports that read intent see only postings. The number of raw txs
// remaining is the quality metric, and it is in the report.
//
// Everything semantic has already happened in beancount's own loader (see `beancountDump.ts`).
// What is left is a mapping problem, and the mapping is in `LOWERING` below.

import { LocalDate } from '@js-joda/core';
import Decimal from 'decimal.js';
import {
  DumpAmount, DumpBalance, DumpDocument, DumpEntry, DumpOpen, DumpPosting, DumpTransaction,
  operatingCurrency,
} from './beancountDump';

/** Where a `bal` books a difference when beancount had no `pad` to name a source. */
export const DEFAULT_ADJUSTMENT_ACCOUNT = 'Equity:Adjustments';
/** Where a residue beancount tolerated but gainstrack will not is made explicit. */
export const ROUNDING_ACCOUNT = 'Equity:Rounding';

const GAINSTRACK_ROOTS = ['Assets', 'Liabilities', 'Equity', 'Income', 'Expenses'] as const;
const ROOT_OPTION_KEYS = ['name_assets', 'name_liabilities', 'name_equity', 'name_income', 'name_expenses'] as const;

/** Gainstrack's `commodity` grammar is stricter than beancount's currency grammar. */
const GAINSTRACK_ASSET_RE = /^[A-Z][A-Z0-9-]+$/;

export interface ImportReport {
  source: string;
  /** Errors beancount's own loader reported. A ledger that does not load cleanly still converts. */
  loaderErrors: string[];
  /** One row per beancount directive type, and what it became. */
  lowered: Record<string, number>;
  /** Directives with no gainstrack equivalent, preserved as comments. */
  commented: Record<string, number>;
  /**
   * Information that does NOT survive the import at all, counted by kind.
   *
   * Separate from `commented` because the difference matters to the user: a commented directive
   * is still in the file and can be read, whereas these are gone. Counted rather than listed —
   * see the note at the call site.
   */
  lossy: Record<string, number>;
  /** Raw `tx` commands emitted — the metric the lifting passes are trying to drive down. */
  rawTransactions: number;
  /** What the lifting passes recognized, by resulting command. Empty after lowering alone. */
  lifted: Record<string, number>;
  /**
   * gainstrack account -> the beancount account it stands for.
   *
   * Only the entries that are NOT identity are listed. Lowering alone is nearly identity; the
   * exceptions are multi-currency accounts, which gainstrack splits into per-currency
   * sub-accounts. The verification harness needs this to compare balances against the original.
   */
  accountFold: Record<string, string>;
  warnings: string[];
}

export interface ImportResult {
  text: string;
  report: ImportReport;
}

interface Ctx {
  /** beancount account -> the currencies its postings and assertions actually use. */
  currencies: Map<string, Set<string>>;
  /** beancount account -> the gainstrack account holding its primary currency. */
  multiAsset: Map<string, string>;
  /** beancount account -> earliest date it is referenced. */
  firstSeen: Map<string, string>;
  renameRoot: (account: string) => string;
  opCcy: string;
  report: ImportReport;
}

// ---- small helpers ---------------------------------------------------------

function dec(a: DumpAmount | null): Decimal | undefined {
  return a?.number == null ? undefined : new Decimal(a.number);
}

/** Amounts are rendered from the beancount literal, so no precision is lost on the way through. */
function amountStr(a: DumpAmount): string {
  return `${a.number ?? '0'} ${a.currency}`;
}

/**
 * Gainstrack has no escape for a `"` inside a description and no way to write a newline in one:
 * both the gainstrack and beancount exports emit it raw. Sanitizing here, once, beats emitting a
 * file that will not parse.
 */
function sanitize(text: string): string {
  return text.replace(/["\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function comment(text: string): string {
  return `; ${sanitize(text)}`;
}

function bump(counter: Record<string, number>, key: string, by = 1): void {
  counter[key] = (counter[key] ?? 0) + by;
}

function minDate(a: string | undefined, b: string): string {
  return a === undefined || b < a ? b : a;
}

// ---- pass 1: survey --------------------------------------------------------

/**
 * Beancount's account roots are renameable (`option "name_assets" "Activo"`), gainstrack's are
 * not — its parser rejects any account whose first segment is not one of the five. So a renamed
 * ledger is mapped back onto the canonical names, and the rename is reported rather than left
 * for the user to discover from a wall of parse errors.
 */
function rootRenamer(doc: DumpDocument, report: ImportReport): (account: string) => string {
  const map = new Map<string, string>();
  ROOT_OPTION_KEYS.forEach((key, i) => {
    const configured = doc.options[key];
    const canonical = GAINSTRACK_ROOTS[i];
    if (typeof configured === 'string' && configured !== '' && configured !== canonical) {
      map.set(configured, canonical);
      report.warnings.push(`account root "${configured}" renamed to "${canonical}" (gainstrack's roots are fixed)`);
    }
  });
  if (map.size === 0) return (account: string) => account;
  return (account: string) => {
    const idx = account.indexOf(':');
    const root = idx < 0 ? account : account.slice(0, idx);
    const renamed = map.get(root);
    return renamed === undefined ? account : renamed + account.slice(root.length);
  };
}

function noteAccount(ctx: Ctx, account: string, date: string, ccy?: string): void {
  const id = ctx.renameRoot(account);
  ctx.firstSeen.set(id, minDate(ctx.firstSeen.get(id), date));
  if (ccy === undefined) return;
  const set = ctx.currencies.get(id) ?? new Set<string>();
  set.add(ccy);
  ctx.currencies.set(id, set);
}

/** Padding transactions are the loader's, not the user's — see `DumpTransaction.flag`. */
// Deliberately not a type guard: the only caller is already inside `case 'transaction'`, and a
// guard would narrow the negative branch to `never` and take `entry` with it.
function isPadding(entry: DumpEntry): boolean {
  return entry.type === 'transaction' && entry.flag === 'P';
}

function survey(doc: DumpDocument, ctx: Ctx): void {
  for (const entry of doc.entries) {
    switch (entry.type) {
      case 'open':
        noteAccount(ctx, entry.account, entry.date);
        // A single declared currency is a claim about the account even if no posting proves it;
        // several (or none) is beancount declining to constrain it, which tells us nothing.
        if (entry.currencies.length === 1) noteAccount(ctx, entry.account, entry.date, entry.currencies[0]);
        break;
      case 'transaction':
        // Padding postings still tell us which currency an account holds, and the `bal` we
        // replace them with has to be routed to the same sub-account.
        for (const p of entry.postings) noteAccount(ctx, p.account, entry.date, p.units?.currency);
        break;
      case 'balance':
        noteAccount(ctx, entry.account, entry.date, entry.amount?.currency);
        break;
      case 'pad':
        noteAccount(ctx, entry.account, entry.date);
        noteAccount(ctx, entry.source_account, entry.date);
        break;
      case 'close':
      case 'note':
      case 'document':
        noteAccount(ctx, entry.account, entry.date);
        break;
      default:
        break;
    }
  }
}

/**
 * Decide which accounts become multi-asset, and pick each one's primary currency.
 *
 * gainstrack ties an account to one asset: `open Assets:Broker USD` in the beancount export
 * CONSTRAINS the account to USD, and a EUR posting into it is rejected. The idiom for an account
 * that genuinely holds several is `multiAsset: true` plus a `:CCY` sub-account per currency,
 * which is also what makes `AllState.balances` mean something — a single series summing USD and
 * EUR is a number nobody can use.
 *
 * The primary currency is the operating currency when the account holds it, else the
 * alphabetically first, chosen for determinism rather than for meaning: nothing posts to the
 * parent, so it only decides what the parent's `open` line says.
 */
function decideMultiAsset(ctx: Ctx): void {
  const existing = new Set(ctx.firstSeen.keys());
  for (const [account, ccys] of ctx.currencies) {
    if (ccys.size < 2) continue;
    const sorted = [...ccys].sort();
    const collisions = sorted.map(c => `${account}:${c}`).filter(id => existing.has(id));
    if (collisions.length > 0) {
      // The routed name is already a real account in the source ledger, so routing would merge
      // two different things. Reported instead of guessed — the numbers would be wrong either
      // way, and a wrong number that announces itself is the only acceptable kind.
      ctx.report.warnings.push(
        `${account} holds ${sorted.join('/')} but ${collisions.join(', ')} already exists; ` +
        'left single-asset, so its balance series sums unlike currencies and the beancount ' +
        're-export will not load. Rename the conflicting account in beancount and re-import.',
      );
      continue;
    }
    const primary = ccys.has(ctx.opCcy) ? ctx.opCcy : sorted[0];
    ctx.multiAsset.set(account, primary);
    for (const c of sorted) ctx.report.accountFold[`${account}:${c}`] = account;
  }
}

/** The gainstrack account a posting in `ccy` lands on. */
function route(ctx: Ctx, account: string, ccy: string | undefined): string {
  const id = ctx.renameRoot(account);
  if (ccy === undefined || !ctx.multiAsset.has(id)) return id;
  return `${id}:${ccy}`;
}

function primaryCurrency(ctx: Ctx, account: string): string {
  const id = ctx.renameRoot(account);
  const multi = ctx.multiAsset.get(id);
  if (multi !== undefined) return multi;
  const ccys = ctx.currencies.get(id);
  // An account nothing ever posted to and beancount never constrained: the operating currency
  // is the only defensible guess, and it cannot be wrong in a way that moves a number.
  return ccys && ccys.size === 1 ? [...ccys][0] : ctx.opCcy;
}

// ---- pass 2: emit ----------------------------------------------------------

/**
 * Option lines are written exactly as `toGainstrack`'s `boolStr` writes them — no space after
 * the colon — so `--raw` output and lifted output are the same text rather than two spellings
 * of it. Both parse; only one makes the two comparable.
 */
const MULTI_ASSET_OPTION = '  multiAsset:true';

function openLines(ctx: Ctx, account: string, date: string): string[] {
  const id = ctx.renameRoot(account);
  const lines = [`${date} open ${id} ${primaryCurrency(ctx, account)}`];
  if (ctx.multiAsset.has(id)) lines.push(MULTI_ASSET_OPTION);
  return lines;
}

function postingLine(ctx: Ctx, p: DumpPosting): string {
  const units = p.units;
  if (!units || units.number == null) {
    // Post-booking every posting has explicit units; if one does not, the loader failed to
    // interpolate and the ledger is broken upstream. Say so rather than emitting `0`.
    throw new Error(`posting to ${p.account} has no resolved amount — does the ledger load cleanly?`);
  }
  const account = route(ctx, p.account, units.currency);
  let line = `  ${account} ${amountStr(units)}`;
  if (p.cost && p.cost.number != null && p.cost.currency) {
    line += ` {${p.cost.number} ${p.cost.currency}}`;
    if (p.cost.date || p.cost.label) {
      // Gainstrack's `{...}` holds a per-unit cost and nothing else. The lot's identity is what
      // realized P&L is computed from, so this is the one place the import is genuinely lossy in
      // a way that can move a number.
      //
      // Counted, not listed. A ledger of any size has thousands of these, and a warning printed
      // thousands of times is a warning nobody reads — which is the same as not warning at all.
      bump(ctx.report.lossy, 'lot identity (date/label) dropped');
    }
  }
  if (p.price && p.price.number != null) line += ` @${amountStr(p.price)}`;
  return line;
}

/** A posting's weight, matching the engine's rule exactly: cost basis, else price, else face. */
function weight(p: DumpPosting): { ccy: string; value: Decimal } | undefined {
  const units = dec(p.units);
  if (units === undefined || !p.units) return undefined;
  if (p.cost?.number != null && p.cost.currency) {
    return { ccy: p.cost.currency, value: units.times(new Decimal(p.cost.number)) };
  }
  if (p.price?.number != null) return { ccy: p.price.currency, value: units.times(new Decimal(p.price.number)) };
  return { ccy: p.units.currency, value: units };
}

/**
 * Beancount accepts a transaction whose postings miss zero by less than the inferred tolerance
 * and simply carries the residue; gainstrack's `tx` does not (see `validateTx`). Rather than
 * loosen the rule, the residue is made explicit as a posting, so the ledger states where the
 * fraction of a cent went instead of leaving it to be discovered later.
 */
function residues(tx: DumpTransaction): Array<{ ccy: string; value: Decimal }> {
  const byCcy = new Map<string, Decimal>();
  for (const p of tx.postings) {
    const w = weight(p);
    if (!w) continue;
    byCcy.set(w.ccy, (byCcy.get(w.ccy) ?? new Decimal(0)).plus(w.value));
  }
  return [...byCcy.entries()].filter(([, v]) => !v.isZero()).map(([ccy, value]) => ({ ccy, value }));
}

function describeTransaction(tx: DumpTransaction): string {
  const parts = [tx.payee, tx.narration].filter((s): s is string => !!s && s.trim() !== '');
  return sanitize(parts.join(' | '));
}

function transactionLines(ctx: Ctx, tx: DumpTransaction, used: Set<string>): string[] {
  const out: string[] = [];

  // Tags, links and metadata have no gainstrack home. Comments do round-trip through the parser
  // and serializer, so nothing is lost from the FILE even though nothing can query it.
  if (tx.tags.length) out.push(comment(`#${tx.tags.join(' #')}`));
  if (tx.links.length) out.push(comment(`^${tx.links.join(' ^')}`));
  for (const [k, v] of Object.entries(tx.meta)) out.push(comment(`${k}: ${String(v)}`));
  // `!` means the user flagged this transaction as needing attention; that is information.
  if (tx.flag && tx.flag !== '*') out.push(comment(`beancount flag ${tx.flag}`));

  out.push(`${tx.date} tx "${describeTransaction(tx)}"`);
  for (const p of tx.postings) out.push(postingLine(ctx, p));

  const residue = residues(tx);
  for (const { ccy, value } of residue) {
    used.add(ROUNDING_ACCOUNT);
    out.push(`  ${ROUNDING_ACCOUNT}:${ccy} ${value.neg().toFixed()} ${ccy}`);
    bump(ctx.report.lowered, 'rounding posting added');
  }
  // Double entry needs two legs. A one-posting transaction that already balances (a lone zero)
  // is legal beancount and would otherwise be rejected by `validateTx` for a reason that is
  // about our grammar, not about the user's ledger.
  if (tx.postings.length + residue.length < 2) {
    const ccy = tx.postings[0]?.units?.currency ?? ctx.opCcy;
    used.add(ROUNDING_ACCOUNT);
    out.push(`  ${ROUNDING_ACCOUNT}:${ccy} 0 ${ccy}`);
  }
  return out;
}

/**
 * `balance` -> `bal`, shifted back one day.
 *
 * The two directives assert at different moments: beancount's `balance` is checked at the START
 * of its date, while a gainstrack `bal` states the balance as of the following morning (its
 * underlying adjustment is dated D+1, which is also why the beancount export re-emits it on
 * D+1). Off by one here and every assertion in a migrated ledger lands a day late — usually
 * still true, which is what makes it dangerous.
 */
function balanceLines(ctx: Ctx, entry: DumpBalance, padSource: string | undefined, used: Set<string>): string[] {
  const amount = entry.amount;
  if (!amount || amount.number == null) return [comment(`dropped balance on ${entry.account}: no amount`)];
  const date = LocalDate.parse(entry.date).minusDays(1).toString();
  const account = ctx.renameRoot(entry.account);
  const adjustment = padSource ? ctx.renameRoot(padSource) : DEFAULT_ADJUSTMENT_ACCOUNT;
  if (!padSource) used.add(DEFAULT_ADJUSTMENT_ACCOUNT);
  const out: string[] = [];
  if (entry.diff) {
    // beancount itself says this assertion fails. Gainstrack's `bal` PLUGS instead of failing,
    // so importing it silently would convert a known-broken ledger into a clean-looking one.
    ctx.report.warnings.push(
      `balance assertion on ${entry.account} at ${entry.date} fails in beancount by ` +
      `${amountStr(entry.diff)}; gainstrack will plug the difference to ${adjustment}`,
    );
  }
  if (entry.tolerance) {
    out.push(comment(`beancount tolerance ~${entry.tolerance} dropped`));
    bump(ctx.report.commented, 'balance tolerance');
  }
  out.push(`${date} bal ${account} ${amountStr(amount)} ${adjustment}`);
  return out;
}

function openEntryLines(ctx: Ctx, entry: DumpOpen, opened: Set<string>): string[] {
  const id = ctx.renameRoot(entry.account);
  opened.add(id);
  const out = openLines(ctx, entry.account, entry.date);
  if (entry.currencies.length > 1) {
    out.push(comment(`beancount allowed ${entry.currencies.join(', ')} here`));
  }
  if (entry.booking && entry.booking !== 'STRICT') {
    // Booking has already been applied by the loader, so this is provenance rather than
    // something gainstrack acts on — but it explains the lot costs downstream.
    out.push(comment(`beancount booking ${entry.booking}`));
  }
  return out;
}

// ---- the lowering ----------------------------------------------------------

export function importBeancount(doc: DumpDocument): ImportResult {
  const report: ImportReport = {
    source: doc.source,
    loaderErrors: doc.errors.map(e => `${e.file ?? '?'}:${e.line ?? '?'}: ${e.message}`),
    lowered: {},
    commented: {},
    lossy: {},
    rawTransactions: 0,
    lifted: {},
    accountFold: {},
    warnings: [],
  };

  const ctx: Ctx = {
    currencies: new Map(),
    multiAsset: new Map(),
    firstSeen: new Map(),
    renameRoot: rootRenamer(doc, report),
    opCcy: operatingCurrency(doc),
    report,
  };

  survey(doc, ctx);
  decideMultiAsset(ctx);

  const opens: string[] = [];
  const body: string[] = [];
  const opened = new Set<string>();
  const used = new Set<string>();

  // A `pad` has no effect of its own — the loader turned it into a flagged transaction, and the
  // assertion that follows is what gainstrack's `bal` expresses. Remember the source account so
  // the `bal` can name it, exactly as the user's `pad` did.
  const padSource = new Map<string, string>();

  for (const entry of doc.entries) {
    bump(report.lowered, entry.type);
    switch (entry.type) {
      case 'open':
        opens.push(...openEntryLines(ctx, entry, opened));
        break;

      case 'commodity':
        if (GAINSTRACK_ASSET_RE.test(entry.currency)) {
          body.push(`${entry.date} commodity ${entry.currency}`);
          const name = entry.meta.name;
          if (typeof name === 'string' && name !== '') body.push(`  name: ${sanitize(name)}`);
        } else {
          body.push(comment(`commodity ${entry.currency} (not expressible as a gainstrack asset id)`));
          bump(report.commented, 'commodity');
        }
        break;

      case 'price':
        if (entry.amount?.number != null && GAINSTRACK_ASSET_RE.test(entry.currency)) {
          body.push(`${entry.date} price ${entry.currency} ${amountStr(entry.amount)}`);
        } else {
          body.push(comment(`price ${entry.currency} (not expressible)`));
          bump(report.commented, 'price');
        }
        break;

      case 'pad':
        padSource.set(entry.account, entry.source_account);
        break;

      case 'transaction': {
        if (isPadding(entry)) {
          // Folded into the `bal` that follows; emitting both would double the adjustment.
          bump(report.lowered, 'pad transaction folded into bal');
          break;
        }
        // Beancount emits a transaction with NO postings when booking failed: it reports the
        // error and drops the legs, so the dump contains the header and nothing else. There is
        // no money here to move, and padding it out to the two postings a `tx` needs would
        // state that the transaction was fine. It is always accompanied by a loader error, so
        // the user has been told why — this says which transaction it cost them.
        if (entry.postings.length === 0) {
          const what = describeTransaction(entry);
          body.push(comment(`${entry.date} ${what}: beancount could not book this, so it has no postings`));
          bump(report.lossy, 'transaction beancount could not book');
          report.warnings.push(
            `${entry.date} "${what}" was dropped. Beancount could not book it, so the dump has no postings for it. See the loader errors.`,
          );
          break;
        }
        body.push(...transactionLines(ctx, entry, used));
        report.rawTransactions += 1;
        break;
      }

      case 'balance': {
        const source = padSource.get(entry.account);
        padSource.delete(entry.account);
        body.push(...balanceLines(ctx, entry, source, used));
        break;
      }

      case 'close':
        // NOT gainstrack's `close`, which books income and expenses to equity — an entirely
        // different operation that would rewrite the ledger's equity if applied here.
        body.push(comment(`beancount close ${entry.account}`));
        bump(report.commented, 'close');
        break;

      case 'note':
        body.push(comment(`note ${entry.account}: ${entry.comment}`));
        bump(report.commented, 'note');
        break;
      case 'document':
        body.push(comment(`document ${entry.account}: ${entry.filename}`));
        bump(report.commented, 'document');
        break;
      case 'event':
        body.push(comment(`event ${entry.event_type}: ${entry.description}`));
        bump(report.commented, 'event');
        break;
      case 'query':
        body.push(comment(`query ${entry.name}: ${entry.query_string}`));
        bump(report.commented, 'query');
        break;
      case 'custom':
        body.push(comment(`custom ${entry.custom_type}: ${entry.values.map(String).join(' ')}`));
        bump(report.commented, 'custom');
        break;
      case 'unknown':
        body.push(comment(`unhandled ${entry.python_type} directive`));
        bump(report.commented, 'unknown');
        break;
    }
  }

  // Accounts referenced but never opened. bean-check rejects those, so a clean ledger has none —
  // but a ledger that does not load cleanly still has to import, and an unopened account is a
  // hard generator error rather than a bad number.
  const synthesized: string[] = [];
  for (const [account, date] of [...ctx.firstSeen].sort()) {
    if (opened.has(account)) continue;
    synthesized.push(...openLines(ctx, account, date));
    report.warnings.push(`${account} was never opened in beancount; opened at ${date}`);
  }

  // The two accounts the mapping itself invents, opened before anything else can post to them.
  //
  // Unconditionally multiAsset: a rounding residue or a balance plug can land in any currency
  // the ledger uses, and an account that is not multiAsset would both sum unlike currencies into
  // one series and produce a beancount re-export that `open`s it in one currency and then posts
  // another into it. Routing every leg to a `:CCY` sub-account costs nothing and removes the
  // whole class of problem.
  const earliest = [...ctx.firstSeen.values()].sort()[0] ?? doc.entries[0]?.date ?? '1970-01-01';
  const invented = [...used].sort().flatMap(id => [`${earliest} open ${id} ${ctx.opCcy}`, MULTI_ASSET_OPTION]);

  // No provenance comment in the file: a gainstrack comment attaches to the command that
  // FOLLOWS it, and the parser re-sorts by date, so a header would end up captioning whichever
  // directive happens to be oldest. The report carries the source instead.
  const header = ctx.opCcy === 'USD' ? [] : [`option "operating_currency" "${ctx.opCcy}"`];

  return {
    text: [...header, '', ...opens, ...synthesized, ...invented, '', ...body, ''].join('\n'),
    report,
  };
}

/** Human-readable rendering of the report, for the CLI and the docs walkthrough. */
export function formatReport(report: ImportReport): string {
  const lines: string[] = [`migration report for ${report.source}`, ''];
  const table = (title: string, counts: Record<string, number>) => {
    const rows = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
    if (rows.length === 0) return;
    lines.push(title);
    for (const [k, v] of rows) lines.push(`  ${k.padEnd(36)} ${String(v).padStart(7)}`);
    lines.push('');
  };
  table('lowered', report.lowered);
  table('lifted into intent-carrying commands', report.lifted);
  table('preserved as comments only', report.commented);
  table('not preserved', report.lossy);
  const liftedTotal = Object.values(report.lifted).reduce((a, b) => a + b, 0);
  lines.push(`raw tx commands remaining: ${report.rawTransactions}` +
    (liftedTotal ? ` of ${report.rawTransactions + liftedTotal} transactions` : ''));
  const folded = Object.keys(report.accountFold).length;
  if (folded > 0) lines.push(`multi-currency accounts split into ${folded} per-currency sub-accounts`);
  if (report.loaderErrors.length) {
    lines.push('', `beancount reported ${report.loaderErrors.length} loader error(s):`);
    for (const e of report.loaderErrors.slice(0, 20)) lines.push(`  ${e}`);
  }
  if (report.warnings.length) {
    // Deduplicated with counts: one dropped lot label is worth reading, four thousand are worth
    // one line. Printing them all is the same as printing none.
    const counts = new Map<string, number>();
    for (const w of report.warnings) counts.set(w, (counts.get(w) ?? 0) + 1);
    lines.push('', `${report.warnings.length} warning(s):`);
    for (const [w, n] of counts) lines.push(`  ${w}${n > 1 ? ` (x${n})` : ''}`);
  }
  return lines.join('\n');
}
