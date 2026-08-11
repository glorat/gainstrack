// Port of `GainstrackGenerator.toGainstrack` — the whole ledger as one gainstrack file.
//
// This backs the "Export Gainstrack" download, which used to be served by Scala's
// ExportController. Note it is NOT the same as the ledger replay text: the export REGROUPS
// commands under their main account and sorts those groups by account id, so the file reads
// account-by-account rather than in the order the user happened to write things.
//
// The layout is, verbatim from Scala:
//   s"${topStrs}\n\n${accountStrs}\n\n${bottomStrs}"
// where top is the global command, accountStrs is the per-account groups joined by a blank
// line, and bottom is everything account-less (prices, commodities). An empty section still
// contributes its separator, so a ledger with no operating-currency line legitimately starts
// with two newlines — that is Scala's output too, and bean-check/the parser both accept it.

import { Parsed } from 'src/lib/GainstrackParser';
import { toGainstrackWithComments } from 'src/lib/toGainstrack';

/**
 * The account a command files under (Scala `AccountCommand.mainAccount`).
 *
 * `undefined` means the command is account-less and sorts to the bottom section.
 * earn/spend are the awkward pair: they file under the *tag's* account, which is the tag
 * itself when already qualified ("Income:Salary") and otherwise the tag prefixed with its
 * type ("Salary" -> "Income:Salary"). Deriving this from `dto.accountId` would work today but
 * silently breaks if the DTO's accountId ever stops being the resolved income/expense account.
 */
export function mainAccount(p: Parsed): string | undefined {
  switch (p.kind) {
    case 'price':
    case 'commodity':
    case 'global':
      return undefined;

    // A `tx` has no main account — it can touch any number of them, and filing it under one
    // would scatter a single transaction's context away from the rest. It goes to the bottom
    // section, which keeps every raw transaction together in date order. That is also the
    // shape an imported beancount ledger naturally wants: accounts grouped at the top, the
    // transaction stream chronological below.
    case 'tx':
      return undefined;

    case 'earn':
      return qualify(p.tag ?? p.dto.accountId, 'Income');
    case 'spend':
      return qualify(p.tag ?? p.dto.accountId, 'Expenses');

    // Everything else files under its own account. Two worth naming: `tfr` files under its
    // SOURCE leg, which is what `accountId` holds (the target is `otherAccount`); and `close`
    // has no Scala counterpart, so filing it under its account simply follows the rest.
    case 'tfr':
    case 'open':
    case 'trade':
    case 'adj':
    case 'bal':
    case 'unit':
    case 'fund':
    case 'yield':
    case 'close':
      return p.dto.accountId;
  }
}

function qualify(tag: string, type: 'Income' | 'Expenses'): string {
  return tag.startsWith(`${type}:`) ? tag : `${type}:${tag}`;
}

/**
 * Serialize commands to a complete gainstrack file.
 *
 * Expects `commands` in the parser's sorted order (`GainstrackParser.getTypedCommands`), which
 * is the same invariant Scala asserts on `originalCommands`.
 */
export function toGainstrackFile(commands: Parsed[]): string {
  // Scala reads the global command off the head, defaulting to USD when the ledger has none.
  const head = commands[0];
  const globalCmd = head?.kind === 'global' ? head : undefined;

  // Scala flatMaps LINES across a group before joining, so a command that emits nothing (a
  // USD global) contributes no blank line. Joining per-command strings instead would.
  const lines = (ps: Parsed[]) => ps.flatMap(toGainstrackWithComments).join('\n');

  const topStrs = globalCmd ? lines([globalCmd]) : '';

  const grouped = new Map<string, Parsed[]>();
  const bottom: Parsed[] = [];
  for (const p of commands) {
    if (p === globalCmd) continue;
    const acct = mainAccount(p);
    if (acct === undefined) {
      bottom.push(p);
    } else {
      const group = grouped.get(acct);
      if (group) group.push(p); else grouped.set(acct, [p]);
    }
  }

  // Scala sorts AccountIds by `name.compareTo`, i.e. plain UTF-16 order — the JS default.
  const accountStrs = [...grouped.keys()].sort()
    .map(id => lines(grouped.get(id)!))
    .join('\n\n');

  const bottomStrs = lines(bottom);

  return `${topStrs}\n\n${accountStrs}\n\n${bottomStrs}`;
}
