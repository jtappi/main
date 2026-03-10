const { loadUsers } = require('./auth');

// Require authenticated session
function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.redirect('/login');
    }
    next();
}

// Require admin role
function requireAdmin(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.redirect('/login');
    }
    if (req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// Require access to a specific project
function requireProjectAccess(projectId) {
    return (req, res, next) => {
        if (!req.session || !req.session.userId) {
            return res.redirect('/login');
        }
        // Admins always have access
        if (req.session.role === 'admin') {
            return next();
        }
        // Check guest project access
        const users = loadUsers();
        const user = users.find(u => u.id === req.session.userId);
        if (!user || !user.projectAccess.includes(projectId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        next();
    };
}

module.exports = { requireAuth, requireAdmin, requireProjectAccess };
