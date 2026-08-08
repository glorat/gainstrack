import { CommandBlock, LedgerRecord, replayLedger, toGainstrackText } from 'src/lib/ledger/replay';

const STREAM = 'fec320db-f125-35f3-a0d2-e66ca7e4ce95';

function rec(streamRevision: number, delta: unknown, streamId = STREAM): LedgerRecord {
  return { streamId, streamRevision, event: JSON.stringify(delta) };
}

const add = (...cmds: CommandBlock[]) => ({ jsonClass: 'GainstrackEntityDelta', adds: cmds });
const remove = (...cmds: CommandBlock[]) => ({ jsonClass: 'GainstrackEntityDelta', removes: cmds });

const OPEN: CommandBlock = ['2019-01-01 open Assets:Bank GBP'];
const BAL: CommandBlock = ['2019-01-02 bal Assets:Bank 100 GBP Equity:Opening'];
const MULTILINE: CommandBlock = ['2019-01-01 open Assets:Inv GBP', '  multiAsset:true'];

describe('replayLedger', () => {
  test('applies adds in insertion order', () => {
    const { commands } = replayLedger([rec(1, add(OPEN)), rec(2, add(BAL))]);
    expect(commands).toEqual([OPEN, BAL]);
  });

  test('orders by streamRevision, not array or document order', () => {
    const { commands } = replayLedger([rec(2, add(BAL)), rec(1, add(OPEN))]);
    expect(commands).toEqual([OPEN, BAL]);
  });

  test('does NOT re-sort by date — insertion order is the file order', () => {
    const later: CommandBlock = ['2021-01-01 bal Assets:Bank 1 GBP Equity:Opening'];
    const earlier: CommandBlock = ['2005-01-01 bal Assets:Bank 2 GBP Equity:Opening'];
    const { commands } = replayLedger([rec(1, add(later)), rec(2, add(earlier))]);
    expect(commands).toEqual([later, earlier]);
  });

  test('processes removes before adds within one event', () => {
    // If adds ran first, the remove would delete the just-added block and leave nothing.
    const { commands } = replayLedger([
      rec(1, add(OPEN)),
      rec(2, { removes: [OPEN], adds: [OPEN] }),
    ]);
    expect(commands).toEqual([OPEN]);
  });

  test('a remove drops EVERY equal block, not just the first', () => {
    const { commands } = replayLedger([
      rec(1, add(OPEN, OPEN, BAL)),
      rec(2, remove(OPEN)),
    ]);
    expect(commands).toEqual([BAL]);
  });

  test('command identity includes indented sub-lines', () => {
    const withoutSub: CommandBlock = ['2019-01-01 open Assets:Inv GBP'];
    const { commands } = replayLedger([
      rec(1, add(MULTILINE, withoutSub)),
      rec(2, remove(withoutSub)),
    ]);
    expect(commands).toEqual([MULTILINE]);
  });

  test('a remove matching nothing is tolerated and counted', () => {
    const { commands, diagnostics } = replayLedger([
      rec(1, add(OPEN)),
      rec(2, remove(BAL)),
    ]);
    expect(commands).toEqual([OPEN]);
    expect(diagnostics.noOpRemoves).toBe(1);
  });

  test('truncates at a revision gap, matching FileRepository, and reports it', () => {
    const { commands, diagnostics } = replayLedger([
      rec(1, add(OPEN)),
      rec(3, add(BAL)), // 2 is missing — server silently discards from here
      rec(4, add(MULTILINE)),
    ]);
    expect(commands).toEqual([OPEN]);
    expect(diagnostics.discardedRevisions).toEqual([3, 4]);
    expect(diagnostics.revisionCount).toBe(1);
  });

  test('a stream not starting at revision 1 yields nothing', () => {
    const { commands, diagnostics } = replayLedger([rec(2, add(OPEN))]);
    expect(commands).toEqual([]);
    expect(diagnostics.discardedRevisions).toEqual([2]);
  });

  test('flags records from a foreign stream', () => {
    const { diagnostics } = replayLedger([
      rec(1, add(OPEN)),
      rec(2, add(BAL), 'some-other-stream'),
    ]);
    expect(diagnostics.foreignStreamIds).toEqual(['some-other-stream']);
  });

  test('an unparseable event is counted, not thrown', () => {
    const bad: LedgerRecord = { streamId: STREAM, streamRevision: 2, event: '{not json' };
    const { commands, diagnostics } = replayLedger([rec(1, add(OPEN)), bad, rec(3, add(BAL))]);
    expect(commands).toEqual([OPEN, BAL]);
    expect(diagnostics.unparseableEvents).toBe(1);
  });

  test('the first event carrying only an id contributes no commands', () => {
    const { commands } = replayLedger([
      rec(1, { jsonClass: 'GainstrackEntityDelta', id: STREAM }),
      rec(2, add(OPEN)),
    ]);
    expect(commands).toEqual([OPEN]);
  });

  test('empty stream', () => {
    expect(replayLedger([]).commands).toEqual([]);
  });
});

describe('toGainstrackText', () => {
  test('flattens blocks to lines with a trailing newline', () => {
    expect(toGainstrackText([MULTILINE, BAL])).toBe(
      '2019-01-01 open Assets:Inv GBP\n  multiAsset:true\n2019-01-02 bal Assets:Bank 100 GBP Equity:Opening\n',
    );
  });

  test('empty ledger produces just a newline', () => {
    expect(toGainstrackText([])).toBe('\n');
  });
});
