'use strict';

function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required' });
}

function requireProjectAccess(projectId) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/login');
    }
    const user = req.session.user;
    if (user.role === 'admin') return next();
    if (user.projectAccess && user.projectAccess.includes(projectId)) {
      return next();
    }
    return res.status(403).send('Access denied to this project.');
  };
}

module.exports = { requireAuth, requireAdmin, requireProjectAccess };
