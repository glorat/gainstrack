# Importing a Beancount ledger

Gainstrack converts a beancount ledger into gainstrack format in your browser, then checks its own
work against beancount before you keep anything.

What you get:

- your numbers preserved, verified by loading both the original and the converted ledger through
  beancount itself
- a report naming everything that did not survive as data, and why
- your original file untouched

## Converting your ledger

Go to **Import / Export → Import from Beancount**, or straight to [/port/beancount](/port/beancount).

Upload your ledger together with every file it pulls in with `include`, name the top-level one, and
press **Convert**. The first conversion downloads a Python interpreter, so it takes a moment. After
that it is cached.

Nothing is uploaded. Your ledger is loaded by beancount itself, compiled to WebAssembly and running
in your browser on [bean2gain](https://bean2gain.web.app), a separate site kept apart for licensing
reasons. Your data reaches it through a browser message channel rather than a network request.

Two toggles change what happens:

- **Check the result against beancount** is on by default and runs the checks described below. It
  roughly doubles the wait.
- **Skip intent recognition** stops after the plain conversion, before the rules that recognise
  `tfr`, `earn`, `spend` and `fund`. It is worth turning on if something looks wrong, because it
  tells you which half of the conversion caused it.

## What gets checked

The converted ledger is exported back to beancount and read a second time through the same loader.
Four things must hold, or the import is reported as failed:

1. **Beancount accepts the re-export.** Every transaction balances, no account is used before it is
   opened, and every one of your balance assertions still holds on its original date.
2. **Every account holds what it held**, compared per account and currency on both sides.
3. **Nothing was swept into a plug account.** An import that balanced itself by moving money into
   `Equity:Adjustments` has failed.
4. **The converted ledger generates in gainstrack** with no errors.

The verdict appears above the report as either "Verified" or "This import did not survive the round
trip. Do not save it." In the second case the specific accounts that moved are listed.

Problems that predate the import are reported separately, in their own banner. If beancount could
not fully load your original file, whatever it dropped is missing from the conversion too, and the
verification can only speak for the part that loaded.

## What survives, and what does not

Gainstrack commands carry *intent* (`trade`, `yield`, `tfr`), beancount postings do not, so the
conversion cannot recover intent that was never recorded.

| | |
|---|---|
| **Recognised** | two-posting movements: income to asset (`earn`), asset to expense (`spend`), asset to asset (`tfr`, including cross-currency), equity to asset (`fund`) |
| **Kept as plain transactions** | anything with three or more postings, anything with a lot cost, and income to expense reclassifications |
| **Kept as comments** | tags, links, metadata, `note`, `document`, `event`, `query`, `custom`, and beancount's `close` |
| **Not carried over** | lot identity, meaning the acquisition date and label inside `{...}` |

A plain transaction is still correct. What it lacks is intent, so the reports built on intent
(contribution analysis, P&L explain, the investment views) see only its postings. On
beancount's own example ledger, roughly three quarters of transactions are recognised and a quarter
stay plain.

Lot identity is the one real loss. Gainstrack's lot basis is a per-unit cost and nothing more, so if
realised P&L matters to you, expect attribution to differ from beancount's.

`trade` and `yield` are **not** recognised, deliberately. They require the accounts to already be in
gainstrack's derived shape (`Assets:Broker:USD` for cash, `Assets:Broker:AAPL` for the holding,
`Expenses:Broker:USD` for commission), and real beancount ledgers name those differently. Recognising
them would mean renaming accounts across the whole ledger. That is a much larger change with its own
failure modes, and the per-transaction balance check cannot verify it.

## What happens to your accounts

Almost nothing. Gainstrack account names are your beancount names, verbatim.

The one exception is an account that genuinely holds more than one currency. Gainstrack ties an
account to a single asset, so such an account becomes `multiAsset` with one `:CCY` sub-account per
currency. `Assets:Wallet` holding EUR and GBP becomes `Assets:Wallet:EUR` and `Assets:Wallet:GBP`
under a `multiAsset` parent, and the report publishes the mapping.

Two accounts are invented. `Equity:Rounding` receives the residues described below, and
`Equity:Adjustments` is the plug for balance assertions that had no `pad` behind them. On a ledger
beancount already accepts, `Equity:Adjustments` ends up empty, which is what check 3 asserts.

## Balance assertions

Beancount checks a `balance` at the **start** of its date. A gainstrack `bal` states the balance as
of the **following morning**. The importer shifts every assertion back one day so that the two mean
the same instant.

A `pad` and the assertion after it collapse into a single `bal` naming the pad's source account,
which is what gainstrack's plug does natively.

## Reading the report

Under **What came across**, the counts are grouped the same way as the table above, and each group
says what that means for your reports.

**Show the full report** opens the full text, including what the conversion created:

```
lowered
  balance                                   78
  open                                      63
  price                                    816
  rounding posting added                   191
  transaction                             1025

lifted into intent-carrying commands
  earn                                      58
  spend                                    649
  tfr                                       40

not preserved
  lot identity (date/label) dropped        412

raw tx commands remaining: 277 of 1025 transactions
```

The `rounding posting added` row needs an explanation. Beancount tolerates a transaction that misses
zero by less than its inferred tolerance and carries the residue silently. Gainstrack does not, so the importer
writes the residue as an explicit posting to `Equity:Rounding:<CCY>`. The money is the same, and the
ledger now says where the fraction of a cent went.

The count of transactions left plain is a quality measure, not an error count.

Warnings appear in their own banner. The three worth acting on are a failing balance assertion
(beancount already disagreed with your ledger before the import), an account nobody opened, and a
multi-currency account whose per-currency sub-account name is already taken.

## Keeping the result

Three choices, once you have read the verdict:

- **Download** writes the gainstrack file and changes nothing in your account.
- **Replace my ledger** discards what you have and keeps the import.
- **Append to my ledger** adds the import on the end of what you have. It is refused if the combined
  ledger does not generate, most often because one account ends up with two `open` commands. Download
  the file and merge it in the editor instead.

## The `tx` command

The plain transactions above are `tx` commands, the one gainstrack directive that carries postings
rather than intent:

```
2024-01-31 tx "ACME Corp | Salary January"
  Assets:Bank:Checking 4500 USD
  Expenses:Tax:Withholding 1500 USD
  Income:Salary -6000 USD
```

It was added for this import and is useful on its own, for any transaction that genuinely has three
or more legs. The full syntax is in the [reference](/docs/reference).

## The command line

The same conversion runs outside the browser, against a local Python with beancount installed rather
than the WebAssembly build. It lives in the gainstrack repository under `tools/beancount-oracle/`,
and that package's README has the commands. It suits work the browser does not cover, such as piping
through stdin and stdout or converting many ledgers at once. For a one-off migration the browser is
the shorter path, and it runs the same checks.
