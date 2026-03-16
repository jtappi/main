import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for local development.
 * Runs against the Vite dev server on port 5174.
 * Requires `npm run dev` to be running in bptracker/client/.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,

  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
