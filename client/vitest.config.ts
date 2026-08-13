import { defineConfig } from 'vitest/config'
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
    coverage: {
      provider: 'v8',
    },
  },
})
