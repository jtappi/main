// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

async function loginAsAdmin(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByTestId('login-identifier').fill(process.env.E2E_ADMIN_USER || 'testadmin');
  await page.getByTestId('login-password').fill(process.env.E2E_ADMIN_PASS || 'test');
  await page.getByTestId('login-submit-btn').click();
  await page.waitForURL(`${BASE_URL}/dashboard`);
}

test.describe('Admin Panel Flow', () => {
  test('guest cannot access /admin', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.getByTestId('login-identifier').fill(process.env.E2E_GUEST_USER || 'testguest');
    await page.getByTestId('login-password').fill(process.env.E2E_GUEST_PASS || 'test');
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(`${BASE_URL}/dashboard`);
    const res = await page.goto(`${BASE_URL}/admin`);
    expect(res.status()).toBe(403);
  });

  test('admin panel renders both tabs', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin`);
    await expect(page.getByTestId('admin-tab-users')).toBeVisible();
    await expect(page.getByTestId('admin-tab-projects')).toBeVisible();
    await expect(page.getByTestId('admin-users-table')).toBeVisible();
  });

  test('switching to projects tab shows projects table', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin`);
    await page.getByTestId('admin-tab-projects').click();
    await expect(page.getByTestId('admin-projects-table')).toBeVisible();
  });

  test('create guest modal opens and closes', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin`);
    await page.getByTestId('admin-create-user-btn').click();
    await expect(page.getByTestId('admin-create-user-modal')).toBeVisible();
    await page.getByTestId('admin-cancel-user-btn').click();
    await expect(page.getByTestId('admin-create-user-modal')).toBeHidden();
  });

  test('create guest modal shows error on empty submit', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin`);
    await page.getByTestId('admin-create-user-btn').click();
    await page.getByTestId('admin-save-user-btn').click();
    await expect(page.getByTestId('admin-modal-error')).toBeVisible();
  });
});
