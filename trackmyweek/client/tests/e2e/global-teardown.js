/**
 * global-teardown.js — CI auth teardown for TrackMyWeek E2E tests.
 *
 * Removes the test user seeded by global-setup.js.
 * Identified by stable ID 'e2e-tmw-001' — never touches other accounts.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const require    = createRequire(import.meta.url);
const auth       = require('../../../../core/auth/auth');
const USERS_FILE = path.join(__dirname, '../../../../core/data/users.json');

export default async function globalTeardown() {
  const users   = auth.loadUsers(USERS_FILE);
  const cleaned = users.filter(u => u.id !== 'e2e-tmw-001');
  auth.saveUsers(cleaned, USERS_FILE);
  console.log('[TMW E2E teardown] Test user removed');
}
