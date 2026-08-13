import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    // Mirrors the `paths` entry in tsconfig.json — see the comment there. What this tool pulls in
    // (`import/`, `GainstrackParser`, `gen/`, `export/`) depends on nothing but `@js-joda/core`
    // and `decimal.js`, which is why aliasing into another package is survivable.
    alias: {
      src: resolve(rootDir, '../../client/src'),
    },
  },
  test: {
    globals: true,
    // node, not jsdom: this is a CLI tool. The website's config uses jsdom for component specs.
    environment: 'node',
  },
})
