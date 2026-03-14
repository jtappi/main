import { test, expect } from '@playwright/test';

test.describe('Log Entry page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trackmyweek/log');
  });

  test('page title is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Log Entry' })).toBeVisible();
  });

  test('category grid renders at least one category button', async ({ page }) => {
    const buttons = page.locator('[data-testid^="category-btn-"]');
    await expect(buttons.first()).toBeVisible({ timeout: 5000 });
  });

  test('submitting a complete entry shows success feedback', async ({ page }) => {
    // Select first available category button
    const firstCat = page.locator('[data-testid^="category-btn-"]').first();
    await expect(firstCat).toBeVisible({ timeout: 5000 });
    await firstCat.click();

    // Fill text via the entry-text-input testid on the Autocomplete input
    await page.getByTestId('entry-text-input').fill('E2E log entry test');

    // Submit via the entry-submit testid
    await page.getByTestId('entry-submit').click();

    // Expect success feedback via entry-success testid
    await expect(page.getByTestId('entry-success')).toBeVisible({ timeout: 5000 });
  });

  test('submitting without category shows validation error', async ({ page }) => {
    await page.getByTestId('entry-text-input').fill('Missing category');
    await page.getByTestId('entry-submit').click();
    await expect(page.getByTestId('entry-error')).toBeVisible();
  });

  test('submitting without text shows validation error', async ({ page }) => {
    const firstCat = page.locator('[data-testid^="category-btn-"]').first();
    await expect(firstCat).toBeVisible({ timeout: 5000 });
    await firstCat.click();
    await page.getByTestId('entry-submit').click();
    await expect(page.getByTestId('entry-error')).toBeVisible();
  });
});
