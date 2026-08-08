// Replay of the CQRS event stream that backs a user's ledger, so the browser can reconstruct
// the gainstrack source text without the Scala server.
//
// See docs/firestore-persistence.md §2. The semantics below mirror
// core/.../lifecycle/GainstrackEntity.scala and are deliberately bug-compatible with it —
// this is a read path, so agreeing with the writer matters more than being tidy.

/** One committed event document from `users/{ledgerId}/records`. */
export interface LedgerRecord {
  streamId: string;
  streamRevision: number;
  /** JSON string (NOT a nested map) of a GainstrackEntityDelta. */
  event: string;
}

/** A command is a list of lines: the command line plus any indented metadata lines. */
export type CommandBlock = string[];

interface GainstrackEntityDelta {
  id?: string;
  adds?: CommandBlock[];
  removes?: CommandBlock[];
}

export interface ReplayDiagnostics {
  /** Revisions that were skipped because they did not match the running count (see below). */
  discardedRevisions: number[];
  /** Records whose streamId disagreed with the majority — a sign of cross-stream contamination. */
  foreignStreamIds: string[];
  /** `removes` entries that matched nothing. Tolerated by the server; surfaced here. */
  noOpRemoves: number;
  /** Events that could not be JSON-parsed. */
  unparseableEvents: number;
  revisionCount: number;
}

export interface ReplayResult {
  commands: CommandBlock[];
  diagnostics: ReplayDiagnostics;
}

const key = (cmd: CommandBlock): string => JSON.stringify(cmd);

/**
 * Rebuild `cmdStrs` from the event stream.
 *
 * Ordering is by `streamRevision`, which is the only order key — Firestore doc ids are random
 * auto-ids and carry no ordering.
 *
 * `FileRepository` starts a counter at 1 and silently DISCARDS any event whose revision does not
 * match the running count, truncating history from the first gap. We reproduce that so the client
 * sees exactly what the server sees, but we report it in `diagnostics` rather than hiding it.
 */
export function replayLedger(records: LedgerRecord[]): ReplayResult {
  const diagnostics: ReplayDiagnostics = {
    discardedRevisions: [],
    foreignStreamIds: [],
    noOpRemoves: 0,
    unparseableEvents: 0,
    revisionCount: 0,
  };

  const ordered = [...records].sort((a, b) => a.streamRevision - b.streamRevision);

  // The dominant streamId is the stream's own; anything else is contamination worth reporting.
  const counts = new Map<string, number>();
  for (const r of ordered) counts.set(r.streamId, (counts.get(r.streamId) ?? 0) + 1);
  let dominant = '';
  let best = -1;
  for (const [id, n] of counts) if (n > best) { dominant = id; best = n; }

  let state: CommandBlock[] = [];
  let expected = 1;

  for (const rec of ordered) {
    if (rec.streamId !== dominant) diagnostics.foreignStreamIds.push(rec.streamId);

    if (rec.streamRevision !== expected) {
      diagnostics.discardedRevisions.push(rec.streamRevision);
      continue;
    }
    expected += 1;
    diagnostics.revisionCount += 1;

    let delta: GainstrackEntityDelta;
    try {
      delta = JSON.parse(rec.event);
    } catch {
      diagnostics.unparseableEvents += 1;
      continue;
    }

    // Removes first, then adds — not interleaved, not adds-first.
    for (const rem of delta.removes ?? []) {
      const k = key(rem);
      const before = state.length;
      // `filterNot(_ == cmd)` drops EVERY equal entry, not just the first.
      state = state.filter(c => key(c) !== k);
      if (state.length === before) diagnostics.noOpRemoves += 1;
    }
    for (const add of delta.adds ?? []) state.push(add);
  }

  return { commands: state, diagnostics };
}

/**
 * The `.gainstrack` file is just the command blocks flattened. Order is INSERTION order, not date
 * order — do not sort it if you want fidelity with what the server would serve.
 */
export function toGainstrackText(commands: CommandBlock[]): string {
  return commands.flat().join('\n') + '\n';
}
