'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// No external dependencies in core — crypto.randomUUID() is built into Node 14.17+
const DEFAULT_USERS_FILE = path.join(__dirname, '../data/users.json');

/**
 * Auth module — all functions accept an optional usersFile path
 * so tests can inject a fixture file without touching real data.
 */

function loadUsers(usersFile = DEFAULT_USERS_FILE) {
  if (!fs.existsSync(usersFile)) {
    throw new Error(
      'users.json not found. Copy users.template.json to users.json and configure it.'
    );
  }
  return JSON.parse(fs.readFileSync(usersFile, 'utf8'));
}

function saveUsers(users, usersFile = DEFAULT_USERS_FILE) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function findUser(identifier, usersFile = DEFAULT_USERS_FILE) {
  const users = loadUsers(usersFile);
  return users.find(
    u => u.email === identifier || u.username === identifier
  ) || null;
}

function authenticate(identifier, passwordHash, usersFile = DEFAULT_USERS_FILE) {
  const user = findUser(identifier, usersFile);
  if (!user) return null;
  if (!user.active) return null;
  if (user.passwordHash !== passwordHash) return null;
  return user;
}

function updateLastLogin(userId, usersFile = DEFAULT_USERS_FILE) {
  const users = loadUsers(usersFile);
  const user = users.find(u => u.id === userId);
  if (user) {
    user.lastLogin = new Date().toISOString();
    saveUsers(users, usersFile);
  }
}

function getAllUsers(usersFile = DEFAULT_USERS_FILE) {
  return loadUsers(usersFile);
}

function getUserById(id, usersFile = DEFAULT_USERS_FILE) {
  return loadUsers(usersFile).find(u => u.id === id) || null;
}

function createUser(userData, usersFile = DEFAULT_USERS_FILE) {
  const users = loadUsers(usersFile);
  const newUser = {
    id: crypto.randomUUID(),
    name: userData.name,
    email: userData.email,
    username: userData.username,
    passwordHash: hashPassword(userData.password),
    role: 'guest',
    active: true,
    projectAccess: userData.projectAccess || [],
    lastLogin: null,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  saveUsers(users, usersFile);
  return newUser;
}

function updateUser(id, updates, usersFile = DEFAULT_USERS_FILE) {
  const users = loadUsers(usersFile);
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return null;
  if (updates.password) {
    updates.passwordHash = hashPassword(updates.password);
    delete updates.password;
  }
  users[index] = { ...users[index], ...updates };
  saveUsers(users, usersFile);
  return users[index];
}

function deleteUser(id, usersFile = DEFAULT_USERS_FILE) {
  const users = loadUsers(usersFile);
  const filtered = users.filter(u => u.id !== id);
  if (filtered.length === users.length) return false;
  saveUsers(filtered, usersFile);
  return true;
}

module.exports = {
  loadUsers,
  saveUsers,
  hashPassword,
  findUser,
  authenticate,
  updateLastLogin,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
