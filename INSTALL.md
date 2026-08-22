# Installing gainstrack

Gainstrack is a plain-text double-entry accounting engine. There are three ways to use it, and they
are independent, so install only what you need.

| | what it is | install |
|---|---|---|
| **Web app** | the full app: write a ledger, read reports | nothing. [www.gainstrack.com](https://www.gainstrack.com) |
| **CLI** | headless: a ledger becomes financial statements as JSON | `npx gainstrack` (Node 24 or later) |
| **Agent skill** | a Claude Code playbook for a bookkeeping engagement | two `/plugin` commands |

## The CLI

The CLI is published to npm as [`gainstrack`](https://www.npmjs.com/package/gainstrack), a single
bundled file with no runtime dependencies. It needs Node 24 or later and nothing else.

```bash
npx gainstrack --help          # run it without installing
npm install -g gainstrack      # or put it on PATH permanently
```

To check that it works, save this as `demo.gainstrack`:

```
2025-01-01 open Assets:Bank:Checking USD
2025-01-01 open Income:Sales USD
2025-01-01 open Expenses:Rent USD

2025-01-31 earn Income:Sales Assets:Bank:Checking 5000 USD
2025-02-05 spend Expenses:Rent Assets:Bank:Checking 1200 USD
```

Then run:

```bash
npx gainstrack report trial-balance demo.gainstrack
```

The output is JSON ending in `"totalDebit": 5000, "totalCredit": 5000, "imbalance": 0`.

What the CLI can do:

```bash
gainstrack report <income-statement|balance-sheet|changes-in-equity|cash-flow|trial-balance|all> <ledger>
gainstrack export <beancount|gainstrack> <ledger>
gainstrack check  <ledger> --expect figures.json
```

Dates default to the ledger's own span, and `--from`, `--to` and `--as-of` override them. Output
goes to stdout unless `-o FILE` says otherwise. The full documentation is in
[tools/gainstrack-cli/README.md](tools/gainstrack-cli/README.md).

## The agent skill

This repository doubles as a Claude Code plugin marketplace. From any Claude Code session:

```
/plugin marketplace add glorat/gainstrack
/plugin install fs-engagement@gainstrack
```

**fs-engagement** is a playbook for turning a shoebox of raw records (bank statements, payment
processor exports, expense logs) into a full set of financial statements, with every figure
traceable to evidence and reproducible by script. It drives the CLI above as its accounting engine,
so install that as well. It also bundles a multi-lens financial-statement review checklist.

Once installed, the skill loads itself when you describe that kind of work, such as "prepare FY2026
statements for X from these bank statements". `/plugin` lists what you have installed. The source is
in [plugins/fs-engagement/](plugins/fs-engagement/).

## Nothing to install

The web app is at [www.gainstrack.com](https://www.gainstrack.com). Sign in with Google to keep a
ledger, or try it signed out. There is [help](https://www.gainstrack.com/help) and a
[language reference](https://www.gainstrack.com/docs/reference).

Importing a beancount ledger happens at
[www.gainstrack.com/port/beancount](https://www.gainstrack.com/port/beancount). It converts in your
browser and verifies its own work against beancount before you keep anything, and nothing is
uploaded. The [walkthrough](https://www.gainstrack.com/docs/beancount-import) explains what survives
the conversion and what does not.

## Working on gainstrack itself

```bash
git clone https://github.com/glorat/gainstrack.git
cd gainstrack/client && pnpm install && pnpm run dev    # the app, on port 8080
```

[README.md](README.md) has the repository map, the test suites, the environment variables and the
deployment steps.
