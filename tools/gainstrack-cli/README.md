# gainstrack-cli

A headless CLI over the gainstrack engine. It turns a `.gainstrack` ledger into the primary
financial statements as **JSON**, so a bookkeeping job outside the app (a Python generator, a docx
builder, a CI check) never has to reimplement report logic. It also exports to beancount/gainstrack
and runs a golden **figures check**.

It adds no accounting logic of its own: every figure comes from `client/src/lib` — the same code the
SPA renders. The statement composition lives in `client/src/lib/statements/` (shared with the browser
pages), and this package is a thin wrapper: parse → build reports → print JSON.

## Usage

```bash
pnpm install                                   # own package, own lockfile (Node ≥ 24)

# A statement (JSON to stdout). Dates default to the ledger's own earliest→latest posting span.
pnpm run gainstrack -- report income-statement ledger.gainstrack --from 2025-05-24 --to 2026-04-30
pnpm run gainstrack -- report balance-sheet    ledger.gainstrack --as-of 2026-04-30
pnpm run gainstrack -- report changes-in-equity ledger.gainstrack --from 2025-05-24 --to 2026-04-30
pnpm run gainstrack -- report cash-flow        ledger.gainstrack --from 2025-05-24 --to 2026-04-30
pnpm run gainstrack -- report trial-balance    ledger.gainstrack --as-of 2026-04-30

# Everything in one bundle — what a docx/report builder consumes:
pnpm run gainstrack -- report all ledger.gainstrack --from 2025-05-24 --to 2026-04-30 --as-of 2026-04-30 -o statements.json

# Exports:
pnpm run gainstrack -- export beancount  ledger.gainstrack
pnpm run gainstrack -- export gainstrack ledger.gainstrack

# Golden check: compare emitted figures to an expected subset, exit 1 on any mismatch.
pnpm run gainstrack -- check ledger.gainstrack --expect figures.json --from 2025-05-24 --to 2026-04-30 --as-of 2026-04-30
```

`ledger` may be `-` or omitted to read stdin; JSON goes to stdout unless `-o/--output FILE`. A ledger
that does not generate exits 1 with its parser errors on stderr.

### `--expect figures.json`

A flat map of dotted key → number. Keys mirror the report JSON, with line-item arrays keyed by
account id, e.g.:

```json
{
  "incomeStatement.totalRevenue": 137294.2,
  "balanceSheet.assets.Assets:Bank:SG": 40186.89,
  "trialBalance.imbalance": 0
}
```

It may pin a **subset** — only the keys it lists are compared (tolerance 0.005). Handy as a
regression pin without a full snapshot.

## What it emits — and what it deliberately doesn't

Figures are **normalised to natural statement sign** (revenue, expenses, assets, liabilities, equity
all read positive when carrying their normal balance; a sub-account holding the opposite balance
comes out negative, which is the signal to reclassify it). The trial balance keeps raw debit/credit
columns, because proving debits = credits is its whole point.

It emits **numbers keyed by account id, plus the grouping-independent subtotals** — no human
captions, no current/non-current grouping, no note wiring. Those are presentation and stay with the
renderer (which reads this JSON).

Every figure is in the ledger's **base currency**. There is no conversion flag: a financial
statement has one presentation currency, so the builders always value in base (`'global'`),
chaining through pivots for foreign/priced holdings (a USD stock in a GBP book values VTI→USD→GBP).
Note that a portfolio carried at market can leave the trial balance with a non-zero `imbalance`
equal to the unrealised gain/FX translation — that's a real figure, not a dropped posting.

## The one coupling: `src/*` → `client/src`

Like `tools/beancount-oracle`, this package imports the engine from `client/src` via the `src/*`
alias, declared in **three** places that must stay in sync:

- `tsconfig.json` `paths`
- `vitest.config.mts` `resolve.alias`
- the `gainstrack` npm script's esbuild `--alias:src=…` flag

It is one-directional — nothing under `client/` imports this tool. Import **leaf modules only**
(`gen/`, `AllStateEx`, `statements/`, `cashflow`, `export/`); an `assetdb` barrel or the store would
pull in Vue/Firebase. The reachable slice depends on nothing but `@js-joda/core`, `decimal.js` and
`lodash`. `@js-joda/core` is additionally aliased to the client's copy (same three places) so the
`LocalDate` this CLI creates is the *same* type/runtime identity the engine expects — two copies,
even at the same version, are unrelated types and break `instanceof`.

When the engine is extracted to `@gainstrack/core`, those alias declarations are the whole migration.

## Commands

```bash
pnpm run gainstrack -- <args>   # bundle cli.ts with esbuild, then run on node
pnpm run test:unit              # composition + check helpers (lib.ts), on a synthetic ledger
pnpm run type-check             # tsc --noEmit
pnpm run lint
```
