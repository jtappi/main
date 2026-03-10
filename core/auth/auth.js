const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '../data/users.json');

// Load users from JSON file
function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([]), 'utf8');
    }
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

// Save users to JSON file
function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

// Hash password with SHA256
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Find user by email or username
function findUser(identifier) {
    const users = loadUsers();
    return users.find(
        u => u.email === identifier || u.username === identifier
    );
}

// Authenticate user — returns user object or null
function authenticate(identifier, passwordHash) {
    const user = findUser(identifier);
    if (!user) return null;
    if (!user.active) return null;
    if (user.passwordHash !== passwordHash) return null;
    return user;
}

// Update last login timestamp
function updateLastLogin(userId) {
    const users = loadUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
        users[index].lastLogin = new Date().toISOString();
        saveUsers(users);
    }
}

module.exports = {
    loadUsers,
    saveUsers,
    hashPassword,
    findUser,
    authenticate,
    updateLastLogin
};
