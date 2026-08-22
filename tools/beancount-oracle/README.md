# beancount-oracle

This package verifies the beancount to gainstrack import against beancount itself. It also includes
a command line that runs the same conversion outside a browser.

The conversion is not here. It lives in `client/src/lib/import/`, next to the engine it builds on,
because the browser import consumes the identical JSON document:

| module | what it does |
|---|---|
| `beancountDump.ts` | the JSON contract with `dump.py`, and the schema-version check |
| `beancountImport.ts` | lowering (every beancount transaction becomes a raw `tx`), always correct and intent-free |
| `lift.ts` | lifting (recognizing `tfr`, `earn`, `spend` and `fund`), one disableable rule at a time |

## Why the package exists

The oracle is what the package is for. `client/`'s specs pin the mapping rules from inline JSON and
stub the converter out, so this is the only place whole real ledgers go through the conversion with
beancount checking the result.

It cannot go anywhere else. In `client/` it would spawn Python and skip by default inside a suite
that otherwise always runs. In `bean2gain/` it would put gainstrack's parser, generator and
exporter on the GPL-2.0-only side of the licence boundary, which the root `README.md` forbids.

The CLI is optional. Nothing imports it (the oracle builds its ledgers from `src/lib/import/`
directly), and the in-browser import at `/port/beancount` covers the same ground for an ordinary
user, verification included. It remains useful for work that does not fit a browser tab: native
Python instead of a 13 MB Pyodide download, stdin/stdout piping, and batch runs across many
ledgers.

Nothing here touches beancount. No beancount syntax is parsed and no beancount package is imported,
because beancount is GPLv2-only and this repository is AGPL-3.0. Everything that links beancount is
quarantined in `bean2gain/`. Read the rules in the root `README.md` before adding a dependency here.

## The oracle

```bash
pnpm install
BEAN_PYTHON=../../bean2gain/.venv/bin/python pnpm run test:unit
pnpm run type-check
pnpm run lint
```

`__tests__/beancountImportOracle.spec.ts` runs the original ledger and the converted-then-re-exported
one through the same beancount loader, compares per-(account, currency) totals, and runs
`bean-check` on the re-export. It asserts against both the lowered and the lifted output, so a
failure shows whether lowering or lifting broke. Without a python that imports beancount, the whole
file skips.

Drop real ledgers into `__tests__/fixtures/local/` (gitignored) to widen the corpus. The mapping
specs live in `client/src/lib/import/__tests__/` and need no python.

## The command line

```bash
../../bean2gain/.venv/bin/python ../../bean2gain/python/dump.py ledger.beancount > ledger.json
pnpm run import ledger.json -o ledger.gainstrack
```

See `../../bean2gain/README.md` for the venv. `--raw` stops after lowering, before the lifting
rules, which tells a lowering bug from a lifting one. The ledger goes to stdout and the migration
report to stderr, so the pipeline form works:

```bash
../../bean2gain/.venv/bin/python ../../bean2gain/python/dump.py ledger.beancount | pnpm run import > ledger.gainstrack
```

## The one coupling

`cli.ts` and the oracle import from `client/src` via the `src/*` alias: the conversion modules
above, plus the parser, generator and serializers. It is declared in `tsconfig.json`, in
`vitest.config.mts` and in the `import` script's esbuild flags, and it is one-directional. Nothing
under `client/` imports this package.

The engine depends on nothing but `@js-joda/core` and `decimal.js`, which is what keeps the alias
workable. When it is extracted into a package of its own, those three declarations are the whole
migration.
