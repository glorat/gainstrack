// The statement of cash flows (IAS 7 / ASC 230), computed from account tags.
//
// The classification beancount cannot do is the whole problem: its data model has no notion of
// operating/investing/financing, so the split has to be reconstructed from account names. The
// mechanism here is the one beancount itself points at — metadata on the account's `open` — with
// two things we can do that it currently cannot:
//
//   1. **Tags inherit down the account tree.** A tag on `Assets:Bank` covers the `Assets:Bank:GBP`
//      children that the multiAsset routing generates and the user never wrote. (Beancount's
//      equivalent request, postings inheriting account metadata, is still open upstream.)
//   2. **The command verb is a second, independent signal.** Every posting carries `originIndex`
//      back to a typed command, so `trade`/`fund`/`earn`/`spend` give a classification derived
//      from something other than the account name. Where the two disagree, the transaction is
//      probably miscoded — reported as `diagnostics`, not as an error.
//
// The cash SET is what makes the arithmetic trustworthy: the classified total is derived from the
// cash legs themselves, so it equals the actual cash movement exactly, in every currency, by
// construction. The classes only decide how that (already correct) total is split.
//
// There is deliberately NO special case for any command. A `bal`/`adj` plug names an adjustment
// account and posts to it like anything else, so it classifies by that account — which is what
// makes the report serve two kinds of bookkeeping without a mode. Someone tracking personal
// finances plugs to `Expenses:General` and sees spending they chose not to itemise appear in
// operating; a company tags its suspense account `cashflowClass: adjustment` and sees unexplained
// differences held out of the subtotals where they cannot be mistaken for activity. Keying on the
// verb instead would be arbitrary: `fund X Equity:Opening 100` and `adj X 100 USD Equity:Opening`
// produce identical postings.

import { LocalDate } from '@js-joda/core';
import { AccountCommandDTO, AccountDTO, Posting, PostingEx, Transaction } from 'src/lib/assetdb/models';
import { SingleFXConverter } from 'src/lib/fx';
import { CASHFLOW_CLASSES, CashflowClass, CashflowTag, isCashflowClass } from 'src/lib/gen/cashflowClass';
import { parentAccountIdOf, positionSetFx, postingsToPositionSet } from 'src/lib/utils';

// ---- tag resolution ---------------------------------------------------------

export interface TagResolver {
  /** Accounts that declared `cashEquivalent:true`, sorted — what the report says it treated as cash. */
  declaredCashAccounts: string[];
  isCash(accountId: string): boolean;
  classOf(accountId: string): CashflowTag | undefined;
}

interface DeclaredTags {
  cashEquivalent?: boolean;
  cashflowClass?: CashflowTag;
}

/**
 * Resolve a tag by walking UP the account id, nearest declaration wins.
 *
 * Deliberately computed here rather than folded into `GAccountState`: generated sub-accounts and
 * interpolated parents are built with `defaultOptions()`, so an account RECORD cannot carry a tag
 * downward without editing the Scala-parity-sensitive account fold. Resolving from the declared
 * set at report time gets the same inheritance and touches nothing in `gen/`.
 *
 * An explicit `cashEquivalent: false` on a child therefore carves it out of a tagged parent, which
 * is why the serializer writes a false rather than dropping it.
 */
export function buildTagResolver(accounts: AccountDTO[]): TagResolver {
  const declared = new Map<string, DeclaredTags>();
  for (const a of accounts) {
    const opts = (a.options ?? {}) as DeclaredTags;
    const tags: DeclaredTags = {};
    if (typeof opts.cashEquivalent === 'boolean') tags.cashEquivalent = opts.cashEquivalent;
    if (opts.cashflowClass !== undefined) tags.cashflowClass = opts.cashflowClass;
    if (Object.keys(tags).length > 0) declared.set(a.accountId, tags);
  }

  function nearest<K extends keyof DeclaredTags>(accountId: string, key: K): DeclaredTags[K] {
    let id = accountId;
    for (;;) {
      const found = declared.get(id)?.[key];
      if (found !== undefined) return found;
      if (id === '') return undefined;
      id = parentAccountIdOf(id);
    }
  }

  return {
    declaredCashAccounts: [...declared.entries()]
      .filter(([, t]) => t.cashEquivalent === true)
      .map(([id]) => id)
      .sort(),
    isCash: (accountId: string) => nearest(accountId, 'cashEquivalent') === true,
    classOf: (accountId: string) => nearest(accountId, 'cashflowClass'),
  };
}

/**
 * The fallback when no ancestor declared a class. It is the weak point of the whole report — the
 * account root cannot tell a supplier payment from a machine purchase — which is exactly why the
 * tags exist. Kept so an untagged ledger still produces something rather than nothing.
 *
 * Never returns `adjustment`: holding a flow out of the activity subtotals is always something the
 * user asked for by tagging, never something inferred. In particular a `bal`/`adj` plug is a normal
 * flow here, classified by the account it plugs to — `Expenses:General` is spending that was not
 * itemised, and a suspense account is an unexplained difference only because it was tagged as one.
 */
