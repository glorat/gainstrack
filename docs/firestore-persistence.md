# Firestore Persistence

How Gainstrack stores data in Firestore. The user-ledger part is **not** what you'd guess from
looking at the console — a user's portfolio is not a document you can read. It's an event stream
you have to replay. This doc explains that, and covers the other collections for completeness.

Project: `gainstrack` (production). `.firebaserc` sets it as the default; hosting targets `prod`
(`gainstrack-prod`) and `poc` (`gainstrack`) both live inside it. A separate `gainstrack-poc`
project exists but its service-account key in the repo root is revoked.

---

## 1. Two regimes, one database

| | User ledger | Everything else |
|---|---|---|
| Collections | `users`, `anons` | `quoteSources`, `quoteSourceHistory`, `quoteSourceErrors`, `userRoles`, `displayNames` |
| Model | Event-sourced (CQRS) | Plain documents |
| Written by | Scala server only | Browser (Firebase SDK) + Cloud Functions |
| Read by | Scala server only | Browser + Cloud Functions + Scala |
| Doc ID | Derived UUID v3 — see §3 | Natural key or auto-ID |

The Vue client **never touches the user ledger**. It reaches Firestore directly only for the asset
DB (`src/lib/assetdb/`). Portfolio data reaches the browser as `AllState` JSON over `/api/allState`,
or is computed locally from gainstrack text.

---

## 2. The user ledger (the non-obvious bit)

### Layout

```
users/{derivedUuid}/records/{autoId}     # signed-in users
anons/{derivedUuid}/records/{autoId}     # anonymous cookie sessions
```

