// Writes the generated differential corpus to disk.
//
//   pnpm run fixtures:fuzz          # regenerate fixtures/fuzz/*.gainstrack
//
// The ledgers are CHECKED IN, deliberately. They are generated deterministically, so they could
// in principle be produced on demand — but the Scala goldens are dumped from these exact files,
// and Scala is being decommissioned. Once it is gone the corpus and its goldens become the only
// surviving record of the oracle's behaviour, and a regenerated corpus would have nothing to
// compare against. Checking them in turns a one-off campaign into a permanent regression suite.
//
// Regenerating therefore invalidates the goldens: re-run the Scala dump straight after.

import * as fs from 'fs';
import * as path from 'path';
import { generateLedger, mutate } from 'src/lib/__tests__/ledgerGenerator';

const ENABLED = process.env.DUMP_FUZZ_CORPUS === '1';
const DIR = path.join(__dirname, 'fixtures', 'fuzz');

/** Kept modest: enough to cover the command matrix many times over, small enough to review. */
export const VALID_SEEDS = 150;
export const MUTATED_SEEDS = 150;

describe.runIf(ENABLED)('generate the fuzz corpus', () => {
  test('write ledgers', () => {
    fs.rmSync(DIR, { recursive: true, force: true });
    fs.mkdirSync(DIR, { recursive: true });

    for (let s = 1; s <= VALID_SEEDS; s++) {
      fs.writeFileSync(path.join(DIR, `valid-${String(s).padStart(4, '0')}.gainstrack`), generateLedger(s), 'utf8');
    }
    for (let s = 1; s <= MUTATED_SEEDS; s++) {
      fs.writeFileSync(path.join(DIR, `mutated-${String(s).padStart(4, '0')}.gainstrack`), mutate(generateLedger(s), s), 'utf8');
    }

    const written = fs.readdirSync(DIR).filter(f => f.endsWith('.gainstrack'));
    expect(written.length).toBe(VALID_SEEDS + MUTATED_SEEDS);
    const bytes = written.reduce((n, f) => n + fs.statSync(path.join(DIR, f)).size, 0);
    console.info(`wrote ${written.length} ledgers (${Math.round(bytes / 1024)} KB) to ${DIR}`);
  });
});
