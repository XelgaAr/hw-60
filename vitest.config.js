import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.js'],
    include: ['src/__test__/**/*.test.js'],
    silent: true,
    coverage: { provider: 'v8', include: ['src/**/*.mjs'], exclude: ['src/server.mjs'] }
  }
})
