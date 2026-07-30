import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@calendar/core': path.resolve(configDir, 'packages/core/src'),
      '@calendar/storage': path.resolve(configDir, 'packages/storage/src'),
      '@calendar/ui': path.resolve(configDir, 'packages/ui/src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./packages/ui/tests/setup.ts'],
    include: ['packages/*/tests/**/*.test.ts', 'packages/*/src/**/*.test.ts', 'packages/*/src/**/*.test.tsx'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/node_modules/**', '**/dist/**']
    }
  }
});
