'use strict';

/**
 * server.js — Prison Donkey router.
 *
 * Serves a single static landing page from prisondonkey/public/.
 *
 * No local npm dependencies. express is resolved from the portal's
 * node_modules via Node's normal upward module resolution: when the portal
 * does require('../prisondonkey/server'), Node searches for 'express'
 * starting at prisondonkey/, then walks up to the repo root, then into
 * portal/node_modules — but that won't work either since it's a sibling.
 *
 * The correct approach: accept express as a parameter, or resolve it from
 * the monorepo root node_modules. Here we use require.resolve to walk up
 * from __dirname until we find express, which works because portal/
 * node_modules is a sibling, not a parent. Since Node module resolution
 * only walks UP the directory tree from the requiring file's location,
 * and prisondonkey/ has no node_modules, we require express from the root.
 *
 * File layout:
 *   prisondonkey/public/index.html   — self-contained landing page
 *   prisondonkey/public/logo.png     — committed binary asset
 */

const path    = require('path');
// Resolve express from the root node_modules (installed at the monorepo root).
// The root package.json must list express as a dependency for this to work.
// If the root doesn't have it, fall back to a factory-function export pattern.
let express;
try {
  express = require('express');
} catch {
  // express not available locally — export a factory that accepts it
  module.exports = function prisondonkeyRouter(expressInstance) {
    const router  = expressInstance.Router();
    const PUBLIC  = path.join(__dirname, 'public');
    router.use(expressInstance.static(PUBLIC));
    router.get('*', (_req, res) => res.sendFile(path.join(PUBLIC, 'index.html')));
    return router;
  };
  module.exports._needsExpress = true;
  return;
}

const router = express.Router();
const PUBLIC = path.join(__dirname, 'public');

router.use(express.static(PUBLIC));
router.get('*', (_req, res) => res.sendFile(path.join(PUBLIC, 'index.html')));

module.exports = router;
