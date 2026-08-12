// GPL-2.0-only — see ./LICENSE and ./README.md.

import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const ROOT = import.meta.dirname;

export default defineConfig({
  // Relative, so the built site works at a domain root, in a subdirectory, or opened from a file.
  base: './',

  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        index: resolve(ROOT, 'index.html'),
        embed: resolve(ROOT, 'embed.html'),
      },
    },
    // The inline beancount wheel is a ~750 KiB base64 string by design; warning about it every
    // build trains people to ignore the warning that matters.
    chunkSizeWarningLimit: 2048,
  },

  // Vite treats an unknown extension as an asset; `?raw` still needs the loader to know it is text.
  // `python/dump.py` is imported that way, so the site ships the same script the CLI runs.
  assetsInclude: ['**/*.py'],
});
