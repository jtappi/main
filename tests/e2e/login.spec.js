// @ts-check
'use strict';

const { test, expect } = require('@playwright/test');

const BASE       = process.env.E2E_BASE_URL || 'http://localhost:3000';
const ADMIN_USER = 'e2e-admin';
const ADMIN_PASS = 'e2epassword';
const GUEST_USER = 'e2e-guest';
const GUEST_PASS = 'e2epassword';

// ── Smoke check ───────────────────────────────────────────────────────────────
// Confirms the login page is reachable and not broken.
test('login page loads', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await expect(page.getByTestId('login-card')).toBeVisible();
});

// ── Auth critical flows ───────────────────────────────────────────────────────

test('admin login redirects to dashboard', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.getByTestId('login-identifier').fill(ADMIN_USER);
  await page.getByTestId('login-password').fill(ADMIN_PASS);
  await page.getByTestId('login-submit-btn').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
});

test('guest login redirects to dashboard', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.getByTestId('login-identifier').fill(GUEST_USER);
  await page.getByTestId('login-password').fill(GUEST_PASS);
  await page.getByTestId('login-submit-btn').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
});

test('invalid credentials show server error', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.getByTestId('login-identifier').fill('nobody');
  await page.getByTestId('login-password').fill('wrongpassword');
  await page.getByTestId('login-submit-btn').click();
  await expect(page.getByTestId('login-error')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('authenticated session skips login page', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.getByTestId('login-identifier').fill(ADMIN_USER);
  await page.getByTestId('login-password').fill(ADMIN_PASS);
  await page.getByTestId('login-submit-btn').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
  await page.goto(`${BASE}/login`);
  await expect(page).toHaveURL(/\/dashboard/);
});
