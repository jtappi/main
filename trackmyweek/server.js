'use strict';

/**
 * server.js — TrackMyWeek Express app factory.
 *
 * This module exports a configured Express router that the portal mounts
 * at /trackmyweek. It does NOT start its own HTTP server.
 *
 * By mounting inside the portal, the trackmyweek routes share the portal's
 * session middleware automatically — so requireAuth works correctly without
 * any cross-port session sharing.
 *
 * For local standalone development only, running this file directly with
 * NODE_ENV=development will spin up a temporary server on port 3001.
 */

const path    = require('path');
const express = require('express');

const entriesController    = require('./controllers/entries.controller');
const categoriesController = require('./controllers/categories.controller');
const reportsController    = require('./controllers/reports.controller');
const questionsController  = require('./controllers/questions.controller');
const prebuiltController   = require('./controllers/prebuilt.controller');

// ---------------------------------------------------------------------------
// Auth middleware — destructure so we get the function, not the whole object
// ---------------------------------------------------------------------------
let requireAuth;
try {
  ({ requireAuth } = require('../core/auth/middleware'));
} catch {
  // Fallback for standalone dev runs outside the monorepo
  requireAuth = (_req, _res, next) => next();
}
if (process.env.NODE_ENV === 'development') {
  requireAuth = (_req, _res, next) => next();
}

// ---------------------------------------------------------------------------
// Build a router with all trackmyweek routes
// ---------------------------------------------------------------------------
const router = express.Router();

// API routes
router.use('/api/entries',    requireAuth, entriesController);
router.use('/api/categories', requireAuth, categoriesController);
router.use('/api/reports',    requireAuth, reportsController);
router.use('/api/questions',  requireAuth, questionsController);
router.use('/api/prebuilt',   requireAuth, prebuiltController);

// Static SPA — served from client/dist/
const DIST = path.join(__dirname, 'client', 'dist');
router.use(express.static(DIST));

// SPA fallback — all non-API routes return index.html for React Router
router.get('*', (_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

// ---------------------------------------------------------------------------
// Export the router for mounting in the portal
// ---------------------------------------------------------------------------
module.exports = router;

// ---------------------------------------------------------------------------
// Standalone dev server (NODE_ENV=development only)
// ---------------------------------------------------------------------------
if (require.main === module) {
  if (process.env.NODE_ENV !== 'development') {
    console.error('trackmyweek/server.js is not meant to run standalone in production.');
    console.error('Mount it in the portal instead: app.use(\'/trackmyweek\', require(\'../trackmyweek/server\')).');
    process.exit(1);
  }
  const app  = express();
  const cors = require('cors');
  app.use(cors());
  app.use(express.json());
  app.use('/trackmyweek', router);
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`TrackMyWeek dev server running at http://localhost:${PORT}/trackmyweek`);
  });
}