Configured in [`FirebaseFactory.scala:14-15`](../core/src/main/scala/com/gainstrack/lifecycle/FirebaseFactory.scala#L14-L15):

```scala
val firestoreConfig = FirestoreLedgerConfig("https://gainstrack.firebaseio.com", "users", "records")
val anonFirestoreConfig = firestoreConfig.copy(mainCollectionName = "anons")
```

> **The parent documents do not exist.** `users/{uuid}` is a *phantom* — only its `records`
> subcollection is real. This means `db.collection('users').get()` returns **zero results** and the
> Firebase console shows the IDs greyed out. You must use `listDocuments()`, which returns refs for
> missing parents. Every tool and script that enumerates users has to account for this.

### Record shape

Each doc in `records` is one committed event:

```json
{
  "streamId": "fec320db-f125-35f3-a0d2-e66ca7e4ce95",
  "streamRevision": 228,
  "event": "{\"jsonClass\":\"GainstrackEntityDelta\",\"adds\":[[\"2021-02-03 bal Assets:Bank:HSBCHK 143881.08 HKD Expenses:General\"]]}"
}
```

- `event` is a **JSON string**, not a nested map. Parse it, don't index into it.
- `jsonClass` comes from json4s `ShortTypeHints` ([`FirebaseFactory.scala:16`](../core/src/main/scala/com/gainstrack/lifecycle/FirebaseFactory.scala#L16)).
- Doc IDs are random auto-IDs and carry **no ordering**. `streamRevision` is the only order key.
- `streamRevision` is **1-based** and contiguous. `FileRepository` starts its counter at `1` and
  *silently discards* any event whose revision doesn't match the running count — a gap doesn't
  error, it truncates the user's history from that point on.

`FirestoreLedger` itself lives in the external `net.glorat:dlstore:0.4.0` dependency (build.sbt
will use a sibling `dlstore/` checkout instead if one exists), so it isn't readable in this repo.
The in-repo [`FileRepository.scala`](../core/src/main/scala/com/gainstrack/lifecycle/FileRepository.scala)
is the reference implementation of the same contract — read it to understand ledger behaviour, and
note its `MyCommittedEvent(event, streamId, streamRevision, repoTimestamp)` envelope. The revision
validation described above is the documented behaviour of *that* class; the field layout and
1-based contiguous revisions were confirmed empirically against production. The file backend
persists `repoTimestamp`, but the Firestore records carry only the three fields above, so **do not
rely on a timestamp being present**.

### The event

```scala
case class GainstrackEntityDelta(
  id:      Option[GUID],
  adds:    Option[Seq[Seq[String]]],
  removes: Option[Seq[Seq[String]]]
)
```

State is `cmdStrs: Seq[Seq[String]]` — a list of commands, each command being a list of lines (the
command line plus its indented sub-lines like `tags:` or `multiAsset:true`). The final `.gainstrack`
file is just `cmdStrs.flatten.mkString("\n")`.

### Replay semantics — get these right

From [`GainstrackEntity.scala:104-110`](../core/src/main/scala/com/gainstrack/lifecycle/GainstrackEntity.scala#L104-L110):

1. **`removes` first, then `adds`.** Not interleaved, not adds-first.
2. **`removeCommand` uses `filterNot(_ == cmd)` — it drops *every* equal entry, not just the first.**
   If a user legitimately holds two identical command blocks, one remove event deletes both.
3. **`adds` append to the end.** Order in the file is insertion order, *not* date order — so the
   output is not chronologically sorted, and shouldn't be re-sorted if you want fidelity.
4. Command equality is structural over the whole `Seq[String]`, so sub-lines are part of the identity.
5. `id` is set only by the first event; ignore it for text reconstruction.
6. A `remove` matching nothing is **tolerated silently** — the `require` in `removeCommand` is
   commented out ([`GainstrackEntity.scala:92-94`](../core/src/main/scala/com/gainstrack/lifecycle/GainstrackEntity.scala#L92-L94)).
   Real streams contain such no-ops.

### Reconstructing a user's file

```js
const snap = await db.collection('users').doc(uid).collection('records').get();
const recs = snap.docs.map(d => d.data()).sort((a, b) => a.streamRevision - b.streamRevision);

const key = cmd => JSON.stringify(cmd);
let state = [];
for (const r of recs) {
  const e = JSON.parse(r.event);
  for (const rem of e.removes ?? []) {
    const k = key(rem);
    state = state.filter(c => key(c) !== k);   // drops ALL equal
  }
  for (const add of e.adds ?? []) state.push(add);
}
const text = state.flat().join('\n') + '\n';
```

Validate the result by feeding it to the TypeScript parser — `GainstrackParser.parseString(text)`
should yield zero `parserErrors`, and `generateAllStateSafe(text)` an empty `errors` array. The
parsed command count should equal `state.length` exactly.

Before trusting a replay, check: revisions contiguous from 1, no duplicates, and no record whose
`streamId` differs from the parent doc ID.

---

## 3. Identity — two incompatible uid conventions

This is the sharpest edge in the codebase, and the direct cause of the auth0 → Firebase Auth
migration losing track of user data.

### The ledger uses a *derived* UUID

[`SimpleAuthStrategy.scala:67-72`](../web/src/main/scala/com/gainstrack/web/SimpleAuthStrategy.scala#L67-L72):

```scala
object GUser {
  def apply(username: String): GUser =
    GUser(username, java.util.UUID.nameUUIDFromBytes(username.getBytes("UTF-8")))
}
```

`nameUUIDFromBytes` is an **MD5-based UUID v3** — a pure deterministic hash of the username string.
So the Firestore path is a function of the login identifier:

| Strategy | `username` is… | Ledger doc ID |
|---|---|---|
| `OAuthStrategy` | the Firebase/auth0 uid from the verified bearer token | `md5uuid(thatUid)` |
| `SimpleAuthStrategy` | the lowercased local username | `md5uuid("glorat")` |
| `AnonAuthStrategy` | `"ANONYMOUS." + anonid` cookie | `md5uuid("ANONYMOUS.<uuid>")` |

**Consequence:** the ledger path depends on the *identity provider's* subject string. When auth0 was
swapped for Firebase Auth, users got new subject ids, so `md5uuid(newSubject)` pointed at a fresh
empty stream. The old data was never deleted — it's still sitting under the old derived UUID. You
recover it by replaying the old stream and re-sourcing it under the new one; there is no rename.

You can spot legacy streams by the version nibble: all the auth0-era IDs are v3 (`...-3xxx-...`,
e.g. `fec320db-f125-`**`3`**`5f3-a0d2-e66ca7e4ce95`).

### The asset DB uses the *raw* Firebase uid

[`assetDb.ts:102`](../client/src/lib/assetdb/assetDb.ts#L102) writes `uid: myAuth().currentUser?.uid`
— the raw Firebase uid, unhashed. `userRoles` and `displayNames` are likewise keyed on whatever uid
the writer supplied.

So **the same person can appear under two different identifiers**, and both appear in Firestore
today: existing `userRoles` / `quoteSourceHistory.uid` values are auth0-era derived UUIDs, while
anything written post-migration is a raw Firebase uid. Never assume a `uid` field in one collection
joins against a doc ID in another without checking which convention produced it.

---

## 4. Other collections

### `quoteSources` — the asset database

Doc ID is a natural key: `` `${ticker}.${marketRegion}` `` (e.g. `2823.HK`). Holds ticker, name,
currency, exchange, an `asset` metadata map, a `providers` map, a deprecated `sources` array, and
`lastUpdate: {timestamp, uid, revision, history}`.

**Writes never go direct.** The client appends to `quoteSourceHistory`; a Firestore `onCreate`
trigger promotes it. From [`writes.ts`](../client/functions/src/writes.ts):

```
client → addDoc(quoteSourceHistory, {payload, action, uid, createTime})
       → onDocumentCreated('quoteSourceHistory/{historyId}')
       → compare payload.lastUpdate.revision against live doc
         ├─ match (or doc absent) → set quoteSources/{id}, revision += 1
         └─ mismatch → copy to quoteSourceErrors, DELETE the history doc
```

Two things to note: this is **optimistic concurrency** via `revision`, so a stale client write is
rejected rather than merged; and on failure the history doc is **deleted**, with the payload
preserved only in `quoteSourceErrors`. `quoteSourceHistory` is therefore an audit log of *successful*
writes only.

### `userRoles` / `displayNames`

A bidirectional pair maintained transactionally by the `setDisplayName` callable
([`index.ts:52-90`](../client/functions/src/index.ts#L52-L90)):

- `userRoles/{uid}` → `{displayName, roles?: {admin: true}}`
- `displayNames/{displayName}` → `{uid}` (reverse index enforcing uniqueness)

Display names are **write-once** — the function rejects any change once `displayName` is set. Both
docs are written in one `runTransaction`, so they shouldn't drift.

### `assets`, `test`

`assets` holds a single document with a different schema from `quoteSources`
(`sedol`/`isin`/`refs`/`priceCcy`/…) and no code in this repo reads it — it looks like an
early prototype superseded by `quoteSources`. `test` holds two junk docs. Treat both as dead;
confirm before removing.

---

## 5. Operational notes

**Backend toggle.** `gainstrack.useFirestore` in
[`application.conf`](../web/src/main/resources/application.conf) (default `true`) switches the
repository between `FirestoreLedger` and a `FileRepository` under `db/userdata`, where each user is
one file of newline-delimited JSON committed events. Same replay semantics, so local dev exercises
the identical code path. `MigrateFileToFirestore` copies file → Firestore, refusing to overwrite a
non-empty target stream.

**No rules in this repo.** There is no `firestore.rules` or `firestore.indexes.json` checked in;
`client/firebase.json` configures hosting only. Security rules are managed in the Firebase console
and are not version-controlled — worth knowing before assuming the repo describes access control.

**Admin scripts.** `firebase-admin` v13 is available at `client/functions/node_modules/`. Point
`GOOGLE_APPLICATION_CREDENTIALS` at the `gainstrack` service-account JSON (gitignored via
`gainstrack*.json`). Note the `gainstrack-poc` key **is** committed to git history despite that
rule, because it was tracked before the rule existed; it currently fails auth.

**Costs.** Enumerating users is `listDocuments()` on `users`/`anons` plus a `count()` aggregate per
stream. Prefer `count()` over fetching docs — production has ~26 user streams and ~197 anon streams,
so a naive per-doc walk is slow enough to time out a 2-minute shell.
