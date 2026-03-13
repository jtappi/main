import { test, expect } from '@playwright/test';

test.describe('Reports page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trackmyweek/reports');
  });

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
  });

  test('pre-built report cards are visible', async ({ page }) => {
    await expect(page.getByText('Entries Over Time')).toBeVisible();
    await expect(page.getByText('Category Breakdown')).toBeVisible();
  });

  test('New Report button is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="new-report-btn"]')).toBeVisible();
  });

  test('clicking New Report opens the builder panel', async ({ page }) => {
    await page.locator('[data-testid="new-report-btn"]').click();
    await expect(page.locator('[data-testid="report-builder"]')).toBeVisible();
  });

  test('builder panel closes on X button', async ({ page }) => {
    await page.locator('[data-testid="new-report-btn"]').click();
    await expect(page.locator('[data-testid="report-builder"]')).toBeVisible();
    await page.getByRole('button', { name: '✕' }).click();
    await expect(page.locator('[data-testid="report-builder"]')).not.toBeVisible();
  });

  test('builder shows chart type options on step 1', async ({ page }) => {
    await page.locator('[data-testid="new-report-btn"]').click();
    // At least one chart type button should render
    await expect(page.locator('[data-testid^="chart-type-"]').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('can advance to step 2 after selecting a chart type', async ({ page }) => {
    await page.locator('[data-testid="new-report-btn"]').click();
    await page.locator('[data-testid="chart-type-bar"]').click();
    await page.locator('[data-testid="builder-next"]').click();
    // Step 2 — measure options
    await expect(page.locator('[data-testid^="measure-"]').first()).toBeVisible();
  });
});
