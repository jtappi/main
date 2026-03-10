'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USERS_FILE = path.join(__dirname, '../data/users.json');

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    throw new Error('users.json not found. Copy users.template.json to users.json and configure it.');
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function findUser(identifier) {
  const users = loadUsers();
  return users.find(
    u => u.email === identifier || u.username === identifier
  ) || null;
}

function authenticate(identifier, passwordHash) {
  const user = findUser(identifier);
  if (!user) return null;
  if (!user.active) return null;
  if (user.passwordHash !== passwordHash) return null;
  return user;
}

function updateLastLogin(userId) {
  const users = loadUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    user.lastLogin = new Date().toISOString();
    saveUsers(users);
  }
}

function getAllUsers() {
  return loadUsers();
}

function getUserById(id) {
  return loadUsers().find(u => u.id === id) || null;
}

function createUser(userData) {
  const users = loadUsers();
  const { v4: uuidv4 } = require('uuid');
  const newUser = {
    id: uuidv4(),
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
  saveUsers(users);
  return newUser;
}

function updateUser(id, updates) {
  const users = loadUsers();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return null;
  if (updates.password) {
    updates.passwordHash = hashPassword(updates.password);
    delete updates.password;
  }
  users[index] = { ...users[index], ...updates };
  saveUsers(users);
  return users[index];
}

function deleteUser(id) {
  const users = loadUsers();
  const filtered = users.filter(u => u.id !== id);
  if (filtered.length === users.length) return false;
  saveUsers(filtered);
  return true;
}

module.exports = {
  authenticate,
  updateLastLogin,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  hashPassword
};
