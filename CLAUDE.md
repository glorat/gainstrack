# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gainstrack is a personal finance/investment tracking application. Users write financial events in a plain-text domain-specific language (the "gainstrack format"), which is parsed into commands and used to generate portfolio reports.

**The application is client-side.** Parsing, report generation and persistence all happen in the browser against Firestore. The Scala backend survives only to serve market quotes — two endpoints. Do not add new dependencies on it, and do not reintroduce fallbacks to it: a Firestore failure must surface as a failure rather than silently serving the legacy Scala-side stream, which would show stale data and then fork the two stores on the next save.

## Architecture

### 1. `client/` — Vue 3 / Quasar SPA (TypeScript) — where the application lives
- State management: Pinia (`src/stores/`). `useAppStore` (`src/stores/app.ts`) holds `AllState`, generated entirely in the browser by the TypeScript engine.
- **TypeScript port of the Scala pipeline**: `src/lib/GainstrackParser.ts` (text → commands) and `src/lib/gen/` (`GainstrackGenerator.ts`, `balanceState.ts`, `transactionState.ts`, `priceState.ts`, …) mirror the Scala core; `generateAllStateSafe(text)` produces `AllState` fully client-side. Verified byte-identical to the Scala pipeline over a real ledger — see Testing below.
- **All reports are computed in the browser.** `src/lib/apiFacade.ts` is the seam between the Pinia store and business logic functions; it no longer has a remote arm.
- `src/lib/ledger/` — the Firestore event stream: `replay.ts` (events → commands), `firestoreLedger.ts` (read), `append.ts` (optimistic-concurrency write), `baseLedger.ts` (starter ledger for users with no history)
- `src/lib/export/` — `gainstrackExport.ts` and `beancountExport.ts` generate downloadable files locally (ported from `ExportController`)
- `src/lib/AllStateEx.ts` — wraps `AllState` to derive postings and FX conversion from raw data
- `src/lib/cashflow.ts` — the statement of cash flows (`/cash_flow`)
- `src/lib/assetdb/models.ts` — all shared TypeScript types (DTOs)
- `src/lib/pricer.ts`, `src/lib/fx.ts` — FX conversion chain used for local compute
- Auth: Firebase Auth with Google sign-in (popup flow); setup in `src/lib/assetdb/myfirebase.ts`. Only properly signed-in users persist — anonymous and signed-out visitors compute locally and never write (`ledgerUid` / `canPersist` in the store).

### 2. `client/functions/` — Firebase Cloud Functions (Node.js/TypeScript)
- HTTP/callable functions for quote sources (Firestore reads/writes in `queries.ts`/`writes.ts`) and `setDisplayName`
- Firestore trigger `upsertQuoteSource` on `quoteSourceHistory` document creation

### 3. Firestore — persistence
- `users/{firebaseUid}/records/{recordId}` — the CQRS event stream, `{streamId, streamRevision, event}` where `event` is a JSON *string*. The document id IS the Firebase uid, so rules authorise straight from the path with no billable `get()`.
- Rules and indexes live in `client/firestore.rules` / `client/firestore.indexes.json`

### 4. `quotes/` — Scala market data module
- Alpha Vantage integration for price history; depends on `core`

### 5. `web/` — Scala HTTP server (Scalatra/Jetty) — quotes only
- Entry point: `JettyLauncher` (port 9050 by default, or `$PORT`)
- **The client calls exactly two endpoints**, both in `QuotesController`: `POST /api/quotes/tickers` and `GET /api/quotes/config`. Both are guarded client-side — a quotes outage must degrade, not block startup.
- `ApiController`, `CommandApiController`, `AuthnController`, `DebugController` and `ExportController` are still mounted in `ScalatraBootstrap` but have **no client callers**. Treat them as dead code pending removal; do not build on them.

