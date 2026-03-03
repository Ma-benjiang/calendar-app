import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  envDir: '../..',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '日历应用',
        short_name: '日历',
        description: '跨平台日历应用',
        theme_color: '#3b82f6',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/volces-api': {
        target: 'https://ark.cn-beijing.volces.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/volces-api/, '')
      }
    }
  },
  resolve: {
    alias: {
      '@calendar/ui': '/../../packages/ui/src',
      '@calendar/core': '/../../packages/core/src',
      '@calendar/storage': '/../../packages/storage/src'
    }
  }
});
