import { test, expect } from '@playwright/test';

test.describe('Log Entry', () => {
  // ── Smoke check ─────────────────────────────────────────────────────────────
  // Confirms the page loads and the categories API returned data.
  test('page loads with category buttons from API', async ({ page }) => {
    await page.goto('/trackmyweek/log');
    await expect(page.getByRole('heading', { name: 'Log Entry' })).toBeVisible();
    await expect(
      page.locator('[data-testid^="category-btn-"]').first()
    ).toBeVisible({ timeout: 5000 });
  });

  // ── Critical flow ────────────────────────────────────────────────────────────
  // Full round-trip: select category → fill text → POST to API → success shown.
  test('submitting a complete entry succeeds', async ({ page }) => {
    await page.goto('/trackmyweek/log');
    const firstCat = page.locator('[data-testid^="category-btn-"]').first();
    await expect(firstCat).toBeVisible({ timeout: 5000 });
    await firstCat.click();
    await page.getByTestId('entry-text-input').fill('E2E log entry test');
    await page.getByTestId('entry-submit').click();
    await expect(page.getByTestId('entry-success')).toBeVisible({ timeout: 5000 });
  });
});
