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
import { BASE_GAINSTRACK } from 'src/lib/ledger/baseLedger';

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
 * A user with no history is not an error: they get the starter ledger, mirroring the server's
 * `bgFromFile.getOrElse(bgDefault)`. Those accounts are load-bearing — `fund` defaults to
 * Equity:Opening and earn/spend resolve via fundingAccount — so an empty ledger would reject
 * the user's very first command.
 */
export async function loadLedgerText(firebaseUid: string): Promise<LedgerSource> {
  const replay = replayLedger(await fetchLedgerRecords(firebaseUid));
  const text = replay.commands.length === 0 ? BASE_GAINSTRACK : toGainstrackText(replay.commands);
  return { text, ledgerId: firebaseUid, replay };
}
