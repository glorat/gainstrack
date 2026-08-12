// GPL-2.0-only — see ../LICENSE and ../README.md.
//
// Small enough to read in one screen, and chosen so the JSON shows the parts that are actually
// worth having beancount do: an elided amount, a lot cost resolved by FIFO, and a `pad` that the
// loader turns into a transaction that is not written anywhere in the text.

export const SAMPLE = `option "title" "Sample"
option "operating_currency" "USD"

2024-01-01 open Assets:Bank      USD
2024-01-01 open Assets:Broker    "FIFO"
2024-01-01 open Expenses:Coffee  USD
2024-01-01 open Income:Salary    USD
2024-01-01 open Equity:Opening-Balances

2024-01-01 * "Opening balance"
  Assets:Bank              8000.00 USD
  Equity:Opening-Balances

2024-01-25 * "Employer Inc" "January salary"
  Assets:Bank              4500.00 USD
  Income:Salary                              ; amount elided — the loader works it out

2024-02-02 * "Buy shares"
  Assets:Broker                 20 ACME {41.50 USD}
  Assets:Bank

2024-03-05 * "Buy more, higher"
  Assets:Broker                 20 ACME {48.25 USD}
  Assets:Bank

2024-04-01 * "Sell some"        ; {} means "pick a lot" — FIFO takes the February one
  Assets:Broker                -15 ACME {} @ 52.00 USD
  Assets:Bank                780.00 USD
  Income:Salary

2024-04-02 * "Cafe" "flat white"
  Expenses:Coffee             4.50 USD
  Assets:Bank

; A pad and the assertion after it: the loader invents the transaction that makes this true.
2024-05-01 pad Assets:Bank Equity:Opening-Balances
2024-05-02 balance Assets:Bank  9000.00 USD

2024-06-30 price ACME  55.10 USD
`;
