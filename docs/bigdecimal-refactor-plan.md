# Refactor plan: `Fraction` (spire Rational) → `BigDecimal` (finance practices)

Status: **DONE (2026-06-12).** `Fraction` is now `scala.math.BigDecimal`. All
modules green: core 129 pass / 1 ignored, quotes compiles (no tests), web 3 pass.
The refactor landed **much simpler than the 16-phase plan below** — see "Actual
outcome" immediately after this line. The phased plan is retained for historical
context.
Last updated: 2026-06-12

## Actual outcome (what actually shipped — simpler than planned)

The user's framing — "it's only display, which in reality is handled by the front
end" — collapsed most of Phase 2 away. The server-side `toString` is consumed ONLY
by `bean-check`; the browser formats from the `toDouble` JSON DTO. And BigDecimal
`+`/`-`/`*` are exact, so the exact-zero balance check still holds across the whole
suite.

**Shipped:**
- `type Fraction = scala.math.BigDecimal`; `parseNumber` → `BigDecimal(str)`;
  `zeroFraction` → `BigDecimal(0)` (package.scala).
- Removed every spire API: `limitDenominatorTo`/`SafeLong` (Amount, BalanceState),
  `spire.math.{Rational,SafeLong}` / `spire.implicits._` / `spire.math.Fractional`
  imports (Events, PriceState, TimeSeriesInterpolator). `.isZero` → `.signum == 0`
  (PositionSet, AccountInvestmentReport, SecurityPurchase, UnitTrustBalance).
