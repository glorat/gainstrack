## Background

This page explains the design of Gainstrack and why choices around design were made. Clarification and discussion of key topics.

## How finances are recorded
Gainstrack allows you to record your finances in a simple text file.

Behind the scenes, Gainstrack converts this to a journal of double-entry bookkeeping records, allowing the generation of rich and powerful reporting that is usually the domain of advanced accounting software run by accountants.

Commands are defined to record transactions

## Commands vs plaintext accounting transactions
Gainstrack is heavily inspired by beancount (and other similar) on its design. As an example, let's look at how one may record transactions in an investment account.

In Gainstrack, here is how we record opening a Stocks account, funding it with 1000 GBP, buying some FTSE and VWRL stocks and subsequently having a dividend paid for the FTSE stock. It is very concise with 5 lines.

```
2004-10-14 open Assets:Investment:Stocks GBP
  fundingAccount: Assets:Bank:England
  multiAsset:true
2006-11-01 fund Assets:Investment:Stocks 1000.0 GBP
2006-11-02 trade Assets:Investment:Stocks 50.0 FTSE @10.0 GBP
2006-11-02 trade Assets:Investment:Stocks 50.0 VWRL @10.0 GBP C0.20 GBP
2006-11-15 yield Assets:Investment:Stocks FTSE 10.0 GBP
```

Here is what it takes to achieve the same in Beancount

```
2004-10-14 open Assets:Investment:Stocks GBP
2004-10-14 open Assets:Investment:Stocks:FTSE FTSE
2004-10-14 open Income:Investment:Stocks GBP
2004-10-14 open Assets:Investment:Stocks:VWRL VWRL
2004-10-14 open Income:Investment:Stocks:GBP GBP
2004-10-14 open Expenses:Investment:Stocks:GBP GBP
2004-10-14 open Income:Investment:Stocks:FTSE GBP
2004-10-14 open Expenses:Investment:Stocks GBP
2004-10-14 open Assets:Investment:Stocks:USD USD

2006-11-01 * "Fund 1000.0 GBP"
  Assets:Bank:England -1000.0 GBP
  Assets:Investment:Stocks:GBP 1000.0 GBP
2006-11-02 * "BUY 50.0 FTSE @10.0 GBP"
  Assets:Investment:Stocks:GBP -500.0 GBP
  Assets:Investment:Stocks:FTSE 50.0 FTSE @10.0 GBP
2006-11-02 * "BUY 50.0 VWRL @10.0 GBP"
  Assets:Investment:Stocks:GBP -500.2 GBP
  Assets:Investment:Stocks:VWRL 50.0 VWRL @10.0 GBP
  Expenses:Investment:Stocks:GBP 0.2 GBP
2006-11-15 * "FTSE yield 10.0 GBP"
  Income:Investment:Stocks:FTSE -10.0 GBP
  Assets:Investment:Stocks:GBP 10.0 GBP

```

Let's look at the key differences

Firstly syntactically
1. Double ledger plain text accounting requires you to have double the amount of information being recorded. Gainstrack removes this duplication.
2. Gainstrack syntax aims to minimize the amount of text needed - using less than half the size of most plaintextaccounting packages
3. Multi-currency account management happens automatically - both opening the right accounts but also allocating postings to the right accounts
4. Automatically generating expense accounts (e.g. for commission) and income accounts (e.g. for dividends)
5. Retaining additional source information by recording *why* the transaction appears. E.g. is it some trading cost, or yield of an asset. Plaintextaccounting only records the movement. This additional information will allow the driving of sophisticated networth tracking and P&L explain

## Transactions must balance or not?

Beancount transactions are [required to balance](https://beancount.github.io/docs/a_comparison_of_beancount_and_ledger_hledger.html), period. hledger allows the use of [virtual accounts](https://ledger-cli.org/doc/ledger3.html#Virtual-postings). The former position maintains the integrity of accounting data. The latter allows more ease of use to those not familiar with accounting principles.

Gainstrack seeks to have the best of both worlds. The command syntax of Gainstrack does not require the user to worry about the concept of balancing of postings. But internally, Gainstrack will always generate transactions where all the postings add up to exactly zero.

## Networth tracking doesn't require recording every little transaction

TBD: Discussion on the use of `bal` command to rebalance with to a padding account and why it works well.


## Can gainstrack replace my use of beancount/hledger? What doesn't gainstrack do?

Gainstrack is for tracking their own finances and networth. This does not require tracking every dollar and cent. As such, use cases that require transactional level tracking or not appropriate for gainstrack. I.e. I would *not* use gainstrack for
* Maintaining accounts of a company
* Use as a basis for handling personal tax calculations

Some (current) technical gaps that prevent the above include
* Lack of unrealised vs realised tracking  - networth tracking at Gainstrack is all mark-to-market based
* Cost basis of transactions is not being tracked
* User defined multi-posting transfers

The gainstrack syntax design doesn't preclude any tracking of the above so these are features that could be added in future if there is demand.
