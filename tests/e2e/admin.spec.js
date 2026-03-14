// @ts-check
'use strict';

const { test, expect } = require('@playwright/test');

const BASE       = process.env.E2E_BASE_URL || 'http://localhost:3000';
const ADMIN_USER = 'e2e-admin';
const ADMIN_PASS = 'e2epassword';
const GUEST_USER = 'e2e-guest';
const GUEST_PASS = 'e2epassword';

async function loginAs(page, username, password) {
  await page.goto(`${BASE}/login`);
  await page.getByTestId('login-identifier').fill(username);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit-btn').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
}

// ── Auth boundaries ───────────────────────────────────────────────────────────

test('unauthenticated /admin returns 403', async ({ request }) => {
  const res = await request.get(`${BASE}/admin`, { maxRedirects: 0 });
  expect(res.status()).toBe(403);
});

test('guest cannot access /admin (403)', async ({ page }) => {
  await loginAs(page, GUEST_USER, GUEST_PASS);
  const res = await page.request.get(`${BASE}/admin`);
  expect(res.status()).toBe(403);
});

// ── Smoke check ───────────────────────────────────────────────────────────────
// Confirms the admin page loads and the users API returned data.

test('admin panel loads with users table populated', async ({ page }) => {
  await loginAs(page, ADMIN_USER, ADMIN_PASS);
  await page.goto(`${BASE}/admin`);
  await expect(page.getByTestId('admin-header')).toBeVisible();
  await expect(
    page.getByTestId('admin-users-tbody').locator('tr').first()
  ).toBeVisible({ timeout: 5000 });
});
