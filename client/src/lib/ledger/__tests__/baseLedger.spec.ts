import * as fs from 'fs';
import * as path from 'path';
import { createPinia, setActivePinia } from 'pinia';
import axios from 'axios';
import { useAppStore } from 'src/stores/app';
import { emptyAllState } from 'src/lib/assetdb/models';
import * as firestoreLedger from 'src/lib/ledger/firestoreLedger';
import * as append from 'src/lib/ledger/append';
import { BASE_GAINSTRACK, baseLedgerBlocks } from 'src/lib/ledger/baseLedger';
import { replayLedger } from 'src/lib/ledger/replay';
import { generateAllStateSafe } from 'src/lib/gen/GainstrackGenerator';

vi.mock('axios');

const SCALA_RESOURCE = path.join(
  __dirname, '..', '..', '..', '..', '..',
  'core', 'src', 'main', 'resources', 'com', 'gainstrack', 'core', 'base.gainstrack',
);

beforeEach(() => {
  setActivePinia(createPinia());
  vi.restoreAllMocks();
  vi.mocked(axios.get).mockResolvedValue({ data: {} });
  vi.mocked(axios.post).mockImplementation((url: string) =>
    Promise.resolve({ data: url === '/api/quotes/tickers' ? [] : emptyAllState }) as never);
});

describe('starter ledger', () => {
  // The server seeds this same file via GainstrackEntity.defaultBase. If it is edited on one
  // side only, new users silently get different accounts from what the backend would have given.
  test('matches the Scala resource byte-for-byte', () => {
    const scala = fs.readFileSync(SCALA_RESOURCE, 'utf8');
    expect(BASE_GAINSTRACK).toBe(scala);
  });

  test('generates a valid starting state', () => {
    const { state, errors } = generateAllStateSafe(BASE_GAINSTRACK);
    expect(errors).toEqual([]);
    expect(state).toBeDefined();
    expect(state!.baseCcy).toBe('USD');
    expect(state!.accounts.map(a => a.accountId)).toEqual(
      expect.arrayContaining(['Equity:Opening', 'Assets:Bank', 'Income:Salary', 'Expenses:General']));
  });

  test('supports the commands that depend on its accounts', () => {
    // Each of these resolves against a default the starter ledger provides: `fund` -> the
    // Equity:Opening default source, earn/spend -> the fundingAccount option.
    for (const cmd of [
      '2019-01-02 fund Assets:Bank 1000 USD',
      '2019-01-02 earn Salary 500 USD',
      // Note Expenses:General has NO fundingAccount in the starter file, so a bare
      // `spend General 20 USD` legitimately fails — the source must be named.
      '2019-01-03 spend General Assets:Bank 20 USD',
    ]) {
      const { errors } = generateAllStateSafe(`${BASE_GAINSTRACK}${cmd}\n`);
      expect(errors, `${cmd} should generate against the starter ledger`).toEqual([]);
    }
  });

  test('without it, a first command fails to generate', () => {
    // The regression this guards: an empty ledger rejects the user's very first command.
    const { errors } = generateAllStateSafe('2019-01-02 fund Assets:Bank 1000 USD\n');
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('a visitor who is not signed in', () => {
  test('gets the sample ledger to explore, not a blank page', async () => {
    // The server served `bgDefault` to logged-out visitors; losing that would land them on an
    // empty site with nothing to look at.
    const store = useAppStore();
    store.user = undefined;

    await store.loadAllState();
    expect(store.gainstrackText).toBe(BASE_GAINSTRACK);
    expect(store.allState.accounts.map(a => a.accountId)).toContain('Equity:Opening');
  });

  test('an anonymous Firebase user gets the sample too, and still cannot persist', async () => {
    const store = useAppStore();
    store.user = { uid: 'anon', isAnonymous: true } as never;

    await store.loadAllState();
    expect(store.gainstrackText).toBe(BASE_GAINSTRACK);
    expect(store.canPersist).toBe(false);
  });
});

describe('a user with no stored history', () => {
  function signedIn() {
    const store = useAppStore();
    store.user = { uid: 'new-uid', isAnonymous: false } as never;
    return store;
  }

  test('loads the starter ledger rather than an empty one', async () => {
    const store = signedIn();
    vi.spyOn(firestoreLedger, 'loadLedgerText').mockResolvedValue({
      text: BASE_GAINSTRACK, ledgerId: 'new-uid', replay: replayLedger([]),
    });

    await store.loadFromFirestore();
    expect(store.gainstrackText).toBe(BASE_GAINSTRACK);
    expect(store.allState.accounts.map(a => a.accountId)).toContain('Equity:Opening');
  });

  test('their first append persists the starter ledger along with the new command', async () => {
    const store = signedIn();
    vi.spyOn(firestoreLedger, 'fetchLedgerRecords').mockResolvedValue([]);
    vi.spyOn(firestoreLedger, 'loadLedgerText').mockResolvedValue({
      text: BASE_GAINSTRACK, ledgerId: 'new-uid', replay: replayLedger([]),
    });
    const appendSpy = vi.spyOn(append, 'appendDelta').mockResolvedValue(1);

    await store.addCommand('2019-01-02 fund Assets:Bank 1000 USD');

    const delta = appendSpy.mock.calls[0][1];
    // The starter commands have never been written, so revision 1 must carry them; otherwise
    // the next load would replay a ledger missing the accounts its commands depend on.
    expect(delta.adds).toEqual([...baseLedgerBlocks(), ['2019-01-02 fund Assets:Bank 1000 USD']]);
    expect(delta.removes).toBeUndefined();
    expect(appendSpy.mock.calls[0][2]?.expectedHead).toBe(0);
  });

  test('a ledger with history is untouched by the starter', async () => {
    const store = signedIn();
    const existing = [['2019-01-01 open Assets:Other USD']];
    const records = existing.map((b, i) => ({
      streamId: 's', streamRevision: i + 1, event: JSON.stringify({ adds: [b] }),
    }));
    vi.spyOn(firestoreLedger, 'fetchLedgerRecords').mockResolvedValue(records);
    vi.spyOn(firestoreLedger, 'loadLedgerText').mockResolvedValue({
      text: existing.flat().join('\n') + '\n', ledgerId: 'new-uid', replay: replayLedger(records),
    });
    const appendSpy = vi.spyOn(append, 'appendDelta').mockResolvedValue(2);

    await store.upsertAssetCommand('1900-01-01 commodity VWRD');
    expect(appendSpy.mock.calls[0][1].adds).toEqual([['1900-01-01 commodity VWRD']]);
  });
});
