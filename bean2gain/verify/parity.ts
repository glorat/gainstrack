// GPL-2.0-only — see ../LICENSE and ./README.md.
//
// One ledger, both runtimes, one verdict. Shared by the CLI and the spec so that what CI checks
// and what a person runs by hand are the same comparison.

import { realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { diff, normalize, type Difference } from './diff.ts';
import { nativeDump } from './native.ts';
import { defaultRoot, MOUNT, type DumpRuntime } from './runtime.ts';

export interface ParitySide {
  millis: number;
  bytes: number;
  entries: number;
  errors: number;
  stderr: string;
  /**
   * The `source` path *before* normalization.
   *
   * Carried so a caller can prove the two halves really ran in different places. Without it,
   * "identical" would be equally consistent with a harness that dumped one side twice.
   */
  source: string;
}

export interface ParityResult {
  ledger: string;
  equal: boolean;
  differences: Difference[];
  native: ParitySide;
  wasm: ParitySide;
}

export interface ParityOptions {
  /** Directory mounted into the WASM filesystem; must contain the ledger and anything it includes. */
  root?: string;
}

export async function compareLedger(
  runtime: DumpRuntime,
  python: string,
  ledgerPath: string,
  options: ParityOptions = {},
): Promise<ParityResult> {
  const ledger = resolve(ledgerPath);
  const root = resolve(options.root ?? defaultRoot(ledger));

  const [nativeOutcome, wasmOutcome] = await Promise.all([
    nativeDump(python, ledger),
    runtime.dump(ledger, { root }),
  ]);

  // A symlinked or /tmp-shadowed root (macOS resolves /tmp to /private/tmp) reaches beancount under
  // whichever name it was opened with, so collapse both spellings.
  const roots = [root, await realpath(root).catch(() => root), MOUNT];

  const nativeRaw = JSON.parse(nativeOutcome.json) as DumpDocument;
  const wasmRaw = JSON.parse(wasmOutcome.json) as DumpDocument;

  const nativeDoc = normalize(nativeRaw, { roots }) as DumpDocument;
  const wasmDoc = normalize(wasmRaw, { roots }) as DumpDocument;

  const differences = diff(nativeDoc, wasmDoc);

  return {
    ledger,
    equal: differences.length === 0,
    differences,
    native: side(nativeOutcome, nativeRaw, nativeDoc),
    wasm: side(wasmOutcome, wasmRaw, wasmDoc),
  };
}

interface DumpDocument {
  source?: string;
  entries?: unknown[];
  errors?: unknown[];
}

function side(
  outcome: { millis: number; json: string; stderr: string },
  raw: DumpDocument,
  normalized: DumpDocument,
): ParitySide {
  return {
    millis: outcome.millis,
    bytes: Buffer.byteLength(outcome.json),
    entries: normalized.entries?.length ?? 0,
    errors: normalized.errors?.length ?? 0,
    stderr: outcome.stderr,
    source: raw.source ?? '',
  };
}
