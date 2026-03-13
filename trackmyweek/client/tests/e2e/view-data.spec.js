import { test, expect } from '@playwright/test';

test.describe('View Data page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trackmyweek/view');
  });

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'View Data' })).toBeVisible();
  });

  test('filter bar is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="filter-bar"]')).toBeVisible();
  });

  test('day chart renders', async ({ page }) => {
    await expect(page.locator('[data-testid="day-chart"]')).toBeVisible();
  });

  test('keyword filter input accepts text', async ({ page }) => {
    const input = page.locator('[data-testid="filter-keyword"]');
    await input.fill('test');
    await expect(input).toHaveValue('test');
  });

  test('date range selector exists with expected options', async ({ page }) => {
    const select = page.locator('[data-testid="filter-daterange"]');
    await expect(select).toBeVisible();
    const options = await select.locator('option').allTextContents();
    expect(options.some((o) => o.includes('7'))).toBe(true);
  });
});
