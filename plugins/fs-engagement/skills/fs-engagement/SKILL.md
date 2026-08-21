---
name: fs-engagement
description: Playbook for preparing a company's financial statements from raw records (bank statements, payment-processor exports, expense logs) using gainstrack as the accounting engine. Use when starting a bookkeeping/FS engagement, rebuilding books from source evidence, or restating figures in an existing engagement. Skip for work on the gainstrack engine itself — this skill is about using it.
---

# Financial statements from raw inputs

Turn a shoebox of raw records into a full set of financial statements — income statement, balance
sheet, changes in equity, cash flow, trial balance — plus notes, tax computation and working
papers, with every figure traceable to evidence and reproducible by script.

The pipeline: **evidence → machine-readable masters → a deterministic builder script → a
`.gainstrack` ledger → engine-computed figures (JSON) → a renderer**. Humans (and you) make
accounting judgments; scripts apply them; the engine does the arithmetic. No figure is ever
hand-keyed downstream of the ledger.

The engine is [gainstrack](https://www.gainstrack.com) — a plain-text double-entry DSL with a
web app for interactive viewing and a headless CLI (`npx gainstrack`) for scripted figures.
Source: https://github.com/glorat/gainstrack.

## The five invariants

Everything else in this playbook serves these. Do not trade them away for convenience.

1. **Every figure traces to a record.** Each number in the FS must walk back to a bank line,
   invoice, log row, or a named judgment applied by script. If you cannot name the source, the
   figure does not go in.
2. **One named constant per judgment.** Every accounting judgment (a deferral, an accrual, a
   reclassification) is a named constant or rule in the builder script, with a comment citing its
   evidence. A restatement then touches one line and regenerates everything.
3. **Presentation never hand-keys a number.** Renderers read the statements JSON. Captions,
   groupings and note wiring are the renderer's; numbers are the engine's. Prose figures in notes
   are the one exception — keep a list of them so restatements sweep them.
4. **Goldens pin the result.** A `figures.json` of expected key figures, enforced by
   `gainstrack check`, so any regeneration that silently moves a number fails loudly.
5. **Private data stays out of version control.** The engagement directory and any test asserting
   real figures live under paths your VCS ignores. Anything tracked or published carries no
   client names or real figures. Simulate a fresh clone before committing anything.

## Directory convention

One directory per engagement (kept out of version control), with a README as its index:

```
<engagement>/
  README.md                  # the index: state, basis, where everything is, how to regenerate
  handover/                  # raw evidence, as received: bank PDFs, processor exports,
                             #   expense logs, incorporation docs, the client facts Q&A
  reference/                 # machine-readable masters transcribed from handover/,
                             #   plus the extractor script that (re)produces them
  gen_<engagement>.py        # the deterministic ledger builder
  <engagement>.gainstrack    # its output — never hand-edited
  <engagement>_statements.json  # CLI output: report all
  <engagement>_figures.json     # golden pins for gainstrack check
  build_<renderer>.py        # renders statements.json → docx/markdown FS
  <notes / tax computation / review checklist>.md   # working papers
```

## Phase 0 — Engagement scoping

Establish before touching numbers, and record in the engagement README:

- Entity legal particulars (name, registration, incorporation date), financial period, base
  currency, reporting framework, and deliverables in scope (FS, notes, tax computation).
- **The deadline calendar**: every statutory date downstream (tax estimate, tax return, annual
  filing), so each filing is scheduled _after_ the books close. **Nothing is filed off draft
  books** — an estimate filed early gets amended when a late judgment (a deferral, an accrual)
  flips the result.
- **A materiality threshold**, written down and applied consistently. It decides which
  imperfections get chased and which get accepted with a note, instead of relitigating
  "is this worth the effort?" item by item.

## Phase 1 — Evidence intake and the client facts Q&A

Collect raw records into `handover/` unmodified — and issue the full information request **up
front** (the professional's "prepared-by-client" list) rather than discovering documents one
iteration at a time: every bank statement for the period _including the final one_ with the
confirmed closing balance, payment-processor exports, expense logs, payroll records and
employment contracts, incorporation and share-capital records (current versions — registers
change), leases and letters of intent, any prior draft accounts.

Then write a **client facts Q&A** document: structured questions with the client's dated answers.
Ask about everything material that records alone cannot settle — who is entitled to what
remuneration and from when, employment vs contractor status (and any mid-period change), what
year-end amounts were unpaid, who personally funded company costs, whether the closing bank
balance is confirmed, related-party arrangements, refunds and how they were actually paid. Ask
the revenue-cycle questions on day one, not when the notes are drafted:

- **Do customers pay before delivery?** Advance payments, credit packs, retainers — the deferred
  income they imply is the classic late discovery that flips a profit into a loss after a tax
  estimate has already been filed.
- Do customers ever consume before paying (a receivable)? Are credits gifted, forfeited or
  expired?

This document is evidence; treat answers as facts with a date, and cite it from the builder
script's judgment comments. Expect corrections: when the client revises source evidence, save the
revision as a new version beside the original (never overwrite), point the builder at it, and
regenerate — downstream artifacts are never patched by hand.

## Phase 2 — Transcription to masters

Turn non-machine-readable evidence (PDF bank statements, spreadsheets) into clean CSVs in
`reference/`, via an extractor script where possible so the step is reproducible. The bank
transaction master is the backbone — every statement line, transcribed faithfully, no
classification yet. Verify completeness: opening + movements = closing for every statement period.

## Phase 3 — The deterministic ledger builder

One script reads the masters and emits the `.gainstrack` ledger. Its job is **classification and
policy**, applied mechanically:

- **Classification rules**: map transaction descriptions to accounts (pattern → account). Every
  unmatched line lands in a visible `UNCLASSIFIED` bucket — never silently dropped. Drive the
  bucket to zero, or consciously accept what remains.
- **Judgment constants at the top of the file**: deferred revenue, accrual amounts, salary
  entitlements — each a named constant with a comment citing its evidence document.
- **Standard policy checklist** — consider each; encode the ones that apply:
  - Revenue basis: gross up processor-settled revenue (gross fees as revenue, processing fees as
    expense, payouts through a clearing account) rather than booking net deposits.
  - Year-end revenue deferral: amounts received for undelivered goods/services → contract
    liability, from a documented computation (ideally per-customer, attached as a schedule).
  - Accrued payroll and related contributions unpaid at year-end.
  - Payroll decomposes to the bank line: gross salary = net cash paid (which must match a bank
    transaction) + employee withholdings (liability) + employer contributions (expense +
    liability). Never book a salary cash line with no matching bank transaction — reconcile
    payroll as a gross-to-net schedule per employee per month, not entry by entry.
  - Chart of accounts: **nature-based from the first draft**, mapped to the captions the filing
    framework expects — never grouped by payment channel (no "Reimbursements" account). Expect
    later statements to force sub-account splits (the cash-flow statement's operating/financing
    distinction is what pulls a director account apart); the builder makes restructuring cheap,
    so let statement needs drive it.
  - Related-party / director current accounts: expenses fronted personally are accrued to a
    current account by nature of expense; cash reimbursements draw the account down. Split
    sub-accounts by nature (salary vs expenses vs loan) where the cash-flow statement needs
    different classifications.
  - Refunds: reversal of revenue, not an expense.
  - Deposits (rent, utilities): refundable → asset, not expense.
  - Expense classification by **nature**, never by how it was paid — no "Reimbursements" account.
  - Personal / non-company costs found in the records: exclude, with a comment saying why.
- **Order and comment** the emitted ledger so a reviewer can read it top to bottom: comments name
  the policy each block applies.

The `.gainstrack` file is generated output. Fix problems in the builder, never in the ledger.

## Phase 4 — Engine validation

The engine enforces double-entry by construction, so validation is about tying to reality:

- `bal` assertions against every **confirmed** external balance (the closing bank balance above
  all). Route the plug to a visible adjustment account — a material plug means missing
  transactions, so investigate rather than accept.
- Search for unrecorded liabilities: read the post-year-end bank lines for payments that belong
  to the period (final payroll, contributions, levies) and accrue them.
- Reconcile each director/related-party account as a **movement schedule** (opening + accruals +
  claims − cash paid = closing) and have the client confirm the schedule itself — a balance
  inferred from bank flows alone hides misclassified transfers (salary inside a reimbursement
  run, and the reverse).
- End the period with `close` so retained earnings is computed, not hand-derived.
- Run the trial balance; the imbalance must be zero.
- Pin the key real figures as goldens for `gainstrack check` (Phase 5) — the portable tie-out.
  Inside the gainstrack repo you can additionally pin them in a test spec (see the last section).
- For a human read of the books: the ledger pastes straight into the editor at
  https://www.gainstrack.com — signed-out use computes entirely in the browser and persists
  nothing, so private books stay private.

## Phase 5 — Figures via the CLI

The engine ships as the `gainstrack` npm package — a single bundled CLI, no install required:

```bash
npx gainstrack report all <ledger> --from <D> --to <D> --as-of <D> -o <engagement>_statements.json
npx gainstrack check <ledger> --expect <engagement>_figures.json --from <D> --to <D> --as-of <D>
```

`report all` emits every statement in one JSON bundle, figures in base currency, keyed by account
id — this is the only interface the renderer sees. `check` compares flat dotted keys
(`incomeStatement.totalRevenue`, `balanceSheet.liabilities.Liabilities:DeferredRevenue`, …,
tolerance 0.005) and exits 1 on mismatch. Pin at minimum: total revenue, total expenses,
profit/loss, total equity, closing cash, each materially judged balance, and
`trialBalance.imbalance: 0`.

The full CLI contract — stdin/`-` input, exit codes, the `--expect` key format, sign
normalisation (a line carrying the opposite of its natural balance emits negative: the signal to
reclassify), always-base-currency valuation and what a non-zero trial-balance imbalance means —
is the package README: https://www.npmjs.com/package/gainstrack. The emitted JSON's shape of
record is the statement-builder types in the gainstrack source:
https://github.com/glorat/gainstrack/blob/master/client/src/lib/statements/index.ts.

## Phase 6 — Presentation

A renderer script reads `<engagement>_statements.json` and produces the FS document (docx,
markdown). It owns captions, current/non-current grouping, statement ordering, note anchors, and
presentation reclassifications (e.g. a debit-balance director account presented as a receivable) —
computed from the JSON's leaf figures, never typed. Note prose will still embed some figures
(going concern, tax, judgments): keep them few, and treat them as a named sweep-list for
restatements. After building, extract the document's figures and diff against the JSON.

Draft the notes from the framework's illustrative FS / disclosure checklist rather than inventing
prose, and hold two disciplines the checklist won't enforce:

- **Policies are descriptions, not aspirations.** Document what was actually done; delete any
  policy describing a treatment, balance or instrument this entity doesn't have.
- **Disclose the statutory minimum.** Volunteering extra detail — expansive business
  descriptions, confessions about record-keeping, workpaper reasoning in note prose — creates a
  permanent record that can only hurt. If a sentence isn't required and doesn't help the reader,
  cut it.

## Phase 7 — Review

- Run the FS review checklist — the full multi-lens methodology (lens families, the
  conformance-vs-faithfulness precedence rule, per-reviewer evidence manifests) is bundled with
  this skill as `review-checklist.md`; read it before spawning reviewers. In brief: completeness
  against the framework's required statements and notes; every figure traced (lens A1);
  recognition and measurement per framework (A2); faithfulness — strip boilerplate describing
  what the entity didn't do (A3); internal consistency (statements foot and cross-tie);
  disclosure adequacy.
- Scope each reviewer's evidence: FS-as-document lenses read only the FS and the ledger; working
  papers enter only as subjects to reconcile against the ledger, never as premises — a stale note
  read as fact poisons the whole review round.
- Run an **over-disclosure sweep** as its own lens: statements that are true but put more on
  record than required. Conformance review rewards boilerplate and will never flag this.
- Keep a **judgment-call log**: each open accounting judgment, the options, the resolution and its
  evidence. Resolve every entry before finalising.
- Tax computation as a separate working paper: start from FS profit/loss, add-backs and
  deductions each traced to ledger accounts, reconciled to the filing position.
- Adversarial review (a second model or reviewer) on the builder script and the FS draft earns its
  cost here — classification and policy errors survive self-review.

## Phase 8 — Restatements

When a figure changes after documents exist (new evidence, corrected computation):

1. Change the **one constant** in the builder; update its evidence citation.
2. Regenerate: ledger → statements JSON → golden pins (update deliberately, reviewing each moved
   figure) → renderer output.
3. Sweep the prose: grep working papers, notes, README and tie-out tests for every old figure
   (formatted and unformatted: `12,345` and `12345`) until the sweep returns nothing.
4. Leave point-in-time archives (filed returns, superseded snapshots in an `archive/`) untouched.
5. Verify the delta flowed coherently: a revenue deferral of +X must move revenue, profit, equity
   and the liability each by exactly X, and leave cash untouched.

## Gainstrack DSL primer

Full reference: https://www.gainstrack.com/md/reference.md. The cash-flow tagging semantics —
`cashEquivalent`, `cashflowClass`, how tags inherit down an account tree, excluding one child
from a cash tree — are documented in full at https://www.gainstrack.com/md/cashflow.md. The
subset an FS engagement uses:

```
option "operating_currency" "SGD"

2025-01-01 open Assets:Bank:SG SGD          ; open before first use; options indented below
  cashEquivalent: true                       ; this account is cash for the cash-flow statement
2025-01-01 open Liabilities:Director:Loan SGD
  cashflowClass: financing                   ; classifies the OTHER side of flows vs this account
                                             ; (operating|investing|financing|adjustment; inherited)
2025-01-01 open Income:Revenue SGD
2025-01-01 open Assets:Clearing SGD
2025-01-01 open Expenses:Salaries SGD
2025-01-01 open Liabilities:Accrued SGD
2025-01-01 open Expenses:General SGD
2025-01-01 open Expenses:Tax:Withholding SGD
2025-01-01 open Income:Salary SGD
2025-01-01 open Equity:RetainedEarnings SGD

2025-06-30 earn Income:Revenue Assets:Clearing 1000.00 SGD      ; income credited, funding acct debited
2025-06-30 spend Expenses:Salaries Liabilities:Accrued 500.00 SGD ; expense debited, source acct credited
2025-06-30 tfr Assets:Clearing Assets:Bank:SG 950.00 SGD ; value flows FROM first TO second
2025-12-31 bal Assets:Bank:SG 12345.67 SGD Expenses:General  ; end-of-day assertion; plug to the
                                                             ; named adjustment account
2025-12-31 tx "paycheck with withholding"   ; explicit multi-leg; postings sum to zero, no inference
  Assets:Bank:SG 4500 SGD
  Expenses:Tax:Withholding 1500 SGD
  Income:Salary -6000 SGD
2025-12-31 close                            ; books P&L to Equity:RetainedEarnings; income
                                            ; statement reports still show the period's activity
```

Notes that bite: `earn`/`spend` name the Income/Expenses account _without_ needing the funding
account if the account declares a `fundingAccount` option; posting lines under `tx` are
single-space separated (column-padding does not parse); `bal`'s adjustment account is required;
account roots are `Assets`/`Liabilities`/`Equity`/`Income`/`Expenses`.

## Working inside the gainstrack repo (skip if you installed this skill from the marketplace)

- The CLI's source lives at `tools/gainstrack-cli/` (own `pnpm install`); run it as
  `pnpm run gainstrack -- <args>` from that directory instead of `npx gainstrack`.
- Tie-out specs go in `client/local/` (gitignored, auto-collected by vitest, guard with
  `existsSync` + skip); run with `pnpm run test:unit` from `client/`. The full convention and the
  guard idiom to copy: `client/local/README.md`.
- A worked reference engagement exists under `data/` (gitignored) — mirror its layout.
