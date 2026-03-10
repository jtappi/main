'use strict';

/**
 * E2E Global Setup
 *
 * Adds known test users to the live users.json before E2E tests run.
 * Uses auth.js directly — same code path as the application.
 *
 * Test users are identified by a stable ID prefix 'e2e-' so teardown
 * can remove them cleanly without touching real accounts.
 *
 * Credentials:
 *   Admin : username=e2e-admin  password=e2epassword
 *   Guest : username=e2e-guest  password=e2epassword
 */

const path = require('path');
const auth = require('../../core/auth/auth');

const USERS_FILE = path.join(__dirname, '../../core/data/users.json');

const TEST_USERS = [
  {
    id: 'e2e-admin-001',
    name: 'E2E Admin',
    email: 'e2e-admin@test.local',
    username: 'e2e-admin',
    password: 'e2epassword',
    role: 'admin',
    projectAccess: ['trackmyweek']
  },
  {
    id: 'e2e-guest-001',
    name: 'E2E Guest',
    email: 'e2e-guest@test.local',
    username: 'e2e-guest',
    password: 'e2epassword',
    projectAccess: ['trackmyweek']
  }
];

module.exports = async function globalSetup() {
  const users = auth.loadUsers(USERS_FILE);

  for (const testUser of TEST_USERS) {
    // Remove any stale copy from a previous interrupted run
    const existing = users.findIndex(u => u.id === testUser.id);
    if (existing !== -1) users.splice(existing, 1);

    // Insert with known stable ID so teardown can find it by ID
    const newUser = {
      id: testUser.id,
      name: testUser.name,
      email: testUser.email,
      username: testUser.username,
      passwordHash: auth.hashPassword(testUser.password),
      role: testUser.role || 'guest',
      active: true,
      projectAccess: testUser.projectAccess || [],
      lastLogin: null,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
  }

  auth.saveUsers(users, USERS_FILE);
  console.log('[E2E setup] Test users added to users.json');
};
