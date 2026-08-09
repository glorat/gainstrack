import { createPinia, setActivePinia } from 'pinia';
import axios from 'axios';
import { useAppStore } from 'src/stores/app';
import { emptyAllState } from 'src/lib/assetdb/models';
import * as firestoreLedger from 'src/lib/ledger/firestoreLedger';
import * as append from 'src/lib/ledger/append';
import { upsertCommodityBlocks } from 'src/lib/ledger/append';
import { replayLedger } from 'src/lib/ledger/replay';
import { apiCmdTest } from 'src/lib/apiFacade';

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
    text: blocks.flat().join('\n') + '\n', ledgerId: 'uid-1', replay: replayLedger(records(blocks)),
  });
}

function signedInStore() {
  const store = useAppStore();
  store.user = { uid: 'uid-1', email: 'a@b.com', isAnonymous: false } as never;
  return store;
}

beforeEach(() => {
  setActivePinia(createPinia());
  vi.restoreAllMocks();
  vi.mocked(axios.get).mockResolvedValue({ data: {} });
  vi.mocked(axios.post).mockResolvedValue({ data: emptyAllState });
});

describe('upsertCommodityBlocks', () => {
  const vwrd = ['1900-01-01 commodity VWRD', '  ticker: VWRD.LON'];
  const iuaa = ['1900-01-01 commodity IUAA'];
  const open = ['2019-01-01 open Assets:Bank USD'];

  test('replaces an existing declaration for the same asset rather than duplicating it', () => {
    const updated = ['1900-01-01 commodity VWRD', '  ticker: VWRD.L', '  name: Vanguard'];
    expect(upsertCommodityBlocks([open, vwrd, iuaa], [updated])).toEqual([open, iuaa, updated]);
  });

  test('appends when the asset was not previously declared', () => {
    expect(upsertCommodityBlocks([open, vwrd], [iuaa])).toEqual([open, vwrd, iuaa]);
  });

  test('never disturbs non-commodity commands', () => {
    expect(upsertCommodityBlocks([open], [vwrd])).toEqual([open, vwrd]);
  });
});

describe('upsertAssetCommand', () => {
  test('writes the replacement as a remove plus an add', async () => {
    const withAsset = [...LEDGER, ['1900-01-01 commodity VWRD', '  ticker: VWRD.LON']];
    const store = signedInStore();
    stubLedger(withAsset);
    const appendSpy = vi.spyOn(append, 'appendDelta').mockResolvedValue(5);

    await store.upsertAssetCommand('1900-01-01 commodity VWRD\n  ticker: VWRD.L');

    expect(appendSpy.mock.calls[0][1]).toEqual({
      jsonClass: 'GainstrackEntityDelta',
      adds: [['1900-01-01 commodity VWRD', '  ticker: VWRD.L']],
      removes: [['1900-01-01 commodity VWRD', '  ticker: VWRD.LON']],
    });
  });

  test('refuses to upsert with no signed-in user, rather than posting to the server', async () => {
    const store = useAppStore();
    store.user = undefined;
    vi.mocked(axios.post).mockClear();

    await expect(store.upsertAssetCommand('1900-01-01 commodity VWRD'))
      .rejects.toThrow(/do not persist/);
    expect(axios.post).not.toHaveBeenCalledWith('/api/post/asset', expect.anything());
  });
});

describe('fetchGainstrackText', () => {
  test('reads the replayed ledger instead of /api/editor/', async () => {
    const store = signedInStore();
    stubLedger();
    vi.mocked(axios.post).mockClear();

    expect(await store.fetchGainstrackText()).toBe(TEXT);
    expect(axios.post).not.toHaveBeenCalledWith('/api/editor/');
  });
});

describe('apiCmdTest computed locally', () => {
  function storeWithText() {
    const store = signedInStore();
    store.gainstrackText = TEXT;
    return store;
  }

  test('reports the added command and its balance changes without calling the server', async () => {
    const store = storeWithText();
    vi.mocked(axios.post).mockClear();

    const res = await apiCmdTest(store, { str: '2019-01-03 fund Assets:Bank 500 USD' });

    expect(axios.post).not.toHaveBeenCalledWith('/api/post/test', expect.anything());
    expect(res.errors).toEqual([]);
    expect(res.added).toHaveLength(1);
    expect(res.added[0]).toMatchObject({ commandType: 'fund', accountId: 'Assets:Bank' });
    // Funding moves value from Equity into Assets; only the Assets leg counts toward net worth.
    expect(res.accountChanges.map(c => c.accountId)).toContain('Assets:Bank');
    expect(res.networthChange).toBeCloseTo(500, 6);
  });

  test('a syntactically invalid command reports errors and no changes', async () => {
    const store = storeWithText();
    const res = await apiCmdTest(store, { str: 'this is not gainstrack !!' });
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.added).toEqual([]);
    expect(res.accountChanges).toEqual([]);
  });

  test('a command that parses but breaks generation reports errors, not a crash', async () => {
    const store = storeWithText();
    const res = await apiCmdTest(store, { str: '2019-01-03 tfr Assets:Bank Assets:Nope 5 USD' });
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.added).toEqual([]);
  });

  test('is always local — never posts to /api/post/test, even with no source loaded', async () => {
    const store = signedInStore();
    store.gainstrackText = '';
    vi.mocked(axios.post).mockClear();

    const res = await apiCmdTest(store, { str: '2019-01-03 fund Assets:Bank 500 USD' });
    expect(axios.post).not.toHaveBeenCalledWith('/api/post/test', expect.anything());
    // Against an empty ledger the account does not exist, so this is an error, not a crash.
    expect(res.errors.length).toBeGreaterThan(0);
  });
});

describe('anonymous users are client-side only', () => {
  // Firebase anonymous sign-in yields a real uid and a real token, so "is a user present" is
  // not a safe test for whether we may persist. `canPersist` excludes them explicitly.
  const anonUser = { uid: 'anon-uid', isAnonymous: true } as never;

  test('canPersist is false for an anonymous Firebase user', () => {
    const store = useAppStore();
    store.user = anonUser;
    expect(store.canPersist).toBe(false);
    expect(store.ledgerUid).toBeUndefined();
  });

  test('canPersist is true for a properly signed-in user', () => {
    const store = useAppStore();
    store.user = { uid: 'uid-1', isAnonymous: false } as never;
    expect(store.canPersist).toBe(true);
    expect(store.ledgerUid).toBe('uid-1');
  });

  test('an anonymous user cannot save, add, or upsert', async () => {
    const store = useAppStore();
    store.user = anonUser;
    const appendSpy = vi.spyOn(append, 'appendDelta');

    await expect(store.saveSource(TEXT)).rejects.toThrow(/do not persist/);
    await expect(store.addCommand('2019-01-03 fund Assets:Bank 500 USD')).rejects.toThrow(/do not persist/);
    await expect(store.upsertAssetCommand('1900-01-01 commodity VWRD')).rejects.toThrow(/do not persist/);
    expect(appendSpy).not.toHaveBeenCalled();
  });

  test('an anonymous user loads empty local state and never reads a ledger', async () => {
    const store = useAppStore();
    store.user = anonUser;
    const read = vi.spyOn(firestoreLedger, 'loadLedgerText');

    await store.loadAllState();
    expect(read).not.toHaveBeenCalled();
    expect(store.allState.txs).toEqual([]);
  });
});
