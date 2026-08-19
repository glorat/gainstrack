/**
 * Smoke tests for the Cloud Functions package.
 *
 * This package has no other tests, and `pnpm run build` only type-checks — it never
 * loads a module or runs a handler. So a dependency bump could keep tsc happy and
 * still break the deployed function on cold start. These tests close that gap:
 * they import the real module graph and drive each handler against a fake Firestore.
 *
 * Deliberately shallow. The point is "does it still load and respond", not coverage.
 */
import {describe, it, expect, vi, beforeEach} from 'vitest';

// admin.initializeApp() runs at import time in index.ts and would demand real
// credentials, so firebase-admin is stubbed before the module graph is pulled in.
const firestoreStub = vi.fn(() => ({collection: vi.fn(), runTransaction: vi.fn()}));
vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  firestore: firestoreStub,
}));

/** Minimal stand-in for an express Response — records what the handler sent. */
function fakeRes() {
  const res = {
    body: undefined as unknown,
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

/** Firestore double backed by a plain object of {collection: {id: data}}. */
function fakeDb(seed: Record<string, Record<string, any>> = {}) {
  const data: Record<string, Record<string, any>> = JSON.parse(JSON.stringify(seed));
  const added: Record<string, any[]> = {};

  const makeQuery = (name: string) => {
    const rows = () => Object.entries(data[name] ?? {});
    const q: any = {
      // where/orderBy are recorded, not evaluated: these tests assert the
      // handler builds and runs a query, not that Firestore filters correctly.
      calls: [] as any[],
      where(...args: any[]) { q.calls.push({where: args}); return q; },
      orderBy(...args: any[]) { q.calls.push({orderBy: args}); return q; },
      get: async () => ({docs: rows().map(([id, d]) => ({id, data: () => ({...d})}))}),
    };
    return q;
  };

  return {
    added,
    raw: data,
    collection(name: string) {
      const q = makeQuery(name);
      return Object.assign(q, {
        doc: (id: string) => ({
          get: async () => ({
            exists: Boolean(data[name]?.[id]),
            data: () => data[name]?.[id],
          }),
          set: async (value: any) => {
            data[name] = data[name] ?? {};
            data[name][id] = value;
          },
        }),
        add: async (value: any) => {
          added[name] = added[name] ?? [];
          added[name].push(value);
        },
      });
    },
  } as any;
}

describe('module graph', () => {
  it('loads index.ts and exports every deployed function', async () => {
    // Exercises firebase-functions' onRequest/onCall/onDocumentCreated wrappers
    // against the express types this package declares — the interop that broke
    // when firebase-functions moved to express 5.
    const mod = await import('../src/index');

    const expected = [
      'getAllQuoteSources',
      'fastGetAllQuoteSources',
      'quoteSources',
      'fastQuoteSources',
      'quoteSourceTableQuery',
      'fastQuoteSourceTableQuery',
      'upsertQuoteSource',
      'setDisplayName',
    ];
    for (const name of expected) {
      expect(mod, `missing export ${name}`).toHaveProperty(name);
    }
  });

  it('loads the assetdb schema module its handlers depend on', async () => {
    // schema.ts sits on the runtime require path (index -> queries -> assetdb/schema).
    // If one of its imports stops resolving, the function dies on cold start.
    const schema = await import('../src/assetdb/schema');
    expect(typeof schema.findProperty).toBe('function');
    expect(typeof schema.searchObjToQuery).toBe('function');
  });
});

describe('quoteSourcesHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the rows of the quoteSources collection, with ids attached', async () => {
    const {quoteSourcesHandler} = await import('../src/queries');
    const db = fakeDb({quoteSources: {abc: {name: 'Vanguard'}}});
    const res = fakeRes();

    // req.body.query is the array of clauses, as introduced in f663827 and as the
    // handler's own default literal is shaped.
    await quoteSourcesHandler(db)(
      {body: {query: []}} as any,
      res as any
    );

    expect(res.body).toEqual({rows: [{id: 'abc', name: 'Vanguard'}]});
  });

  it('applies its default ETF query when the request carries none', async () => {
    const {quoteSourcesHandler} = await import('../src/queries');
    const db = fakeDb({quoteSources: {abc: {name: 'Vanguard'}}});
    const res = fakeRes();

    await quoteSourcesHandler(db)({body: {}} as any, res as any);

    expect(res.body).toEqual({rows: [{id: 'abc', name: 'Vanguard'}]});
  });

  it('passes the default ETF clause through to the query', async () => {
    const {quoteSourcesHandler} = await import('../src/queries');
    const db = fakeDb({quoteSources: {}});
    const res = fakeRes();
    const seen: any[] = [];
    const orig = db.collection.bind(db);
    db.collection = (name: string) => {
      const col = orig(name);
      const where = col.where.bind(col);
      col.where = (...args: any[]) => { seen.push(args); return where(...args); };
      return col;
    };

    await quoteSourcesHandler(db)({body: {}} as any, res as any);

    expect(seen).toEqual([['asset.type', '==', 'ETF']]);
  });
});

