// @ts-check
'use strict';

const { test, expect } = require('@playwright/test');

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const ADMIN_USER = process.env.E2E_ADMIN_USER || 'testadmin';
const ADMIN_PASS = process.env.E2E_ADMIN_PASS || 'test';
const GUEST_USER = process.env.E2E_GUEST_USER || 'testguest';
const GUEST_PASS = process.env.E2E_GUEST_PASS || 'test';

async function loginAs(page, username, password) {
  await page.goto(`${BASE}/login`);
  await page.getByTestId('login-identifier').fill(username);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit-btn').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
}

// ── Unauthenticated redirect ──────────────────────────────────────────────────
test('unauthenticated access to /dashboard returns 401', async ({ request }) => {
  const res = await request.get(`${BASE}/dashboard`);
  expect(res.status()).toBe(401);
});

// ── Dashboard renders for guest ───────────────────────────────────────────────
test('dashboard renders all required elements for guest', async ({ page }) => {
  await loginAs(page, GUEST_USER, GUEST_PASS);
  await expect(page.getByTestId('dashboard-header')).toBeVisible();
  await expect(page.getByTestId('dashboard-user-name')).toBeVisible();
  await expect(page.getByTestId('dashboard-logout-btn')).toBeVisible();
  await expect(page.getByTestId('dashboard-project-grid')).toBeVisible();
});

// ── User name is populated ────────────────────────────────────────────────────
test('dashboard shows logged-in user name', async ({ page }) => {
  await loginAs(page, GUEST_USER, GUEST_PASS);
  const name = await page.getByTestId('dashboard-user-name').textContent();
  expect(name.trim().length).toBeGreaterThan(0);
});

// ── Admin link visibility ─────────────────────────────────────────────────────
test('admin link is HIDDEN for guest user', async ({ page }) => {
  await loginAs(page, GUEST_USER, GUEST_PASS);
  await expect(page.getByTestId('dashboard-admin-link')).toBeHidden();
});

test('admin link is VISIBLE for admin user', async ({ page }) => {
  await loginAs(page, ADMIN_USER, ADMIN_PASS);
  await expect(page.getByTestId('dashboard-admin-link')).toBeVisible();
});

// ── Project cards render ──────────────────────────────────────────────────────
test('project grid contains at least one card', async ({ page }) => {
  await loginAs(page, GUEST_USER, GUEST_PASS);
  const grid = page.getByTestId('dashboard-project-grid');
  await expect(grid).toBeVisible();
  // Wait for JS to populate cards (loading text disappears)
  await expect(grid.locator('.project-card').first()).toBeVisible({ timeout: 5000 });
});

// ── Logout works ──────────────────────────────────────────────────────────────
test('logout redirects to login page', async ({ page }) => {
  await loginAs(page, GUEST_USER, GUEST_PASS);
  await page.getByTestId('dashboard-logout-btn').click();
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
});

test('after logout, /dashboard returns 401', async ({ page, request }) => {
  await loginAs(page, GUEST_USER, GUEST_PASS);
  await page.getByTestId('dashboard-logout-btn').click();
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  const res = await request.get(`${BASE}/dashboard`);
  expect(res.status()).toBe(401);
});
