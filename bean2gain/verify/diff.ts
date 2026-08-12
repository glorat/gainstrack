// GPL-2.0-only — see ../LICENSE and ./README.md.
//
// Structural comparison of two dump documents. Deliberately dumb: it normalizes the two things
// that *must* differ (where the ledger lives, and how long the run took — the latter isn't in the
// document at all) and then demands exact equality of everything else, down to the digits of every
// number. Numbers are strings in the schema precisely so that this comparison can be exact.

/** Paths that legitimately differ between a host filesystem and the WASM mount. */
export interface NormalizeOptions {
  /** Absolute prefixes to collapse to `<root>`; longest match wins. */
  roots: readonly string[];
}

const ROOT_TOKEN = '<root>';

/**
 * Replace every mention of either run's ledger directory with a common token.
 *
 * Applied to *every* string in the document rather than to a list of known fields, because the
 * paths turn up in three places — `source`, each entry's `location.file`, and inside loader error
 * messages — and a field-by-field list would silently miss the next one.
 */
export function normalize(value: unknown, options: NormalizeOptions): unknown {
  const roots = [...options.roots].filter(Boolean).sort((a, b) => b.length - a.length);

  const scrub = (text: string): string => {
    let out = text;
    for (const root of roots) out = out.split(root).join(ROOT_TOKEN);
    // The WASM side is POSIX; a Windows host would otherwise differ on separators alone.
    return out.split('\\').join('/');
  };

  const walk = (node: unknown): unknown => {
    if (typeof node === 'string') return scrub(node);
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(node)) out[key] = walk(child);
      return out;
    }
    return node;
  };

  return walk(value);
}

export interface Difference {
  path: string;
  kind: 'value' | 'type' | 'missing' | 'extra' | 'length';
  left: unknown;
  right: unknown;
}

/**
 * Every place the two documents disagree, in document order.
 *
 * Not short-circuiting: on a real divergence the useful question is "how much of the ledger is
 * affected and is it one systematic thing", which needs the whole list.
 */
export function diff(left: unknown, right: unknown, path = ''): Difference[] {
  const found: Difference[] = [];
  compare(left, right, path, found);
  return found;
}

function compare(left: unknown, right: unknown, path: string, found: Difference[]): void {
  if (Object.is(left, right)) return;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      found.push({ path, kind: 'type', left: describe(left), right: describe(right) });
      return;
    }
    if (left.length !== right.length) {
      found.push({ path, kind: 'length', left: left.length, right: right.length });
    }
    for (let i = 0; i < Math.min(left.length, right.length); i++) {
      compare(left[i], right[i], `${path}[${i}]`, found);
    }
    return;
  }

  if (isObject(left) || isObject(right)) {
    if (!isObject(left) || !isObject(right)) {
      found.push({ path, kind: 'type', left: describe(left), right: describe(right) });
      return;
    }
    for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
      const at = path ? `${path}.${key}` : key;
      if (!(key in left)) {
        found.push({ path: at, kind: 'missing', left: undefined, right: right[key] });
      } else if (!(key in right)) {
        found.push({ path: at, kind: 'extra', left: left[key], right: undefined });
      } else {
        compare(left[key], right[key], at, found);
      }
    }
    return;
  }

  found.push({ path, kind: 'value', left, right });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `array(${value.length})`;
  return typeof value;
}

export function formatDifference(difference: Difference, labels: [string, string]): string {
  const at = difference.path || '<document>';
  switch (difference.kind) {
    case 'missing':
      return `${at}: absent in ${labels[0]}, ${labels[1]} has ${short(difference.right)}`;
    case 'extra':
      return `${at}: ${labels[0]} has ${short(difference.left)}, absent in ${labels[1]}`;
    case 'length':
      return `${at}: ${labels[0]} has ${difference.left} items, ${labels[1]} has ${difference.right}`;
    default:
      return `${at}: ${labels[0]}=${short(difference.left)} ${labels[1]}=${short(difference.right)}`;
  }
}

function short(value: unknown): string {
  const text = typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value) ?? 'undefined';
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}