### 6. `core/` — Scala domain model (superseded by the TypeScript port)
- `com.gainstrack.command` — Command types (`open`, `earn`, `spend`, `tfr`, `trade`, `adj`, `bal`, `price`, `unit`, `fund`, `yield`, `commodity`) and `GainstrackParser` (text → `AccountCommand` seq)
- `com.gainstrack.report.GainstrackGenerator` — Multi-pass report engine: first pass builds `AccountState`, second pass `BalanceState`, third pass `TransactionState`/`PriceState`
- `com.gainstrack.lifecycle.GainstrackEntity` — CQRS aggregate root wrapping the generator
- Nothing the UI needs routes through this any more. It still compiles and links because the build graph is `web → quotes → core → dlstore` and `quotes` imports `com.gainstrack.core._` for the money/asset primitives. Its remaining active role is as the **oracle for parity tests** (see Testing).
- The `close` and `tx` commands are TypeScript-only and have no Scala counterpart, so Scala cannot be an oracle for either. `tx` is the raw multi-posting transaction (`gen/__tests__/tx.spec.ts` pins its rules); it exists because every other command produces a fixed shape of postings, so a paycheck with withholding or any other N-legged transaction had no representation at all.
- The `open` options `cashEquivalent` and `cashflowClass` are likewise TypeScript-only — Scala's `applyOption` throws `Unknown account option` on both, so **no fixture ledger may use them** and their tests are inline. They are optional and absent unless written, which is exactly what keeps every existing golden byte-identical; `gen/invariants.spec.ts` pins that. `cashflow.ts` resolves them by walking UP the account id at report time rather than through `GAccountState`: generated sub-accounts and interpolated parents are built with `defaultOptions()`, so making a *record* carry a tag downward would mean editing the parity-sensitive account fold. Resolve from the declared set and `gen/` stays untouched.

### 7. The beancount import — three packages either side of a licence boundary

Walkthrough: `docs/beancount-import.md`. **Root `README.md` § Licensing is the authority on the boundary** — read it before moving code across, and do not restate its argument here.

- `bean2gain/` — **GPL-2.0-only**, the entire GPL side: `python/dump.py` (ledger → versioned JSON), `python/balances.py`, and a standalone Pyodide website that runs the same script in a browser. Own package, own domain, meant to be extractable — nothing inside points out. `bean2gain/README.md`.
- `client/src/lib/import/` — the conversion, AGPL-3.0 and part of the app: `beancountDump.ts` (the JSON contract + schema-version check), `beancountImport.ts` (lowering: every beancount transaction becomes a raw `tx`), `lift.ts` (intent rules, each disableable), `browserImport.ts` + `balances.ts` (the in-browser front end and its round-trip check, behind `/port/beancount`, lazily routed). It reads JSON and never beancount syntax. The CLI oracle imports `balances.ts`'s `fold`/`pluggedAmounts` rather than reimplementing them — keep it that way or the two drift.
- `tools/beancount-oracle/` — AGPL-3.0, own pnpm package, holding what cannot go in a browser bundle. Its reason to exist is the oracle spec: the only test that runs a real beancount over the conversion, and unmovable (`client/` would carry a suite that spawns python and skips by default; `bean2gain/` may not hold gainstrack logic). `cli.ts` ships alongside it as an optional front end — nothing imports it and the browser import covers the same ground. Imports `client/src` via an `src/*` alias; one-directional and the only coupling. `tools/beancount-oracle/README.md`.

Nothing in `client/` imports `bean2gain/` — it drives a hidden iframe over `postMessage` (`client/src/lib/bean2gain/bridge.ts`, an independent implementation of `bean2gain/docs/embedding.md`). Three rules keep the two programs two:

1. **No beancount outside `bean2gain/`** — not the package, not a wheel, not a Pyodide runtime. Nothing else may import, bundle or serve any part of it.
2. **No gainstrack domain logic inside `bean2gain/`** — its scripts emit beancount's own data model verbatim and name no consumer.
3. **The interface is the JSON schema** (`SCHEMA_VERSION` / `SUPPORTED_SCHEMA`). Widen it by adding fields, never by importing across the line.

## Development Setup

**Frontend alone is usually enough.** The app runs entirely client-side, and the dev server proxies the two quotes endpoints to the deployed backend — so for most work you only need `pnpm run dev`.

**Backend (Scala/Scalatra)** — only when working on quotes:
Open in IntelliJ and run `JettyLauncher`. Set env vars as needed (see below).

**Cloud Functions:**
```bash
cd client/functions
export DEV=true
export GOOGLE_APPLICATION_CREDENTIALS=<path-to-json>
pnpm run serve
```

