// Parity of the TS whole-file gainstrack export against the Scala oracle (DumpToGainstrack).
//
// This is what the "Export Gainstrack" button downloads. Users treat it as their backup and
// re-upload it, so it has to be both byte-faithful to what Scala served and re-parseable.

import * as fs from 'fs';
import * as path from 'path';
import { GainstrackParser } from 'src/lib/GainstrackParser';
import { toGainstrackFile } from 'src/lib/export/gainstrackExport';
import { toCommandBlocks } from 'src/lib/toGainstrack';
import { FIXTURE_NAMES } from 'src/lib/__tests__/fixtureNames';

const FIXTURES = path.join(__dirname, 'fixtures');
const LOCAL = path.join(FIXTURES, 'local');
const GOLDENS = FIXTURE_NAMES;

function exportFor(text: string): string {
  const parser = new GainstrackParser();
  parser.parseString(text);
  return toGainstrackFile(parser.getTypedCommands());
}

function blocksFor(text: string): string[][] {
  const parser = new GainstrackParser();
  parser.parseString(text);
  return toCommandBlocks(parser.getTypedCommands());
}

describe('whole-file export parity with Scala', () => {
  for (const name of GOLDENS) {
    test(`${name}.gainstrack`, () => {
      const text = fs.readFileSync(path.join(FIXTURES, `${name}.gainstrack`), 'utf8');
      const golden = fs.readFileSync(path.join(FIXTURES, `${name}.export.gainstrack`), 'utf8');
      expect(exportFor(text)).toBe(golden);
    });
  }

  const localLedger = path.join(LOCAL, 'glorat.gainstrack');
  const localGolden = path.join(LOCAL, 'glorat.export.gainstrack');
  const hasLocal = fs.existsSync(localLedger) && fs.existsSync(localGolden);

  (hasLocal ? test : test.skip)('private ledger', () => {
    const golden = fs.readFileSync(localGolden, 'utf8');
    expect(exportFor(fs.readFileSync(localLedger, 'utf8'))).toBe(golden);
  });
});

const sorted = (blocks: string[][]) => [...blocks].sort((a, b) => a.join('\n').localeCompare(b.join('\n')));

describe('the export is usable as a backup', () => {
  // The whole point of the button: download, then re-upload via Port.vue.
  for (const name of GOLDENS) {
    test(`${name}.gainstrack survives export -> re-import`, () => {
      const text = fs.readFileSync(path.join(FIXTURES, `${name}.gainstrack`), 'utf8');
      const exported = exportFor(text);
      // Compare command blocks as a SET. Two deliberate differences make sequence equality
      // the wrong test:
      //  - a `USD` operating-currency line serializes to nothing (Scala emits the option only
      //    when it differs from the default), so it is absent from both export and re-parse;
      //  - the export regroups by account, and the parser's sort is stable, so commands
      //    sharing a date come back in a different — equally valid — order.
      // What must hold is that no command is lost or mutated, which is what this asserts.
      expect(sorted(blocksFor(exported))).toEqual(sorted(blocksFor(text)));
      // Re-exporting must be a fixed point, or repeated backup/restore cycles would drift.
      expect(exportFor(exported)).toBe(exported);
    });
  }
});
