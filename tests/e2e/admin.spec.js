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

// ── Access control ────────────────────────────────────────────────────────────
test('unauthenticated access to /admin returns 401', async ({ request }) => {
  const res = await request.get(`${BASE}/admin`);
  expect(res.status()).toBe(401);
});

test('guest cannot access /admin (403)', async ({ page, request }) => {
  await loginAs(page, GUEST_USER, GUEST_PASS);
  // Use the same browser context (carries session cookie)
  const res = await page.request.get(`${BASE}/admin`);
  expect(res.status()).toBe(403);
});

// ── Admin panel renders ───────────────────────────────────────────────────────
test('admin panel renders all required elements', async ({ page }) => {
  await loginAs(page, ADMIN_USER, ADMIN_PASS);
  await page.goto(`${BASE}/admin`);
  await expect(page.getByTestId('admin-header')).toBeVisible();
  await expect(page.getByTestId('admin-tabs')).toBeVisible();
  await expect(page.getByTestId('admin-tab-users')).toBeVisible();
  await expect(page.getByTestId('admin-tab-projects')).toBeVisible();
  await expect(page.getByTestId('admin-dashboard-link')).toBeVisible();
  await expect(page.getByTestId('admin-logout-btn')).toBeVisible();
});

// ── Tab switching ─────────────────────────────────────────────────────────────
test('users tab is active by default and shows users table', async ({ page }) => {
  await loginAs(page, ADMIN_USER, ADMIN_PASS);
  await page.goto(`${BASE}/admin`);
  await expect(page.getByTestId('admin-users-panel')).toBeVisible();
  await expect(page.getByTestId('admin-projects-panel')).toBeHidden();
  await expect(page.getByTestId('admin-users-table')).toBeVisible();
});

test('clicking projects tab shows projects panel', async ({ page }) => {
  await loginAs(page, ADMIN_USER, ADMIN_PASS);
  await page.goto(`${BASE}/admin`);
  await page.getByTestId('admin-tab-projects').click();
  await expect(page.getByTestId('admin-projects-panel')).toBeVisible();
  await expect(page.getByTestId('admin-users-panel')).toBeHidden();
});

test('clicking back to users tab hides projects panel', async ({ page }) => {
  await loginAs(page, ADMIN_USER, ADMIN_PASS);
  await page.goto(`${BASE}/admin`);
  await page.getByTestId('admin-tab-projects').click();
  await page.getByTestId('admin-tab-users').click();
  await expect(page.getByTestId('admin-users-panel')).toBeVisible();
  await expect(page.getByTestId('admin-projects-panel')).toBeHidden();
});

// ── Users table populates ─────────────────────────────────────────────────────
test('users table has at least one row after load', async ({ page }) => {
  await loginAs(page, ADMIN_USER, ADMIN_PASS);
  await page.goto(`${BASE}/admin`);
  await expect(
    page.getByTestId('admin-users-tbody').locator('tr').first()
  ).toBeVisible({ timeout: 5000 });
});

// ── Create user modal ─────────────────────────────────────────────────────────
test('create user modal opens and closes', async ({ page }) => {
  await loginAs(page, ADMIN_USER, ADMIN_PASS);
  await page.goto(`${BASE}/admin`);
  await expect(page.getByTestId('admin-create-user-modal')).toBeHidden();
  await page.getByTestId('admin-create-user-btn').click();
  await expect(page.getByTestId('admin-create-user-modal')).toBeVisible();
  await page.getByTestId('admin-cancel-user-btn').click();
  await expect(page.getByTestId('admin-create-user-modal')).toBeHidden();
});

test('create user modal shows error for empty fields', async ({ page }) => {
  await loginAs(page, ADMIN_USER, ADMIN_PASS);
  await page.goto(`${BASE}/admin`);
  await page.getByTestId('admin-create-user-btn').click();
  await expect(page.getByTestId('admin-modal-error')).toBeHidden();
  await page.getByTestId('admin-save-user-btn').click();
  await expect(page.getByTestId('admin-modal-error')).toBeVisible();
});

// ── Admin logout ──────────────────────────────────────────────────────────────
test('admin logout redirects to login', async ({ page }) => {
  await loginAs(page, ADMIN_USER, ADMIN_PASS);
  await page.goto(`${BASE}/admin`);
  await page.getByTestId('admin-logout-btn').click();
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
});
