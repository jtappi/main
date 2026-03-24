'use strict';

/**
 * server.js — Prison Donkey router.
 *
 * Serves a single static landing page from prisondonkey/public/.
 * No dependencies — portal provides express when mounting this router.
 * No build step required.
 */

const path    = require('path');
const express = require('express');

const router = express.Router();

const PUBLIC = path.join(__dirname, 'public');

// Serve static files (index.html, assets/logo.png)
router.use(express.static(PUBLIC));

// Fallback to index.html for any unmatched route under /prisondonkey
router.get('*', (_req, res) => {
  res.sendFile(path.join(PUBLIC, 'index.html'));
});

module.exports = router;
