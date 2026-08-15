# Cash flow statement

The third primary financial statement, alongside the balance sheet and the income statement. It
answers a question neither of those does: where the money actually went.

Your income statement can show a healthy profit in a period when your bank balance fell, because
income is recorded when it is earned and expenses when they are incurred, not when cash moves. The
cash flow statement reconciles the two, splitting every movement of cash into three activities:

- **Operating** is the day-to-day. Salary in, groceries and bills out.
- **Investing** is buying and selling long-term assets. Property, securities, equipment.
- **Financing** is capital in and out. Owner contributions, loans drawn and repaid.

Open it under **Cash Flow** in the sidebar.

## You have to say what counts as cash

Nothing is treated as cash until you say so, and the report will tell you as much until you do. This
is deliberate rather than an omission: the statement's total is the change in exactly the accounts
you nominate, so nominating them is the one input it cannot guess. A savings account might be cash
to you and not to your accountant. A fixed deposit maturing in 90 days is a genuine judgement call.

Tag them on the `open` directive:

```
2019-01-01 open Assets:Bank USD
  cashEquivalent: true
```

Tags are inherited, so tagging `Assets:Bank` also covers `Assets:Bank:Current`,
`Assets:Bank:Savings` and any sub-account gainstrack creates for you behind the scenes. Tag the
parent once rather than every child.

To exclude one child from an otherwise-cash tree:

```
2019-01-01 open Assets:Bank:Escrow USD
  cashEquivalent: false
```

## Classifying the other side

Once cash is defined, every flow is a movement between a cash account and something else, and it is
that *something else* which decides the activity. Gainstrack starts from a sensible default based on
the account type:

| Account type | Default activity |
|---|---|
| `Income`, `Expenses` | Operating |
| `Equity` | Financing |
| `Assets`, `Liabilities` | Investing |

That default gets the common cases right and some important ones wrong, because an account's type
cannot distinguish a supplier payment from a machine purchase. Override it where it matters:

```
2019-01-01 open Liabilities:CreditCard USD
  cashflowClass: operating

2019-01-01 open Liabilities:Mortgage USD
  cashflowClass: financing
```

Paying down a credit card is operating, since it settles ordinary expenses. Repaying a mortgage is
financing. Both are `Liabilities`, so only a tag can tell them apart. `cashflowClass` is inherited
down the account tree in exactly the same way as `cashEquivalent`.

There is a fourth value, `adjustment`, for an account whose flows are real movements of cash that
are not an activity (a suspense account, typically). It is covered under balance assertions below.

## What the report does for you

**Transfers between your own cash accounts disappear.** Moving money from current to savings is not
a cash flow, and you do not have to mark it as one. Both sides are cash, so it cancels.

**Transactions with more than two postings split correctly.** A mortgage payment of 1,000 that is
300 interest and 700 principal shows 300 in operating and 700 in financing, because each leg is
classified on its own.

**Balance assertions need no special handling.** No command is treated as a special case, which is
the subject of the next section.

**Foreign currency is handled.** Cash held in another currency changes value as rates move, without
any transaction taking place. That appears as *Effect of exchange rate changes on cash held*, the
same line the accounting standards require and the reason the statement still reconciles.

## Balance assertions, and the two ways to keep books

Gainstrack's [how-to guide](/docs/howto) suggests you do not need to record every expense. Record
your balances, your income and your transfers, and let the rest fall out. Balance assertions are
therefore the main way many ledgers get written, and the statement handles them without you doing
anything special.

When you write `bal Assets:Bank 4200 USD Expenses:General`, the difference between the asserted
figure and what the ledger expected is posted to `Expenses:General`. That is an ordinary posting to
an ordinary account, so it classifies like any other: `Expenses` defaults to operating, and your
unitemised spending lands in operating activities where you would expect to find it.

That is the right treatment, because the account you plug to is what carries the meaning. Compare:

```
2020-02-01 fund Assets:Bank Equity:Opening 5000 USD
2020-02-01 bal  Assets:Bank 5000 USD Equity:Opening
```

These produce identical postings. Classifying them differently because one says `fund` and the
other says `bal` would be arbitrary, so the report does not.

**If you are keeping books to an accounting standard**, this is not what you want. There a plug is
an unexplained difference. It should never appear inside a subtotal, and the remedy is to fix the
ledger rather than present the gap tidily. Say so by tagging the account you plug to:

```
1900-01-01 open Equity:Suspense USD
  cashflowClass: adjustment
```

Flows to an `adjustment` account are shown on their own line, under **Adjustments (not classified
as activities)**. They still count toward the net change in cash (the money really did move, and
leaving them out would stop the statement reconciling), but they are held out of operating,
investing and financing, where they could be mistaken for something measured.

So the same report serves both, and the difference is one tag on one account rather than a setting.

## Possible miscodings

Below the statement you may see a table of transactions where the account's `cashflowClass` says one
thing and the command that produced it says another. An expense account tagged `financing` but
reached by a `spend`, for instance.

These are not errors and the statement above uses your tag regardless. They are a second opinion:
gainstrack knows what each command *meant*, so it can point at flows where the two signals disagree.
Usually one of them is a mistake worth finding. Commands that state no particular intent (`tfr`
between accounts, or a raw `tx`) never appear here, because they have no opinion to disagree with.

## Interest and dividends

`yield` income is treated as operating. The accounting standards permit either operating or
investing for dividends and interest received, so if you prefer investing, tag the income account:

```
2019-01-01 open Income:Dividends USD
  cashflowClass: investing
```

The disagreement will show up in the miscodings table, which is expected. Your tag wins.

## A worked example

```
option "operating_currency" "USD"
1900-01-01 open Equity:Opening USD
  multiAsset: true
1900-01-01 open Assets:Bank USD
  cashEquivalent: true
  multiAsset: true
1900-01-01 open Assets:Savings USD
  cashEquivalent: true
1900-01-01 open Assets:Property USD
1900-01-01 open Liabilities:CreditCard USD
  cashflowClass: operating
1900-01-01 open Income:Salary USD
  fundingAccount: Assets:Bank
1900-01-01 open Expenses:General USD
  multiAsset: true

2024-06-01 fund Assets:Bank Equity:Opening 20000 USD
2025-03-01 earn Income:Salary Assets:Bank 6000 USD
2025-03-02 spend Expenses:General Assets:Bank 250 USD
2025-04-01 tfr Assets:Bank Assets:Property 5000 USD
2025-05-01 tfr Assets:Bank Assets:Savings 1000 USD
2025-06-01 tfr Assets:Bank Liabilities:CreditCard 400 USD
```

Over 2025 this reports operating +5,350, investing -5,000, and cash falling from 20,000 to 20,350.
The 1,000 moved into savings appears nowhere, because both accounts are cash. The 400 credit card
payment lands in operating rather than investing, because of the tag.

## Relationship with beancount

Beancount and Fava do not produce a cash flow statement. The classification is absent from their
data model, and the usual workaround is a hand-written query or script. The convention here is the
one beancount itself points at (metadata on the `open` directive), so an exported ledger carries
your tags across as `cash-equivalent` and `cashflow-class`, where Fava can query them.

Two things gainstrack can do that beancount currently cannot: tags inherit down the account tree,
and the command that produced each posting provides the independent second opinion behind the
miscodings table.

## See also

- [Reference](/docs/reference) contains the `open` directive and every option it takes
- [Relationship with Beancount/Fava](/docs/beancount)
