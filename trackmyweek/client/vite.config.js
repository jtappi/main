import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite config for TrackMyWeek client.
 *
 * base: '/' because trackmyweek.com IS the root domain — no subdirectory
 * prefix needed. Change to '/trackmyweek/' if ever mounted under a portal.
 *
 * proxy: during `npm run dev`, API calls to /api/* are forwarded to
 * the Express server on port 3001.
 *
 * outDir: 'dist' — production build lands at client/dist/, where
 * server.js serves it as static files.
 */
export default defineConfig({
  plugins: [react()],

  base: '/',

  server: {
    port: 5173,
    proxy: {
      '/api': {
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
