import { describe, test, expect } from 'vitest';
import { LocalDate } from '@js-joda/core';
import { generate } from 'src/lib/gen/GainstrackGenerator';
import { GainstrackParser, RETAINED_EARNINGS_ID } from 'src/lib/GainstrackParser';
import { SingleFXConversion } from 'src/lib/fx';
import { PostingEx, Transaction } from 'src/lib/assetdb/models';
import { balanceTreeTable } from 'src/lib/TreeTable';

// Single currency so no quotes are needed and the numbers stay readable.
// Bank = 10000 + 5000 - 2000 = 13000; profit = 5000 - 2000 = 3000.
const BOOKS = [
  'option "operating_currency" "USD"',
  '2020-01-01 open Equity:ShareCapital USD',
  '2020-01-01 open Assets:Bank USD',
  '2020-01-01 open Income:Revenue USD',
  '2020-01-01 open Expenses:General USD',
  '2020-01-01 tfr Equity:ShareCapital Assets:Bank 10000 USD',
  '2020-02-01 tfr Income:Revenue Assets:Bank 5000 USD',
  '2020-03-01 tfr Assets:Bank Expenses:General 2000 USD',
].join('\n');

const DATE = LocalDate.parse('2020-12-31');

function postingsOf(txs: Transaction[]): PostingEx[] {
  return txs.flatMap(tx => tx.postings.map(p => ({ ...p, date: tx.postDate, originIndex: tx.originIndex })));
}

function build(text: string) {
  const { accounts, txs } = generate(text);
  const postings = postingsOf(txs);
  const fx = SingleFXConversion.empty();
  const tree = (top: string, ps: PostingEx[] = postings) =>
    balanceTreeTable(top, DATE, 'USD', 'units', accounts, ps, fx);
  return { accounts, txs, postings, tree };
}

const usd = (node: { assetBalance: { ccy: string, number: number }[] }) =>
  node.assetBalance.find(b => b.ccy === 'USD')?.number ?? 0;

describe('close command', () => {
  test('parses bare and with an explicit equity account', () => {
    // parseLines rather than parseString: the latter throws on error instead of collecting.
    const parse = (line: string) => {
      const p = new GainstrackParser();
      p.parseLines([line]);
      return { cmds: p.getCommands(), errors: p.parserErrors };
    };

    expect(parse('2020-12-31 close').cmds[0]).toMatchObject({
      commandType: 'close', date: '2020-12-31', accountId: RETAINED_EARNINGS_ID,
    });
    expect(parse('2020-12-31 close Equity:Reserves').cmds[0]).toMatchObject({
      commandType: 'close', accountId: 'Equity:Reserves',
    });
    // Booking the close anywhere but equity is a bookkeeping error, not a silent no-op.
    expect(parse('2020-12-31 close Assets:Bank').errors[0].message).toMatch(/Equity account/);
  });

  test('books income and expenses to retained earnings', () => {
    const { txs, tree } = build(`${BOOKS}\n2020-12-31 close`);

    const closing = txs[txs.length - 1];
    expect(closing.postDate).toBe('2020-12-31');
    // Reversals of both P&L accounts plus one equity leg, summing to zero.
    expect(closing.postings.map(p => [p.account, p.value.number])).toEqual([
      ['Expenses:General', -2000],
      ['Income:Revenue', 5000],
      [RETAINED_EARNINGS_ID, -3000],
    ]);
    expect(closing.postings.reduce((a, p) => a + p.value.number, 0)).toBe(0);

    // Credits are negative, as for every other equity account.
    expect(usd(tree(RETAINED_EARNINGS_ID))).toBe(-3000);
    expect(usd(tree('Income'))).toBe(0);
    expect(usd(tree('Expenses'))).toBe(0);
  });

  test('the balance sheet foots once the books are closed', () => {
    const open = build(BOOKS);
    const closed = build(`${BOOKS}\n2020-12-31 close`);

    // Before closing, equity is short by the retained profit — the gap this whole thing fixes.
    expect(usd(open.tree('Assets')) + usd(open.tree('Liabilities')) + usd(open.tree('Equity'))).toBe(3000);

    expect(usd(closed.tree('Assets'))).toBe(13000);
    expect(usd(closed.tree('Assets')) + usd(closed.tree('Liabilities')) + usd(closed.tree('Equity'))).toBe(0);
  });

  test('the income statement reads pre-close activity', () => {
    const text = `${BOOKS}\n2020-12-31 close`;
    const { txs, tree } = build(text);

    // Exactly the store's filter: originIndex resolves back through the sorted command list.
    const parser = new GainstrackParser();
    parser.parseString(text);
    const cmds = parser.getCommands();
    const preClose = postingsOf(txs).filter(p => cmds[p.originIndex]?.commandType !== 'close');

    expect(usd(tree('Income', preClose))).toBe(-5000);
    expect(usd(tree('Expenses', preClose))).toBe(2000);
  });

  test('a second close only books what happened since the first', () => {
    const text = [
      BOOKS,
      '2020-12-31 close',
      '2021-02-01 tfr Income:Revenue Assets:Bank 1000 USD',
      '2021-12-31 close',
    ].join('\n');
    const { txs, tree } = build(text);

    const closings = txs.filter(tx => tx.postings.some(p => p.account === RETAINED_EARNINGS_ID));
    expect(closings).toHaveLength(2);
    // Period two closes 1000, not the cumulative 4000 — this is what makes periods fall out.
    expect(closings[1].postings.find(p => p.account === RETAINED_EARNINGS_ID)?.value.number).toBe(-1000);
    expect(usd(tree(RETAINED_EARNINGS_ID))).toBe(-4000);
  });

  test('a close with nothing to close emits no transaction', () => {
    const before = build(BOOKS).txs.length;
    const after = build(`${BOOKS}\n2020-12-31 close\n2020-12-31 close`).txs.length;
    expect(after).toBe(before + 1);
  });
});
