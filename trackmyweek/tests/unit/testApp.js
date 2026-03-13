'use strict';

/**
 * testApp.js — shared test helper.
 *
 * trackmyweek/server.js now exports an Express router (not a full app),
 * so it can be mounted inside the portal and share its session.
 *
 * For supertest integration tests we need a real Express app. This helper
 * wraps the router in a minimal app with:
 *   - express.json() body parsing
 *   - the trackmyweek router mounted at /trackmyweek
 *
 * Usage in every controller test:
 *
 *   const app = require('./testApp');
 *   // then use app with supertest exactly as before
 */

const express = require('express');

function createTestApp() {
  const app = express();
  app.use(express.json());
  // Mount at /trackmyweek so all test URLs (/trackmyweek/api/...) still work
  app.use('/trackmyweek', require('../../server'));
  return app;
}

module.exports = createTestApp();
