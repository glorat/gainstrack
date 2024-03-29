## Reference

Technical reference.

[//]: # (Covers tools, components, commands and resources)

## Key concepts
Your financial data is maintained in a Gainstrack text file. It consists of a set of **entries** in the file written in plain text, each of which represents some event that affects your financial position.

### Entries

The input consists mainly of **entries**, each of which may have various **options**. Each entry begins with an associated date, which determines the point in time at which the entry will apply, and its type, which defines which kind of event this directive represents. Entries begin with a syntax that looks like this

`YYYY-MM-DD <type> ...`

where YYYY is the year, MM is the numerical month, and DD the numerical date. All digits are required, for example, the 7th of May 2007 should be “2007-05-07”, including its zeros.

### Ordering of entries
The order of declaration of the entries is not important. In fact, the entries are re-sorted by gainstrack automatically when you use the website, although for your own purposes you can organise your input file in any way you wish.

Directives may be defined as occurring on start of day, intraday or end of day.

### Accounts
Gainstrack accumulates assets in accounts. Main accounts must be defined before they can be use, although Gainstrack will automatically generate related accounts depending on how the account is used.

An account name is a colon-separated list of capitalized words which begin with a letter, and whose first word must be one of five account types:

`Assets Liabilities Equity Income Expenses`

The components of account names is still to be defined by Gainstrack but it is strongly recommended that each component of the account names begin with a capital letter or a number and are followed by letters, numbers or dash (-) characters. All other characters should be avoided.

An example of an account would be
`Assets:UK:Investment:ISA`

Gainstrack may automatically create related accounts based on this such as
```
Assets:UK:Investment:ISA:GBP ; GBP held in that account
Income:UK:Investment:ISA     ; Income generated by this account
Expenses:UK:Investment:ISA   ; Expenses generated by this account
```
These automatically generated related accounts are used for reporting purposes backed by the double entry journals that are generated. However, entries in the input file should only refer to the main account names, not the related account.

The set of all names of accounts seen in an input file implicitly define a hierarchy of accounts (sometimes called a chart-of-accounts), similarly to how files are organized in a file system.


### Assets
Accounts contain **assets**. Assets are anything of value, such as currencies, commodities, property, crypto and other investments.

Like account names, asset names are recognized by their syntax, though, unlike account names, they need not be declared before being used). The syntax for an asset is a word all in capital letters, like these:
```
USD
CAD
EUR
MSFT
IBM
AIRMILE
HOME
```
Gainstrack recognises currencies specially. If they are an [ISO 4217 currency](http://en.wikipedia.org/wiki/ISO_4217#Active_codes), the website will use its historic database of currency database to perform automatic currency conversion.

In general, Gainstrack does not apply special treatment to assets. They are just "things" that can be put into accounts.

Finally, you will notice that there exists a “commodity” directive that can be used to declare assets. It is entirely optional: assets come into being as you use them. The purpose of the directive is simply to attach metadata to it. The naming of "commodity" rather than "asset" is for consistency with beancount.

### Comments
The Beancount input file isn’t intended to contain only your directives: you can place comments and headers in it to organize your file. Any text on a line after the character “;” is ignored, text like this:

```
; I paid and left the taxi, forgot to take change, it was cold.
2015-01-01 spend Expenses:Taxi 20 USD Assets:Cash
```

At present, inline comments, while supported, will be dropped from the online editor

## Account based entries
### Open
All main accounts need to be declared "open" to accept entries to be made against them. You can do this by writing a directive that looks like this:
```
2014-05-01 open Liabilities:CreditCard:CapitalOne     USD
```
The general format of the Open directive is:
```
YYYY-MM-DD open Account Asset
   optionName: optionValue
   optionName: optionValue
```
Accounts can be multi-asset or single-asset. For single-asset, the Asset specifices the single type of asset the account holds.

Multi-asset accounts are declared with the option
`multiAsset: true`
being set. The account's Asset still needs to be defined as this will determine the default reporting currency for that account.

Each account should be declared “opened” at a particular date that precedes (or is the same as) the date of the first transaction that posts an amount to that account.

Note that unlike Beancount, there is no booking method to be defined.

Addition options include:
* expenseAccount: default account for expenses to be directed
* incomeAccount: default account for income to be directed
* fundingAccount: default account for funding to be sourced from
* multiAsset: if "true", account will be multi-asset
* automaticReinvestment: if "true", automatic reinvestment accounting is enabled (to be documented)

### Close
This directive has not been defined, unlike other accounting platforms like Beancount. It may be added in future if required.

## Transaction based entries
Unlike normal double entry based accounting systems that define a single transaction syntax, Gainstrack defines several ways to model transactions. These higher level directives allow for
* Simpler and shorter syntax to define transactions
* Ability to perform richer reporting from the extra information
* Inference of double entry accounting numbers, rather than being forced to be explicit

TBD notes on use of main account and not referring to subaccounts

### tfr
Transfer assets between two accounts

This is the most basic directive. An example would be
```
2009-01-01 tfr Assets:Bank:HSBCUK Assets:Property:PP 100000.0 GBP 1.0 HOME
```
which represents spending money to buy a home.

The general syntax is
```
YYYY-MM-DD tfr FromAccount ToAccount AmountValue AmountAsset [TargetAmountValue TargetAmountAsset]
```
TargetAmount only needs to be provided if it differs from the Amount to be deducted from the FromAccount.

By providing a different TargetAmountAsset, cross currency transfers or asset purchases can be specified.
### trade
Purchase assets, recording cost basis

The general syntax is
```
YYYY-MM-DD trade Account AssetAmount @Price cCommission
```
for example
`2020-01-20 trade Assets:Investment:IB 4000.0 IBTA @5.0 USD C12.0 USD`
means that 4000 units of IBTA were purchased at a cost of 5.0 USD per unit. The cost of performing the trade was 12 USD. As a result of this trade, the following postings would be generated
* 4000 applied to Assets:Investment:IB:IBTA, with a cost basis of 5.0 USD
* -20000 applied to Assets:Investment:IB:USD
* 12 applied to Expenses:Investment:IB:USD

Trades must be performed within multi-asset accounts.

Sales can similarly be recorded. For example
`2020-01-20 trade Assets:Investment:IB -4000.0 IBTA @6.0 USD C12.0 USD`
The following postings would be generated
* -4000 applied to Assets:Investment:IB:IBTA
* 23988 applied to Assets:Investment:IB:USD
* 12 applied to Expenses:Investment:IB:USD
  Note that Gainstrack is not (presently) explicitly tracking inventory or lots of assets together with their cost basis. Also, realised P&L is not explicitly recorded in the postings. Instead Gainstrack handles unrealised and realised P&L in its reporting. For more discussion on this, see TBD docs.

### fund
A shorthand for transfer funds into an account from a funding source. Typical use is to transfer funds in/out of an investment account. For example, given
```
1900-01-01 open Assets:Bank USD
1900-01-01 open Assets:OtherBank USD
1900-01-01 open Assets:Investment:MyBroker USD
  fundingAccount: Assets:Bank
```
Then
`2010-01-01 fund Assets:Investment:MyBroker 10000.0 USD`
would represent a transfer from Assets:Bank to Assets:Investment:MyBroker of 10000 USD.

Funding source can always be set explicitly, for example
`2010-01-01 fund Assets:Investment:MyBroker 10000.0 USD Assets:OtherBank`

### yield
Records income generated from an asset. For example
`2010-01-01 yield Assets:Bank 50 USD`
could be used to represent bank interest being generated from a bank account. This would give rise to postings of
* Assets:Bank +50 USD
* Income:Bank -50 USD

It can also be used to represent dividend yields in multi-asset accounts. For example
`2010-01-01 yield Assets:Investment:MyBroker VWRL 30 USD`
would give rise to postings of
* Assets:Investment:MyBroker:USD +30 USD
* Income:Investment:MyBroker:AGGG -30 USD

### earn
Generate external personal income such as salary. For example, given
```
1900-01-01 open Assets:Bank USD
1900-01-01 open Assets:OtherBank USD
1900-01-01 open Income:Salary
  fundingAccount Assets:Bank
```
Then
`2010-01-01 earn Income:Salary 1000 USD`
would fund Assets:Bank with 1000 USD from Income:Salary.

The funding account can be specified explicitly if desired:
`2010-01-01 earn Income:Salary 1000 USD Assets:OtherBank`

## Balance based commands
### bal
Declare a balance in an account of cash, applied at end of day

For instance, this
`2014-12-26 bal Liabilities:US:CreditCard   -3492.02 USD`

asserts that the the account Liabilities:US:CreditCard should hold -3492.02 USD at *end of day*. If a different balance is encountered, a transfer is automatically generated from an adjustment account to the account in order to achieve the balance.

The general syntax is
`YYYY-MM-DD bal AccountName AmountValue AmountAsset [AdjustmentAccount]`

The account against which adjustments are to be made against is determined is chosen from, in order of priority
* the AdjustmentAccount in the entry
* TODO: an adjAccount on the account option

Typical usage would be to use Expenses:General as an adjustment account for your bank account

### unit
Declare a balance in an account of a security where cost basis is maintained
`2010-01-01 unit Assets:Pension:Company 706.0 UNITTRUST @5.0 GBP`

This would ensure the resulting balance of UNITTRUST in the account reaches 706 by buying/selling the necessary units at 5.0 GBP to achieve the balance.

If automaticReinvestment option is set to true on the account, any remaining cash amount in the account (currency determined by the currency of the main account), will be set to zero by moving value between an associated Income account. This feature is useful where the account is automatically reinvesting cash into assets so that cash is never undeployed

### adj (deprecated)
Declare a balance in an account of cash, applied at start of day. It is otherwise similar to the `bal` command that asserts the balance at end of day.

Since the assertion for this entry is start of day, the adjustment entry is made on the day before, which causes confusion. For that reason, this directive is deprecated

## Global options
This commands are typically found at the top of the file

`option "operating_currency" "GBP"`
specify your primary reporting currency

## Miscellaneous commands
### price
Specify market price for an asset
```
2010-01-01 price HOME 100,000 GBP
2010-01-01 price GBP 1.2 USD
```
In practice, this type of entry is rarely needed because Gainstrack can obtain prices from
* Implied prices when transfer or trades are performed between two assets
* Historic prices for currencies

It is still useful when one wants to perform a mark to market of an asset such as HOME where there is no automatic pricing available.

### Commodity
This directive is to declare assets such as currencies, commodities or other assets
```
1900-01-01 commodity CAD
1900-01-01 commodity VWRD
  ticker: VWRD.LN
  tags: equity
1900-01-01 commodity WORLDINDEX
  proxy: VWRD.LN
```
The general format of the Commodity directive is:

`YYYY-MM-DD commodity Asset`
The purpose of this directive is to attach commodity-specific metadata fields on it, so that it can be gathered by reports later on.

For example, defining an ISO currency will allow the website to perform automatic currency conversions.

You can use any date for an asset as the date is never used. `1900-01-01` is a recommended date.

Options include
* tags - comma separated set of strings, useful for identifying a class of assets (e.g. bond, equity)
* ticker - ticker symbol for obtaining external prices
* proxy - a proxy ticker symbol to extrapolate prices based on last trade and an external price source for the proxy ticker
