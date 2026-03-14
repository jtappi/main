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

test('unauthenticated /dashboard redirects to /login', async ({ request }) => {
  const res = await request.get(`${BASE}/dashboard`, { maxRedirects: 0 });
  expect(res.status()).toBe(302);
});

// ── Smoke check ───────────────────────────────────────────────────────────────
// Confirms the dashboard loads and the projects API returned data.

test('dashboard loads with project cards for guest', async ({ page }) => {
  await loginAs(page, GUEST_USER, GUEST_PASS);
  await expect(page.getByTestId('dashboard-header')).toBeVisible();
  await expect(page.getByTestId('dashboard-project-grid').locator('.project-card').first()).toBeVisible({ timeout: 5000 });
});

// ── Critical flows ────────────────────────────────────────────────────────────

test('admin link hidden for guest, visible for admin', async ({ page }) => {
  await loginAs(page, GUEST_USER, GUEST_PASS);
  await expect(page.getByTestId('dashboard-admin-link')).toBeHidden();
});

test('admin link visible for admin user', async ({ page }) => {
  await loginAs(page, ADMIN_USER, ADMIN_PASS);
  await expect(page.getByTestId('dashboard-admin-link')).toBeVisible();
});

test('logout destroys session', async ({ page }) => {
  await loginAs(page, GUEST_USER, GUEST_PASS);
  await page.getByTestId('dashboard-logout-btn').click();
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  await page.goto(`${BASE}/dashboard`);
  await expect(page).toHaveURL(/\/login/);
});
