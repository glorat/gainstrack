# Financial-statement review lenses — the comprehensive set

A set of financial statements is not "reviewed" by one read-through. Distinct **lenses** catch
distinct defect classes, and some lenses _conflict_ — which is how a defect survives several
review rounds and then falls out to a one-line prompt. This lists every review that should be
run, why it exists, and an anonymised example of the defect class from a real first-year
small-company engagement.

The lens families generalise to any jurisdiction; the statutory specifics named here are
Singapore (Companies Act 1967, SFRS for Small Entities) — swap family B's checklist for your
jurisdiction's equivalents.

---

## The precedence rule (read first)

Lenses are **not** independent and must not be run as a flat checklist:

- **Conformance rewards boilerplate. Faithfulness strips it.** A standard template carries a
  deferred-tax policy, an impairment policy, a financial-instruments policy — whether or not the
  entity does any of those things. A _conformance_ reviewer sees them and passes. A
  _faithfulness_ reviewer sees them and deletes them. On the same text they return opposite
  verdicts.
- Therefore run **substance and faithfulness AFTER conformance, and let them override.**
  Conformance establishes the skeleton; faithfulness removes what this entity didn't actually
  do; the statutory minimum (family B) is the floor neither may cut below.
- A review loop pointed only at "does this look like a normal set of accounts?" will converge
  while still full of inapplicable boilerplate, because boilerplate _is_ what normal looks like.
  In the reference engagement an inapplicable deferred-tax policy survived three conformance
  rounds exactly this way.

---

## Evidence scoping (read second) — sources vs subjects

A lens is only as good as the evidence it is allowed to trust. The costliest review failure in
the reference engagement was not a wrong file list — it was letting a **stale working paper act
as a source of fact**. Fix it by giving each reviewer an explicit two-tier evidence manifest,
keyed to its lens family.

**The authoritative set (sources of truth) — the same for every reviewer:**

- The FS draft under review
- The ledger (the `.gainstrack` file — the books)
- The golden pins / tie-out tests that prove the books tie

**Two tiers, assigned by family:**

- **FS-as-document lenses** — A3 faithfulness, all of C, B1–B4 disclosure: scope to the
  **authoritative set only**. These ask "does the FS say what the books support, and nothing
  inapplicable?" A working paper cannot answer that and can only mislead.
- **Evidence-dependent lenses** — A1 vouching, A2 recognition, A4 analytical, B3 tax: these
  _may_ read the working papers (notes, tax computation, payroll schedules, the bank master),
  but **every one enters as a subject to reconcile against the authoritative set, never as a
  premise.** The rule handed to each such reviewer: _if a working paper disagrees with the
  ledger, the ledger wins and the disagreement is your finding._

**Freshness gate (precondition for the evidence-dependent lenses only).** Before A1/A2/A4/B3
run, confirm the working papers are synced to the current ledger. If they are stale, either sync
them first or the reviewers will re-import the staleness as fact. The FS-as-document lenses have
no such precondition — they never read the working papers, so they can always run. (In the
reference engagement, an analytical reviewer with no manifest swallowed a stale narrative —
superseded profit, filing status, premises — as fact; a tax reviewer that happened to treat the
same document as a subject correctly flagged it as a finding. The manifest makes the correct
behaviour the default, not luck.)

---

## Family A — Substance: is the accounting right and true to the records?

These look through the presentation to the numbers and treatments.

### A1. Vouching / numbers-to-source

**Mandate:** every figure traces to an underlying record (bank statements, payroll, invoices,
the ledger).
**Catches:** fabricated or transposed figures; amounts that foot internally but don't match
reality.
**Example:** revenue reconciles as gross processor receipts − refunds − year-end deferral;
closing cash ties to the final bank statement. Nothing may appear in the FS that isn't in the
ledger.

### A2. Recognition & measurement (technical accounting)

**Mandate:** each item is recognised and measured per the framework, not just disclosed.
**Catches:** wrong asset/expense split, missed accruals, revenue cut-off, mismeasured
liabilities.
**Example:** a refundable rental deposit capitalised as an asset rather than expensed; prepaid
customer credits deferred as a contract liability; a director's salary accrued from the date of
entitlement; a contractor reclassified as an employee with the payroll-contribution gross-up.
Each is a _treatment_ decision a disclosure check would never test.

### A3. Faithfulness / right-sizing ← the lens most often missing

**Mandate:** go policy-by-policy, note-by-note, line-by-line, and flag anything describing a
treatment, balance, or transaction **that does not exist in this ledger** — and the reverse,
any real treatment with no policy behind it.
**Catches:** template boilerplate (deferred tax, impairment, inventory, hedging, depreciation,
revenue-over-time) an entity doesn't actually apply; and undocumented real policies.
**Example:** a deferred-tax accounting policy for an entity that recognised no deferred tax and
has no temporary differences. Faithful accounts describe what was done, not the ideal.

### A4. Analytical review / professional skepticism