describe('applyQueries', () => {
  it('translates where and orderBy clauses onto the collection', async () => {
    const {applyQueries} = await import('../src/queries');
    const col: any = fakeDb().collection('quoteSources');

    applyQueries(col, [
      {where: ['asset.type', '==', 'ETF']},
      {orderBy: ['name', 'asc']},
    ]);

    expect(col.calls).toEqual([
      {where: ['asset.type', '==', 'ETF']},
      {orderBy: ['name', 'asc']},
    ]);
  });
});

describe('quoteSourceHistoryCreateHandler', () => {
  /** Builds the FirestoreEvent shape the trigger receives. */
  const event = (payload: any, uid = 'user-1') => ({
    params: {historyId: 'hist-1'},
    data: {
      data: () => ({payload, uid}),
      createTime: {toMillis: () => 1_700_000_000_000},
      ref: {delete: vi.fn(async () => undefined)},
    },
  } as any);

  it('writes a new quote source at revision 1', async () => {
    const {quoteSourceHistoryCreateHandler} = await import('../src/writes');
    const db = fakeDb({quoteSources: {}});

    await quoteSourceHistoryCreateHandler(db)(event({id: 'qs-1', name: 'New'}));

    expect(db.raw.quoteSources['qs-1']).toMatchObject({
      name: 'New',
      lastUpdate: {revision: 1, uid: 'user-1', history: 'hist-1'},
    });
  });

  it('increments the revision when the incoming one matches', async () => {
    const {quoteSourceHistoryCreateHandler} = await import('../src/writes');
    const db = fakeDb({
      quoteSources: {'qs-1': {id: 'qs-1', name: 'Old', lastUpdate: {revision: 3}}},
    });

    await quoteSourceHistoryCreateHandler(db)(
      event({id: 'qs-1', name: 'Newer', lastUpdate: {revision: 3}})
    );

    expect(db.raw.quoteSources['qs-1']).toMatchObject({
      name: 'Newer',
      lastUpdate: {revision: 4},
    });
  });

  it('rejects a stale revision into quoteSourceErrors and leaves the record alone', async () => {
    const {quoteSourceHistoryCreateHandler} = await import('../src/writes');
    const db = fakeDb({
      quoteSources: {'qs-1': {id: 'qs-1', name: 'Old', lastUpdate: {revision: 5}}},
    });
    // The handler logs the rejection; keep it out of the test output.
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await quoteSourceHistoryCreateHandler(db)(
      event({id: 'qs-1', name: 'Conflicting', lastUpdate: {revision: 2}})
    );

    expect(db.raw.quoteSources['qs-1'].name).toBe('Old');
    expect(db.added.quoteSourceErrors).toHaveLength(1);
    expect(db.added.quoteSourceErrors[0].error).toMatch(/Revision mismatch/);
    err.mockRestore();
  });
});