**Frontend:**
```bash
cd client
pnpm run dev   # quasar dev on port 8080
```

The Quasar dev server proxies API calls to `https://poc.gainstrack.com` by default (configured in `quasar.config.js`). To point at local backend, update the proxy target there.

## Commands

### Frontend (run from `client/`)
```bash
pnpm run dev             # dev server (port 8080)
pnpm run build           # production build (quasar build)
pnpm run lint            # ESLint
pnpm run type-check      # vue-tsc type check (no emit)
pnpm run test:unit       # Vitest (all tests)
pnpm run test:unit:watch # Vitest watch mode
pnpm run fixtures:fuzz   # regenerate the differential corpus (then re-dump Scala goldens)
```

### Run a single Vitest test file:
```bash
cd client
pnpm run test:unit -- path/to/test.spec.ts
```

### bean2gain, the browser converter (run from `bean2gain/`)
Its own pnpm package; GPL-2.0-only and deployed to its own domain.
```bash
pnpm run dev              # assembles public/pyodide/ (network once), then serves
pnpm run build            # → dist/, ~13 MB, mostly interpreter
pnpm run test:unit        # bridge protocol + browser module + comparison against native beancount
pnpm run verify:fixtures  # the differential harness, human-readable
```

### Beancount oracle, and the import CLI beside it (run from `tools/beancount-oracle/`)
Own package, own lockfile — `pnpm install` here, separately from `client/`. The conversion itself lives in `client/src/lib/import/` and is tested by `client/`'s suite; what runs here is the oracle, plus an optional CLI nothing depends on.
```bash
BEAN_PYTHON=… pnpm run test:unit                   # the oracle round trip — the point of the package
pnpm run import ledger.json -o ledger.gainstrack   # optional CLI; see docs/beancount-import.md
pnpm run type-check      # tsc --noEmit (no Vue here)
pnpm run lint
```

### Type checking
Run `pnpm run type-check` from `client/` after any TypeScript or Vue SFC change to catch type errors before they reach the browser. This uses `vue-tsc --noEmit`, which understands `<script setup lang="ts">` blocks and component prop types. It must pass cleanly before a PR is considered ready.

When editing a `.vue` file whose `<script>` tag lacks `lang="ts"`, add it and resolve any new errors introduced by that file before committing.

### Backend (from repo root, via sbt)
```bash
sbt compile
sbt test                          # all Scala tests
sbt "core/testOnly com.gainstrack.core.test.First"  # single test class
sbt web/assembly                  # build uber-jar
```

### Cloud Functions (from `client/functions/`)
```bash
pnpm run build     # compile TypeScript
pnpm run serve     # build + start emulator
pnpm run deploy    # deploy to Firebase
```

## Key Environment Variables

| Variable | Purpose |
|---|---|
| `AV_API_KEY` | Alpha Vantage API key for market quotes |
| `MYSQL_PASS` / `MYSQL_URL` | Cloud SQL (quotes DB) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Firestore service account JSON path |
| `QUOTES_ADMIN` | Enable quotes admin endpoints |
| `PORT` | Override Jetty listen port (default 9050) |

## Testing

- **Scala tests** live in `core/src/test/scala/` and `web/src/test/scala/`; use ScalaTest
- **TypeScript/Vue tests** live in `client/test/unit/` and `client/src/lib/__tests__/`; use Vitest
- Test files use `.spec.ts` or `.test.ts` suffixes
- Run tests with `pnpm run test:unit` from `client/`
- Firestore rules tests need the emulator running (`client/src/lib/ledger/__tests__/firestoreRules.spec.ts`)

### Private tests and private data

Picking the wrong mechanism either leaks data or breaks a clean checkout. `client/local/README.md` is the full convention, including the guard idiom to copy:

| What is private | Where it goes |
|---|---|
| The **input data** only, test code is generic | tracked spec + gitignored fixture + an `existsSync` guard that skips |
| The **assertions themselves** — real figures, account names, named individuals | `client/local/`, gitignored in full |

