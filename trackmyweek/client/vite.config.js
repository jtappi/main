import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite config for TrackMyWeek client.
 *
 * - base: '/trackmyweek/' ensures all asset paths are relative to the
 *   Express mount point so the SPA works when served from the portal.
 * - proxy: during `npm run dev`, API calls are forwarded to the Express
 *   server running on port 3001 so you don't need to build to test.
 * - outDir: 'dist' puts the production build at client/dist/, which is
 *   exactly where server.js expects to find it.
 */
export default defineConfig({
  plugins: [react()],

  base: '/trackmyweek/',

  server: {
    port: 5173,
    proxy: {
      '/trackmyweek/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
