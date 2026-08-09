import { createPinia, setActivePinia } from 'pinia';
import axios from 'axios';
import { useAppStore } from 'src/stores/app';
import { emptyAllState } from 'src/lib/assetdb/models';
import { generateAllStateSafe } from 'src/lib/gen/GainstrackGenerator';
import * as firestoreLedger from 'src/lib/ledger/firestoreLedger';
import { replayLedger, toGainstrackText } from 'src/lib/ledger/replay';

vi.mock('axios');

const LEDGER = [
  ['2019-01-01 open Equity:Opening USD'],
  ['2019-01-01 open Assets:Bank USD'],
  ['2019-01-02 fund Assets:Bank 1000 USD'],
];

const TEXT = toGainstrackText(LEDGER);

function stubRecords(blocks: string[][]) {
  return blocks.map((b, i) => ({
    streamId: 's', streamRevision: i + 1, event: JSON.stringify({ adds: [b] }),
  }));
}

beforeEach(() => {
  setActivePinia(createPinia());
  vi.restoreAllMocks();
  // The store pre-loads quotes and computes balances off whatever /api/allState returns, so the
  // stub has to be a structurally valid AllState rather than a bare {}.
  vi.mocked(axios.get).mockResolvedValue({ data: {} });
  vi.mocked(axios.post).mockResolvedValue({ data: emptyAllState });
});

describe('direct Firestore ledger read', () => {
  test('replayed stream reproduces the source text exactly', () => {
    expect(toGainstrackText(replayLedger(stubRecords(LEDGER)).commands)).toBe(TEXT);
  });

  test('loadFromFirestore yields the same AllState as generating from text', async () => {
    const store = useAppStore();
    store.user = { uid: 'firebase-uid-123', email: 'a@b.com' } as never;
    vi.spyOn(firestoreLedger, 'loadLedgerText').mockResolvedValue({
      text: TEXT,
      ledgerId: 'derived-id',
      replay: replayLedger(stubRecords(LEDGER)),
    });

    await store.loadFromFirestore();

    const expected = generateAllStateSafe(TEXT, { username: 'a@b.com' }).state!;
    expect(store.allState.accounts.map(a => a.accountId).sort())
      .toEqual(expected.accounts.map(a => a.accountId).sort());
    expect(store.allState.txs.length).toBe(expected.txs.length);
    expect(store.allState.baseCcy).toBe(expected.baseCcy);
    // The editor should show the replayed text rather than re-fetching /api/editor/.
    expect(store.gainstrackText).toBe(TEXT);
    expect(store.parseState.errors).toEqual([]);
  });

  test('refuses to read when there is no signed-in Firebase user', async () => {
    const store = useAppStore();
    store.user = undefined;
    await expect(store.loadFromFirestore()).rejects.toThrow(/no signed-in Firebase user/);
  });

  test('loadAllState ignores the direct path while the flag is off', async () => {
    const store = useAppStore();
    store.user = { uid: 'u' } as never;
    store.useDirectLedger = false;
    const direct = vi.spyOn(firestoreLedger, 'loadLedgerText');
    await store.loadAllState();
    expect(direct).not.toHaveBeenCalled();
    expect(axios.post).toHaveBeenCalledWith('/api/allState');
  });

  test('a permission error falls back to /api/allState instead of locking the user out', async () => {
    const store = useAppStore();
    store.user = { uid: 'u' } as never;
    store.useDirectLedger = true;
    vi.spyOn(firestoreLedger, 'loadLedgerText')
      .mockRejectedValue(new Error('Missing or insufficient permissions.'));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await store.loadAllState();
    expect(axios.post).toHaveBeenCalledWith('/api/allState');
  });

  test('a brand-new user with no records gets an empty ledger, not a fallback', async () => {
    const store = useAppStore();
    store.user = { uid: 'brand-new-uid' } as never;
    vi.spyOn(firestoreLedger, 'loadLedgerText').mockResolvedValue({
      text: toGainstrackText([]), ledgerId: 'brand-new-uid', replay: replayLedger([]),
    });
    vi.mocked(axios.post).mockClear(); // call history leaks across tests in this file

    await store.loadAllState();
    // No history is a valid empty ledger — falling back to the server here would resurrect
    // whatever the Scala side happens to hold and silently fork the two stores.
    expect(axios.post).not.toHaveBeenCalledWith('/api/allState');
    expect(store.allState.txs).toEqual([]);
  });

  test('a ledger that fails to generate surfaces parse errors and does not clobber state', async () => {
    const store = useAppStore();
    store.user = { uid: 'u' } as never;
    vi.spyOn(firestoreLedger, 'loadLedgerText').mockResolvedValue({
      text: '2019-01-01 open Assets:Bank USD\n2019-01-02 tfr Assets:Bank Assets:Nope 5 USD\n',
      ledgerId: 'derived-id',
      replay: replayLedger([]),
    });

    await expect(store.loadFromFirestore()).rejects.toThrow(/failed to generate/);
    expect(store.parseState.errors.length).toBeGreaterThan(0);
    expect(store.allState.accounts).toEqual([]);
  });
});
