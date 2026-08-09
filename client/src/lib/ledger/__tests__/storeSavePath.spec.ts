import { createPinia, setActivePinia } from 'pinia';
import axios from 'axios';
import { useAppStore } from 'src/stores/app';
import { emptyAllState } from 'src/lib/assetdb/models';
import * as firestoreLedger from 'src/lib/ledger/firestoreLedger';
import * as append from 'src/lib/ledger/append';
import { replayLedger } from 'src/lib/ledger/replay';

vi.mock('axios');

const LEDGER = [
  ['2019-01-01 open Equity:Opening USD'],
  ['2019-01-01 open Assets:Bank USD'],
  ['2019-01-02 fund Assets:Bank 1000 USD'],
];

const TEXT = LEDGER.flat().join('\n') + '\n';

function records(blocks: string[][]) {
  return blocks.map((b, i) => ({
    streamId: 's', streamRevision: i + 1, event: JSON.stringify({ adds: [b] }),
  }));
}

function stubLedger(blocks = LEDGER) {
  vi.spyOn(firestoreLedger, 'fetchLedgerRecords').mockResolvedValue(records(blocks));
  vi.spyOn(firestoreLedger, 'loadLedgerText').mockResolvedValue({
    text: blocks.flat().join('\n') + '\n',
    ledgerId: 'uid-1',
    replay: replayLedger(records(blocks)),
  });
}

function signedInStore() {
  const store = useAppStore();
  store.user = { uid: 'uid-1', email: 'a@b.com' } as never;
  store.useDirectLedger = true;
  return store;
}

beforeEach(() => {
  setActivePinia(createPinia());
  vi.restoreAllMocks();
  vi.mocked(axios.get).mockResolvedValue({ data: {} });
  vi.mocked(axios.post).mockResolvedValue({ data: emptyAllState });
});

describe('saveSource', () => {
  test('appends only the difference, not the whole ledger', async () => {
    const store = signedInStore();
    stubLedger();
    const appendSpy = vi.spyOn(append, 'appendDelta').mockResolvedValue(4);

    await store.saveSource(TEXT + '2019-01-03 fund Assets:Bank 500 USD\n');

    expect(appendSpy).toHaveBeenCalledTimes(1);
    const [ledgerId, delta, opts] = appendSpy.mock.calls[0];
    expect(ledgerId).toBe('uid-1');
    expect(delta).toEqual({ jsonClass: 'GainstrackEntityDelta', adds: [['2019-01-03 fund Assets:Bank 500 USD']] });
    // The head it diffed against must be passed through, or a concurrent append is a lost update.
    expect(opts?.expectedHead).toBe(3);
  });

  test('an unchanged save burns no revision', async () => {
    const store = signedInStore();
    stubLedger();
    const appendSpy = vi.spyOn(append, 'appendDelta').mockResolvedValue(4);

    await store.saveSource(TEXT);
    expect(appendSpy).not.toHaveBeenCalled();
  });

  test('refuses to write text that does not parse', async () => {
    const store = signedInStore();
    stubLedger();
    const appendSpy = vi.spyOn(append, 'appendDelta').mockResolvedValue(4);

    await expect(store.saveSource('this is not gainstrack !!')).rejects.toThrow();
    expect(appendSpy).not.toHaveBeenCalled();
  });

  test('refuses to write text that parses but would not generate', async () => {
    const store = signedInStore();
    stubLedger();
    const appendSpy = vi.spyOn(append, 'appendDelta').mockResolvedValue(4);

    // Transfer to an account that was never opened: parses fine, fails generation.
    await expect(store.saveSource(TEXT + '2019-01-04 tfr Assets:Bank Assets:Nope 5 USD\n'))
      .rejects.toThrow(/Would not generate/);
    expect(appendSpy).not.toHaveBeenCalled();
  });

  test('refuses to write to a stream with a revision gap', async () => {
    const store = signedInStore();
    vi.spyOn(firestoreLedger, 'fetchLedgerRecords').mockResolvedValue([
      { streamId: 's', streamRevision: 1, event: JSON.stringify({ adds: [LEDGER[0]] }) },
      { streamId: 's', streamRevision: 3, event: JSON.stringify({ adds: [LEDGER[1]] }) },
    ]);
    const appendSpy = vi.spyOn(append, 'appendDelta').mockResolvedValue(4);

    await expect(store.saveSource(TEXT)).rejects.toThrow(/revision gap/);
    expect(appendSpy).not.toHaveBeenCalled();
  });

  test('falls back to the server when the direct path is off', async () => {
    const store = useAppStore();
    store.user = { uid: 'uid-1' } as never;
    store.useDirectLedger = false;
    vi.mocked(axios.post).mockResolvedValue({ data: { errors: [] } });

    await store.saveSource(TEXT);
    expect(axios.post).toHaveBeenCalledWith('/api/post/source', expect.objectContaining({ source: TEXT }));
  });
});

describe('addCommand', () => {
  test('appends the new command with the head it read', async () => {
    const store = signedInStore();
    stubLedger();
    const appendSpy = vi.spyOn(append, 'appendDelta').mockResolvedValue(4);

    const res = await store.addCommand('2019-01-03 fund Assets:Bank 500 USD');

    expect(res.added).toBe(1);
    expect(appendSpy.mock.calls[0][1])
      .toEqual({ jsonClass: 'GainstrackEntityDelta', adds: [['2019-01-03 fund Assets:Bank 500 USD']] });
    expect(appendSpy.mock.calls[0][2]?.expectedHead).toBe(3);
  });

  test('rejects an exact duplicate, matching the server invariant', async () => {
    const store = signedInStore();
    stubLedger();
    const appendSpy = vi.spyOn(append, 'appendDelta').mockResolvedValue(4);

    await expect(store.addCommand('2019-01-02 fund Assets:Bank 1000 USD'))
      .rejects.toThrow(/no duplicates allowed/);
    expect(appendSpy).not.toHaveBeenCalled();
  });

  test('falls back to the server when the direct path is off', async () => {
    const store = useAppStore();
    store.user = { uid: 'uid-1' } as never;
    store.useDirectLedger = false;
    vi.mocked(axios.post).mockResolvedValue({ data: { errors: [], added: [{}] } });

    const res = await store.addCommand('2019-01-03 fund Assets:Bank 500 USD');
    expect(axios.post).toHaveBeenCalledWith('/api/post/add', { str: '2019-01-03 fund Assets:Bank 500 USD' });
    expect(res.added).toBe(1);
  });
});
