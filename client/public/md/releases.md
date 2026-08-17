# Release notes

### v3.2.0

August 2026

- **Statement of changes in equity** and a **trial balance**, joining the balance sheet, income
  statement and cash flow as built-in views. Find them in the sidebar under _Changes in Equity_
  and _Trial Balance_.
- Changes in equity rolls each equity account forward — opening balance, movement, closing balance
  — so a share issue and the period's result sit side by side.
- The trial balance lists every account's debit or credit as at a date and checks the two columns
  agree — the quickest way to see the books tie before you read the statements. It is a pre-closing
  view: income and expense accounts still show, and retained earnings sits at its opening balance.

### v3.1.0

August 2026

- **Cash flow statement**, the third primary statement alongside the balance sheet and income
  statement. It shows where the money actually went, split into operating, investing and financing
  activities. Find it under _Cash Flow_ in the sidebar.
- Two new `open` options drive it: `cashEquivalent` marks which accounts you treat as cash, and
  `cashflowClass` classifies the other side of a flow. Both are inherited by sub-accounts, so you
  tag a bank once rather than every currency and sub-account under it.
- Balance assertions need no special handling. The difference a `bal` plugs is classified by the
  account you plug to, so unitemised spending shows up as spending. If you keep books to an
  accounting standard, tag the suspense account `cashflowClass: adjustment` and its flows are held
  out of the activity subtotals while still counting toward the change in cash.
- Transfers between your own cash accounts cancel rather than counting twice, multi-posting
  transactions split across activities leg by leg, and foreign cash held across a period reports
  its revaluation on the exchange-rate line the standards ask for.
- A posting that states a cost basis or a price is valued by it, using the same weight rule that
  makes the transaction balance. Buying shares with a commission reports the shares as investing
  and the commission as operating, with no separate `price` directive needed. This is the shape an
  imported beancount trade arrives in, since a cost basis is kept rather than interpreted.
- Because gainstrack knows which command produced each posting, the report offers a second opinion:
  flows where your account tag and the command disagree are listed as **possible miscodings**.
- **Export to Beancount** carries the tags across as `open` metadata, so Fava can query them.
  Neither beancount nor Fava produces this statement itself. See
  [Cash flow statement](/docs/cashflow).

### v3.0.0

August 2026

- **Gainstrack now runs in your browser.** Parsing, every report and every export are computed
  locally instead of on a server. Nothing about your ledger leaves the machine to be turned into
  a report, and the app stays responsive while you edit.
- **Your data is saved as you go**, to your own Firestore document, as a stream of changes rather
  than a file that gets overwritten. Signed out or browsing anonymously, everything still works -
  it simply computes locally and saves nothing.
- **Sign in with Google**, replacing the old Auth0 login and its glitches.
- **Import from Beancount** — Import / Export → _Import from Beancount_. Your ledger is loaded by
  beancount itself, running in your browser, then converted. The result is exported back out and
  checked against your original account by account, so you can see the migration is faithful
  before you trust it.
- **Export to Beancount** now includes price and balance directives, so a re-import lands where
  it started.
- **Two new commands**: `tx` for a transaction with any number of postings (a paycheck with
  withholding, say), and `close` for booking a period's income and expenses to equity.
- The new in-browser engine was checked against the previous one over hundreds of generated
  ledgers, and against beancount as an independent second opinion.

### v2.4.0

Dec
Auth0 login glitches cleaned up

### v2.3.0

Asset database

### v1.3.0

Sep

- Refactored auth0 login integration for better stability

### v1.2.0

16 August

- Whole architecture has been revamped. Now following a serverless architecture inspired off the https://www.covibes.org project
- No more cookies for state management of accounts
- Only Auth0 for authentication, now supports persistent login
- Greatly reduced required bandwidth for using app
- Various experimental changes at reducing network traffic - more logic handled in the browser

### v1.1.0

1 July

- Various experimental changes in the UI
- Migrating away from Element UI to Quasar for widgets

### v1.0.0

21 March

- Mobile usable UI based on Quasar
- Assets report

### v0.10.0

14 March

- Smart multi-currency conversion - if it can be converted, the best conversion will be applied
- Sunburst Asset Allocation report
- Spend command

### v0.9.1

8 March

- More efficient alternative for data entry
- Guided tour updated for new entry method

### v0.9.0

7 March

- Live quotes more reliably being pulled in
- "Proxy" feature for live quotes
- Minor fixes for account graph and PnlExplain

### v0.8.0

29 February

- Minor fixes for reporting added commands and errors

### v0.7.0

22 February

- A fairly comprehensive guided tour for new users
- Google analytics added to website

### v0.6.0

15 February

- A completed set of UI editors for adding all commands
- Improved P&L explain for new activity and income
- A basic guided tour

### v0.5.0

8 February

- Rudimentary UI for updating your data without the text entry

### v0.4.0

1 February

- Much improved P&L Explain reporting
- Switched graphs to plotly.js library
- Login support to save your data server side

### v0.3.0

4 January

- FIX: Error reporting on uploaded files
- FIX: Date selector off-by one error on P&L Explain
- Experimental authentication support

### v0.2.0

14 December

- Addition of bal command for EOD balance adjustment/assertions, plus numerous edge case fixes for bal/adj generally
- Improvements to base currency conversion in reports such as P&L Explain and IRR
- P&L explain automatically reports over a range of typical time periods - very cool
