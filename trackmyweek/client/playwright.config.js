import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start both servers before running E2E tests
  webServer: [
    {
      command: 'NODE_ENV=development node ../server.js',
      cwd: '../',
      url: 'http://localhost:3001/trackmyweek/api/categories',
      reuseExistingServer: true,
      timeout: 15000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173/trackmyweek/',
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
