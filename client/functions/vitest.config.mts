import {defineConfig} from 'vitest/config';

// This package is its own pnpm workspace, but it sits inside client/, whose vitest
// config would otherwise be found by walking up. Defining one here keeps the two
// runs independent: node environment, no jsdom, no client setup file.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.spec.ts'],
  },
});
