# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gainstrack is a personal finance/investment tracking application. Users write financial events in a plain-text domain-specific language (the "gainstrack format"), which is parsed into commands and used to generate portfolio reports.

## Architecture

The project has five distinct layers:

### 1. `core/` — Scala domain model
- `com.gainstrack.command` — Command types (`open`, `earn`, `spend`, `tfr`, `trade`, `adj`, `bal`, `price`, `unit`, `fund`, `yield`, `commodity`) and `GainstrackParser` (text → `AccountCommand` seq)
- `com.gainstrack.report.GainstrackGenerator` — Multi-pass report engine: first pass builds `AccountState`, second pass `BalanceState`, third pass `TransactionState`/`PriceState`. All reporting starts here.
- `com.gainstrack.lifecycle.GainstrackEntity` — CQRS aggregate root wrapping the generator; persists to Firestore/file

### 2. `quotes/` — Scala market data module
- Alpha Vantage integration for price history; depends on `core`

### 3. `web/` — Scala HTTP server (Scalatra/Jetty)
- Entry point: `JettyLauncher` (port 9050 by default, or `$PORT`)
- Routes registered in `ScalatraBootstrap`: `/api/*` → `ApiController`, `/api/post/*` → `CommandApiController`, `/api/quotes/*` → `QuotesController`, `/api/authn/*` → `AuthnController`, `/api/export/*` → `ExportController`, `/api/debug/*` → `DebugController`, plus `/api/quotesAdmin/*` → `QuotesAdminController` when `QUOTES_ADMIN` is set
- Auth: Firebase ID tokens verified server-side in `OAuthStrategy` (bearer token → `FirebaseAuth.verifyIdToken`); session state via `GainstrackSupport`

### 4. `client/` — Vue 3 / Quasar SPA (TypeScript)
- State management: Pinia (`src/stores/`). `useAppStore` (`src/stores/app.ts`) holds `AllState`, obtained either from the server via `/api/allState` or generated entirely in the browser by the TypeScript engine. Persistence via `pinia-plugin-persistedstate`.
- **TypeScript port of the Scala pipeline**: `src/lib/GainstrackParser.ts` (text → commands) and `src/lib/gen/` (`GainstrackGenerator.ts`, `balanceState.ts`, `transactionState.ts`, `priceState.ts`, …) mirror the Scala core; `generateAllStateSafe(text)` produces `AllState` fully client-side.
- **Most reports are computed locally in the browser** (`localCompute = true` in `src/lib/apiFacade.ts`), not on the server. `apiFacade.ts` is the seam between the Pinia store and business logic functions.
- `src/lib/AllStateEx.ts` — wraps `AllState` to derive postings and FX conversion from raw data
- `src/lib/assetdb/models.ts` — all shared TypeScript types (DTOs)
- `src/lib/pricer.ts`, `src/lib/fx.ts` — FX conversion chain used for local compute
- Frontend auth: Firebase Auth with Google sign-in (popup flow); Firebase setup in `src/lib/assetdb/myfirebase.ts`

### 5. `client/functions/` — Firebase Cloud Functions (Node.js/TypeScript)
- HTTP/callable functions for quote sources (Firestore reads/writes in `queries.ts`/`writes.ts`) and `setDisplayName`
- Firestore trigger `upsertQuoteSource` on `quoteSourceHistory` document creation

## Development Setup

All three processes must run simultaneously:

**Backend (Scala/Scalatra):**
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

## Data Flow

1. User writes gainstrack text (plain-text DSL commands)
2. `GainstrackParser` tokenizes into commands (Scala on the server; `src/lib/GainstrackParser.ts` in the browser)
3. `GainstrackGenerator` runs a multi-pass fold to produce `BalanceState`, `TransactionState`, `PriceState`, etc. (Scala `com.gainstrack.report`; TypeScript `src/lib/gen/`)
4. The client obtains `AllState` either from the server (`/api/allState`) or by running the TypeScript pipeline locally
5. The Pinia app store holds `AllState`; reports (balance trees, IRR, P&L explain) are computed locally via `apiFacade.ts` → lib functions

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
