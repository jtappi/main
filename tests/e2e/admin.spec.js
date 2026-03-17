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

// ── Auth boundaries ────────────────────────────────────────────────

test('unauthenticated /admin redirects to login with returnTo', async ({ request }) => {
  const res = await request.get(`${BASE}/admin`, { maxRedirects: 0 });
  expect(res.status()).toBe(302);
  expect(res.headers()['location']).toBe('/login?returnTo=%2Fadmin');
});

test('guest cannot access /admin (403)', async ({ page }) => {
  await loginAs(page, GUEST_USER, GUEST_PASS);
  const res = await page.request.get(`${BASE}/admin`);
  expect(res.status()).toBe(403);
});

// ── Smoke check ──────────────────────────────────────────────────

test('admin panel loads with users table populated', async ({ page }) => {
  await loginAs(page, ADMIN_USER, ADMIN_PASS);
  await page.goto(`${BASE}/admin`);
  await expect(page.getByTestId('admin-header')).toBeVisible();
  await expect(
    page.getByTestId('admin-users-tbody').locator('tr').first()
  ).toBeVisible({ timeout: 5000 });
});

// ── Status badge ─────────────────────────────────────────────────
// Confirms Active column shows an icon-only badge.

test('active user shows status badge in Active column', async ({ page }) => {
  await loginAs(page, ADMIN_USER, ADMIN_PASS);
  await page.goto(`${BASE}/admin`);
  await expect(
    page.getByTestId('admin-users-tbody').locator('tr').first()
  ).toBeVisible({ timeout: 5000 });
  const badge = page.getByTestId('admin-status-badge-e2e-admin-001');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveAttribute('title', 'Active');
  await expect(badge).toHaveClass(/status-active/);
});

// ── Actions column — all three buttons present ───────────────────

test('actions column has Edit, Disable, and Delete buttons for each user', async ({ page }) => {
  await loginAs(page, ADMIN_USER, ADMIN_PASS);
  await page.goto(`${BASE}/admin`);
  await expect(
    page.getByTestId('admin-users-tbody').locator('tr').first()
  ).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('admin-edit-btn-e2e-guest-001')).toBeVisible();
  await expect(page.getByTestId('admin-toggle-btn-e2e-guest-001')).toBeVisible();
  await expect(page.getByTestId('admin-delete-btn-e2e-guest-001')).toBeVisible();
});

// ── Edit modal ───────────────────────────────────────────────────

test('edit modal opens pre-filled with current user values', async ({ page }) => {
  await loginAs(page, ADMIN_USER, ADMIN_PASS);
  await page.goto(`${BASE}/admin`);
  await expect(
    page.getByTestId('admin-users-tbody').locator('tr').first()
  ).toBeVisible({ timeout: 5000 });

  await page.getByTestId('admin-edit-btn-e2e-guest-001').click();

  const modal = page.getByTestId('admin-edit-user-modal');
  await expect(modal).toBeVisible();
  await expect(page.getByTestId('admin-edit-name')).toHaveValue('E2E Guest');
  await expect(page.getByTestId('admin-edit-email')).toHaveValue('e2e-guest@test.local');
  await expect(page.getByTestId('admin-edit-username')).toHaveValue('e2e-guest');
  await expect(page.getByTestId('admin-edit-password')).toHaveValue('');
});

test('edit modal cancel closes without saving', async ({ page }) => {
  await loginAs(page, ADMIN_USER, ADMIN_PASS);
  await page.goto(`${BASE}/admin`);
  await expect(
    page.getByTestId('admin-users-tbody').locator('tr').first()
  ).toBeVisible({ timeout: 5000 });

  await page.getByTestId('admin-edit-btn-e2e-guest-001').click();
  await expect(page.getByTestId('admin-edit-user-modal')).toBeVisible();

  await page.getByTestId('admin-cancel-edit-btn').click();
  await expect(page.getByTestId('admin-edit-user-modal')).toBeHidden();
});

test('saving an edit updates the users table', async ({ page }) => {
  await loginAs(page, ADMIN_USER, ADMIN_PASS);
  await page.goto(`${BASE}/admin`);
  await expect(
    page.getByTestId('admin-users-tbody').locator('tr').first()
  ).toBeVisible({ timeout: 5000 });

  await page.getByTestId('admin-edit-btn-e2e-guest-001').click();
  await expect(page.getByTestId('admin-edit-user-modal')).toBeVisible();

  await page.getByTestId('admin-edit-name').fill('E2E Guest Edited');
  await page.getByTestId('admin-save-edit-btn').click();

  await expect(page.getByTestId('admin-edit-user-modal')).toBeHidden();
  await expect(page.getByTestId('admin-users-tbody')).toContainText('E2E Guest Edited');

  // Restore original name so subsequent runs start clean
  await page.getByTestId('admin-edit-btn-e2e-guest-001').click();
  await page.getByTestId('admin-edit-name').fill('E2E Guest');
  await page.getByTestId('admin-save-edit-btn').click();
  await expect(page.getByTestId('admin-edit-user-modal')).toBeHidden();
});

// ── Disable / Enable toggle ───────────────────────────────────────

test('disable toggle changes status badge then back to Active', async ({ page }) => {
  await loginAs(page, ADMIN_USER, ADMIN_PASS);
  await page.goto(`${BASE}/admin`);
  await expect(
    page.getByTestId('admin-users-tbody').locator('tr').first()
  ).toBeVisible({ timeout: 5000 });

  // Disable e2e-guest
  await page.getByTestId('admin-toggle-btn-e2e-guest-001').click();
  const badge = page.getByTestId('admin-status-badge-e2e-guest-001');
  await expect(badge).toHaveAttribute('title', 'Disabled', { timeout: 5000 });
  await expect(badge).toHaveClass(/status-disabled/);
  await expect(page.getByTestId('admin-toggle-btn-e2e-guest-001')).toHaveAttribute('title', 'Enable user');
  await expect(page.getByTestId('admin-toggle-btn-e2e-guest-001')).toHaveClass(/icon-btn-enable/);

  // Re-enable to leave state clean for other tests
  await page.getByTestId('admin-toggle-btn-e2e-guest-001').click();
  await expect(badge).toHaveAttribute('title', 'Active', { timeout: 5000 });
  await expect(badge).toHaveClass(/status-active/);
  await expect(page.getByTestId('admin-toggle-btn-e2e-guest-001')).toHaveAttribute('title', 'Disable user');
  await expect(page.getByTestId('admin-toggle-btn-e2e-guest-001')).toHaveClass(/icon-btn-disable/);
});
