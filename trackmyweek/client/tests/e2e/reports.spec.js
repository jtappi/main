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
    await expect(page.getByTestId('new-report-btn')).toBeVisible();
  });

  test('clicking New Report opens the builder panel', async ({ page }) => {
    await page.getByTestId('new-report-btn').click();
    await expect(page.getByTestId('report-builder')).toBeVisible();
  });

  test('builder panel closes on close button', async ({ page }) => {
    await page.getByTestId('new-report-btn').click();
    await expect(page.getByTestId('report-builder')).toBeVisible();
    await page.getByTestId('builder-close').click();
    await expect(page.getByTestId('report-builder')).not.toBeVisible();
  });

  test('builder shows chart type options on step 1', async ({ page }) => {
    await page.getByTestId('new-report-btn').click();
    await expect(page.locator('[data-testid^="chart-type-"]').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('can advance to step 2 after selecting a chart type', async ({ page }) => {
    await page.getByTestId('new-report-btn').click();
    await page.getByTestId('chart-type-bar').click();
    await page.getByTestId('builder-next').click();
    await expect(page.locator('[data-testid^="measure-"]').first()).toBeVisible();
  });
});
