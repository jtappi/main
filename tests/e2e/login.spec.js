// @ts-check
'use strict';

const { test, expect } = require('@playwright/test');

const BASE       = process.env.E2E_BASE_URL || 'http://localhost:3000';
const ADMIN_USER = 'e2e-admin';
const ADMIN_PASS = 'e2epassword';
const GUEST_USER = 'e2e-guest';
const GUEST_PASS = 'e2epassword';

// ── Smoke check ─────────────────────────────────────────────────────
test('login page loads', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await expect(page.getByTestId('login-card')).toBeVisible();
});

// ── Auth critical flows ──────────────────────────────────────────────────

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

// ── Critical flow: returnTo ───────────────────────────────────────────────
// Unauthenticated access → redirect to login with returnTo → login → land on original page

test('unauthenticated access to /dashboard redirects to login then back', async ({ page }) => {
  // Go directly to a protected page without a session
  await page.goto(`${BASE}/dashboard`);
  // Must land on login with returnTo in URL
  await expect(page).toHaveURL(/\/login\?returnTo=/, { timeout: 5000 });
  await expect(page.getByTestId('login-card')).toBeVisible();
  // Log in
  await page.getByTestId('login-identifier').fill(GUEST_USER);
  await page.getByTestId('login-password').fill(GUEST_PASS);
  await page.getByTestId('login-submit-btn').click();
  // Must land back on /dashboard — not the default /dashboard via a separate redirect
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
});

test('unauthenticated access to /admin redirects to login then back for admin user', async ({ page }) => {
  // Go directly to /admin without a session
  await page.goto(`${BASE}/admin`);
  // Must land on login with returnTo pointing at /admin
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fadmin/, { timeout: 5000 });
  await expect(page.getByTestId('login-card')).toBeVisible();
  // Log in as admin
  await page.getByTestId('login-identifier').fill(ADMIN_USER);
  await page.getByTestId('login-password').fill(ADMIN_PASS);
  await page.getByTestId('login-submit-btn').click();
  // Must land back on /admin
  await expect(page).toHaveURL(/\/admin/, { timeout: 5000 });
});
