'use strict';

/**
 * server.js — Prison Donkey router.
 *
 * Serves a single static landing page from prisondonkey/public/.
 * No npm dependencies — portal provides express when mounting this router.
 * No build step required.
 *
 * File layout:
 *   prisondonkey/public/index.html   — self-contained landing page
 *   prisondonkey/public/logo.png     — committed binary asset
 */

const path = require('path');

// express is NOT required here — the portal's express instance is used
// when it calls app.use('/prisondonkey', require('../prisondonkey/server')).
// Calling require('express') from this file would crash the server because
// prisondonkey has no node_modules.
const { Router, static: serveStatic } = require('../portal/node_modules/express');

const router = Router();

const PUBLIC = path.join(__dirname, 'public');

router.use(serveStatic(PUBLIC));

router.get('*', (_req, res) => {
  res.sendFile(path.join(PUBLIC, 'index.html'));
});

module.exports = router;
