// GPL-2.0-only — see ../LICENSE and ../README.md.
//
// The shape `dump.py` emits, as much of it as this app needs to count things and show a summary.
//
// Deliberately shallow. This is the interface between two separately licensed programs, and the
// less either side asserts about the other's internals the better; the consumer on the other side
// of the boundary has its own, fuller reader. Entries are carried through verbatim.

/** Bumped by `dump.py` whenever the document shape changes incompatibly. */
export const SUPPORTED_SCHEMA = 1;

export interface DumpDocument {
  schema: number;
  source: string;
  options: Record<string, unknown>;
  errors: DumpError[];
  entries: DumpEntry[];
}

export interface DumpError {
  message: string;
  file: string | null;
  line: number | null;
}

export interface DumpEntry {
  type: string;
  date: string;
  [field: string]: unknown;
}

export function isDumpDocument(value: unknown): value is DumpDocument {
  if (typeof value !== 'object' || value === null) return false;
  const document = value as Partial<DumpDocument>;
  return (
    typeof document.schema === 'number' &&
    Array.isArray(document.entries) &&
    Array.isArray(document.errors)
  );
}

/** Directive counts, for the summary the app shows and the report the caller may want. */
export function countByType(document: DumpDocument): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of document.entries) {
    counts[entry.type] = (counts[entry.type] ?? 0) + 1;
  }
  return counts;
}