- **Do not add an explicit `include` to `vitest.config.ts`** — the default `**/*.spec.ts` glob is what makes `client/local/` work with no configuration.
- **Any new spec reading a gitignored path must guard on it and skip**, or a fresh checkout goes red. Same for an external binary, and existence is not enough: probe it (`beancountOracle.spec.ts` runs `--version`, so a stale shim on `PATH` counts as absent).
- **Simulate a fresh clone before committing** — move `client/local/`, `data/` and `client/src/lib/__tests__/fixtures/local/` aside, run `pnpm run test:unit`, and require green *with skips* rather than failures. This is also what catches a `readFileSync` in a `describe` body, which runs at collection time and fails the whole suite.

### Scala-as-oracle parity tests

The TypeScript port is verified against Scala by golden files. The Scala side dumps goldens; the TS specs compare against them. This is why `core/` still earns its keep.

```bash
# from repo root — dump goldens (Dump* suites are no-ops without -DdumpFixtures)
sbt -DdumpFixtures=1 "core/testOnly com.gainstrack.core.test.DumpParserCases"    # parser behaviour corpus
sbt -DdumpFixtures=1 "core/testOnly com.gainstrack.core.test.DumpGeneratorCases" # generator ok/error corpus
sbt -DdumpFixtures=1 "core/testOnly com.gainstrack.core.test.DumpParserDTOs"     # per-ledger command DTOs
sbt -DdumpFixtures=1 "core/testOnly com.gainstrack.core.test.DumpGeneratorDTOs"  # allState + full transactions
sbt -DdumpFixtures=1 "core/testOnly com.gainstrack.core.test.DumpToGainstrack"
sbt -DdumpFixtures=1 "core/testOnly com.gainstrack.core.test.DumpToBeancount"
sbt -DdumpFixtures=1 "core/testOnly com.gainstrack.core.test.DumpFuzzGoldens"    # the 300-ledger corpus
sbt -DdumpFixtures=1 "core/testOnly com.gainstrack.core.test.DumpLocalAllState"
```

**Adding a fixture ledger** means adding it in exactly two places: `Fixtures.names` (Scala) and `fixtureNames.ts` (TS). `fixtureNames.spec.ts` fails if the two drift or if any golden is missing, so a half-added fixture cannot pass silently.

The layers, in rough order of what they catch:

| Spec | Compares | Notes |
|---|---|---|
| `GainstrackParserDiff` | parser ok/error/crash + command DTOs | shared corpus `parser_cases.txt` |
| `GeneratorDiff` | generator ok/error | shared corpus `gen_cases.txt` |
| `Generator` / `localGoldens` | `allState` per ledger | 9 synthetic + 1 private |
| `txsFull` | full `Transaction`, **including `description` and `id`** | `TransactionDTO` drops both — that gap hid four real bugs |
| `gainstrackExport` / `beancountExport` | whole-file exports, byte-exact | plus export → re-import round trip |
| `fuzzDiff` | **300 generated ledgers**, every artifact | the broadest net; see below |
| `exportInvariance` | `generate(export(x)) ≡ generate(x)` | no oracle — outlives Scala |
| `beancountOracle` | our output vs **beancount** | independent engine; opt-in, see below |
| `gen/invariants` | guards no ledger can reach | each one added because a mutation survived |
| `gen/tx` | the `tx` command's rules | TS-only command, so no differential test can |
| `lib/import/beancountImport` | one case per lowering/lifting row | inline dump documents, needs no python |
| `lib/import/balances` | the totals arithmetic `balances.py` does | what the in-browser verification rests on |
| `lib/cashflow` | tag resolution, classification, reconciliation | inline ledgers — tagged ones cannot be fixtures |
| `lib/import/browserImport` | the import + its round trip, converter stubbed | one test per way an import can go wrong |
| `beancountImportOracle` † | beancount ledger → import → export → **beancount** | balances compared through the same loader on both sides; opt-in via `BEAN_PYTHON` |
| `bean2gain/verify/parity` ‡ | `dump.py` under WASM vs native CPython | 4 ledgers incl. a 2037-entry `bean-example`, byte-identical |
| `bean2gain/src/browserParity` ‡ | the *browser module* vs native CPython | the site's own code path, not just the script |
| `bean2gain/src/bridge` ‡ | the `postMessage` contract | over a real MessageChannel with a stub engine |
| `client/lib/bean2gain/bridge` | the client half of that contract | jsdom plays the converter; no beancount involved |

