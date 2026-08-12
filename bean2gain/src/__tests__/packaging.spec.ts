// GPL-2.0-only — see ../../LICENSE.
//
// Guards on the package itself, for the failure mode where a suite reports green having tested
// less than it claims.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE = JSON.parse(
  readFileSync(resolve(HERE, '..', '..', 'package.json'), 'utf8'),
) as { scripts: Record<string, string> };

describe('the test scripts', () => {
  it('assemble the interpreter before running vitest', () => {
    // `public/pyodide/` is gitignored and built by `pnpm run assets`. A fresh checkout that ran
    // vitest directly would skip every browser spec — the ones that carry the whole claim that the
    // shipped path matches native beancount — and still print a green summary. `dev` and `build`
    // already chain `assets`; the test scripts have to as well or CI tests less than it reports.
    const usingVitest = Object.entries(PACKAGE.scripts).filter(([, command]) =>
      command.includes('vitest'),
    );

    expect(usingVitest.length).toBeGreaterThan(0);
    for (const [name, command] of usingVitest) {
      expect(command, `the "${name}" script must run \`assets\` first`).toMatch(
        /run assets\s*&&/,
      );
    }
  });
});
