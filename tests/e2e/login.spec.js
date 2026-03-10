// @ts-check
'use strict';

const { test, expect } = require('@playwright/test');

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const ADMIN_USER = 'e2e-admin';
const ADMIN_PASS = 'e2epassword';
const GUEST_USER = 'e2e-guest';
const GUEST_PASS = 'e2epassword';

// ── Login page renders ────────────────────────────────────────────────────────
test('login page renders required elements', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await expect(page.getByTestId('login-card')).toBeVisible();
  await expect(page.getByTestId('login-logo')).toBeVisible();
  await expect(page.getByTestId('login-identifier')).toBeVisible();
  await expect(page.getByTestId('login-password')).toBeVisible();
  await expect(page.getByTestId('login-submit-btn')).toBeVisible();
  await expect(page.getByTestId('login-error')).toBeHidden();
});

// ── Bad credentials show error ────────────────────────────────────────────────
test('shows error message for invalid credentials', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.getByTestId('login-identifier').fill('nobody');
  await page.getByTestId('login-password').fill('wrongpassword');
  await page.getByTestId('login-submit-btn').click();
  await expect(page.getByTestId('login-error')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

// ── Empty fields show error ───────────────────────────────────────────────────
test('shows error when fields are empty', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.getByTestId('login-submit-btn').click();
  await expect(page.getByTestId('login-error')).toBeVisible();
});

// ── Successful admin login ────────────────────────────────────────────────────
test('admin login redirects to dashboard', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.getByTestId('login-identifier').fill(ADMIN_USER);
  await page.getByTestId('login-password').fill(ADMIN_PASS);
  await page.getByTestId('login-submit-btn').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
});

// ── Successful guest login ────────────────────────────────────────────────────
test('guest login redirects to dashboard', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.getByTestId('login-identifier').fill(GUEST_USER);
  await page.getByTestId('login-password').fill(GUEST_PASS);
  await page.getByTestId('login-submit-btn').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
});

// ── Already logged in → skip login ───────────────────────────────────────────
test('visiting /login while authenticated redirects to dashboard', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.getByTestId('login-identifier').fill(ADMIN_USER);
  await page.getByTestId('login-password').fill(ADMIN_PASS);
  await page.getByTestId('login-submit-btn').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
  await page.goto(`${BASE}/login`);
  await expect(page).toHaveURL(/\/dashboard/);
});
