// @ts-check
/**
 * playwright.ci.config.js — CI-only Playwright config for TrackMyWeek E2E.
 *
 * Differences from playwright.config.js (local dev):
 *   - baseURL points at the portal (http://localhost:3000/trackmyweek)
 *     rather than the Vite dev server (http://localhost:5173).
 *   - No webServer block — the portal is started by CI before this runs.
 *   - JSON reporter enabled so CI can capture results for the dashboard.
 *   - retries: 1 to reduce flakiness on cold runners.
 *
 * Used by CI only. Local dev still uses playwright.config.js.
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: '/tmp/trackmyweek-e2e-results.json' }],
    ['html', { outputFolder: 'playwright-report-tmw', open: 'never' }],
  ],

  use: {
    baseURL: 'http://localhost:3000/trackmyweek',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No webServer — portal is started by CI before this config is invoked.
});
