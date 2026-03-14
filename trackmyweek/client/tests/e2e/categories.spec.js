import { test, expect } from '@playwright/test';

test.describe('Categories page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trackmyweek/categories');
  });

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();
  });

  test('existing categories are listed', async ({ page }) => {
    const list = page.getByTestId('category-list');
    await expect(list).toBeVisible();
    const items = list.locator('li');
    await expect(items.first()).toBeVisible();
  });

  test('can add a new category', async ({ page, request }) => {
    const nameInput = page.getByTestId('new-cat-name');
    await nameInput.fill('E2E Test Category');
    await page.getByTestId('add-cat-btn').click();

    // Input should clear on success
    await expect(nameInput).toHaveValue('', { timeout: 5000 });

    // New category should appear in list
    await expect(
      page.getByTestId('category-list').getByText('E2E Test Category')
    ).toBeVisible();
  });

  test.afterEach(async ({ request }) => {
    // Clean up any E2E test category created during the test run.
    // Fetch all categories and delete the one named 'E2E Test Category' if it exists.
    try {
      const res = await request.get('/trackmyweek/api/categories');
      if (!res.ok()) return;
      const cats = await res.json();
      const target = cats.find((c) => c.name === 'E2E Test Category');
      if (target) {
        await request.delete(`/trackmyweek/api/categories/${target.id}`);
      }
    } catch {
      // Best-effort — do not fail the test if cleanup fails
    }
  });

  test('edit button reveals edit form', async ({ page }) => {
    const list = page.getByTestId('category-list');
    const firstRow = list.locator('li').first();

    // Edit buttons are always in the DOM — no hover needed
    const editBtn = firstRow.locator('[data-testid^="edit-btn-"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Edit input should be visible
    const editInput = firstRow.locator('[data-testid^="edit-name-"]');
    await expect(editInput).toBeVisible();
  });
});
