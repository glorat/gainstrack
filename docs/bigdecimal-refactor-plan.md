# Refactor plan: `Fraction` (spire Rational) → `BigDecimal` (finance practices)

Status: **planning / not started.** No source changes made yet.
Last updated: 2026-06-12

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

### Per-currency scale registry

Source of truth = commodity options, with hardcoded defaults as fallback:

```
scaleOf(ccy) = commodityOptions(ccy).get("precision").map(_.toInt)
                 .getOrElse(default(ccy))
// defaults: fiat = 2, JPY/KRW = 0, crypto (BTC/ETH...) = 8, securities/NAV = 6
```

Wiring: because `Amount` is constructed in many places, use a process-level
provider for the registry, initialized once when `GainstrackGenerator` processes
`commodity` commands, with the hardcoded defaults as fallback. (Alternative —
threading a registry through every `Amount.apply` — is cleaner but touches far
more call sites; rejected for now.)

### Rounding choke points (so "fixed scale at each step" holds without
accumulating intermediate error)

Additive chains of equal-scale amounts already stay on-scale, so only round the
scale-growing operations + construction:

- `Amount.apply(value, ccy)` — replace `limitDenominatorTo(1_000_000)` with
  `value.setScale(scaleOf(ccy), HALF_EVEN)`.
- `Amount.*` and `Amount./`, and FX `convertTo` (in `Amount` and `PositionSet`)
  — round result to the **target** currency scale.
- `Amount.+` / `Amount.-` — leave as-is (scale-preserving).

### Balance tolerance

`Transaction.isBalanced`: replace `sum == 0` with
`sum.abs <= 0.5 × 10^(-minScaleAmongPostings)`.

### Equality gotcha

Never use `==` on `BigDecimal` for zero tests (Scala `BigDecimal` equality has
scale pitfalls, e.g. `0` vs `0.00`). Use `.signum == 0` / `.compare`. Audit every
`== zeroFraction`, `!= zeroFraction`, and spire `.isZero` (which won't exist on
`BigDecimal`).

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

### Phase 2 — Semantics that actually matter
7. Add the per-currency scale registry + provider.
8. `Transaction.isBalanced` (`Transaction.scala:29`): tolerance check.
9. `SecurityPurchase.scala:50` (`-price*security.number - commission`) and other
   trade/FX multiplications: round results to currency scale via `MathContext`.
10. Audit/convert all `== zeroFraction` / `!= zeroFraction` / `.isZero`
    (PositionSet `filterZeroes` + `isEmpty`, SecurityPurchase guards, etc.) to
    `.signum == 0`.

### Phase 3 — Tests
11. `First.scala:73` `denominatorIsValidLong` and `First.scala:302`
    `limitDenominatorTo(1000000)` — spire-specific; rewrite.
12. Make `==` balance assertions in tests tolerance-aware / use `.compare`.
13. Run `sbt core/test quotes/test web/test`; breakages concentrated in the 5
    test files referencing `Fraction` directly.

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

`.venv/` is gitignored. Production parity note: the Docker images currently
install beancount unpinned (`pip3 install beancount`) / transitively via `fava`;
pinning it in `python/requirements.txt` makes it explicit. Consider updating
`Dockerfile` / `scalabase.Dockerfile` to install beancount from the requirements
file rather than a bare `pip3 install beancount` so prod matches 2.3.6.

## Next steps when resuming

1. Resolve the build environment (above) and run **Phase 0** baseline:
   `core/compile`, then `core/test` — record pass/fail counts.
2. Proceed Phase 1 → 2 → 3, running `core/test` after each phase to track blast
   radius.
3. Effort estimate: ~13 source files + 5 test files. Phase 1 mechanical; Phases
   2–3 require judgment (the `.signum`/tolerance audit is the crux).
