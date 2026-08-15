# Relationship with Beancount/Fava
## Beancount/Fava as the inspiration
Gainstrack was heavily inspired by [Beancount](https://github.com/beancount/beancount), A double-entry bookkeeping computer language that lets you define financial transaction records in a text file. It is also heavily inspired by [Fava](https://github.com/beancount/fava), which provides a web interface for Beancount.

Gainstrack aims to be more accessible and rich language for defining records than Beancount and thus provide reporting capability that far exceeds Fava. It is specifically aimed at the use case of recording personal finance and networth tracking.

Unlike beancount, Gainstrack is (currently) not suitable for maintaining precise and complete account records for business accounts or accounts suitable for tax reporting. This may change depending on demand.

## Syntax differences
It may be best to start with an example. Beancount comes with a sample file at [https://raw.githubusercontent.com/beancount/beancount/master/examples/simple/basic.beancount](https://raw.githubusercontent.com/beancount/beancount/master/examples/simple/basic.beancount)

To see the gainstrack equivalent of that file, or of any beancount file, run it through the importer described below. The [reference](/docs/reference) documents each gainstrack directive on its own terms.

## Reporting differences
Fava builds an income statement and a balance sheet from your ledger with no configuration, but not
a cash flow statement. Beancount's data model has no notion of operating, investing and financing
activities, so the classification has to be reconstructed by hand in a query or a script.

Gainstrack produces one. The convention is the one beancount itself points at, metadata on the
`open` directive, so it survives an export in a form Fava can query. Two things differ. The tags are
inherited by sub-accounts, and gainstrack knows which command produced each posting, giving it a
second opinion to check your classification against. See [Cash flow statement](/docs/cashflow).

## Moving a ledger across
Gainstrack imports a beancount ledger directly. Beancount itself does the loading, compiled to WebAssembly and running in your browser, and the converted ledger is checked back against beancount before you are asked to keep it.

[Migrating from Beancount](/docs/beancount-import) is the walkthrough, and it covers what survives a conversion and what does not.

Gainstrack also exports to beancount format, under Import / Export.
