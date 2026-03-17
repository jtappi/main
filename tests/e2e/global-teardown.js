'use strict';

const path = require('path');
const auth = require('../../core/auth/auth');

const USERS_FILE = path.join(__dirname, '../../core/data/users.json');

// Stable IDs seeded by global-setup — remove exactly these, nothing else
const E2E_USER_IDS = [
  'e2e-admin-001',
  'e2e-guest-001',
  'e2e-single-001',
];

module.exports = async function globalTeardown() {
  const users   = auth.loadUsers(USERS_FILE);
  const cleaned = users.filter(u => !E2E_USER_IDS.includes(u.id));
  auth.saveUsers(cleaned, USERS_FILE);
  console.log('[E2E teardown] Test users removed from users.json');
};
