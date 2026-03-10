'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const auth = require('../../core/auth/auth');

const FIXTURE = path.join(__dirname, '../fixtures/users.fixture.json');

// Each test gets a fresh writable copy of the fixture
function makeTempUsers() {
  const tmp = path.join(os.tmpdir(), `users-${Date.now()}-${Math.random()}.json`);
  fs.copyFileSync(FIXTURE, tmp);
  return tmp;
}

// ── hashPassword ─────────────────────────────────────────────────────────────
describe('hashPassword', () => {
  test('returns 64-char hex string', () => {
    const h = auth.hashPassword('test');
    expect(h).toHaveLength(64);
    expect(h).toMatch(/^[0-9a-f]+$/);
  });

  test('SHA-256 of "test" matches known value', () => {
    expect(auth.hashPassword('test'))
      .toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
  });

  test('different inputs produce different hashes', () => {
    expect(auth.hashPassword('a')).not.toBe(auth.hashPassword('b'));
  });
});

// ── loadUsers ─────────────────────────────────────────────────────────────────
describe('loadUsers', () => {
  test('returns array from fixture', () => {
    const users = auth.loadUsers(FIXTURE);
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
  });

  test('throws if file does not exist', () => {
    expect(() => auth.loadUsers('/nonexistent/path.json')).toThrow();
  });
});

// ── findUser ──────────────────────────────────────────────────────────────────
describe('findUser', () => {
  test('finds by email', () => {
    const u = auth.findUser('admin@test.com', FIXTURE);
    expect(u).not.toBeNull();
    expect(u.id).toBe('test-admin-001');
  });

  test('finds by username', () => {
    const u = auth.findUser('testadmin', FIXTURE);
    expect(u).not.toBeNull();
    expect(u.id).toBe('test-admin-001');
  });

  test('returns null for unknown identifier', () => {
    expect(auth.findUser('nobody@nowhere.com', FIXTURE)).toBeNull();
  });
});

// ── authenticate ──────────────────────────────────────────────────────────────
describe('authenticate', () => {
  const HASH = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';

  test('returns user for valid admin credentials', () => {
    const u = auth.authenticate('testadmin', HASH, FIXTURE);
    expect(u).not.toBeNull();
    expect(u.role).toBe('admin');
  });

  test('returns user for valid guest credentials', () => {
    const u = auth.authenticate('testguest', HASH, FIXTURE);
    expect(u).not.toBeNull();
    expect(u.role).toBe('guest');
  });

  test('returns null for wrong password', () => {
    expect(auth.authenticate('testadmin', 'wronghash', FIXTURE)).toBeNull();
  });

  test('returns null for unknown user', () => {
    expect(auth.authenticate('nobody', HASH, FIXTURE)).toBeNull();
  });

  test('returns null for inactive user', () => {
    expect(auth.authenticate('inactiveuser', HASH, FIXTURE)).toBeNull();
  });
});

// ── updateLastLogin ───────────────────────────────────────────────────────────
describe('updateLastLogin', () => {
  test('sets lastLogin timestamp on user', () => {
    const tmp = makeTempUsers();
    auth.updateLastLogin('test-admin-001', tmp);
    const users = auth.loadUsers(tmp);
    const u = users.find(x => x.id === 'test-admin-001');
    expect(u.lastLogin).not.toBeNull();
    expect(new Date(u.lastLogin).getTime()).toBeLessThanOrEqual(Date.now());
  });

  test('does nothing for unknown id', () => {
    const tmp = makeTempUsers();
    expect(() => auth.updateLastLogin('no-such-id', tmp)).not.toThrow();
  });
});

// ── getAllUsers ───────────────────────────────────────────────────────────────
describe('getAllUsers', () => {
  test('returns all users', () => {
    const users = auth.getAllUsers(FIXTURE);
    expect(users.length).toBe(3);
  });
});

// ── getUserById ───────────────────────────────────────────────────────────────
describe('getUserById', () => {
  test('returns correct user', () => {
    const u = auth.getUserById('test-guest-001', FIXTURE);
    expect(u.username).toBe('testguest');
  });

  test('returns null for unknown id', () => {
    expect(auth.getUserById('no-such-id', FIXTURE)).toBeNull();
  });
});

// ── createUser ────────────────────────────────────────────────────────────────
describe('createUser', () => {
  test('adds user and returns it with an id', () => {
    const tmp = makeTempUsers();
    const u = auth.createUser({
      name: 'New User', email: 'new@test.com',
      username: 'newuser', password: 'secret123',
      projectAccess: ['trackmyweek']
    }, tmp);
    expect(u.id).toBeDefined();
    expect(u.role).toBe('guest');
    expect(u.active).toBe(true);
    // confirm it persisted
    const all = auth.loadUsers(tmp);
    expect(all.find(x => x.id === u.id)).toBeDefined();
  });

  test('hashes the password (does not store plaintext)', () => {
    const tmp = makeTempUsers();
    const u = auth.createUser({
      name: 'Test', email: 't@t.com',
      username: 'ttt', password: 'mypassword'
    }, tmp);
    expect(u.passwordHash).not.toBe('mypassword');
    expect(u.passwordHash).toHaveLength(64);
  });
});

// ── updateUser ────────────────────────────────────────────────────────────────
describe('updateUser', () => {
  test('updates a field', () => {
    const tmp = makeTempUsers();
    const updated = auth.updateUser('test-guest-001', { active: false }, tmp);
    expect(updated.active).toBe(false);
  });

  test('hashes password if included in update', () => {
    const tmp = makeTempUsers();
    const updated = auth.updateUser('test-guest-001', { password: 'newpass' }, tmp);
    expect(updated.passwordHash).toHaveLength(64);
    expect(updated.passwordHash).not.toBe('newpass');
  });

  test('returns null for unknown id', () => {
    const tmp = makeTempUsers();
    expect(auth.updateUser('no-such-id', { active: false }, tmp)).toBeNull();
  });
});

// ── deleteUser ────────────────────────────────────────────────────────────────
describe('deleteUser', () => {
  test('removes user and returns true', () => {
    const tmp = makeTempUsers();
    const result = auth.deleteUser('test-guest-001', tmp);
    expect(result).toBe(true);
    expect(auth.getUserById('test-guest-001', tmp)).toBeNull();
  });

  test('returns false for unknown id', () => {
    const tmp = makeTempUsers();
    expect(auth.deleteUser('no-such-id', tmp)).toBe(false);
  });
});
