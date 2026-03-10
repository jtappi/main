require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const { authenticate, updateLastLogin, loadUsers, saveUsers } = require('../core/auth/auth');
const { requireAuth, requireAdmin } = require('../core/auth/middleware');
const projectsData = require('../core/data/projects.json');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (behind Nginx)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"]
        }
    }
}));

// Rate limiting on auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' }
});

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessions
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,        // HTTPS only
        httpOnly: true,      // No JS access
        maxAge: 24 * 60 * 60 * 1000  // 24 hours
    }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// ─── Auth Routes ─────────────────────────────────────────────────────────────

// POST /auth/login
app.post('/auth/login', authLimiter, (req, res) => {
    const { identifier, passwordHash } = req.body;

    if (!identifier || !passwordHash) {
        return res.status(400).json({ success: false, message: 'Missing credentials' });
    }

    const user = authenticate(identifier, passwordHash);
    if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.name = user.name;

    updateLastLogin(user.id);

    res.json({ success: true, role: user.role });
});

// POST /auth/logout
app.post('/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// GET /auth/session
app.get('/auth/session', (req, res) => {
    if (!req.session.userId) {
        return res.json({ authenticated: false });
    }
    res.json({
        authenticated: true,
        name: req.session.name,
        role: req.session.role
    });
});

// ─── Portal Routes ────────────────────────────────────────────────────────────

// GET / — redirect to dashboard or login
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// GET /login
app.get('/login', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// GET /dashboard
app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// GET /admin
app.get('/admin', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ─── API: Projects ────────────────────────────────────────────────────────────

// GET /api/projects — returns projects visible to current user
app.get('/api/projects', requireAuth, (req, res) => {
    if (req.session.role === 'admin') {
        return res.json(projectsData);
    }
    // Guests: filter by access
    const users = loadUsers();
    const user = users.find(u => u.id === req.session.userId);
    const accessible = projectsData.filter(p => user.projectAccess.includes(p.id));
    res.json(accessible);
});

// ─── Admin API: Users ─────────────────────────────────────────────────────────

// GET /admin/users
app.get('/admin/users', requireAdmin, (req, res) => {
    const users = loadUsers();
    // Never return password hashes
    const safe = users.map(({ passwordHash, ...u }) => u);
    res.json(safe);
});

// POST /admin/users — create guest
app.post('/admin/users', requireAdmin, (req, res) => {
    const { name, email, username, passwordHash } = req.body;
    if (!name || !email || !username || !passwordHash) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const users = loadUsers();
    const exists = users.find(u => u.email === email || u.username === username);
    if (exists) {
        return res.status(409).json({ error: 'Email or username already exists' });
    }
    const newUser = {
        id: uuidv4(),
        name,
        email,
        username,
        passwordHash,
        role: 'guest',
        active: true,
        projectAccess: [],
        lastLogin: null,
        createdAt: new Date().toISOString()
    };
    users.push(newUser);
    saveUsers(users);
    const { passwordHash: _, ...safe } = newUser;
    res.status(201).json(safe);
});

// PUT /admin/users/:id — update user
app.put('/admin/users/:id', requireAdmin, (req, res) => {
    const users = loadUsers();
    const index = users.findIndex(u => u.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'User not found' });
    // Prevent changing role to admin via API
    const { role, passwordHash, id, createdAt, ...updates } = req.body;
    users[index] = { ...users[index], ...updates };
    saveUsers(users);
    const { passwordHash: _, ...safe } = users[index];
    res.json(safe);
});

// PUT /admin/users/:id/access — update project access
app.put('/admin/users/:id/access', requireAdmin, (req, res) => {
    const { projectAccess } = req.body;
    if (!Array.isArray(projectAccess)) {
        return res.status(400).json({ error: 'projectAccess must be an array' });
    }
    const users = loadUsers();
    const index = users.findIndex(u => u.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'User not found' });
    users[index].projectAccess = projectAccess;
    saveUsers(users);
    res.json({ success: true });
});

// DELETE /admin/users/:id
app.delete('/admin/users/:id', requireAdmin, (req, res) => {
    let users = loadUsers();
    const index = users.findIndex(u => u.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'User not found' });
    // Prevent deleting admin accounts
    if (users[index].role === 'admin') {
        return res.status(403).json({ error: 'Cannot delete admin accounts' });
    }
    users.splice(index, 1);
    saveUsers(users);
    res.json({ success: true });
});

// ─── Admin API: Projects ──────────────────────────────────────────────────────

// GET /admin/projects
app.get('/admin/projects', requireAdmin, (req, res) => {
    res.json(projectsData);
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, '127.0.0.1', () => {
    console.log(`Portal running on http://localhost:${PORT}`);
});
