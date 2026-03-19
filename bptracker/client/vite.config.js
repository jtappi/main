import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite config for BP Tracker client.
 *
 * base: '/bptracker/' — nginx serves this app under /bptracker/,
 * so all asset paths must be relative to that prefix.
 *
 * proxy: during `npm run dev`, API calls to /bptracker/api/* are
 * forwarded to the Express server on port 3002.
 *
 * outDir: 'dist' — production build lands at client/dist/,
 * which bptracker/server.js serves as static files.
 */
export default defineConfig({
  plugins: [react()],

  base: '/bptracker/',

  server: {
    port: 5174,
    proxy: {
      '/bptracker/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
