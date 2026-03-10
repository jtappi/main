'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const auth = require('../../core/auth/auth');

// ── Fixture helpers ──────────────────────────────────────────────────────────
const FIXTURE = path.join(__dirname, '../fixtures/users.fixture.json');

function makeTempUsersFile() {
  const tmp = path.join(os.tmpdir(), `users-test-${Date.now()}.json`);
  fs.copyFileSync(FIXTURE, tmp);
  return tmp;
}

// ── hashPassword ─────────────────────────────────────────────────────────────
describe('hashPassword', () => {
  test('returns a 64-char hex string', () => {
    const hash = auth.hashPassword('test');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  test('same input always produces same hash', () => {
    expect(auth.hashPassword('hello')).toBe(auth.hashPassword('hello'));
  });

  test('different inputs produce different hashes', () => {
    expect(auth.hashPassword('a')).not.toBe(auth.hashPassword('b'));
  });
});

// ── loadUsers ─────────────────────────────────────────────────────────────────
describe('loadUsers', () => {
  test('loads users from a valid file', () => {
    const users = auth.loadUsers(FIXTURE);
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
  });

  test('throws when file does not exist', () => {
    expect(() => auth.loadUsers('/nonexistent/path.json')).toThrow();
  });
});

// ── findUser ──────────────────────────────────────────────────────────────────
describe('findUser', () => {
  test('finds user by email', () => {
    const user = auth.findUser('admin@test.com', FIXTURE);
    expect(user).not.toBeNull();
    expect(user.id).toBe('test-admin-001');
  });

  test('finds user by username', () => {
    const user = auth.findUser('testadmin', FIXTURE);
    expect(user).not.toBeNull();
    expect(user.id).toBe('test-admin-001');
  });

  test('returns null for unknown identifier', () => {
    expect(auth.findUser('nobody@test.com', FIXTURE)).toBeNull();
  });
});

// ── authenticate ──────────────────────────────────────────────────────────────
describe('authenticate', () => {
  // passwordHash for 'test' = SHA256('test')
  const VALID_HASH = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';

  test('returns user on valid email + hash', () => {
    const user = auth.authenticate('admin@test.com', VALID_HASH, FIXTURE);
    expect(user).not.toBeNull();
    expect(user.role).toBe('admin');
  });

  test('returns user on valid username + hash', () => {
    const user = auth.authenticate('testadmin', VALID_HASH, FIXTURE);
    expect(user).not.toBeNull();
  });

  test('returns null for wrong password', () => {
    expect(auth.authenticate('admin@test.com', 'badhash', FIXTURE)).toBeNull();
  });

  test('returns null for unknown identifier', () => {
    expect(auth.authenticate('nobody', VALID_HASH, FIXTURE)).toBeNull();
  });

  test('returns null for inactive user', () => {
    expect(auth.authenticate('inactive@test.com', VALID_HASH, FIXTURE)).toBeNull();
  });
});

// ── updateLastLogin ───────────────────────────────────────────────────────────
describe('updateLastLogin', () => {
  test('updates lastLogin timestamp for existing user', () => {
    const tmp = makeTempUsersFile();
    auth.updateLastLogin('test-admin-001', tmp);
    const users = auth.loadUsers(tmp);
    const user = users.find(u => u.id === 'test-admin-001');
    expect(user.lastLogin).not.toBeNull();
    fs.unlinkSync(tmp);
  });

  test('does nothing for unknown userId', () => {
    const tmp = makeTempUsersFile();
    expect(() => auth.updateLastLogin('unknown-id', tmp)).not.toThrow();
    fs.unlinkSync(tmp);
  });
});

// ── getAllUsers ───────────────────────────────────────────────────────────────
describe('getAllUsers', () => {
  test('returns all users array', () => {
    const users = auth.getAllUsers(FIXTURE);
    expect(users).toHaveLength(3);
  });
});

// ── getUserById ───────────────────────────────────────────────────────────────
describe('getUserById', () => {
  test('returns user for valid id', () => {
    const user = auth.getUserById('test-admin-001', FIXTURE);
    expect(user.email).toBe('admin@test.com');
  });

  test('returns null for unknown id', () => {
    expect(auth.getUserById('nope', FIXTURE)).toBeNull();
  });
});

// ── createUser ────────────────────────────────────────────────────────────────
describe('createUser', () => {
  test('creates a new guest user and persists it', () => {
    const tmp = makeTempUsersFile();
    const before = auth.loadUsers(tmp).length;
    const user = auth.createUser(
      { name: 'New User', email: 'new@test.com', username: 'newuser', password: 'secret', projectAccess: ['trackmyweek'] },
      tmp
    );
    expect(user.role).toBe('guest');
    expect(user.id).toBeDefined();
    expect(auth.loadUsers(tmp).length).toBe(before + 1);
    fs.unlinkSync(tmp);
  });

  test('defaults projectAccess to empty array if not provided', () => {
    const tmp = makeTempUsersFile();
    const user = auth.createUser(
      { name: 'N', email: 'n@test.com', username: 'n', password: 'p' },
      tmp
    );
    expect(user.projectAccess).toEqual([]);
    fs.unlinkSync(tmp);
  });
});

// ── updateUser ────────────────────────────────────────────────────────────────
describe('updateUser', () => {
  test('updates fields on existing user', () => {
    const tmp = makeTempUsersFile();
    const updated = auth.updateUser('test-guest-001', { name: 'Updated Name' }, tmp);
    expect(updated.name).toBe('Updated Name');
    fs.unlinkSync(tmp);
  });

  test('hashes password when password field is supplied', () => {
    const tmp = makeTempUsersFile();
    const updated = auth.updateUser('test-guest-001', { password: 'newpass' }, tmp);
    expect(updated.passwordHash).toBe(auth.hashPassword('newpass'));
    expect(updated.password).toBeUndefined();
    fs.unlinkSync(tmp);
  });

  test('returns null for unknown id', () => {
    const tmp = makeTempUsersFile();
    expect(auth.updateUser('nope', { name: 'x' }, tmp)).toBeNull();
    fs.unlinkSync(tmp);
  });
});

// ── deleteUser ────────────────────────────────────────────────────────────────
describe('deleteUser', () => {
  test('deletes existing user and returns true', () => {
    const tmp = makeTempUsersFile();
    const result = auth.deleteUser('test-guest-001', tmp);
    expect(result).toBe(true);
    expect(auth.getUserById('test-guest-001', tmp)).toBeNull();
    fs.unlinkSync(tmp);
  });

  test('returns false for unknown id', () => {
    const tmp = makeTempUsersFile();
    expect(auth.deleteUser('nope', tmp)).toBe(false);
    fs.unlinkSync(tmp);
  });
});
