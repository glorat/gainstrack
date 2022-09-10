# Introduction
### Key concepts
TBD

# Syntax Overview
## Directives

A declarative language is used to maintain accounts inspired by Beancount. Like Beancount, The input consists of a text file containing mainly a list of directives, or entries (we use these terms interchangeably in the code and documentation); there is also syntax for defining various options. Each directive begins with an associated date, which determines the point in time at which the directive will apply, and its type, which defines which kind of event this directive represents. All the directives begin with a syntax that looks like this:
YYYY-MM-DD <type> ...
where YYYY is the year, MM is the numerical month, and DD the numerical date. All digits are required, for example, the 7th of May 2007 should be “2007-05-07”, including its zeros. Beancount supports the international ISO 8601 standard format for dates, with dashes (e.g., “2014-02-03”), or the same ordering with slashes (e.g., “20

Here are some example directives, just to give you an idea of the aesthetics:
2014-02-03 open Assets:US:BofA:Checking
2014-05-02 bal Assets:US:BofA:Checking   154.20 USD

The end product of a parsed input file is a simple list of these entries, in a data structure. All operations are performed on these entries.
Each particular directive type is documented in a section below.

### Ordering of Directives
Like Beancount, the order of declaration of the directives is not important. This is an important feature of the language, because it makes it possible for you to organize your input file any way you like without having to worry about affecting the meaning of the directives.

However, internally an ordering is applied and if you use the Gainstrack website, an opinionated formatter will reorder all commands to a conventional order.
## Accounts
Assets are accumulated in accounts. An account name is a colon-separated list of capitalized words which begin with a letter, and whose first word must be one of five account types:
Assets
Liabilities
Equity
Income
Expenses

Each component of the account names should begin with a capital letter or a number and are followed by letters, numbers or dash (-) characters. All other characters are disallowed

TODO: Describe tree of accounts (like beancount)

TODO: Describe related accounts (a convention not in beancount)

## Asset Ids
Accounts contain assets (which can be currencies, commodities, securities, properties etc.)
The syntax for a asset is a word all in capital letters, like these:
```
USD
CAD
EUR
MSFT
IBM
AIRMILE
HOME
```
Gainstrack recognises ISO currency codes and will look to treat those automatically. All other asset codes will have no special handling, although they can be linked to market prices in their definition.
# Directives
##
#### open
All accounts need to be declared “open” in order to accept amounts posted to them. You do this by writing a directive that looks like this:
```
2014-05-01 open Liabilities:CreditCard:CapitalOne USD
   multiCurrency: true
```
The general format of the Open directive is:
```
YYYY-MM-DD open Account AssetId
    optionName optionValue
```

The date at which an account is opened should precede all commands applied to that account.

The AssetId represents the reporting asset or currency of the account and the default asset id when using the account.

The following options can be applied to accounts


## Transaction based commands
Transactions involve movement of assets from one account to another. In double entry bookkeeping, this is would be modelled as a 2 (or more) postings that represent the change in values between the two accounts. In our model, directives are defined by observations of economic events that occur and typically the observation is tied to one account, the the second account being more of a target. By modelling directives in this way, richer information can be gained about our economics beyond just what a set of postings can achieve.

#### tfr
Transfer assets between two accounts
#### trade
Purchase assets, retaining cost basis
#### fund
Receiving assets int an account

Unlike the tfr directive, the fund command has the receiving account as the primary account. Typical use for this would be regular funding of investment accounts.
#### yield
Generate income from an asset
#### earn
Generate external income

#### spend
Expenses applied

### Balance based commands
#### bal
Declare a balance in an account of an asset, applied at end of day.

#### unit
Declare a balance in an account of an asset where cost basis is maintained, unlike the bal directive

#### adj (deprecated)
Declare a balance in an account of asset, applied at start of day

#### Global options
This commands are typically found at the top of the file

`option "operating_currency" "GBP"`
specify your primary reporting currency

### Miscellaneous commands
#### price
Specify market price of an asset at a given date

#### commodity
Provide meta data about assets and commodities held in balance

In some future version, this directive should be renamed to `asset` but it currently is named `commodity` to be in line with beancount.