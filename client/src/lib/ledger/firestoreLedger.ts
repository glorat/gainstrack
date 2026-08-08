// Direct Firestore read of a user's ledger event stream, bypassing /api/allState.
//
// Layout (docs/firestore-persistence.md §2):
//   users/{ledgerId}/records/{autoId}      signed-in users
//   anons/{ledgerId}/records/{autoId}      anonymous cookie sessions
//
// The parent `users/{ledgerId}` document is a PHANTOM — it does not exist, only its `records`
// subcollection does. Reading the subcollection by path works regardless; only enumerating
// parents needs `listDocuments()`, which the browser SDK does not expose anyway.

import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { myFirestore } from 'src/lib/assetdb/myfirebase';
import { ledgerIdForUid } from 'src/lib/ledger/nameUuid';
import { LedgerRecord, ReplayResult, replayLedger, toGainstrackText } from 'src/lib/ledger/replay';

export type LedgerScope = 'users' | 'anons';

export interface LedgerSource {
  text: string;
  ledgerId: string;
  replay: ReplayResult;
}

/** Raw committed events for a ledger id, ordered by revision. */
export async function fetchLedgerRecords(
  ledgerId: string,
  scope: LedgerScope = 'users',
): Promise<LedgerRecord[]> {
  const records = collection(myFirestore(), scope, ledgerId, 'records');
  // Ordering server-side keeps the read cheap; replayLedger re-sorts defensively anyway.
  const snap = await getDocs(query(records, orderBy('streamRevision')));
  return snap.docs.map(d => d.data() as LedgerRecord);
}

/**
 * Fetch + replay a signed-in user's ledger into gainstrack source text.
 *
 * `firebaseUid` is the RAW Firebase uid (`auth.currentUser.uid`); the ledger path is the derived
 * UUID of it. Note the asset DB keys on the raw uid instead, so the two are not interchangeable.
 */
export async function loadLedgerText(
  firebaseUid: string,
  scope: LedgerScope = 'users',
): Promise<LedgerSource> {
  const ledgerId = ledgerIdForUid(firebaseUid);
  const records = await fetchLedgerRecords(ledgerId, scope);
  const replay = replayLedger(records);
  return { text: toGainstrackText(replay.commands), ledgerId, replay };
}