- `Amount.toString` → `number.bigDecimal.toPlainString` (no exp notation; preserves
  each amount's natural parsed scale, so roundtrip is unaffected).
- `FractionSerializer`: emit `JDecimal(value)`, and the deserialize `???` is now
  implemented (`JDecimal`/`JString` → BigDecimal).
- Tests: 3 stale double-format expectations updated (TransactionBalance "10.0"→"10",
  "-1830.7"→"-1830.70"; First inferred-rate compared via `.toDouble`); spire-only
  test sites rewritten (`denominatorIsValidLong` removed, `limitDenominatorTo`/
  `.round` → `setScale(_, HALF_UP)`).

**Deliberately NOT done (unnecessary):**
- **Per-currency fixed scale / `defaultScaleOf` classification.** `AssetId` has no
  type metadata, so it would need fragile hardcoded currency lists, and forcing
  e.g. USD→scale-2 would break roundtrip fidelity ("10.0"→"10.00") for zero real
  benefit (client formats from the double DTO). Skipped.
- **Tolerance balance check.** Not needed — exact BigDecimal arithmetic keeps
  `sum == 0` true everywhere in the suite. Remains available as cheap hardening if
  FX-division residuals ever surface in real data.
- `== zeroFraction` / `!= zeroFraction` left as-is: Scala BigDecimal `equals` is
  compare-based (scale-independent), so `filterZeroes` etc. are already correct.

## Goal

Replace the exact-rational number model (`spire.math.Rational`) used for all
monetary amounts with `scala.math.BigDecimal`, following standard finance
practice: **per-currency fixed decimal scale** with **banker's rounding**, and a
**tolerance-based balance check** instead of exact-zero equality.

## Why (the motivation)

`Rational` was chosen so that postings sum to *exactly* zero and balances are
exact. But:

- Rationals can represent values (`1/3`, `1/7`) that are not valid monetary
  amounts in any currency — a category mismatch with real money.
- The code already approximates anyway: `Amount.apply` caps the denominator via
  `limitDenominatorTo(SafeLong(1000000))`, and `BalanceState` does the same. So
  it is "approximately rational," with the error hidden rather than explicit.
- Real ledgers (beancount, ledger-cli, GnuCash) use fixed-point decimal with
  explicit rounding and a per-currency tolerance when checking balance.

## Key findings from code investigation

1. **Single type alias is the lever.**
   `core/.../core/package.scala:8` → `type Fraction = spire.math.Rational`.
   Changing this to `scala.math.BigDecimal` is the core move; Scala's
   `BigDecimal` has implicit `Int`/`Long` conversions so literals like `9999`
   and `zeroFraction` keep working.

2. **Exactness only truly bites in ONE place.**
   `Transaction.isBalanced` (`core/.../core/Transaction.scala:29`) does
   `postings.map(_.weight.number).sum == 0` — an *exact* zero comparison. This
   is the only place that genuinely depends on rational exactness.

3. **The client already uses doubles.**
   The entire TypeScript client represents `Amount` as `number` (JS double) —
   `client/src/lib/assetdb/models.ts:28`. Server serializes amounts via
   `JDecimal(value.toBigDecimal(DECIMAL64))` and the browser does all report
   math (IRR, P&L, balances) in double precision (`localCompute = true`). So the
   rational exactness is a **server-side-only** concern and is already discarded
   before the client computes anything. This dramatically lowers risk.

4. **No precision metadata on `AssetId`.**
   `AssetId` (`core/.../core/Events.scala:71`) is just an all-caps symbol string.
   But `CommodityOptions` (`core/.../command/CommodityOptions.scala:11`) carries a
   free-form `options: SortedMap[String,String]` populated by the `commodity`
   command — the natural home for a per-currency `precision:` setting.

## Decisions made (confirmed with user)

| Decision | Choice |
|---|---|
| Internal arithmetic | **Per-currency fixed scale** — round every amount to its currency's minor unit at each step (most "finance-correct", most invasive) |
| Balance residuals | **Tolerance check** — transaction balances if `\|sum\| <= 0.5 × smallest-unit` (beancount approach); no rounding account / ledger pollution |
| Rounding mode | `HALF_EVEN` (banker's rounding) |
| Display | Keep `.toDouble` at the JSON/DTO seam (unchanged; client untouched) |

## Design

### Per-currency scale: pure-function defaults + per-session overrides

DECISION (2026-06-12, reviewed): scale must NOT live in a global/process registry.
The web server is **multi-tenant** (per-session `GainstrackGenerator` in
`GainstrackSupport`), so shared mutable scale state would leak one user's
`commodity ... precision:` into another's ledger. Also, `Amount`s are constructed
during *parsing* — before any commodity command is folded — so a
generator-populated registry wouldn't even be ready at construction time.

Two tiers:

1. **Defaults — a PURE function of the ccy symbol, used inside `Amount`** (no
   shared state, safe to call at parse time):
   ```
   def defaultScaleOf(ccy: AssetId): Int   // fiat=2, JPY/KRW=0, crypto=8, securities/NAV=6
   ```
   `Amount` rounds to `defaultScaleOf(ccy)` on construction and scale-growing ops.

2. **Overrides — `commodity ... precision: N`** are applied at the
   generator/report **boundary**, where per-session commodity context is in scope
   (re-round to the declared scale when finalizing postings/balances). Any override
   registry is per-`GainstrackGenerator` instance, **never global**.

### Rounding choke points

`Amount` has TWO constructors: the case-class ctor `Amount(number, ccy:AssetId)`
(used by all arithmetic ops) and `apply(value, ccy:String)`. Rounding must sit
where BOTH funnel — normalize in the case-class `apply` override (or a private
`normalized` helper the ops call), NOT only in the string `apply`.

Additive chains of equal-scale amounts stay on-scale, so round only construction +
the scale-growing ops:
- construction — replace `limitDenominatorTo(1_000_000)` with
  `value.setScale(defaultScaleOf(ccy), HALF_EVEN)`.
- `Amount.*(Fraction)` / `Amount./` and FX `convertTo` (in `Amount`/`PositionSet`)
  — round result to the **target** ccy default scale.
- `Amount.+` / `Amount.-` — leave as-is (scale-preserving).

**Balancing invariant:** a trade rounds both legs (`price*units` and `-price*units`)
identically, so they still cancel to exactly 0. Never round the two sides with
different scales/contexts — the tolerance check below is meant to absorb genuine
cross-currency residuals, NOT asymmetric-rounding bugs.

**FX/price RATES are not currency amounts.** Keep rate computation (PriceState
division, implied rates) at a high working precision (DECIMAL128); only the
resulting converted `Amount` gets currency-scale rounding. Do not `setScale` rates.

### Balance tolerance

`Transaction.isBalanced` checks a single weight-ccy (it already `require`s all
postings share a ccy), so replace `sum == 0` with
`sum.abs <= 0.5 × 10^(-defaultScaleOf(weightCcy))`.

### Equality / zero tests

Use `.signum == 0` (not `==`) for zero tests. Scala `BigDecimal` `==` is mostly
value-based, but scale/`hashCode` differences after operations make `.signum` the
reliable choice. Audit every `== zeroFraction`, `!= zeroFraction`, and spire
`.isZero` (which won't exist on `BigDecimal`).

### Beancount text formatting (affects the RUNTIME bean-check)

`Amount.toString` (Amount.scala:21) renders amounts into the generated beancount
that `bean-check` validates — both at runtime (`writeBeancountFile`) and in two
tests. `BigDecimal.toString` can emit exponential notation (e.g. `1E-7`), which
beancount rejects — exactly the hazard the existing Amount.scala:18 comment warns
about. Render via `number.bigDecimal.toPlainString` so output is always plain
decimal, and re-verify generated beancount passes bean-check.

## Phased execution plan

### Phase 0 — Baseline (DONE 2026-06-12)
- `core/compile`: **clean** on JDK 17 (deprecation warnings only).
- `core/test`: **129 passed, 1 ignored, 0 failed** (fully green) once the
  project-local beancount venv is on PATH (see below).
- Before the venv was set up, 2 tests failed (`First."should pass bean-check"`
  First.scala:177, `TransactionAmountTest."should generate beancount"`
  TransactionBalance.scala:62) — both shell out to `bean-check`, which was
  broken globally (`No module named 'beancount'`). NOTE: `bean-check` is not
  test-only — it's a **runtime** dependency: `GainstrackGenerator.writeBeancountFile`
  (GainstrackGenerator.scala:176) runs it to validate generated output, called
  from `GainstrackSupport.scala:159`.
- **Target after refactor = stay fully green (129 pass / 1 ignored).**

### Phase 1 — Swap the alias, get it compiling
1. `core/package.scala`: `type Fraction = scala.math.BigDecimal`;
   `parseNumber` → `BigDecimal(str)`; `zeroFraction` → `BigDecimal(0)`.
2. `Amount.scala`: delete `limitDenominatorTo(SafeLong(1000000))` in `apply`;
   drop `spire.math.SafeLong` import. `/` now needs an explicit `MathContext`.
3. `BalanceState.scala`: remove `.limitDenominatorTo(1000000)` (line 37) and
   `SafeLong` import; delete dead commented variants.
4. `PriceState.scala`, `Events.scala`: drop `spire.math.{Rational, SafeLong}`
   imports.
5. `GainstrackJsonSerializers.scala`: `FractionSerializer` → `JDecimal(value)`
   (already BigDecimal); implement the deserialize case (currently `???`).
6. `TimeSeriesInterpolator.scala`: ensure `n / all` uses a `MathContext` or
   double (already converts to double); remove now-unused `spire.implicits._` /
   `spire.math.Fractional` imports.
7. `Amount.toString` → render via `number.bigDecimal.toPlainString` (no exp
   notation) so generated beancount stays bean-check-valid.

### Phase 2 — Semantics that actually matter
8. Add `defaultScaleOf(ccy)` (pure function) and round inside `Amount` at the
   shared construction/normalize point + scale-growing ops (see Design).
9. Apply `commodity precision:` **overrides at the generator/report boundary**
   (per-session), not in `Amount`.
10. Keep PriceState rate math at DECIMAL128 — do not currency-round rates.
11. `Transaction.isBalanced` (`Transaction.scala:29`): tolerance check.
12. `SecurityPurchase.scala:50` (`-price*security.number - commission`) and other
    trade/FX multiplications: round results to currency scale (both legs alike).
13. Audit/convert all `== zeroFraction` / `!= zeroFraction` / `.isZero`
    (PositionSet `filterZeroes` + `isEmpty`, SecurityPurchase guards, etc.) to
    `.signum == 0`.

### Phase 3 — Tests
14. `First.scala:73` `denominatorIsValidLong` and `First.scala:302`
    `limitDenominatorTo(1000000)` — spire-specific; rewrite.
15. Make `==` balance assertions in tests tolerance-aware / use `.compare`.
16. Run `./scripts/sbt "core/test"` after each phase; finally
    `./scripts/sbt "core/test quotes/test web/test"`. BASELINES CAPTURED
    (2026-06-12, all green): core 129 pass/1 ignored; quotes+web all pass. Any
    new failure is attributable to the refactor.

## File inventory

**Source (core) referencing `Fraction`:**
- `core/.../core/package.scala` (the alias + `parseNumber`, `zeroFraction`)
- `core/.../core/Amount.scala`
- `core/.../core/PositionSet.scala`
- `core/.../core/Transaction.scala`
- `core/.../core/Events.scala`
- `core/.../core/TimeSeriesInterpolator.scala`
- `core/.../core/GainstrackJsonSerializers.scala`
- `core/.../report/BalanceState.scala`
- `core/.../report/PriceState.scala`
- `core/.../report/TransactionState.scala`
- `core/.../report/NetworthReport.scala`
- `core/.../report/BalanceConversion.scala`
- `core/.../report/AccountInvestmentReport.scala`
- `core/.../command/BalanceStatement.scala`
- `core/.../command/BalanceAdjustment.scala`
- `core/.../command/SecurityPurchase.scala`
- `core/.../command/Transfer.scala`
- `quotes/.../av/AVStockParser.scala`

**Tests referencing `Fraction`:**
- `core/.../test/First.scala`
- `core/.../test/TestPositionSet.scala`
- `core/.../test/TransactionBalance.scala`
- `core/.../test/MultiAssetAdj.scala`
- `core/.../test/TestTimeSeriesInterpolator.scala`

**Spire-specific APIs that won't port directly (must rewrite):**
- `limitDenominatorTo(SafeLong(1000000))` — Amount.scala:58, BalanceState.scala:37
- `spire.math.Rational(BigDecimal(str))` — package.scala:20 (parseNumber)
- `.denominatorIsValidLong` — First.scala:73 (test)
- `.isZero` — PositionSet.scala (use `.signum == 0`)
- imports of `spire.math.{Rational, SafeLong}`, `spire.implicits._`,
  `spire.math.Fractional`

## Environment / tooling situation (RESOLVED)

`sbt` is installed via Homebrew (`/opt/homebrew/bin/sbt`, runner; project uses
sbt **1.11.3** from `project/build.properties`).

**JDK: target is 21 (LTS).** The project builds + tests green on JDK 17 and 21
with no changes. It also builds on JDK 26 *after* one fix (below). Homebrew's
sbt bundles JDK 26, so do NOT let it use its default — use the wrapper, which
selects 21.

`core/.../core/package.scala:25` previously used a hand-rolled
`new Ordering[LocalDate]{}` that fails to compile on JDK 26 (its
`java.util.Comparator` now ships default `max`/`min` that collide with Scala's
`Ordering`). Replaced with `Ordering.fromLessThan(_ isBefore _)` — idiomatic,
works on 17/21/26. This is the ONLY source blocker for newer JDKs (verified:
core+quotes+web compile and core tests pass on real JDK 26).

Installed JDKs (via `/usr/libexec/java_home -V`): 21.0.9 (Temurin) and 17.0.4.1
(Oracle); plus Homebrew's 26.0.1 (not registered in java_home). Local caches
(`~/.ivy2`, `~/.sbt`, Coursier) are populated.

**Deferred:** Docker base images still pin Temurin 17 (`scalabase.Dockerfile`,
`runtime.Dockerfile`). Bumping prod to a newer JDK is a separate change.

**beancount (RUNTIME dependency) via uv:** the backend shells out to
`bean-check`. It is pinned as `beancount==2.3.6` in `python/requirements.txt`
(the same file the Docker runtime image installs). Locally we mirror it in a
project-local venv managed by uv:

```
uv venv .venv
uv pip install --python .venv/bin/python -r python/requirements.txt
```

`.venv/bin` must be on PATH when running sbt so tests/runtime find `bean-check`.

**Use the wrapper `./scripts/sbt`** — it bakes in both gotchas (auto-selects
JDK 21, prepends `.venv/bin`). So the whole baseline is just:

```
./scripts/sbt "core/test"
```

**Test flakiness — FIXED.** `FirstStored` and its subclass `FirestoreFirstStored`
inherited the same hardcoded UUIDs and, when Firebase creds are absent, both fall
back to `FileRepository("/tmp")` — racing on identical files under ScalaTest's
parallel suite execution (intermittent "invalid CE at revision N" / wrong commit
counts; there was a `FIXME` about it). Fixed by seeding the ids with
`getClass.getName` in `FirstStored.scala` so each suite has distinct storage keys.
Suite is now deterministically green.

`.venv/` is gitignored. Production parity: DONE (2026-06-12). All Dockerfiles now
pin `beancount==2.3.6` — `scalabase.Dockerfile` and the `Dockerfile` builder
(both run `sbt test` → bean-check), and the runtime stages (`Dockerfile`,
`runtime.Dockerfile`) install `fava beancount==2.3.6` (fava 1.30.x is compatible
with beancount 2.3.6, verified by resolution). `fast`/`fasttest` inherit the
pinned base images. JDK stays 17 across all images (intentional; prod JDK bump
deferred). Base images modernized (2026-06-12): builder `hseeberger/scala-sbt`
(abandoned) → `sbtscala/scala-sbt:eclipse-temurin-17.0.15_6_1.11.3_2.13.16`
(matches scalabase + the project's declared sbt/scala); runtime
`openjdk:17.0.2-slim-bullseye` (deprecated) → `eclipse-temurin:17-jre-jammy` in
`Dockerfile` + `runtime.Dockerfile`; webbuilder `node:16-alpine` → `node:20-alpine`.
Note the pip flag split: the builder base is PEP-668 externally-managed (needs
`--break-system-packages`); the jammy runtime base is not (pip lines stay
flag-free). Still-open (not blocking): `fava` at runtime may be vestigial (server
calls `bean-check`, not fava) — confirm before any future cleanup.

## Next steps when resuming

1. (Optional, recommended) Capture `quotes/test` + `web/test` baselines via
   `./scripts/sbt` so the refactor's blast radius outside `core` is attributable.
2. Proceed Phase 1 → 2 → 3, running `./scripts/sbt "core/test"` after each phase.
3. Effort estimate: ~13 source files + 5 test files. Phase 1 mechanical; Phases
   2–3 require judgment (scale boundary, `.signum`/tolerance audit, beancount
   formatting are the crux).