export function defaultClassOf(accountId: string): CashflowClass {
  const root = accountId.split(':')[0];
  if (root === 'Income' || root === 'Expenses') return 'operating';
  if (root === 'Equity') return 'financing';
  return 'investing';
}

// ---- the verb cross-check ---------------------------------------------------

/**
 * What the ORIGINATING COMMAND implies, independent of any account name.
 *
 * `undefined` means the verb has no opinion, not that it disagrees: a `tfr` crosses the cash
 * boundary in either direction, and a `tx` states no intent by design (it is the raw multi-posting
 * form, which is the whole reason imported beancount ledgers need the account tags).
 */
export function verbClassOf(commandType: string | undefined): CashflowClass | undefined {
  switch (commandType) {
    case 'trade': case 'unit': return 'investing';
    case 'fund': return 'financing';
    case 'earn': case 'spend': return 'operating';
    // IAS 7 permits dividends/interest received in either operating or investing. Operating is the
    // more common presentation and is what we assume; a `cashflowClass` on the income account
    // overrides it, and the disagreement shows up as a diagnostic rather than silently.
    case 'yield': return 'operating';
    default: return undefined;
  }
}

// ---- the statement ----------------------------------------------------------

export interface CashflowLine {
  account: string;
  value: number;
}

export interface CashflowSection {
  cashflowClass: CashflowClass;
  total: number;
  byAccount: CashflowLine[];
}

export interface CashflowDiagnostic {
  date: string;
  description: string;
  account: string;
  tagClass: CashflowClass;
  verbClass: CashflowClass;
  value: number;
}

export interface CashflowStatement {
  fromDate: string;
  toDate: string;
  baseCcy: string;
  /** Empty means nothing was tagged — the UI says so rather than showing a zeroed statement. */
  declaredCashAccounts: string[];
  sections: CashflowSection[];
  /** Flows against accounts tagged `cashflowClass: adjustment` — cash moved, but not as an activity. */
  adjustments: number;
  /** Which accounts those adjustments went to, so the report can name them rather than just total them. */
  adjustmentsByAccount: CashflowLine[];
  /** Net flows = Σ sections + adjustments. Equals the period's cash-leg movement exactly. */
  netFlows: number;
  openingCash: number;
  closingCash: number;
  /**
   * IAS 7's "effect of exchange rate changes on cash held", as a balancing figure: the part of the
   * cash movement that no posting explains, i.e. revaluation of foreign cash across the period.
   * MUST be zero for a single-currency ledger — a non-zero value there means a flow was dropped or
   * double-counted, and `cashflow.spec.ts` pins that.
   */
  fxEffect: number;
  diagnostics: CashflowDiagnostic[];
}

function emptySections(): Map<CashflowClass, CashflowLine[]> {
  return new Map(CASHFLOW_CLASSES.map(c => [c, [] as CashflowLine[]]));
}

/** One posting's value in baseCcy, at ITS OWN date — a cash flow is dated, unlike a balance. */
function valueAt(postings: Posting[], baseCcy: string, date: LocalDate, fx: SingleFXConverter): number {
  return positionSetFx(postingsToPositionSet(postings), baseCcy, date, fx);
}

/**
 * What a posting is worth, by the same rule `tx` balances against (`GPosting.weight`): cost basis
 * if it has one, price-converted value if it has a price, face value otherwise.
 *
 * This has to agree with the balancing rule. A transaction sums to zero by weight, so valuing its
 * legs any other way lets a transaction balance while the split of its cash movement does not.
 *
 * Face value alone is not enough for a security leg, because it is denominated in the security:
 * `10 AAPL` needs the FX chain, which only knows what a `price`, `trade` or `unit` command put
 * there, and `positionSetFx` reads a missing rate as 0. A `{cost}` on a raw `tx` teaches the chain
 * nothing, so the leg would be worth nothing and the proportional split below would hand the whole
 * movement to whichever leg did have a rate. `lift.ts` refuses to lift a costed transaction, so
 * that is the ordinary shape of an imported beancount trade rather than an edge case.
 */
function weightValueAt(p: Posting, baseCcy: string, date: LocalDate, fx: SingleFXConverter): number {
  const basis = p.cost ?? p.price;
  if (!basis) return valueAt([p], baseCcy, date, fx);
  return positionSetFx({ [basis.ccy]: basis.number * p.value.number }, baseCcy, date, fx);
}

/** Cash held at a point in time: every cash posting up to and including `date`, at that date's rate. */
function cashAt(cashPostings: PostingEx[], date: LocalDate, baseCcy: string, fx: SingleFXConverter): number {
  const upTo = cashPostings.filter(p => !LocalDate.parse(p.date).isAfter(date));
  return valueAt(upTo, baseCcy, date, fx);
}

