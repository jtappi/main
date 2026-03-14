'use strict';

/**
 * testApp.js — shared test helper.
 *
 * trackmyweek/server.js exports an Express router (not a full app).
 * For supertest integration tests we need a real Express app.
 *
 * This helper:
 *   1. Mocks core/auth/middleware so requireAuth is a pass-through.
 *   2. Mocks lib/data with the named functions controllers actually call
 *      (readEntries, writeEntries, readCategories, etc.) — NOT readFile/writeFile.
 *      Each test file overrides mockData and mock implementations in beforeEach.
 *   3. Wraps the trackmyweek router in a minimal Express app at /trackmyweek.
 *
 * IMPORTANT: jest.mock() calls are hoisted to the top of the file by Jest's
 * babel transform. They must live here so every test file that does
 * `require('./testApp')` gets the mocks applied before server.js loads.
 */

jest.mock('../../../core/auth/middleware', () => ({
  requireAuth:          (_req, _res, next) => next(),
  requireAdmin:         (_req, _res, next) => next(),
  requireProjectAccess: () => (_req, _res, next) => next(),
}));

// Mock lib/data with the exact named exports controllers use.
// Tests override these in beforeEach via the exported mockData object.
const mockData = {
  data:       [],
  categories: [],
  reports:    [],
  questions:  [],
};

jest.mock('../../lib/data', () => ({
  readEntries:    jest.fn(() => JSON.parse(JSON.stringify(mockData.data))),
  writeEntries:   jest.fn((arr) => { mockData.data = arr; }),
  readCategories: jest.fn(() => JSON.parse(JSON.stringify(mockData.categories))),
  writeCategories:jest.fn((arr) => { mockData.categories = arr; }),
  readReports:    jest.fn(() => JSON.parse(JSON.stringify(mockData.reports))),
  writeReports:   jest.fn((arr) => { mockData.reports = arr; }),
  readQuestions:  jest.fn(() => JSON.parse(JSON.stringify(mockData.questions))),
  writeQuestions: jest.fn((arr) => { mockData.questions = arr; }),
  nextIntId:      jest.fn((items) => items.length ? Math.max(...items.map(i => i.id)) + 1 : 1),
  nextTimestampId:jest.fn(() => Date.now()),
}));

const express = require('express');

const app = express();
app.use(express.json());
app.use('/trackmyweek', require('../../server'));

// Export both the app (for supertest) and mockData (for test setup)
module.exports = { app, mockData };
