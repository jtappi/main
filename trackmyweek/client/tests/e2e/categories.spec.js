import { test, expect } from '@playwright/test';

test.describe('Categories page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trackmyweek/categories');
  });

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();
  });

  test('existing categories are listed', async ({ page }) => {
    const list = page.locator('[data-testid="category-list"]');
    await expect(list).toBeVisible();
    const items = list.locator('li');
    await expect(items.first()).toBeVisible();
  });

  test('can add a new category', async ({ page }) => {
    const nameInput = page.locator('[data-testid="new-cat-name"]');
    await nameInput.fill('E2E Test Category');
    await page.locator('[data-testid="add-cat-btn"]').click();

    // Input should clear on success
    await expect(nameInput).toHaveValue('', { timeout: 5000 });

    // New category should appear in list
    await expect(
      page.locator('[data-testid="category-list"]').getByText('E2E Test Category')
    ).toBeVisible();
  });

  test('edit button reveals edit form', async ({ page }) => {
    const list = page.locator('[data-testid="category-list"]');
    const firstRow = list.locator('li').first();

    // Hover to show action buttons
    await firstRow.hover();
    const editBtn = firstRow.locator('[data-testid^="edit-btn-"]');
    await editBtn.click();

    // Edit input should be visible
    const editInput = firstRow.locator('[data-testid^="edit-name-"]');
    await expect(editInput).toBeVisible();
  });
});
