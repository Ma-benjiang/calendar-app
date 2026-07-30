import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  envDir: '../..',
  plugins: [react()],
  resolve: {
    alias: {
      '@calendar/ui': '/../../packages/ui/src',
      '@calendar/core': '/../../packages/core/src',
      '@calendar/storage': '/../../packages/storage/src'
    }
  }
});
