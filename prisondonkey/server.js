'use strict';

/**
 * server.js — Prison Donkey Express app factory.
 *
 * Exports a configured Express router that the portal mounts at /prisondonkey.
 * Does NOT start its own HTTP server.
 */

const path    = require('path');
const express = require('express');

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------
let requireAuth;
try {
  ({ requireAuth } = require('../core/auth/middleware'));
} catch {
  requireAuth = (_req, _res, next) => next();
}
if (process.env.NODE_ENV === 'development') {
  requireAuth = (_req, _res, next) => next();
}

// ---------------------------------------------------------------------------
// Build router
// ---------------------------------------------------------------------------
const router = express.Router();

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
    console.error('prisondonkey/server.js is not meant to run standalone in production.');
    process.exit(1);
  }
  const app  = express();
  const cors = require('cors');
  app.use(cors());
  app.use('/prisondonkey', router);
  const PORT = process.env.PORT || 3003;
  app.listen(PORT, () => {
    console.log(`Prison Donkey dev server running at http://localhost:${PORT}/prisondonkey`);
  });
}
