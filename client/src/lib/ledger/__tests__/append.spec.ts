import { diffToDelta, makeDelta } from 'src/lib/ledger/append';
import { CommandBlock, replayLedger, toGainstrackText } from 'src/lib/ledger/replay';
import { GainstrackParser } from 'src/lib/GainstrackParser';
import { toCommandBlocks } from 'src/lib/toGainstrack';

const OPEN: CommandBlock = ['2019-01-01 open Assets:Bank USD'];
const OPEN_EQ: CommandBlock = ['2019-01-01 open Equity:Opening USD'];
const FUND: CommandBlock = ['2019-01-02 fund Assets:Bank 1000 USD'];

describe('makeDelta', () => {
  test('omits empty arrays so events match the Scala shape', () => {
    expect(makeDelta([OPEN])).toEqual({ jsonClass: 'GainstrackEntityDelta', adds: [OPEN] });
    expect(makeDelta([], [OPEN])).toEqual({ jsonClass: 'GainstrackEntityDelta', removes: [OPEN] });
  });
});

describe('diffToDelta', () => {
  test('returns null when nothing changed, so no revision is burned', () => {
    expect(diffToDelta([OPEN, FUND], [OPEN, FUND])).toBeNull();
  });

  test('detects a pure addition', () => {
    expect(diffToDelta([OPEN], [OPEN, FUND])).toEqual({ jsonClass: 'GainstrackEntityDelta', adds: [FUND] });
  });

  test('detects a pure removal', () => {
    expect(diffToDelta([OPEN, FUND], [OPEN])).toEqual({ jsonClass: 'GainstrackEntityDelta', removes: [FUND] });
  });

  test('an edit is a remove plus an add', () => {
    const edited: CommandBlock = ['2019-01-02 fund Assets:Bank 2000 USD'];
    expect(diffToDelta([OPEN, FUND], [OPEN, edited]))
      .toEqual({ jsonClass: 'GainstrackEntityDelta', adds: [edited], removes: [FUND] });
  });

  test('reordering alone is not a change — the diff is set-based, like Scala', () => {
    expect(diffToDelta([OPEN, FUND], [FUND, OPEN])).toBeNull();
  });

  test('comment-only changes are a real change (comments are part of the block)', () => {
    const commented: CommandBlock = ['; payday', ...FUND];
    expect(diffToDelta([FUND], [commented]))
      .toEqual({ jsonClass: 'GainstrackEntityDelta', adds: [commented], removes: [FUND] });
  });
});

describe('append round trip through replay', () => {
  // The whole write path in miniature: serialize -> delta -> replay -> same text.
  function streamFrom(deltas: ReturnType<typeof makeDelta>[]) {
    return deltas.map((d, i) => ({ streamId: 's', streamRevision: i + 1, event: JSON.stringify(d) }));
  }

  test('appending each command block replays to the original ledger', () => {
    const text = [OPEN_EQ, OPEN, FUND].flat().join('\n') + '\n';
    const parser = new GainstrackParser();
    parser.parseString(text);
    const blocks = toCommandBlocks(parser.getTypedCommands());

    const replayed = replayLedger(streamFrom(blocks.map(b => makeDelta([b]))));
    expect(toGainstrackText(replayed.commands)).toBe(toGainstrackText(blocks));

    // And the replayed text must parse back to the same commands.
    const reparsed = new GainstrackParser();
    reparsed.parseString(toGainstrackText(replayed.commands));
    expect(toCommandBlocks(reparsed.getTypedCommands())).toEqual(blocks);
  });

  test('a remove delta drops the command from the replayed ledger', () => {
    const stream = streamFrom([makeDelta([OPEN, FUND]), makeDelta([], [FUND])]);
    expect(replayLedger(stream).commands).toEqual([OPEN]);
  });

  test('an edit delta replays to the edited command only', () => {
    const edited: CommandBlock = ['2019-01-02 fund Assets:Bank 2000 USD'];
    const stream = streamFrom([makeDelta([OPEN, FUND]), makeDelta([edited], [FUND])]);
    expect(replayLedger(stream).commands).toEqual([OPEN, edited]);
  });
});
