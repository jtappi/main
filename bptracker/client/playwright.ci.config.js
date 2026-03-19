import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for CI.
 *
 * - baseURL points at the portal (port 3000) under /bptracker
 * - No webServer block — CI starts the server manually
 * - storageState set globally so all specs run authenticated
 * - JSON reporter output goes to /tmp/ for the dashboard log script
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,

  reporter: [
    ['list'],
    ['json', { outputFile: '/tmp/bptracker-e2e-results.json' }],
  ],

  use: {
    baseURL: 'http://localhost:3000/bptracker',
    trace: 'on-first-retry',
    storageState: './tests/e2e/.auth/user.json',
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
