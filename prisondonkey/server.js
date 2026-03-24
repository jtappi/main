'use strict';

/**
 * server.js — Prison Donkey router factory.
 *
 * Serves a single static landing page from prisondonkey/public/.
 * No local npm dependencies — express is provided by the portal.
 *
 * Usage in portal/server.js:
 *   const prisondonkey = require('../prisondonkey/server');
 *   app.use('/prisondonkey', prisondonkey(express));
 *
 * File layout:
 *   prisondonkey/public/index.html   — self-contained landing page
 *   prisondonkey/public/logo.png     — binary asset
 */

const path = require('path');

const PUBLIC = path.join(__dirname, 'public');

/**
 * @param {import('express')} express - the portal's express instance
 * @returns {import('express').Router}
 */
module.exports = function prisondonkeyRouter(express) {
  const router = express.Router();

  router.use(express.static(PUBLIC));

  router.get('*', (_req, res) => {
    res.sendFile(path.join(PUBLIC, 'index.html'));
  });

  return router;
};
