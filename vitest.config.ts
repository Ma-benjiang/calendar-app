import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['packages/*/tests/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/node_modules/**', '**/dist/**']
    }
  }
});
