// @vitest-environment node
//
// Behavioural verification of firestore.rules against the Firestore emulator.
//
// Compilation only proves the rules parse. These tests prove they DO what the comments claim —
// which matters because with useDirectLedger on, the rules are the only thing standing between
// one user's portfolio and another's, and the only thing enforcing append-only.
//
// Run:  pnpm run test:rules      (wraps vitest in `firebase emulators:exec`)
// Skips automatically when no emulator is running, so `pnpm run test:unit` stays offline.

import * as fs from 'fs';
import * as path from 'path';
import {
  assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, updateDoc, collection, getDocs } from 'firebase/firestore';

const RULES = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'firestore.rules'), 'utf8');
const HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '';
const [EMU_HOST, EMU_PORT] = HOST ? HOST.split(':') : ['', ''];

const ALICE = 'alice-uid';
const BOB = 'bob-uid';

const validRecord = (uid: string, revision = 1) => ({
  streamId: uid,
  streamRevision: revision,
  event: JSON.stringify({ jsonClass: 'GainstrackEntityDelta', adds: [['2019-01-01 open Assets:Bank USD']] }),
});

const suite = HOST ? describe : describe.skip;

suite('firestore.rules', () => {
  let env: RulesTestEnvironment;

  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: 'gainstrack-rules-test',
      firestore: { rules: RULES, host: EMU_HOST, port: Number(EMU_PORT) },
    });
  });

  afterAll(async () => { await env?.cleanup(); });
  beforeEach(async () => { await env.clearFirestore(); });

  const alice = () => env.authenticatedContext(ALICE).firestore();
  const bob = () => env.authenticatedContext(BOB).firestore();
  const anon = () => env.unauthenticatedContext().firestore();

  /** Seed a document bypassing rules, the way the Scala server or a trigger would. */
  async function seed(fn: (db: ReturnType<typeof alice>) => Promise<unknown>) {
    await env.withSecurityRulesDisabled(async ctx => { await fn(ctx.firestore() as never); });
  }

  describe('ledger reads', () => {
    beforeEach(() => seed(db => setDoc(doc(db, 'users', ALICE, 'records', 'rev-1'), validRecord(ALICE))));

    test('the owner can read their own records', async () => {
      await assertSucceeds(getDoc(doc(alice(), 'users', ALICE, 'records', 'rev-1')));
    });

    test('another signed-in user cannot read them', async () => {
      await assertFails(getDoc(doc(bob(), 'users', ALICE, 'records', 'rev-1')));
    });

    test('an anonymous visitor cannot read them', async () => {
      await assertFails(getDoc(doc(anon(), 'users', ALICE, 'records', 'rev-1')));
    });

    test('another user cannot list the collection either', async () => {
      await assertFails(getDocs(collection(bob(), 'users', ALICE, 'records')));
    });
  });

  describe('ledger appends', () => {
    test('the owner can append a valid record', async () => {
      await assertSucceeds(setDoc(doc(alice(), 'users', ALICE, 'records', 'rev-1'), validRecord(ALICE)));
    });

    test('another user cannot append to someone else’s ledger', async () => {
      await assertFails(setDoc(doc(bob(), 'users', ALICE, 'records', 'rev-1'), validRecord(ALICE)));
    });

    test('an anonymous visitor cannot append', async () => {
      await assertFails(setDoc(doc(anon(), 'users', ALICE, 'records', 'rev-1'), validRecord(ALICE)));
    });

    test('streamId must match the ledger path', async () => {
      await assertFails(setDoc(doc(alice(), 'users', ALICE, 'records', 'rev-1'),
        { ...validRecord(ALICE), streamId: BOB }));
    });

    test('extra fields are rejected', async () => {
      await assertFails(setDoc(doc(alice(), 'users', ALICE, 'records', 'rev-1'),
        { ...validRecord(ALICE), sneaky: true }));
    });

    test('missing fields are rejected', async () => {
      await assertFails(setDoc(doc(alice(), 'users', ALICE, 'records', 'rev-1'),
        { streamId: ALICE, streamRevision: 1 }));
    });

    test('a non-integer or non-positive revision is rejected', async () => {
      for (const revision of [0, -1, 1.5, '1']) {
        await assertFails(setDoc(doc(alice(), 'users', ALICE, 'records', `rev-${revision}`),
          { ...validRecord(ALICE), streamRevision: revision }));
      }
    });

    test('a non-string or empty event is rejected', async () => {
      for (const event of [{ adds: [] }, '', 42]) {
        await assertFails(setDoc(doc(alice(), 'users', ALICE, 'records', 'rev-1'),
          { ...validRecord(ALICE), event }));
      }
    });
  });

  describe('ledger is append-only', () => {
    beforeEach(() => seed(db => setDoc(doc(db, 'users', ALICE, 'records', 'rev-1'), validRecord(ALICE))));

    test('the owner cannot overwrite an existing record', async () => {
      await assertFails(setDoc(doc(alice(), 'users', ALICE, 'records', 'rev-1'), validRecord(ALICE, 2)));
    });

    test('the owner cannot update a record', async () => {
      await assertFails(updateDoc(doc(alice(), 'users', ALICE, 'records', 'rev-1'), { event: '{}' }));
    });

    test('the owner cannot delete a record', async () => {
      await assertFails(deleteDoc(doc(alice(), 'users', ALICE, 'records', 'rev-1')));
    });
  });

  describe('legacy anon streams are closed off', () => {
    test('no signed-in user can read or write them', async () => {
      await assertFails(getDoc(doc(alice(), 'anons', 'some-uuid', 'records', 'r1')));
      await assertFails(setDoc(doc(alice(), 'anons', 'some-uuid', 'records', 'r1'), validRecord('some-uuid')));
    });
  });

  describe('asset database', () => {
    beforeEach(() => seed(async db => {
      await setDoc(doc(db, 'quoteSources', '2823.HK'), { ticker: '2823.HK' });
      await setDoc(doc(db, 'assets', 'legacy'), { ticker: 'X' });
      await setDoc(doc(db, 'userRoles', ALICE), { displayName: 'Alice', roles: { admin: true } });
      await setDoc(doc(db, 'userRoles', BOB), { displayName: 'Bob' });
    }));

    test('quoteSources is world-readable', async () => {
      await assertSucceeds(getDoc(doc(anon(), 'quoteSources', '2823.HK')));
    });

    test('an admin may write quoteSources; a plain user may not', async () => {
      await assertSucceeds(setDoc(doc(alice(), 'quoteSources', '2823.HK'), { ticker: '2823.HK', name: 'x' }));
      await assertFails(setDoc(doc(bob(), 'quoteSources', '2823.HK'), { ticker: '2823.HK', name: 'y' }));
    });

    test('a role-less user evaluates cleanly to false rather than erroring', async () => {
      // Bob's userRoles doc has no `roles` map at all — the defensive .get() path.
      await assertFails(setDoc(doc(bob(), 'assets', 'legacy'), { ticker: 'Z' }));
    });

    test('assets is readable but no longer writable by any signed-in user', async () => {
      await assertSucceeds(getDoc(doc(anon(), 'assets', 'legacy')));
      await assertFails(setDoc(doc(bob(), 'assets', 'legacy'), { ticker: 'Z' }));
      await assertSucceeds(setDoc(doc(alice(), 'assets', 'legacy'), { ticker: 'Z' }));
    });

    test('history entries may only be created under the author’s own uid', async () => {
      await assertSucceeds(setDoc(doc(bob(), 'quoteSourceHistory', 'h1'), { uid: BOB, payload: {} }));
      await assertFails(setDoc(doc(bob(), 'quoteSourceHistory', 'h2'), { uid: ALICE, payload: {} }));
    });
  });

  describe('userRoles', () => {
    beforeEach(() => seed(db => setDoc(doc(db, 'userRoles', ALICE), { displayName: 'Alice' })));

    test('signed-in users may read; anonymous visitors may not', async () => {
      await assertSucceeds(getDoc(doc(bob(), 'userRoles', ALICE)));
      await assertFails(getDoc(doc(anon(), 'userRoles', ALICE)));
    });

    test('nobody may write directly — that is the callable’s job', async () => {
      await assertFails(setDoc(doc(alice(), 'userRoles', ALICE), { displayName: 'Hacker' }));
    });
  });
});
