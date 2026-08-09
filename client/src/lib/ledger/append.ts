// Appending to a user's ledger event stream from the browser.
//
// The stream is the CQRS log described in docs/firestore-persistence.md §2. Writing to it has one
// hard invariant: `streamRevision` is 1-based and CONTIGUOUS. `FileRepository` silently discards
// any event whose revision doesn't match its running count, so a duplicate or skipped revision
// does not error — it truncates the user's history from that point on. Two browser tabs saving at
// once is enough to cause that, so every append runs in a Firestore transaction that re-reads the
// head revision inside the transaction and aborts on conflict.

import {
  collection, doc, getDocs, limit, orderBy, query, runTransaction,
} from 'firebase/firestore';
import { myFirestore } from 'src/lib/assetdb/myfirebase';
import { CommandBlock, LedgerRecord } from 'src/lib/ledger/replay';

/** Mirrors Scala `GainstrackEntityDelta`. `jsonClass` is required by json4s ShortTypeHints. */
export interface GainstrackEntityDelta {
  jsonClass: 'GainstrackEntityDelta';
  adds?: CommandBlock[];
  removes?: CommandBlock[];
}

export class LedgerConflictError extends Error {}

export function makeDelta(adds: CommandBlock[], removes: CommandBlock[] = []): GainstrackEntityDelta {
  const delta: GainstrackEntityDelta = { jsonClass: 'GainstrackEntityDelta' };
  if (adds.length) delta.adds = adds;
  if (removes.length) delta.removes = removes;
  return delta;
}

/** Highest revision currently in the stream; 0 for an empty stream. */
export async function headRevision(ledgerId: string, scope: string = 'users'): Promise<number> {
  const records = collection(myFirestore(), scope, ledgerId, 'records');
  const snap = await getDocs(query(records, orderBy('streamRevision', 'desc'), limit(1)));
  return snap.empty ? 0 : (snap.docs[0].data() as LedgerRecord).streamRevision;
}

/**
 * Append one event, allocating the next contiguous revision.
 *
 * Firestore transactions cannot range-query, so the expected head is read first and then
 * *confirmed* inside the transaction by checking the document at the next revision does not
 * already exist. The append writes a deterministic document id (`rev-{n}`) rather than an auto-id
 * precisely so that check is possible — two racers targeting the same revision collide on the
 * same id, and the loser aborts instead of silently truncating history.
 *
 * Existing records written by Scala have random auto-ids; that is fine, ids carry no meaning and
 * ordering comes solely from `streamRevision`.
 */
export async function appendDelta(
  ledgerId: string,
  delta: GainstrackEntityDelta,
  opts: { scope?: string; expectedHead?: number } = {},
): Promise<number> {
  const scope = opts.scope ?? 'users';
  const db = myFirestore();
  // Callers that computed a diff MUST pass the head they diffed against. Re-reading it here
  // instead would silently accept a stale diff written on top of someone else's append —
  // a lost update rather than a detected conflict.
  const expectedHead = opts.expectedHead ?? await headRevision(ledgerId, scope);
  const nextRevision = expectedHead + 1;
  const target = doc(db, scope, ledgerId, 'records', `rev-${nextRevision}`);

  await runTransaction(db, async tx => {
    const existing = await tx.get(target);
    if (existing.exists()) {
      throw new LedgerConflictError(
        `Revision ${nextRevision} already exists on ${scope}/${ledgerId} — reload before saving`,
      );
    }
    tx.set(target, {
      streamId: ledgerId,
      streamRevision: nextRevision,
      // The server stores `event` as a JSON STRING, not a nested map. Match it exactly.
      event: JSON.stringify(delta),
    });
  });

  return nextRevision;
}

const key = (cmd: CommandBlock): string => JSON.stringify(cmd);

/**
 * Diff current state against a desired set of command blocks (Scala `GainstrackEntity.source`).
 * Returns null when nothing changed, so callers can skip a pointless revision.
 */
export function diffToDelta(
  current: CommandBlock[],
  desired: CommandBlock[],
): GainstrackEntityDelta | null {
  const currentKeys = new Set(current.map(key));
  const desiredKeys = new Set(desired.map(key));
  const adds = desired.filter(c => !currentKeys.has(key(c)));
  const removes = current.filter(c => !desiredKeys.has(key(c)));
  if (!adds.length && !removes.length) return null;
  return makeDelta(adds, removes);
}
