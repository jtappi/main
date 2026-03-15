'use strict';

/**
 * Encodes the original request URL as a returnTo query parameter so that
 * after login the user is redirected back to where they were going.
 * Only the pathname + search + hash are encoded — never a full origin —
 * so the login page cannot be used as an open redirect to external URLs.
 */
function buildLoginRedirectUrl(req) {
  const returnTo = req.originalUrl || req.url || '/';
  return '/login?returnTo=' + encodeURIComponent(returnTo);
}

function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect(buildLoginRedirectUrl(req));
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
      return res.redirect(buildLoginRedirectUrl(req));
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
