import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite config for TrackMyWeek client.
 *
 * base: '/trackmyweek/' — nginx serves this app under /trackmyweek/,
 * so all asset paths must be relative to that prefix.
 *
 * proxy: during `npm run dev`, API calls to /trackmyweek/api/* are
 * forwarded to the Express server on port 3001.
 *
 * outDir: 'dist' — production build lands at client/dist/.
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
