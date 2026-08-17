import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    // Mirrors the `paths` entry in tsconfig.json — see the comment there. The engine slice this
    // tool reaches (gen/, statements/, cashflow, export/) depends on nothing but @js-joda/core,
    // decimal.js and lodash, which is why aliasing into another package is survivable.
    alias: {
      src: resolve(rootDir, '../../client/src'),
      // Share the client's single @js-joda/core — see tsconfig.json. Two copies would make the
      // LocalDate this package creates unequal to the one engine code expects.
      '@js-joda/core': resolve(rootDir, '../../client/node_modules/@js-joda/core'),
    },
  },
  test: {
    globals: true,
    // node, not jsdom: this is a CLI tool.
    environment: 'node',
  },
})
