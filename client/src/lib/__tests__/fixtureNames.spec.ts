// Guards the fixture corpus itself.
//
// A fixture is only useful if EVERY dump suite produced its goldens. Half-adding one — a ledger
// checked in, but `Fixtures.names` on the Scala side not updated — leaves specs silently
// comparing against a stale or missing golden, which is exactly the failure mode this whole
// parity effort is trying to remove. So assert the artifacts exist rather than trusting that a
// dump was re-run.

import * as fs from 'fs';
import * as path from 'path';
import { FIXTURE_NAMES } from 'src/lib/__tests__/fixtureNames';

const FIXTURES = path.join(__dirname, 'fixtures');

// One entry per dump suite, so a missing artifact names the suite that needs re-running.
const ARTIFACTS: Record<string, string[]> = {
  DumpParserDTOs: ['commands.json'],
  DumpGeneratorDTOs: ['accounts.json', 'txs.json', 'balances.json', 'priceState.json',
    'assetState.json', 'fxMapper.json', 'proxyMapper.json', 'ccys.json', 'tradeFx.json'],
  DumpToGainstrack: ['blocks.json', 'export.gainstrack'],
  DumpToBeancount: ['beancount.json'],
};

describe('every fixture has a complete golden set', () => {
  for (const name of FIXTURE_NAMES) {
    test(`${name}.gainstrack exists`, () => {
      expect(fs.existsSync(path.join(FIXTURES, `${name}.gainstrack`))).toBe(true);
    });

    for (const [suite, exts] of Object.entries(ARTIFACTS)) {
      test(`${name} has ${suite} goldens`, () => {
        const missing = exts.filter(ext => !fs.existsSync(path.join(FIXTURES, `${name}.${ext}`)));
        expect({ suite, missing }).toEqual({ suite, missing: [] });
      });
    }
  }

  test('the Scala fixture list is in step with this one', () => {
    // The dumps are driven by Fixtures.names; if the two lists drift, goldens go stale without
    // any test failing. Cheap to read the Scala source and compare literally.
    const scala = fs.readFileSync(
      path.join(__dirname, '../../../../core/src/test/scala/com/gainstrack/core/test/Fixtures.scala'),
      'utf8',
    );
    const listed = [...scala.matchAll(/"([a-z]+)"/g)].map(m => m[1]);
    expect(listed).toEqual([...FIXTURE_NAMES]);
  });
});
