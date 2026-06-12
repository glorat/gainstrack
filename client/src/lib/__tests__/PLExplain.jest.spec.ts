import {LocalDate} from '@js-joda/core';
import {pnlExplain} from 'src/lib/PLExplain';
import {PostingEx, AccountCommandDTO} from 'src/lib/assetdb/models';
import {SingleFXConversion} from 'src/lib/fx';

describe('pnlExplain', () => {
  const baseCcy = 'USD';
  // USD→USD is always 1 via the fx1==fx2 shortcut, so empty() is sufficient
  const fxConverter = SingleFXConversion.empty();
  const startDate = LocalDate.parse('2024-01-01');
  const toDate   = LocalDate.parse('2024-01-31');

  test('unexplained is zero with only asset activity (baseline)', () => {
    // Earn $1000 salary: Income → Assets
    const postings: PostingEx[] = [
      { account: 'Assets:Cash',     value: { number:  1000, ccy: 'USD' }, date: '2024-01-15', originIndex: 0 },
      { account: 'Income:Salary',   value: { number: -1000, ccy: 'USD' }, date: '2024-01-15', originIndex: 0 },
    ];
    const cmds: AccountCommandDTO[] = [
      { accountId: 'Assets:Cash', date: '2024-01-15', description: 'Salary', commandType: 'earn' },
    ];

    const result = pnlExplain(startDate, toDate, postings, cmds, baseCcy, fxConverter);

    expect(result.unexplained).toBeCloseTo(0, 5);
  });

  // This test exposes the Liability bug: taking a loan creates a non-zero unexplained P&L
  // because pnlExplain filters `postings` to Assets only (line: `// FIXME: +Liabilities`).
  // The actual networth change is 0 (loan proceeds are offset by debt), but the current code
  // computes actual = +1000 (only sees the Asset side) while explained = 0 (Asset and Liability
  // postings cancel in newActivityPnl), leaving unexplained = 1000.
  //
  // Fix: change the postings filter in pnlExplain to include Liabilities alongside Assets.
  test('unexplained is zero when a loan is recorded via a Liability account', () => {
    // Take a $1000 loan: cash received (+Asset), debt incurred (-Liability in debit-normal)
    const postings: PostingEx[] = [
      { account: 'Assets:Cash',      value: { number:  1000, ccy: 'USD' }, date: '2024-01-15', originIndex: 0 },
      { account: 'Liabilities:Loan', value: { number: -1000, ccy: 'USD' }, date: '2024-01-15', originIndex: 0 },
    ];
    const cmds: AccountCommandDTO[] = [
      { accountId: 'Assets:Cash', date: '2024-01-15', description: 'Take loan', commandType: 'tfr' },
    ];

    const result = pnlExplain(startDate, toDate, postings, cmds, baseCcy, fxConverter);

    // Taking a loan changes net worth by zero — all P&L should be explained.
    expect(result.actual).toBeCloseTo(0, 5);
    expect(result.unexplained).toBeCloseTo(0, 5);
  });
});
