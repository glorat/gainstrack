// On-demand golden dumper for a private ledger. Mirrors the Scala harnesses
// (DumpParserDTOs / DumpGeneratorDTOs), which likewise gate on an explicit flag:
//
//   pnpm run fixtures:local                        # snapshots glorat.gainstrack
//   LOCAL_GAINSTRACK=/path/to/other.gainstrack pnpm run fixtures:local
//
// Output (all git-ignored) goes to src/lib/__tests__/fixtures/local/. The input is copied
// alongside the goldens on purpose: the regression test replays the SNAPSHOT, not the live
// ledger, so ordinary edits to your real file never produce a spurious failure.

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { GainstrackParser } from 'src/lib/GainstrackParser';
import { generate } from 'src/lib/gen/GainstrackGenerator';
import {
  ARTIFACTS, Artifact, LOCAL_DIR, LocalMeta, REPO_ROOT,
  artifactPath, defaultSource, metaPath,
} from 'src/lib/__tests__/localFixtures';

const ENABLED = process.env.DUMP_LOCAL_FIXTURES === '1';

function gitCommit(): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function write(file: string, value: unknown): void {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

describe.runIf(ENABLED)('dump local golden fixtures', () => {
  test('snapshot the configured ledger', () => {
    const source = defaultSource();
    if (!fs.existsSync(source)) {
      throw new Error(
        `No ledger at ${source}. Point LOCAL_GAINSTRACK at one, or drop a glorat.gainstrack at the repo root.`,
      );
    }

    const name = path.basename(source).replace(/\.gainstrack$/, '');
    const text = fs.readFileSync(source, 'utf8');

    // Parse and generate up front so a broken ledger fails before anything is written.
    const parser = new GainstrackParser();
    parser.parseString(text);
    const commands = parser.getCommands();
    const gen = generate(text);

    fs.mkdirSync(LOCAL_DIR, { recursive: true });

    const values: Record<Artifact, unknown> = {
      commands,
      accounts: gen.accounts,
      txs: gen.txs,
      balances: gen.balances,
      priceState: gen.priceState,
      assetState: gen.assetState,
      fxMapper: gen.fxMapper,
      proxyMapper: gen.proxyMapper,
      ccys: gen.ccys,
      tradeFx: gen.tradeFx,
      baseCcy: gen.baseCcy,
    };
    for (const artifact of ARTIFACTS) write(artifactPath(name, artifact), values[artifact]);

    // Replay input, so the regression test is stable against edits to the live ledger.
    fs.writeFileSync(path.join(LOCAL_DIR, `${name}.gainstrack`), text, 'utf8');

    const meta: LocalMeta = {
      source,
      // Scala is unavailable in this environment; re-dump via the Scala harnesses to upgrade
      // these from a drift baseline to a genuine parity oracle.
      provenance: 'typescript',
      generatedAt: new Date().toISOString(),
      gitCommit: gitCommit(),
      sourceLines: text.split('\n').length,
      commandCount: commands.length,
    };
    write(metaPath(name), meta);

    console.info(
      `[fixtures:local] ${name}: ${meta.commandCount} commands, ${gen.accounts.length} accounts, ` +
      `${gen.txs.length} txs -> ${path.relative(REPO_ROOT, LOCAL_DIR)} (provenance: ${meta.provenance})`,
    );

    expect(commands.length).toBeGreaterThan(0);
    expect(parser.parserErrors).toEqual([]);
  });
});

describe.runIf(!ENABLED)('dump local golden fixtures', () => {
  test.skip('disabled — run `pnpm run fixtures:local` to regenerate', () => undefined);
});
