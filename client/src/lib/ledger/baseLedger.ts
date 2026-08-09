// The starter ledger given to a user with no stored history.
//
// Replicates the server's `GainstrackEntity.defaultBase`, which sources
// core/src/main/resources/com/gainstrack/core/base.gainstrack whenever a ledger is absent
// (`getGainstrack` -> `bgFromFile.getOrElse(bgDefault)`).
//
// This is not cosmetic scaffolding. Several commands resolve against these accounts by default,
// so without them a brand-new user's first command fails to generate:
//   - `fund` defaults its source to Equity:Opening (FundCommand.DEFAULT_FUND_ACCOUNT)
//   - `earn` / `spend` resolve through the `fundingAccount` option on Income/Expenses accounts
//
// Kept byte-identical to the Scala resource; baseLedger.spec.ts asserts they cannot drift.

import { CommandBlock } from 'src/lib/ledger/replay';
import { GainstrackParser } from 'src/lib/GainstrackParser';
import { toCommandBlocks } from 'src/lib/toGainstrack';

export const BASE_GAINSTRACK = `option "operating_currency" "USD"
1900-01-01 open Equity:Opening USD
  multiAsset: true

1900-01-01 open Expenses:General USD
  multiAsset: true

1900-01-01 open Assets:Bank USD

1900-01-01 open Assets:Investment USD
  fundingAccount: Assets:Bank
  multiAsset: true

1900-01-01 open Income:Salary USD
  fundingAccount: Assets:Bank
`;

/** The starter ledger as command blocks, in the parser's sorted order. */
export function baseLedgerBlocks(): CommandBlock[] {
  const parser = new GainstrackParser();
  parser.parseString(BASE_GAINSTRACK);
  return toCommandBlocks(parser.getTypedCommands());
}
