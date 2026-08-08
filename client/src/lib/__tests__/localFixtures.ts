// Shared plumbing for LOCAL, git-ignored golden fixtures.
//
// The checked-in fixtures (basic/unit/src/…) are small synthetic ledgers dumped from the Scala
// parser. They are the parity oracle, but they are also tiny. A real ledger exercises command
// combinations the synthetic ones never reach, and is private — so its goldens live here,
// under an ignored directory, and are generated on demand rather than committed.
//
// Generate:  pnpm run fixtures:local
// Consume:   localGoldens.spec.ts (skips cleanly when nothing has been generated)

import * as fs from 'fs';
import * as path from 'path';

export const LOCAL_DIR = path.join(__dirname, 'fixtures', 'local');

export const REPO_ROOT = path.join(__dirname, '..', '..', '..', '..');

/** The ledger to snapshot: $LOCAL_GAINSTRACK, else glorat.gainstrack at the repo root. */
export function defaultSource(): string {
  return process.env.LOCAL_GAINSTRACK ?? path.join(REPO_ROOT, 'glorat.gainstrack');
}

/**
 * Artifacts dumped per ledger — `commands` from the parser, the rest from the generator.
 *
 * This is exactly the key set of Scala's `GainstrackGenerator.allState`, which is what
 * `/api/allState` serializes into the Pinia store and what the UI data-binds against.
 * `getAllState` decorates it with four more fields, none of them parser/generator output:
 * `conversion`, `dateOverride` and `authentication` are session state, and `latestDate`
 * (`finalCommands.maxBy(_.date).date`) has no TS equivalent and no client reader.
 */
export const ARTIFACTS = [
  'commands', 'accounts', 'txs', 'balances', 'priceState',
  'assetState', 'fxMapper', 'proxyMapper', 'ccys', 'tradeFx', 'baseCcy',
] as const;

export type Artifact = typeof ARTIFACTS[number];

export interface LocalMeta {
  /** Absolute path the snapshot was taken from. */
  source: string;
  /**
   * Which implementation produced these goldens.
   *  - 'typescript': a self-snapshot. Detects DRIFT in the TS pipeline; it cannot detect a
   *    pre-existing TS/Scala divergence, because the TS output defined the baseline.
   *  - 'scala': a true parity oracle, dumped by DumpParserDTOs/DumpGeneratorDTOs.
   */
  provenance: 'typescript' | 'scala';
  generatedAt: string;
  gitCommit: string;
  sourceLines: number;
  commandCount: number;
}

export function metaPath(name: string): string {
  return path.join(LOCAL_DIR, `${name}.meta.json`);
}

export function artifactPath(name: string, artifact: Artifact): string {
  return path.join(LOCAL_DIR, `${name}.${artifact}.json`);
}

/** Ledger names that have a complete set of generated goldens. */
export function listLocalFixtures(): string[] {
  if (!fs.existsSync(LOCAL_DIR)) return [];
  return fs
    .readdirSync(LOCAL_DIR)
    .filter(f => f.endsWith('.meta.json'))
    .map(f => f.slice(0, -'.meta.json'.length))
    .filter(name => ARTIFACTS.every(a => fs.existsSync(artifactPath(name, a))))
    .sort();
}

export function readMeta(name: string): LocalMeta {
  return JSON.parse(fs.readFileSync(metaPath(name), 'utf8'));
}

export function readArtifact(name: string, artifact: Artifact): unknown {
  return JSON.parse(fs.readFileSync(artifactPath(name, artifact), 'utf8'));
}

/**
 * Same normalization the checked-in golden specs use: drop null/undefined (json4s omits
 * `None`) and drop `comments` (the TS parser discards comment lines, so only the Scala
 * GlobalCommand ever emits `comments: []`). `description` is deliberately NOT dropped.
 */
export function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'comments') continue;
      const nv = normalize(v);
      if (nv === undefined || nv === null) continue;
      out[k] = nv;
    }
    return out;
  }
  return value;
}

/**
 * Relative tolerance for Scala BigDecimal→Double vs JS float accumulation. Observed worst
 * case on a real ledger is ~1e-14 relative (last-ulp disagreement in FX chains), so 1e-12
 * is comfortably tight — any genuine arithmetic bug is orders of magnitude larger.
 */
const REL_TOL = 1e-12;

function numbersClose(a: number, b: number): boolean {
  if (a === b) return true;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= REL_TOL * Math.max(Math.abs(a), Math.abs(b), 1);
}

/**
 * Structural comparison returning human-readable difference paths (empty when equal).
 * Beats `toEqual` on these artifacts: the payload is megabytes, so a deep-equal failure
 * prints an unreadable dump, and numbers need a relative rather than absolute tolerance.
 */
export function differences(actual: unknown, golden: unknown, at = '$', out: string[] = [], limit = 20): string[] {
  if (out.length >= limit) return out;
  if (typeof actual === 'number' && typeof golden === 'number') {
    if (!numbersClose(actual, golden)) out.push(`${at}: actual=${actual} golden=${golden}`);
    return out;
  }
  if (Array.isArray(actual) && Array.isArray(golden)) {
    if (actual.length !== golden.length) {
      out.push(`${at}: length actual=${actual.length} golden=${golden.length}`);
    }
    for (let i = 0; i < Math.min(actual.length, golden.length); i++) {
      differences(actual[i], golden[i], `${at}[${i}]`, out, limit);
    }
    return out;
  }
  if (actual && golden && typeof actual === 'object' && typeof golden === 'object') {
    const ao = actual as Record<string, unknown>, go = golden as Record<string, unknown>;
    for (const k of new Set([...Object.keys(ao), ...Object.keys(go)])) {
      if (!(k in ao)) { out.push(`${at}.${k}: missing (golden=${JSON.stringify(go[k])?.slice(0, 60)})`); continue; }
      if (!(k in go)) { out.push(`${at}.${k}: unexpected (actual=${JSON.stringify(ao[k])?.slice(0, 60)})`); continue; }
      differences(ao[k], go[k], `${at}.${k}`, out, limit);
    }
    return out;
  }
  if (JSON.stringify(actual) !== JSON.stringify(golden)) {
    out.push(`${at}: actual=${JSON.stringify(actual)?.slice(0, 70)} golden=${JSON.stringify(golden)?.slice(0, 70)}`);
  }
  return out;
}

/** Index a collection by a stable key — Scala emits several of these from unordered Sets. */
export function keyBy(rows: unknown, field: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const row of rows as Record<string, unknown>[]) out[String(row[field])] = row;
  return out;
}
