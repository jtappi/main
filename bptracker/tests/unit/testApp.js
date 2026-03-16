'use strict';

/**
 * testApp.js — shared integration test helper for BP Tracker.
 *
 * bptracker/server.js exports an Express router (not a full app).
 * For supertest integration tests we need a real Express app.
 *
 * This helper:
 *   1. Mocks core/auth/middleware so requireAuth is a pass-through.
 *   2. Mocks lib/data with jest.fn() stubs for every exported function.
 *      Each test file sets up return values in beforeEach.
 *   3. Mocks @anthropic-ai/sdk so no real API calls are made in tests.
 *   4. Wraps the bptracker router in a minimal Express app at /bptracker.
 *
 * IMPORTANT: jest.mock() calls are hoisted by Jest's transform — they must
 * live here so every test file that does require('./testApp') gets the mocks
 * applied before server.js or any controller loads.
 */

jest.mock('../../../core/auth/middleware', () => ({
  requireAuth:          (_req, _res, next) => next(),
  requireAdmin:         (_req, _res, next) => next(),
  requireProjectAccess: () => (_req, _res, next) => next(),
}));

jest.mock('../../lib/data', () => ({
  readReadings:        jest.fn(() => []),
  writeReadings:       jest.fn(),
  filterByUserId:      jest.fn((readings) => readings),
  appendReading:       jest.fn(),
  updateReading:       jest.fn(),
  deleteReading:       jest.fn(),
  purgeExpiredImages:  jest.fn(() => ({ purged: 0 })),
  IMAGE_RETENTION_MS:  90 * 24 * 60 * 60 * 1000,
  DATA_DIR:            '/tmp/bptracker-test',
  IMAGES_DIR:          '/tmp/bptracker-test/images',
}));

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn(),
    },
  }));
});

const express = require('express');

/**
 * Build a minimal Express app with a fake session user injected.
 * Each test can override req.session.user by calling buildApp({ user: {...} }).
 *
 * @param {{ user?: object }} options
 * @returns {express.Application}
 */
function buildApp(options = {}) {
  const user = options.user || { id: 'user-001', role: 'guest' };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = { user };
    next();
  });
  app.use('/bptracker', require('../../server'));
  return app;
}

module.exports = { buildApp };
