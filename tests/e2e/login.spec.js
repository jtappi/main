// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * E2E: Login Flow
 * Requires the portal to be running at BASE_URL (default: http://localhost:3000)
 */

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
  });

  test('login page renders key elements', async ({ page }) => {
    await expect(page.getByTestId('login-card')).toBeVisible();
    await expect(page.getByTestId('login-identifier')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-submit-btn')).toBeVisible();
    await expect(page.getByTestId('login-error')).toBeHidden();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.getByTestId('login-identifier').fill('nobody');
    await page.getByTestId('login-password').fill('wrongpass');
    await page.getByTestId('login-submit-btn').click();
    await expect(page.getByTestId('login-error')).toBeVisible();
  });

  test('redirects to dashboard on valid admin login', async ({ page }) => {
    await page.getByTestId('login-identifier').fill(process.env.E2E_ADMIN_USER || 'testadmin');
    await page.getByTestId('login-password').fill(process.env.E2E_ADMIN_PASS || 'test');
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(`${BASE_URL}/dashboard`);
    expect(page.url()).toContain('/dashboard');
  });

  test('enter key triggers login', async ({ page }) => {
    await page.getByTestId('login-identifier').fill(process.env.E2E_ADMIN_USER || 'testadmin');
    await page.getByTestId('login-password').fill(process.env.E2E_ADMIN_PASS || 'test');
    await page.keyboard.press('Enter');
    await page.waitForURL(`${BASE_URL}/dashboard`);
    expect(page.url()).toContain('/dashboard');
  });
});
