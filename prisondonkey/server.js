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
 *   prisondonkey/public/logo.png     — committed binary asset (symlinked from
 *                                      client/src/assets/logo.png via CI,
 *                                      or copied on first deploy)
 */

const path    = require('path');
const express = require('express');

const router = express.Router();

const PUBLIC = path.join(__dirname, 'public');

router.use(express.static(PUBLIC));

router.get('*', (_req, res) => {
  res.sendFile(path.join(PUBLIC, 'index.html'));
});

module.exports = router;
