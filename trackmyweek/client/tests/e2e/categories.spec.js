import { test, expect } from '@playwright/test';

test.describe('Categories', () => {
  // ── Smoke check ─────────────────────────────────────────────────────────────
  // Confirms the page loads and the categories API returned data.
  test('page loads with existing categories from API', async ({ page }) => {
    await page.goto('/trackmyweek/categories');
    await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();
    await expect(page.getByTestId('category-list').locator('li').first()).toBeVisible();
  });

  // ── Critical flow ────────────────────────────────────────────────────────────
  // Full round-trip: fill form → POST to API → new category appears in list.
  test('adding a new category persists and appears in list', async ({ page, request }) => {
    await page.goto('/trackmyweek/categories');
    await page.getByTestId('new-cat-name').fill('E2E Test Category');
    await page.getByTestId('add-cat-btn').click();
    await expect(page.getByTestId('new-cat-name')).toHaveValue('', { timeout: 5000 });
    await expect(
      page.getByTestId('category-list').getByText('E2E Test Category')
    ).toBeVisible();
  });

  test.afterEach(async ({ request }) => {
    // Clean up any category created during the test run.
    try {
      const res = await request.get('/trackmyweek/api/categories');
      if (!res.ok()) return;
      const cats = await res.json();
      const target = cats.find((c) => c.name === 'E2E Test Category');
      if (target) await request.delete(`/trackmyweek/api/categories/${target.id}`);
    } catch {
      // Best-effort — do not fail the test if cleanup fails
    }
  });
});
