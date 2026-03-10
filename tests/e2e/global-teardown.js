'use strict';

/**
 * E2E Global Teardown
 *
 * Removes test users added by global-setup.js.
 * Identifies them by stable ID prefix 'e2e-' — never touches real accounts.
 */

const path = require('path');
const auth = require('../../core/auth/auth');

const USERS_FILE = path.join(__dirname, '../../core/data/users.json');

module.exports = async function globalTeardown() {
  const users = auth.loadUsers(USERS_FILE);
  const cleaned = users.filter(u => !u.id.startsWith('e2e-'));
  auth.saveUsers(cleaned, USERS_FILE);
  console.log('[E2E teardown] Test users removed from users.json');
};
