# gainstrack-cli

A headless CLI over the gainstrack engine. It turns a `.gainstrack` ledger into the primary
financial statements as JSON, so a bookkeeping job outside the app (a Python generator, a docx
builder, a CI check) never has to reimplement report logic. It also exports to beancount/gainstrack
and runs a golden figures check.

It adds no accounting logic of its own. Every figure comes from `client/src/lib`, the same code the
SPA renders. The statement composition lives in `client/src/lib/statements/` (shared with the browser
pages), and this package is a thin wrapper: parse, build reports, print JSON.

## Install

Published to npm as [`gainstrack`](https://www.npmjs.com/package/gainstrack), a single bundled file
with no runtime dependencies (Node ≥ 24):

```bash
npx gainstrack report balance-sheet ledger.gainstrack   # no install
npm install -g gainstrack                               # or put it on PATH
```

To work on it in this repo instead, `pnpm install` here (own package, own lockfile) and use
`pnpm run gainstrack --` in place of `gainstrack` in the examples below.

## Usage

```bash
# A statement (JSON to stdout). Dates default to the ledger's own earliest→latest posting span.
gainstrack report income-statement ledger.gainstrack --from 2025-05-24 --to 2026-04-30
gainstrack report balance-sheet    ledger.gainstrack --as-of 2026-04-30
gainstrack report changes-in-equity ledger.gainstrack --from 2025-05-24 --to 2026-04-30
gainstrack report cash-flow        ledger.gainstrack --from 2025-05-24 --to 2026-04-30
gainstrack report trial-balance    ledger.gainstrack --as-of 2026-04-30

# Everything in one bundle (what a docx/report builder consumes):
gainstrack report all ledger.gainstrack --from 2025-05-24 --to 2026-04-30 --as-of 2026-04-30 -o statements.json

# Exports:
gainstrack export beancount  ledger.gainstrack
gainstrack export gainstrack ledger.gainstrack

# Golden check: compare emitted figures to an expected subset, exit 1 on any mismatch.
gainstrack check ledger.gainstrack --expect figures.json --from 2025-05-24 --to 2026-04-30 --as-of 2026-04-30
```

`ledger` may be `-` or omitted to read stdin. JSON goes to stdout unless `-o/--output FILE` is
given. A ledger that does not generate exits 1 with its parser errors on stderr.

### `--expect figures.json`

A flat map of dotted key to number. Keys mirror the report JSON, with line-item arrays keyed by
account id, e.g.:

```json
{
  "incomeStatement.totalRevenue": 137294.2,
  "balanceSheet.assets.Assets:Bank:SG": 40186.89,
  "trialBalance.imbalance": 0
}
```

It may pin a subset: only the keys it lists are compared (tolerance 0.005). Useful as a
regression pin without a full snapshot.

## What it emits

Figures are normalised to natural statement sign. Revenue, expenses, assets, liabilities and
equity all read positive when carrying their normal balance. A sub-account holding the opposite
balance comes out negative, which is the signal to reclassify it. The trial balance keeps raw
debit/credit columns, because proving debits = credits is what it is for.

It emits numbers keyed by account id, plus the grouping-independent subtotals. There are no
human captions, no current/non-current grouping and no note wiring. Those are presentation and stay
with the renderer (which reads this JSON).

Every figure is in the ledger's base currency. There is no conversion flag: a financial
statement has one presentation currency, so the builders always value in base (`'global'`),
chaining through pivots for foreign or priced holdings (a USD stock in a GBP book values
VTI→USD→GBP). A portfolio carried at market can leave the trial balance with a non-zero `imbalance`
equal to the unrealised gain or FX translation. That is a real figure, not a dropped posting.

## Coupling to `client/src`

Like `tools/beancount-oracle`, this package imports the engine from `client/src` via the `src/*`
alias, declared in three places that must stay in sync:

- `tsconfig.json` `paths`
- `vitest.config.mts` `resolve.alias`
- the `build` npm script's esbuild `--alias:src=…` flag

It is one-directional: nothing under `client/` imports this tool. Import leaf modules only
(`gen/`, `AllStateEx`, `statements/`, `cashflow`, `export/`). An `assetdb` barrel or the store would
pull in Vue/Firebase. The reachable slice depends on nothing but `@js-joda/core`, `decimal.js` and
`lodash`. `@js-joda/core` is also aliased to the client's copy (same three places) so the `LocalDate`
this CLI creates is the *same* type and runtime identity the engine expects. Two copies, even at the
same version, are unrelated types and break `instanceof`.

When the engine is extracted to `@gainstrack/core`, those alias declarations are the whole migration.

## Commands

```bash
pnpm run gainstrack -- <args>   # build, then run on node (the artifact users get)
pnpm run build                  # bundle cli.ts with esbuild into dist/cli.cjs
pnpm run test:unit              # composition + check helpers (lib.ts), on a synthetic ledger
pnpm run type-check             # tsc --noEmit
pnpm run lint
```

## Publishing

`prepack` runs the bundle, so `npm publish` and `npm pack` always ship a freshly built
`dist/cli.cjs`. The tarball is that file plus `README.md`, `LICENSE` and `package.json`, nothing
else. That is why the `src/*` alias never has to resolve on a user's machine.

Releases are automatic. The `publish_cli` job in `.github/workflows/quasar_deploy.yml` publishes on
every push to `master` that semantic-release decides is a release, at the same version as the web
app. That is deliberate: this package has no logic of its own, so what changes in it is the engine,
and the engine ships with the app. The committed `version` is a `0.0.0-development` placeholder, and
CI stamps the real one with `npm version` just before publishing. Building it in CI needs `client/`'s
dependencies installed as well as this package's, for the reason in the section above.

To verify a change before it ships, `npm pack` and install the tarball somewhere outside this repo.
That is the only check that the bundle is genuinely self-contained, since building it here always
has `client/` on hand.

### Authentication

CI authenticates to npm by OIDC rather than a stored secret. npm revoked classic tokens in December
2025 and caps granular ones at 90 days, so there is deliberately no `NPM_TOKEN` anywhere. The job
declares `id-token: write` and npm mints a short-lived credential from the workflow's own identity.
Provenance attestations are generated automatically, so no `--provenance` flag is needed.

Two consequences are worth knowing. The trusted publisher registered on npmjs.com names the workflow
**file**, so renaming `quasar_deploy.yml` silently breaks publishing until the registration is
updated. And OIDC cannot perform a package's *first* publish: npm requires the package to exist
before a trusted publisher can be attached to it, so the registry entry has to be created once by
hand, after which CI owns every release.