**Mandate:** ratios, margins, round numbers, unusual items, related-party leakage, personal
costs, completeness of income — what's wrong that no checklist names.
**Catches:** personal expenditure in company costs; missing income; implausible margins;
round-sum "estimates" masquerading as actuals.
**Example:** a small personal-care purchase stripped out of staff meals; a best-effort deferral
estimate flagged as such; director current-account movements scrutinised for personal vs
business.

---

## Family B — Compliance: does it meet the law and the framework?

Checklist lenses. These are the floor — faithfulness may not cut below them. (Singapore
specifics; substitute your jurisdiction's.)

### B1. Framework disclosure completeness

**Mandate:** every mandatory disclosure present — related parties, key-management compensation,
share capital, going concern, subsequent events, commitments & contingencies, the
accounting-policy set.
**Catches:** omitted mandatory notes — and notes wrongly included (a commitments note for a
lease signed after year-end belongs in subsequent events, or nowhere).

### B2. Statutory compliance (Companies Act)

**Mandate:** the legal boxes — audit-exemption basis, directors' statement contents, register
of directors' interests, solvency statement.
**Catches:** missing or defective directors' statement clauses; wrong exemption basis.

### B3. Tax coherence

**Mandate:** the tax note and treatment hang together — current tax, losses carried forward,
exemptions, the deferred-tax-asset recognition decision, filing obligations — even when the tax
computation is a separate paper.
**Catches:** a tax narrative inconsistent with the result or with the accounting policies. Keep
consistent with A3: don't disclose tax machinery the entity doesn't use.

### B4. Going concern & solvency

**Mandate:** negative equity / net current liabilities properly assessed; any
shareholder-support basis stated; the statutory solvency declaration is **unqualified** and
consistent with the going-concern note.
**Catches:** an over-conditioned solvency statement; a going-concern note that contradicts the
declaration.
**Example:** net liabilities supported by the controlling shareholder's written non-repayment
confirmation; a solvency statement reverted to clean statutory wording after an earlier
over-qualification.

---

## Family C — Presentation: form, consistency, readability

Necessary, not sufficient — a loop that runs only these converges while still wrong.

### C1. Conformance / standard form

**Mandate:** matches the expected structure and standard phrasing of the jurisdiction's FS.
**Catches:** missing statements, non-standard headings, unconventional wording.
**Caveat:** rewards boilerplate — must be overridden by A3.

### C2. Arithmetic: tie & foot (internal consistency)

**Mandate:** every statement foots; cross-statement ties hold; note subtotals equal face
amounts; every numeric cross-reference resolves.
**Catches:** a balance sheet that doesn't foot; cash-flow closing cash ≠ balance-sheet cash; a
note total ≠ its face line.
**Example:** a one-dollar footing break on the face of the balance sheet, traced to a rounding
choice — push the unit into a component so the face ties exactly; equity ties income statement →
changes in equity → balance sheet.

### C3. Cross-note consistency / contradiction hunt

**Mandate:** notes agree with each other and with the face; dates, entity name, registration
number consistent throughout.
**Catches:** internal contradictions — "no par value" in one note vs "issued at par" in another;
"no trade receivables" vs a receivables-implying disclosure; registered office vs place of
business.

### C4. Plain-language / leak / over-explanation

**Mandate:** no working-note leaks, no internal reasoning, no excessive justification;
professional tone. Also the **over-disclosure sweep**: statements that are true but put more on
record than required (adverse admissions about record-keeping, expansive business descriptions).
**Catches:** phrases like "after adjustment for double-counting" that belong in the workpapers;
an internal drafting note left in the document; a written admission of a statutory breach
nothing required.

### C5. Independent readability (fresh eyes)

**Mandate:** an external reader (bank, regulator, investor) understands it with no access to
the preparer's context.
**Catches:** notes that only make sense to the preparer.

---

## Family D — Cross-period (N/A in year one, mandatory thereafter)

### D1. Comparatives & opening balances

**Mandate:** prior-period comparatives present and consistent; opening balances tie to last
year's close; any restatement disclosed.

---

## How to actually run it

1. **Conformance (C1)** first — get the skeleton and standard wording in place.
2. **Statutory + framework floor (B1–B4)** — nothing may be missing.
3. **Substance (A1–A4)** — vouch, check treatments, and run **faithfulness (A3) to strip
   inapplicable boilerplate**, overriding C1 where they conflict.
4. **Presentation polish (C2–C5)** — foot, tie, de-contradict, de-leak, read cold.
5. **Cross-period (D1)** — from the second year on.

When spawning fresh-eyes reviewers, give **one mandate per reviewer** — a reviewer told to check
"everything" defaults to conformance and misses A3. The faithfulness reviewer in particular
needs the ledger in hand and the explicit instruction: _flag every disclosure that describes
something this entity did not do._

Give every reviewer its **evidence manifest** (see "Evidence scoping" above): its authoritative
set, and — for the evidence-dependent lenses only — its subject set with the "ledger wins,
disagreement is a finding" rule. Run the freshness gate before A1/A2/A4/B3. An FS-as-document
reviewer that is handed a working paper will treat its narrative as fact; do not hand it one.
