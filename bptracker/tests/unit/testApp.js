'use strict';

/**
 * testApp.js — shared integration test helper for BP Tracker.
 *
 * Provides buildApp({ user }) only. All jest.mock() declarations that need
 * to be hoisted must live in the individual test files, not here — Jest
 * hoists mocks to the top of the file they are declared in, so mocks declared
 * here only apply to modules loaded from this file, not to modules loaded
 * from test files that require() this helper.
 *
 * Usage in test files:
 *
 *   jest.mock('../../lib/data', () => ({ ... }));
 *   jest.mock('@anthropic-ai/sdk', () => jest.fn(...));
 *   jest.mock('../../../core/auth/middleware', () => ({ ... }));
 *   const { buildApp } = require('../unit/testApp');
 */

const express = require('express');

/**
 * Build a minimal Express app with a fake session user injected.
 *
 * @param {{ user?: object }} options
 * @returns {express.Application}
 */
function buildApp(options = {}) {
  const user = options.user || { id: 'user-001', role: 'guest' };
  jest.resetModules();
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
