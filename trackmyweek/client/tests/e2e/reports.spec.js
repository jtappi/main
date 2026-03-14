import { test, expect } from '@playwright/test';

test.describe('Reports', () => {
  // ── Smoke check ─────────────────────────────────────────────────────────────
  // Confirms the page loads and the prebuilt reports API returned data.
  // Report cards only render if /api/prebuilt/trend and /api/prebuilt/categories succeeded.
  test('page loads with pre-built report cards from API', async ({ page }) => {
    await page.goto('/trackmyweek/reports');
    await expect(page.getByText('Entries Over Time')).toBeVisible();
    await expect(page.getByText('Category Breakdown')).toBeVisible();
  });

  // ── Critical flow ────────────────────────────────────────────────────────────
  // Confirms the report builder opens and the schema API returned chart types.
  test('report builder opens and loads schema from API', async ({ page }) => {
    await page.goto('/trackmyweek/reports');
    await page.getByTestId('new-report-btn').click();
    await expect(page.getByTestId('report-builder')).toBeVisible();
    // Schema API must have returned chart types for these buttons to exist
    await expect(
      page.locator('[data-testid^="chart-type-"]').first()
    ).toBeVisible({ timeout: 5000 });
  });
});
