import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'node:url'

const configDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@calendar/core': path.resolve(configDir, '../core/src'),
      '@calendar/storage': path.resolve(configDir, '../storage/src'),
      '@calendar/ui': path.resolve(configDir, './src'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
})
