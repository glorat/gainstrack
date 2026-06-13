# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gainstrack is a personal finance/investment tracking application. Users write financial events in a plain-text domain-specific language (the "gainstrack format"), which is parsed into commands and used to generate portfolio reports.

## Architecture

The project has four distinct layers:

### 1. `core/` — Scala domain model
- `com.gainstrack.command` — Command types (`open`, `earn`, `spend`, `tfr`, `trade`, `adj`, `bal`, `price`, `unit`, `fund`, `yield`, `commodity`) and `GainstrackParser` (text → `AccountCommand` seq)
- `com.gainstrack.report.GainstrackGenerator` — Multi-pass report engine: first pass builds `AccountState`, second pass `BalanceState`, third pass `TransactionState`/`PriceState`. All reporting starts here.
- `com.gainstrack.lifecycle.GainstrackEntity` — CQRS aggregate root wrapping the generator; persists to Firestore/file

### 2. `quotes/` — Scala market data module
- Alpha Vantage integration for price history; depends on `core`

### 3. `web/` — Scala HTTP server (Scalatra/Jetty)
- Entry point: `JettyLauncher` (port 9050 by default, or `$PORT`)
- Routes registered in `ScalatraBootstrap`: `/api/*` → `ApiController`, `/api/post/*` → `CommandApiController`, `/api/quotes/*` → `QuotesController`, `/api/authn/*` → `AuthnController`, `/api/export/*` → `ExportController`
- Auth: Auth0 JWT via `Auth0JWTVerifier`; session state via `GainstrackSupport`

### 4. `client/` — Vue 3 / Quasar SPA (TypeScript)
- State management: Vuex store (`src/store/index.ts`) holds `AllState` loaded from `/api/allState`
- **Most reports are computed locally in the browser** (`localCompute = true` in `src/lib/apiFacade.ts`), not on the server. `apiFacade.ts` is the seam between Vuex state and business logic functions.
- `src/lib/AllStateEx.ts` — wraps `AllState` to derive postings and FX conversion from raw data
- `src/lib/assetdb/models.ts` — all shared TypeScript types (DTOs)
- `src/lib/pricer.ts`, `src/lib/fx.ts` — FX conversion chain used for local compute

### 5. `client/functions/` — Firebase Cloud Functions (Node.js/TypeScript)
- Auth bridge: exchanges Auth0 JWT for Firebase custom token
- Firestore reads/writes for quote sources and user data

## Development Setup

All three processes must run simultaneously:

**Backend (Scala/Scalatra):**
Open in IntelliJ and run `JettyLauncher`. Set env vars as needed (see below).

**Cloud Functions:**
```bash
cd client/functions
export DEV=true
export GOOGLE_APPLICATION_CREDENTIALS=<path-to-json>
npm run serve
```

**Frontend:**
```bash
cd client
pnpm run quasar   # runs: quasar dev on port 8080
```

The Quasar dev server proxies API calls to `https://poc.gainstrack.com` by default (configured in `quasar.conf.js`). To point at local backend, update the proxy target there.

## Commands

### Frontend (run from `client/`)
```bash
pnpm run quasar          # dev server (port 8080)
pnpm run build           # production build (quasar build)
pnpm run lint            # ESLint
pnpm run test:unit       # Vitest (all tests)
pnpm run test:unit:watch # Vitest watch mode
```

### Run a single Vitest test file:
```bash
cd client
pnpm run test:unit -- path/to/test.spec.ts
```

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
| `AUTH0_DOMAIN` / `AUTH0_AUDIENCE` / `AUTH0_CLIENT` | Auth0 config |
| `QUOTES_ADMIN` | Enable quotes admin endpoints |
| `PORT` | Override Jetty listen port (default 9050) |

Frontend auth is configured via `.env.development` in `client/` (Auth0 client/domain/audience).

## Testing

- **Scala tests** live in `core/src/test/scala/` and `web/src/test/scala/`; use ScalaTest
- **TypeScript/Vue tests** live in `client/test/unit/` and `client/src/lib/__tests__/`; use Vitest
- Test files use `.spec.ts` or `.test.ts` suffixes
- Run tests with `pnpm run test:unit` from `client/`

## Data Flow

1. User writes gainstrack text (plain-text DSL commands)
2. `GainstrackParser` tokenizes into `Seq[AccountCommand]`
3. `GainstrackGenerator` runs multi-pass fold to produce `BalanceState`, `TransactionState`, `PriceState`, etc.
4. Server serializes to `AllState` JSON via `/api/allState`
5. Client loads `AllState` into Vuex and locally computes reports (balance trees, IRR, P&L explain) using `apiFacade.ts` → lib functions

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
