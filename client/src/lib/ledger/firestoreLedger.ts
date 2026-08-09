// Direct Firestore access to a user's ledger event stream, replacing /api/allState.
//
// Layout:
//   users/{firebaseUid}/records/{recordId}
//
// The document id IS the Firebase uid, so there is nothing to derive and nothing to look up:
// the browser knows its own path, and security rules authorise straight from it without a
// billable `get()`. The parent `users/{uid}` document is not required to exist — reading and
// writing a subcollection by path works regardless.

import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { myFirestore } from 'src/lib/assetdb/myfirebase';
import { LedgerRecord, ReplayResult, replayLedger, toGainstrackText } from 'src/lib/ledger/replay';

export interface LedgerSource {
  text: string;
  ledgerId: string;
  replay: ReplayResult;
}

/** Raw committed events for a user, ordered by revision. Empty for a ledger with no history. */
export async function fetchLedgerRecords(firebaseUid: string): Promise<LedgerRecord[]> {
  const records = collection(myFirestore(), 'users', firebaseUid, 'records');
  // Ordering server-side keeps the read cheap; replayLedger re-sorts defensively anyway.
  const snap = await getDocs(query(records, orderBy('streamRevision')));
  return snap.docs.map(d => d.data() as LedgerRecord);
}

/**
 * Fetch and replay a user's ledger into gainstrack source text.
 *
 * A user with no history is not an error — it replays to an empty ledger, which generates a
 * valid empty AllState.
 */
export async function loadLedgerText(firebaseUid: string): Promise<LedgerSource> {
  const replay = replayLedger(await fetchLedgerRecords(firebaseUid));
  return { text: toGainstrackText(replay.commands), ledgerId: firebaseUid, replay };
}
