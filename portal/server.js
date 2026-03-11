'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const session = require('express-session');
const helmet  = require('helmet');
const rateLimit = require('express-rate-limit');
const path    = require('path');
const fs      = require('fs');

const auth = require('../core/auth/auth');
const { requireAuth, requireAdmin } = require('../core/auth/middleware');

const app  = express();
const PORT = process.env.PORTAL_PORT || 3000;

const PROJECTS_FILE = process.env.PROJECTS_FILE ||
  path.join(__dirname, '../core/data/projects.json');

const LOG_FILE = process.env.LOG_FILE ||
  path.join(__dirname, '../logs/test-runs.jsonl');

// ── Trust proxy (behind Nginx) ───────────────────────────────────
app.set('trust proxy', 1);

// ── Security headers ───────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", "data:"],
      connectSrc: ["'self'"]
    }
  }
}));

// ── Sessions ───────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge:   24 * 60 * 60 * 1000
  }
}));

// ── Body parsing ───────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Rate limiting on auth ─────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});

// ── Static files ────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Helpers ──────────────────────────────────────────────────────
function loadProjects() {
  return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
}

function safeUser(u) {
  const { passwordHash, ...safe } = u;
  return safe;
}

function loadTestRuns() {
  if (!fs.existsSync(LOG_FILE)) return [];
  return fs.readFileSync(LOG_FILE, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
}

// ── Routes: Root ────────────────────────────────────────────────
app.get('/', (req, res) => {
  if (req.session && req.session.user) return res.redirect('/dashboard');
  return res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.session && req.session.user) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin.html'));
});

app.get('/test-dashboard', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/test-dashboard.html'));
});

// ── Routes: Auth ────────────────────────────────────────────────
app.post('/auth/login', authLimiter, (req, res) => {
  const { identifier, passwordHash } = req.body;
  if (!identifier || !passwordHash) {
    return res.status(400).json({ success: false, message: 'Missing credentials.' });
  }
  const usersFile = process.env.USERS_FILE;
  const user = usersFile
    ? auth.authenticate(identifier, passwordHash, usersFile)
    : auth.authenticate(identifier, passwordHash);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }
  usersFile
    ? auth.updateLastLogin(user.id, usersFile)
    : auth.updateLastLogin(user.id);
  req.session.user = {
    id:            user.id,
    name:          user.name,
    email:         user.email,
    username:      user.username,
    role:          user.role,
    projectAccess: user.projectAccess
  };
  return res.json({ success: true, role: user.role });
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/auth/session', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ authenticated: true, user: req.session.user });
  }
  return res.json({ authenticated: false });
});

// ── Routes: Admin — Users ─────────────────────────────────────────
app.get('/admin/users', requireAdmin, (req, res) => {
  const usersFile = process.env.USERS_FILE;
  const users = (usersFile ? auth.getAllUsers(usersFile) : auth.getAllUsers()).map(safeUser);
  res.json(users);
});

app.post('/admin/users', requireAdmin, (req, res) => {
  const { name, email, username, password, projectAccess } = req.body;
  if (!name || !email || !username || !password) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  const usersFile = process.env.USERS_FILE;
  const user = usersFile
    ? auth.createUser({ name, email, username, password, projectAccess }, usersFile)
    : auth.createUser({ name, email, username, password, projectAccess });
  res.status(201).json(safeUser(user));
});

app.put('/admin/users/:id', requireAdmin, (req, res) => {
  const usersFile = process.env.USERS_FILE;
  const updated = usersFile
    ? auth.updateUser(req.params.id, req.body, usersFile)
    : auth.updateUser(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'User not found.' });
  res.json(safeUser(updated));
});

app.delete('/admin/users/:id', requireAdmin, (req, res) => {
  if (req.params.id === req.session.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account.' });
  }
  const usersFile = process.env.USERS_FILE;
  const deleted = usersFile
    ? auth.deleteUser(req.params.id, usersFile)
    : auth.deleteUser(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'User not found.' });
  res.json({ success: true });
});

app.put('/admin/users/:id/access', requireAdmin, (req, res) => {
  const { projectAccess } = req.body;
  const usersFile = process.env.USERS_FILE;
  const updated = usersFile
    ? auth.updateUser(req.params.id, { projectAccess }, usersFile)
    : auth.updateUser(req.params.id, { projectAccess });
  if (!updated) return res.status(404).json({ error: 'User not found.' });
  res.json(safeUser(updated));
});

// ── Routes: Admin — Projects ─────────────────────────────────────────
app.get('/admin/projects', requireAdmin, (req, res) => {
  res.json(loadProjects());
});

app.get('/api/projects', requireAuth, (req, res) => {
  const user = req.session.user;
  const all  = loadProjects();
  const visible = user.role === 'admin'
    ? all
    : all.filter(p => user.projectAccess.includes(p.id) && p.status === 'active');
  res.json(visible);
});

// ── Routes: Test runs ──────────────────────────────────────────────
app.get('/api/test-runs', requireAdmin, (req, res) => {
  const runs = loadTestRuns();
  res.json(runs);
});

// ── Export for testing ───────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Portal running on port ${PORT}`);
  });
}

module.exports = app;
