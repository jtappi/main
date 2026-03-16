import { test, expect } from '@playwright/test';

/**
 * return-to.spec.js
 *
 * Critical Flow: unauthenticated access to a TrackMyWeek page redirects to
 * /login?returnTo=<path>, and after login the user lands back on the original page.
 *
 * These tests intentionally do NOT use storageState so they run unauthenticated.
 * They must be self-contained and not depend on global-setup seeding.
 *
 * Note on baseURL: the CI config sets baseURL to 'http://localhost:3000/trackmyweek'.
 * We use full URLs here to avoid path doubling (baseURL + relative path).
 * The BASE constant matches what the portal serves at.
 */

const BASE     = 'http://localhost:3000';
const TMW_USER = 'e2e-tmw';
const TMW_PASS = 'e2epassword';

async function loginWith(page, username, password) {
  await page.getByTestId('login-identifier').fill(username);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit-btn').click();
}

test.describe('TrackMyWeek returnTo — unauthenticated redirect', () => {
  // Override storageState for this entire describe block so tests run without a session
  test.use({ storageState: { cookies: [], origins: [] } });

  test('unauthenticated /trackmyweek/log redirects to login with returnTo', async ({ page }) => {
    await page.goto(`${BASE}/trackmyweek/log`);
    await expect(page).toHaveURL(/\/login\?returnTo=/, { timeout: 5000 });
    await expect(page.getByTestId('login-card')).toBeVisible();
    const url = new URL(page.url());
    expect(decodeURIComponent(url.searchParams.get('returnTo'))).toBe('/trackmyweek/log');
  });

  test('unauthenticated /trackmyweek/log redirects to login then back after login', async ({ page }) => {
    await page.goto(`${BASE}/trackmyweek/log`);
    await expect(page).toHaveURL(/\/login\?returnTo=/, { timeout: 5000 });
    await loginWith(page, TMW_USER, TMW_PASS);
    await expect(page).toHaveURL(/\/trackmyweek\/log/, { timeout: 5000 });
    // Confirm page loaded — category buttons only appear if API responded
    await expect(
      page.locator('[data-testid^="category-btn-"]').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('unauthenticated /trackmyweek/view redirects to login then back after login', async ({ page }) => {
    await page.goto(`${BASE}/trackmyweek/view`);
    await expect(page).toHaveURL(/\/login\?returnTo=/, { timeout: 5000 });
    await loginWith(page, TMW_USER, TMW_PASS);
    await expect(page).toHaveURL(/\/trackmyweek\/view/, { timeout: 5000 });
    await expect(page.getByTestId('day-chart')).toBeVisible({ timeout: 5000 });
  });
});