export function cashflowStatement(
  txs: Transaction[],
  allCmds: AccountCommandDTO[],
  accounts: AccountDTO[],
  baseCcy: string,
  fromDate: LocalDate,
  toDate: LocalDate,
  fx: SingleFXConverter,
): CashflowStatement {
  const tags = buildTagResolver(accounts);
  const sections = emptySections();
  const diagnostics: CashflowDiagnostic[] = [];
  const adjustmentAccounts = new Map<string, number>();
  let adjustments = 0;

  // Same inclusivity as PLExplain (fromDate exclusive, toDate inclusive), so the two reports agree
  // on boundary days. Diverging here would be invisible until someone compared them.
  const inPeriod = (date: string) => {
    const dt = LocalDate.parse(date);
    return dt.isAfter(fromDate) && dt.isBefore(toDate.plusDays(1));
  };

  const allCashPostings: PostingEx[] = [];
  for (const tx of txs) {
    for (const p of tx.postings) {
      if (tags.isCash(p.account)) allCashPostings.push({ ...p, date: tx.postDate, originIndex: tx.originIndex });
    }
  }

  for (const tx of txs) {
    if (!inPeriod(tx.postDate)) continue;
    const date = LocalDate.parse(tx.postDate);
    const cashLegs = tx.postings.filter(p => tags.isCash(p.account));
    if (cashLegs.length === 0) continue; // touches no cash: not a cash flow at all
    const otherLegs = tx.postings.filter(p => !tags.isCash(p.account));

    // The exact cash movement. Everything below only decides how to SPLIT this number, never what
    // it is, which is what makes the total trustworthy regardless of the classification rules.
    const movement = valueAt(cashLegs, baseCcy, date, fx);
    const cmd = allCmds[tx.originIndex];

    // No non-cash leg: cash moved between cash accounts. Same-currency nets to zero on its own;
    // cross-currency leaves a residue, which IS an exchange effect and belongs in `fxEffect`.
    if (otherLegs.length === 0) continue;

    // Split `movement` across the non-cash legs in proportion to their weights. Where the
    // transaction balances at the day's rate this is exactly `-legValue`, which is what makes an
    // N-legged `tx` work: a mortgage payment splits into its interest and principal legs with no
    // stated intent anywhere. Proportional rather than direct so the parts always sum to the whole.
    //
    // Only the SPLIT uses weights. `movement`, `openingCash` and `closingCash` stay on face value
    // at the day's rate, so the totals and `fxEffect` are untouched by anything decided here.
    const legValues = otherLegs.map(p => weightValueAt(p, baseCcy, date, fx));
    const legTotal = legValues.reduce((a, b) => a + b, 0);
    const verbClass = verbClassOf(cmd?.commandType);

    otherLegs.forEach((leg, i) => {
      // A zero-value leg gets a zero share; an all-zero set would divide by zero, so fall back to
      // an even split of what is then almost certainly itself zero.
      const share = legTotal === 0 ? movement / otherLegs.length : movement * (legValues[i] / legTotal);
      if (share === 0) return;
      const tag = tags.classOf(leg.account) ?? defaultClassOf(leg.account);

      // `adjustment` is a real movement of cash that is not an activity. It still counts toward the
      // net change — dropping it would break the reconciliation — but it is held out of the three
      // subtotals and off the diagnostics list, which has no opinion to offer about a plug.
      if (!isCashflowClass(tag)) {
        adjustments += share;
        adjustmentAccounts.set(leg.account, (adjustmentAccounts.get(leg.account) ?? 0) + share);
        return;
      }
      const tagClass: CashflowClass = tag;
      sections.get(tagClass)!.push({ account: leg.account, value: share });

      if (verbClass !== undefined && verbClass !== tagClass) {
        diagnostics.push({
          // `TransactionDTO` drops the description, so it comes from the originating command —
          // the same source PLExplain groups its activity by.
          date: tx.postDate,
          description: cmd?.description ?? '',
          account: leg.account,
          tagClass,
          verbClass,
          value: share,
        });
      }
    });
  }

  const openingCash = cashAt(allCashPostings, fromDate, baseCcy, fx);
  const closingCash = cashAt(allCashPostings, toDate, baseCcy, fx);

  const built: CashflowSection[] = CASHFLOW_CLASSES.map(c => {
    const lines = sections.get(c)!;
    const byAccount = [...lines.reduce((m, l) => m.set(l.account, (m.get(l.account) ?? 0) + l.value), new Map<string, number>())]
      .map(([account, value]) => ({ account, value }))
      .sort((a, b) => a.account.localeCompare(b.account));
    return { cashflowClass: c, total: byAccount.reduce((a, l) => a + l.value, 0), byAccount };
  });

  const netFlows = built.reduce((a, s) => a + s.total, 0) + adjustments;

  return {
    fromDate: fromDate.toString(),
    toDate: toDate.toString(),
    baseCcy,
    declaredCashAccounts: tags.declaredCashAccounts,
    sections: built,
    adjustments,
    adjustmentsByAccount: [...adjustmentAccounts]
      .map(([account, value]) => ({ account, value }))
      .sort((a, b) => a.account.localeCompare(b.account)),
    netFlows,
    openingCash,
    closingCash,
    fxEffect: closingCash - openingCash - netFlows,
    diagnostics,
  };
}
