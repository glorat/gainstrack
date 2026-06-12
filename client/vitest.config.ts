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
    coverage: {
      provider: 'v8',
    },
  },
})
