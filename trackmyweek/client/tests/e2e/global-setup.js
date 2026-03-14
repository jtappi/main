/**
 * global-setup.js — CI auth setup for TrackMyWeek E2E tests.
 *
 * The trackmyweek app is mounted inside the portal and protected by
 * requireAuth. Without an active session every API call returns 401
 * and the UI shows "Failed to fetch" / "Could not load categories".
 *
 * This setup:
 *  1. Launches a temporary browser context.
 *  2. Logs in as the e2e-admin user via POST /auth/login (the same
 *     endpoint the portal login page uses).
 *  3. Saves the resulting session cookie to a storageState file.
 *  4. All specs then load that storageState so every page.goto()
 *     starts with a valid authenticated session.
 *
 * The e2e-admin user is seeded by the portal's own global-setup.js
 * which runs before the portal E2E suite. We rely on that user already
 * existing in users.json when this runs. CI starts the portal E2E
 * suite first, which calls the portal global-setup, then runs the
 * trackmyweek suite — so the user is guaranteed to be present.
 *
 * Credentials (stable, defined in tests/e2e/global-setup.js at repo root):
 *   username : e2e-admin
 *   password : e2epassword
 */

import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const STORAGE_STATE = path.join(__dirname, '.auth-state.json');

export default async function globalSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page    = await context.newPage();

  // Hash the password the same way the portal does (SHA-256 hex)
  const passwordHash = crypto
    .createHash('sha256')
    .update('e2epassword')
    .digest('hex');

  // POST to the portal login endpoint directly — faster than UI login
  const response = await page.request.post('http://localhost:3000/auth/login', {
    data: { identifier: 'e2e-admin', passwordHash },
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `[TMW E2E setup] Login failed: ${response.status()} ${body}`
    );
  }

  const body = await response.json();
  if (!body.success) {
    throw new Error(
      `[TMW E2E setup] Login returned success=false: ${JSON.stringify(body)}`
    );
  }

  // Save cookies + localStorage so specs can reuse the session
  await context.storageState({ path: STORAGE_STATE });
  console.log('[TMW E2E setup] Auth state saved to', STORAGE_STATE);

  await browser.close();
}
