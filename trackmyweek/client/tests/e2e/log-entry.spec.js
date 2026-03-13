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
    await expect(buttons.first()).toBeVisible();
  });

  test('submitting a complete entry shows success feedback', async ({ page }) => {
    // Select first available category
    const firstCat = page.locator('[data-testid^="category-btn-"]').first();
    await firstCat.click();

    // Fill text
    await page.getByPlaceholder(/what happened/i).fill('E2E test entry');

    // Submit
    await page.getByRole('button', { name: /log entry/i }).click();

    // Expect success feedback
    await expect(page.locator('.success-msg, [data-testid="success-msg"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test('submitting without category shows validation error', async ({ page }) => {
    await page.getByPlaceholder(/what happened/i).fill('Missing category');
    await page.getByRole('button', { name: /log entry/i }).click();
    await expect(page.locator('.error-msg')).toBeVisible();
  });

  test('submitting without text shows validation error', async ({ page }) => {
    const firstCat = page.locator('[data-testid^="category-btn-"]').first();
    await firstCat.click();
    await page.getByRole('button', { name: /log entry/i }).click();
    await expect(page.locator('.error-msg')).toBeVisible();
  });
});
