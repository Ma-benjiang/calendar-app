import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'jsdom',
    globals: true,
    alias: {
      '@calendar/core': path.resolve(__dirname, '../core/src'),
      '@calendar/storage': path.resolve(__dirname, '../storage/src'),
      '@calendar/ui': path.resolve(__dirname, './src'),
    },
  },
})
