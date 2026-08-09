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
- The `close` command is TypeScript-only and has no Scala counterpart, so Scala cannot be an oracle for it.

### 5. `client/functions/` — Firebase Cloud Functions (Node.js/TypeScript)
- HTTP/callable functions for quote sources (Firestore reads/writes in `queries.ts`/`writes.ts`) and `setDisplayName`
- Firestore trigger `upsertQuoteSource` on `quoteSourceHistory` document creation

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
```

### Run a single Vitest test file:
```bash
cd client
pnpm run test:unit -- path/to/test.spec.ts
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

### Scala-as-oracle parity tests

The TypeScript port is verified against Scala by golden files. The Scala side dumps goldens; the TS specs compare against them. This is why `core/` still earns its keep.

```bash
# from repo root — dump goldens (Dump* suites are no-ops without -DdumpFixtures)
sbt -DdumpFixtures=1 "core/testOnly com.gainstrack.core.test.DumpToGainstrack"
sbt -DdumpFixtures=1 "core/testOnly com.gainstrack.core.test.DumpToBeancount"
sbt -DdumpFixtures=1 "core/testOnly com.gainstrack.core.test.DumpLocalAllState"
```

- Checked-in goldens live in `client/src/lib/__tests__/fixtures/` and cover 8 synthetic ledgers.
- `fixtures/local/` is **gitignored** — it holds goldens for a private real ledger. Specs that consume it gate on `fs.existsSync` and skip cleanly, so a fresh checkout is unaffected. **Any new spec reading a private/ignored file must do the same**, or it breaks CI.
- Known, deliberate divergences are documented in the specs: Scala `BigDecimal` preserves trailing-zero scale where decimal.js normalizes; Scala iterates account `Set`s in JVM hash order where TS sorts.

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
