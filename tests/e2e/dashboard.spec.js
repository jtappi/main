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

test.describe('Dashboard Flow', () => {
  test('unauthenticated access redirects to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForURL(`${BASE_URL}/login`);
    expect(page.url()).toContain('/login');
  });

  test('dashboard renders header and project grid after login', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByTestId('dashboard-header')).toBeVisible();
    await expect(page.getByTestId('dashboard-user-name')).toBeVisible();
    await expect(page.getByTestId('dashboard-project-grid')).toBeVisible();
  });

  test('admin link is visible for admin user', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByTestId('dashboard-admin-link')).toBeVisible();
  });

  test('logout clears session and redirects to login', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByTestId('dashboard-logout-btn').click();
    await page.waitForURL(`${BASE_URL}/login`);
    expect(page.url()).toContain('/login');
    // Verify session is gone — navigating to dashboard should redirect back
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForURL(`${BASE_URL}/login`);
  });
});
