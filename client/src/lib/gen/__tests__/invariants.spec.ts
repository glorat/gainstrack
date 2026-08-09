// Invariants that no ledger in the corpus can reach, so nothing else pins them.
//
// Each test here exists because a mutation audit removed the corresponding guard and the entire
// suite — 3300 tests, including a 300-ledger differential against Scala — stayed green. A rule
// that survives its own deletion is not being tested, however obviously correct it looks.

import { GAmount, D } from 'src/lib/gen/money';
import { buildAccountState } from 'src/lib/gen/accountState';
import { buildCommands } from 'src/lib/gen/commands';
import { GainstrackParser } from 'src/lib/GainstrackParser';
import { makeTransfer } from 'src/lib/gen/transfer';

describe('GAmount refuses to combine currencies', () => {
  // Scala's `Amount.+`/`-` `require(rhs.ccy == this.ccy)`. In the pipeline this fires only via
  // paths the corpus does not reach, but it is the guard that stops an adjustment computing a
  // difference between two unlike currencies and reporting the result as money.
  const gbp = new GAmount(D(10), 'GBP');
  const usd = new GAmount(D(10), 'USD');

  test('add throws', () => {
    expect(() => gbp.add(usd)).toThrow('Balance can only combine single currency');
  });

  test('sub throws', () => {
    expect(() => gbp.sub(usd)).toThrow('Balance can only combine single currency');
  });

  test('same currency is unaffected', () => {
    expect(gbp.add(new GAmount(D(5), 'GBP')).number.toNumber()).toBe(15);
    expect(gbp.sub(new GAmount(D(5), 'GBP')).number.toNumber()).toBe(5);
  });
});

describe('a transfer must move a non-zero amount on both legs', () => {
  // `Transfer.apply` requires it. Reachable from a ledger (`fund X 0 USD`), which gen_cases.txt
  // now covers against Scala — but asserted directly too, since the message and both legs matter.
  const usd = (n: number) => new GAmount(D(n), 'USD');

  test('zero source throws', () => {
    expect(() => makeTransfer('Assets:A', 'Assets:B', '2019-01-01', usd(0), usd(5)))
      .toThrow('Transfer amount must be non-zero');
  });

  test('zero target throws', () => {
    expect(() => makeTransfer('Assets:A', 'Assets:B', '2019-01-01', usd(5), usd(0)))
      .toThrow('Transfer amount must be non-zero');
  });
});

describe('account creation is first-write-wins', () => {
  // Scala cannot arbitrate this: its `accounts` is a `Set[AccountCreation]` keyed on the whole
  // case class, so the same id created twice with different options is stored TWICE and resolved
  // by JVM hash order (see fuzzDiff.spec.ts). The port keys by id and keeps the first write,
  // which is deterministic — but precisely because Scala has no answer, no differential test can
  // pin it. Asserted here so the choice cannot be reversed silently.
  const state = (text: string) => {
    const parser = new GainstrackParser();
    parser.parseString(text);
    return buildAccountState(buildCommands(parser.getTypedCommands()));
  };

  test('the first creator of an account wins over a later plainer one', () => {
    // `unit` creates `Assets:Broker:USD` carrying the PARENT's options
    // (`UnitTrustBalance.createRequiredAccounts` copies them). A later `yield` reaches the same
    // account through `YieldCommand.createRequiredAccounts`, which builds a bare
    // `generatedAccount` version instead. Whichever is kept is what the UI shows and what
    // funding resolution reads, so it has to be decided rather than incidental — 41 of the 150
    // generated valid ledgers hit this exact collision.
    const acct = state([
      '2019-01-01 open Equity:Opening USD',
      '2019-01-01 open Assets:Bank USD',
      '2019-01-01 open Assets:Broker USD',
      '  multiAsset: true',
      '  fundingAccount: Assets:Bank',
      '2019-01-02 fund Assets:Broker 1000 USD',
      '2019-01-03 unit Assets:Broker 5 IVV @100 USD',
      '2019-01-04 yield Assets:Broker IVV 10 USD',
      '',
    ].join('\n'));

    expect(acct.find('Assets:Broker:USD')?.options.fundingAccount).toBe('Assets:Bank');
  });

  test('accounts are unique by id', () => {
    const acct = state([
      '2019-01-01 open Equity:Opening USD',
      '2019-01-01 open Assets:Bank USD',
      '2019-01-01 open Assets:Broker USD',
      '  multiAsset: true',
      '  fundingAccount: Assets:Bank',
      '2019-01-02 fund Assets:Broker 1000 USD',
      '2019-01-03 trade Assets:Broker 5 IVV @100 USD',
      '2019-01-04 unit Assets:Broker 6 IVV @110 USD',
      '',
    ].join('\n')).withInterpolatedAccounts().toAccountDTOs();

    expect(acct.length).toBe(new Set(acct.map(a => a.accountId)).size);
  });
});
