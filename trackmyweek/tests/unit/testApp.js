'use strict';

/**
 * testApp.js — shared test helper.
 *
 * trackmyweek/server.js exports an Express router (not a full app).
 * For supertest integration tests we need a real Express app.
 *
 * This helper:
 *   1. Mocks core/auth/middleware so requireAuth is a pass-through.
 *      (The real middleware redirects to /login because there's no session
 *      in the Jest environment — all tests would get 302 without this.)
 *   2. Wraps the trackmyweek router in a minimal Express app mounted at
 *      /trackmyweek so all test URLs (/trackmyweek/api/...) still work.
 *
 * Usage in every controller test:
 *   const app = require('./testApp');
 *   // use with supertest exactly as before
 */

// Must be called BEFORE requiring server.js so the mock is in place
// when server.js calls require('../core/auth/middleware').
jest.mock('../../../core/auth/middleware', () => ({
  requireAuth:          (_req, _res, next) => next(),
  requireAdmin:         (_req, _res, next) => next(),
  requireProjectAccess: () => (_req, _res, next) => next(),
}));

const express = require('express');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/trackmyweek', require('../../server'));
  return app;
}

module.exports = createTestApp();
