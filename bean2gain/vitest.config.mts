// GPL-2.0-only — see ./LICENSE.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  assetsInclude: ['**/*.py'],

  test: {
    globals: true,
    environment: 'node',
    server: {
      deps: {
        // Vite resolves pyodide to its TypeScript sources, which the published package does not
        // contain; the runtime then looks for pyodide.asm.wasm next to a file that does not exist.
        external: ['pyodide', 'beancount-wasm'],
      },
    },
    // Booting Pyodide and installing the wheel costs a couple of seconds before the first
    // assertion, and a bean-example-sized ledger takes a while to dump twice.
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
});
