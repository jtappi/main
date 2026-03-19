import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/prisondonkey/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      '/auth': 'http://localhost:3000',
      '/api':  'http://localhost:3000',
    },
  },
});
