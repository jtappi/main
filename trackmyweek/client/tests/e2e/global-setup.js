/**
 * global-setup.js — CI auth setup for TrackMyWeek E2E tests.
 *
 * The trackmyweek app is mounted inside the portal and protected by
 * requireAuth. Without an active session every API call returns 401.
 *
 * This setup:
 *  1. Seeds the e2e-tmw test user directly into users.json via auth.js.
 *     We cannot rely on the portal E2E suite having left the user behind
 *     because portal's global-teardown.js removes all e2e-* users when
 *     the portal suite finishes — which runs before this suite starts.
 *  2. Launches a temporary browser context and POSTs to /auth/login.
 *  3. Saves the resulting session cookie to .auth-state.json.
 *  4. All specs load that storageState so every page.goto() starts
 *     with a valid authenticated session.
 *
 * Teardown: global-teardown.js removes the seeded user after the run.
 */

import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const require    = createRequire(import.meta.url);
const auth       = require('../../../../core/auth/auth');
const USERS_FILE = path.join(__dirname, '../../../../core/data/users.json');

export const STORAGE_STATE = path.join(__dirname, '.auth-state.json');

const TEST_USER = {
  id:            'e2e-tmw-001',
  name:          'E2E TrackMyWeek',
  email:         'e2e-tmw@test.local',
  username:      'e2e-tmw',
  password:      'e2epassword',
  role:          'admin',
  projectAccess: ['trackmyweek'],
};

export default async function globalSetup() {
  // ── 1. Seed test user ───────────────────────────────────────────────
  const users    = auth.loadUsers(USERS_FILE);
  const existing = users.findIndex(u => u.id === TEST_USER.id);
  if (existing !== -1) users.splice(existing, 1);

  users.push({
    id:            TEST_USER.id,
    name:          TEST_USER.name,
    email:         TEST_USER.email,
    username:      TEST_USER.username,
    passwordHash:  auth.hashPassword(TEST_USER.password),
    role:          TEST_USER.role,
    active:        true,
    projectAccess: TEST_USER.projectAccess,
    lastLogin:     null,
    createdAt:     new Date().toISOString(),
  });
  auth.saveUsers(users, USERS_FILE);
  console.log('[TMW E2E setup] Test user seeded:', TEST_USER.username);

  // ── 2. Log in and save session state ────────────────────────────────
  const browser  = await chromium.launch();
  const context  = await browser.newContext();
  const page     = await context.newPage();

  const passwordHash = auth.hashPassword(TEST_USER.password);

  const response = await page.request.post('http://localhost:3000/auth/login', {
    data:    { identifier: TEST_USER.username, passwordHash },
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok()) {
    const body = await response.text();
    await browser.close();
    throw new Error(
      `[TMW E2E setup] Login failed: ${response.status()} ${body}`
    );
  }

  const body = await response.json();
  if (!body.success) {
    await browser.close();
    throw new Error(
      `[TMW E2E setup] Login returned success=false: ${JSON.stringify(body)}`
    );
  }

  await context.storageState({ path: STORAGE_STATE });
  console.log('[TMW E2E setup] Auth state saved to', STORAGE_STATE);
  await browser.close();
}
