'use strict';

/**
 * server.js — BP Tracker Express app factory.
 *
 * Exports a configured Express router that the portal mounts at /bptracker.
 * Does NOT start its own HTTP server.
 *
 * purgeExpiredImages() is called only when this file is run directly as a
 * standalone dev server, NOT at require() time, to avoid firing during tests.
 */

const path    = require('path');
const express = require('express');

const readingsController = require('./controllers/readings.controller');
const extractController  = require('./controllers/extract.controller');
const { purgeExpiredImages } = require('./lib/data');

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------
let requireAuth, requireAdmin;
try {
  ({ requireAuth, requireAdmin } = require('../core/auth/middleware'));
} catch {
  requireAuth  = (_req, _res, next) => next();
  requireAdmin = (_req, _res, next) => next();
}
if (process.env.NODE_ENV === 'development') {
  requireAuth  = (_req, _res, next) => next();
  requireAdmin = (_req, _res, next) => next();
}

// ---------------------------------------------------------------------------
// Auth module — for user list endpoint
// ---------------------------------------------------------------------------
let getAllUsers;
try {
  ({ getAllUsers } = require('../core/auth/auth'));
} catch {
  getAllUsers = () => [];
}

// ---------------------------------------------------------------------------
// Build router
// ---------------------------------------------------------------------------
const router = express.Router();

// The extract endpoint receives a base64-encoded camera image which can be
// several MB. The portal mounts express.json() with the default 100kb limit.
// We apply a larger limit specifically for this route before requireAuth so
// the body is parsed correctly regardless of the portal's global limit.
router.use('/api/extract',  express.json({ limit: '10mb' }), requireAuth, extractController);
router.use('/api/readings', requireAuth, readingsController);

// ---------------------------------------------------------------------------
// GET /api/users
// Admin-only. Returns active users who have bptracker project access.
// Admin users are always included regardless of their projectAccess array.
// Only id and name are returned — no passwords, emails, or sensitive fields.
// ---------------------------------------------------------------------------
router.get('/api/users', requireAuth, requireAdmin, (req, res) => {
  try {
    const all = getAllUsers();
    const users = all
      .filter(u => {
        if (!u.active) return false;
        if (u.role === 'admin') return true;
        return Array.isArray(u.projectAccess) && u.projectAccess.includes('bptracker');
      })
      .map(u => ({ id: u.id, name: u.name }));
    res.json(users);
  } catch (err) {
    console.error('[bptracker] GET /api/users error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// Static SPA — served from client/dist/
const DIST = path.join(__dirname, 'client', 'dist');
router.use(express.static(DIST));

// SPA fallback
router.get('*', (_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

// ---------------------------------------------------------------------------
// Export for portal mounting
// ---------------------------------------------------------------------------
module.exports = router;

// ---------------------------------------------------------------------------
// Standalone dev server (NODE_ENV=development only)
// ---------------------------------------------------------------------------
if (require.main === module) {
  if (process.env.NODE_ENV !== 'development') {
    console.error('bptracker/server.js is not meant to run standalone in production.');
    console.error('Mount it in the portal instead.');
    process.exit(1);
  }

  try {
    const { purged } = purgeExpiredImages();
    if (purged > 0) {
      console.log(`[bptracker] Purged ${purged} expired image(s) on startup.`);
    }
  } catch (err) {
    console.error('[bptracker] Image purge failed on startup:', err.message);
  }

  const app  = express();
  const cors = require('cors');
  app.use(cors());
  app.use('/bptracker', router);
  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => {
    console.log(`BP Tracker dev server running at http://localhost:${PORT}/bptracker`);
  });
}