† in `tools/beancount-oracle/`, ‡ in `bean2gain/` — separate packages, each with its own `pnpm run test:unit`. `client/`'s does not run either. Everything unmarked is `client/`'s.

**The generated corpus** (`fixtures/fuzz/`) is 150 valid ledgers plus 150 targeted mutations of them, produced deterministically by `ledgerGenerator.ts`. Both the ledgers and the gzipped goldens are checked in on purpose: once Scala is gone they are the only surviving record of its behaviour, and `fuzzDiff` becomes a regression suite without any change. Regenerate with `pnpm run fixtures:fuzz`, then re-run `DumpFuzzGoldens`.

**The import oracle** checks the beancount importer by running the original ledger and the converted-then-re-exported one through the *same* beancount loader, comparing per-(account, currency) totals — on both the lowered and the lifted output, so a failure says which half broke. It lives in its own package and `client/`'s suite does not run it: `cd tools/beancount-oracle && BEAN_PYTHON=… pnpm run test:unit`, which skips whole without that python. Details and how to widen the corpus: `tools/beancount-oracle/README.md`.

**Beancount as an independent oracle** (`beancountOracle.spec.ts`) is the one check that does not depend on Scala at all: it runs our export through the real beancount CLI, which verifies every transaction balances, no account is used before opening, and `AllState.balances` reconciles with the postings `TransactionState` produced. Opt in with `BEAN_CHECK=/path/to/bean-check`; it skips cleanly otherwise.

- `fixtures/local/` holds goldens dumped from a private real ledger and is **gitignored**; the specs consuming it guard and skip — see Private tests and private data above.
- Known, deliberate divergences, each documented at its assertion:
  - Scala `BigDecimal` preserves trailing-zero scale where decimal.js normalizes (`__tests__/scale.ts` strips it, and every spec that does also asserts the residue is *only* trailing zeros).
  - Scala iterates account `Set`s in JVM hash order where TS sorts.
  - Scala's `Set[AccountCreation]` keys on the whole case class, so one account id can be stored **twice** with different options and resolved by hash order — it even emits duplicate beancount `open` directives, which bean-check rejects. The TS port keys by id and is first-write-wins. This is deliberately *better* than the oracle, and `gen/invariants.spec.ts` pins the choice since no differential test can.
  - The `cashEquivalent` / `cashflowClass` account options exist only in TS. Untagged ledgers are unaffected, so the divergence is invisible to every golden; a tagged one simply cannot be dumped from Scala.
- Some ledgers are legal gainstrack but not expressible in beancount (`open X GBP` constrains the account to GBP; gainstrack lets any currency post into it). `beancountOracle` detects and skips those, and reports how many.

## Data Flow

1. User writes gainstrack text (plain-text DSL commands)
2. `src/lib/GainstrackParser.ts` tokenizes into commands
3. `src/lib/gen/` runs a multi-pass fold to produce `BalanceState`, `TransactionState`, `PriceState`, etc.
4. `AllState` is generated in the browser — for signed-in users by replaying their Firestore event stream, for everyone else from the starter ledger (`baseLedger.ts`)
5. The Pinia app store holds `AllState`; reports (balance trees, IRR, P&L explain) are computed locally via `apiFacade.ts` → lib functions
6. Writes append a delta to the Firestore stream under optimistic concurrency (`ledger/append.ts`)

The Scala `com.gainstrack.command` / `com.gainstrack.report` equivalents of steps 2–3 still exist and are kept behaviourally in step with the port, but serve only as the test oracle.

## Build & Deployment

```bash
# Frontend to Firebase Hosting
cd client && quasar build && firebase deploy --only hosting:poc

# Full backend image (slow)
gcloud builds submit --config cloudbuild.yaml

# Fast incremental backend image
gcloud builds submit --machine-type=N1_HIGHCPU_8 --config fast.cloudbuild.yaml

# Deploy backend to Cloud Run
gcloud run deploy appserver --region asia-northeast1 --image gcr.io/gainstrack/gainstrack --platform managed --allow-unauthenticated --project gainstrack
```
