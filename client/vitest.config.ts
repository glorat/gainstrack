import { defineConfig, configDefaults } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      src: resolve(rootDir, 'src'),
      app: rootDir,
      components: resolve(rootDir, 'src/components'),
      layouts: resolve(rootDir, 'src/layouts'),
      pages: resolve(rootDir, 'src/pages'),
      assets: resolve(rootDir, 'src/assets'),
      boot: resolve(rootDir, 'src/boot'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['test/setup.ts'],
    // No explicit `include`: the default `**/*.{test,spec}.*` glob is what lets `local/` work.
    // That directory is gitignored and holds specs whose assertions contain private data, so
    // they run for whoever has them and simply do not exist for anyone else — see
    // local/README.md before narrowing this.
    //
    // `functions/` is a separate pnpm package with its own vitest config, node environment
    // and firebase-admin stubs. The open include glob would otherwise pull its specs into
    // this jsdom run. Exclude rather than adding an `include`, which would break `local/`.
    exclude: [...configDefaults.exclude, 'functions/**'],
    coverage: {
      provider: 'v8',
    },
  },
})
