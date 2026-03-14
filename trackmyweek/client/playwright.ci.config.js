// @ts-check
/**
 * playwright.ci.config.js — CI-only Playwright config for TrackMyWeek E2E.
 *
 * Differences from playwright.config.js (local dev):
 *   - baseURL points at the portal (http://localhost:3000/trackmyweek)
 *     rather than the Vite dev server (http://localhost:5173).
 *   - No webServer block — the portal is started by CI before this runs.
 *   - globalSetup seeds e2e-tmw user + saves auth storageState.
 *   - globalTeardown removes the seeded user.
 *   - storageState applied to all specs so requireAuth never blocks.
 *   - JSON reporter enabled so CI can capture results for PR B.
 *   - retries: 1 to reduce flakiness on cold runners.
 *
 * Used by CI only. Local dev still uses playwright.config.js.
 */

import { defineConfig, devices } from '@playwright/test';
import { STORAGE_STATE } from './tests/e2e/global-setup.js';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup:    './tests/e2e/global-setup.js',
  globalTeardown: './tests/e2e/global-teardown.js',
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: '/tmp/trackmyweek-e2e-results.json' }],
    ['html', { outputFolder: 'playwright-report-tmw', open: 'never' }],
  ],

  use: {
    baseURL:      'http://localhost:3000/trackmyweek',
    storageState: STORAGE_STATE,
    trace:        'on-first-retry',
    screenshot:   'only-on-failure',
    video:        'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No webServer — portal is started by CI before this config is invoked.
});
