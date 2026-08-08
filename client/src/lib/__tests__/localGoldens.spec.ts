// Parity of the TS parser+generator against the Scala pipeline, over a private ledger that is
// far larger than the checked-in synthetic fixtures. The artifact set is every key of Scala's
// `GainstrackGenerator.allState` — i.e. exactly what /api/allState puts in the Pinia store and
// what the UI data-binds against.
//
// Skips cleanly when no goldens have been generated, so CI and other machines are unaffected.
//   TS baseline (drift only): pnpm run fixtures:local
//   Scala oracle (parity):    sbt -DdumpFixtures=1 "core/testOnly com.gainstrack.core.test.DumpLocalAllState"

import * as fs from 'fs';
import * as path from 'path';
import { GainstrackParser } from 'src/lib/GainstrackParser';
import { generate } from 'src/lib/gen/GainstrackGenerator';
import {
  LOCAL_DIR, differences, keyBy, listLocalFixtures, normalize, readArtifact, readMeta,
} from 'src/lib/__tests__/localFixtures';

const names = listLocalFixtures();

if (names.length === 0) {
  describe('local ledger goldens', () => {
    test.skip('no local fixtures — run `pnpm run fixtures:local` to generate them', () => undefined);
  });
}

/**
 * Scala resolves a transaction's `originIndex` with `originalCommands.indexOf(_)`, which uses
 * case-class STRUCTURAL equality — so when a ledger repeats an identical command, every one of
 * its transactions points at the first occurrence. TS uses the positional index, which is the
 * more faithful answer.
 *
 * Rather than paper over that with a skip, compare what the index actually means: swap it for
 * the command DTO it resolves to. Identical commands canonicalize identically, so the benign
 * case passes while an index pointing at a genuinely different command still fails.
 */
function canonicalTxs(txs: unknown, commands: unknown): unknown {
  const cmds = commands as unknown[];
  return (txs as Record<string, unknown>[]).map(tx => {
    const { originIndex, ...rest } = tx;
    return { ...rest, origin: cmds[originIndex as number] };
  });
}

for (const name of names) {
  describe(`local ledger goldens: ${name}`, () => {
    const meta = readMeta(name);
    const text = fs.readFileSync(path.join(LOCAL_DIR, `${name}.gainstrack`), 'utf8');

    const parser = new GainstrackParser();
    parser.parseString(text);
    const tsCommands = parser.getCommands();
    const gen = generate(text);

    test('baseline provenance is recorded', () => {
      expect(['typescript', 'scala']).toContain(meta.provenance);
      if (meta.provenance === 'typescript') {
        console.info(
          `[${name}] drift baseline only (self-snapshotted from TS at ${meta.gitCommit.slice(0, 7)}); ` +
          're-dump from Scala for true parity',
        );
      }
    });

    test('parses with no errors', () => {
      expect(parser.parserErrors).toEqual([]);
      expect(tsCommands.length).toBe(meta.commandCount);
    });

    test('commands', () => {
      expect(differences(normalize(tsCommands), normalize(readArtifact(name, 'commands')))).toEqual([]);
    });

    test('txs (originIndex resolved to its command)', () => {
      const goldCommands = readArtifact(name, 'commands');
      expect(differences(
        normalize(canonicalTxs(gen.txs, tsCommands)),
        normalize(canonicalTxs(readArtifact(name, 'txs'), goldCommands)),
      )).toEqual([]);
    });

    // Scala builds these from Sets, whose iteration order is not deterministic — compare by key.
    test('accounts (keyed; Scala Set order is arbitrary)', () => {
      expect(differences(
        normalize(keyBy(gen.accounts, 'accountId')),
        normalize(keyBy(readArtifact(name, 'accounts'), 'accountId')),
      )).toEqual([]);
    });

    test('assetState (keyed; Scala Set order is arbitrary)', () => {
      expect(differences(
        normalize(keyBy(gen.assetState, 'asset')),
        normalize(keyBy(readArtifact(name, 'assetState'), 'asset')),
      )).toEqual([]);
    });

    test('priceState (ccys is an unordered Set)', () => {
      const gold = readArtifact(name, 'priceState') as { ccys: string[]; prices: unknown };
      expect([...gen.priceState.ccys].sort()).toEqual([...gold.ccys].sort());
      expect(differences(normalize(gen.priceState.prices), normalize(gold.prices))).toEqual([]);
    });

    for (const artifact of ['balances', 'fxMapper', 'proxyMapper', 'ccys', 'tradeFx', 'baseCcy'] as const) {
      test(artifact, () => {
        expect(differences(normalize(gen[artifact]), normalize(readArtifact(name, artifact)))).toEqual([]);
      });
    }
  });
}
