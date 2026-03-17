'use strict';

/**
 * testApp.js — shared test helper.
 *
 * Mocks:
 *   1. core/auth/middleware — requireAuth injects a test user into req.session
 *      so controllers can call req.session.user.id without crashing.
 *   2. lib/data — all named functions now accept userId as their first arg.
 *      The mock ignores userId and operates on the shared mockData object,
 *      which is the correct behaviour for unit tests (isolation via mock state).
 */

const TEST_USER = { id: 'test-user-001', name: 'Test User', role: 'guest' };

jest.mock('../../../core/auth/middleware', () => ({
  requireAuth: (req, _res, next) => {
    req.session = req.session || {};
    req.session.user = TEST_USER;
    next();
  },
  requireAdmin:         (_req, _res, next) => next(),
  requireProjectAccess: () => (_req, _res, next) => next(),
}));

// Mock lib/data — all functions accept (userId, ...args) but ignore userId.
// Tests control state entirely through mockData.
const mockData = {
  data:       [],
  categories: [],
  reports:    [],
  questions:  [],
};

jest.mock('../../lib/data', () => ({
  readEntries:     jest.fn((_userId)       => JSON.parse(JSON.stringify(mockData.data))),
  writeEntries:    jest.fn((_userId, arr)  => { mockData.data = arr; }),
  readCategories:  jest.fn((_userId)       => JSON.parse(JSON.stringify(mockData.categories))),
  writeCategories: jest.fn((_userId, arr)  => { mockData.categories = arr; }),
  readReports:     jest.fn((_userId)       => JSON.parse(JSON.stringify(mockData.reports))),
  writeReports:    jest.fn((_userId, arr)  => { mockData.reports = arr; }),
  readQuestions:   jest.fn((_userId)       => JSON.parse(JSON.stringify(mockData.questions))),
  writeQuestions:  jest.fn((_userId, arr)  => { mockData.questions = arr; }),
  nextIntId:       jest.fn((items)         => items.length ? Math.max(...items.map(i => i.id)) + 1 : 1),
  nextTimestampId: jest.fn(()              => Date.now()),
}));

const express = require('express');

const app = express();
app.use(express.json());
app.use('/trackmyweek', require('../../server'));

module.exports = { app, mockData, TEST_USER };
