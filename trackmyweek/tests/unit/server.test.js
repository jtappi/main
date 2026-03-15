'use strict';

/**
 * server.test.js — integration tests for TrackMyWeek server-side auth boundaries.
 *
 * Tests that unauthenticated requests to protected API routes are redirected to
 * /login?returnTo=<path> rather than returning data or a bare 401.
 *
 * auth middleware is NOT mocked here — we are specifically testing that
 * requireAuth fires correctly on each route group.
 *
 * A real Express app is assembled around the trackmyweek router, with a real
 * session middleware (no session = unauthenticated).
 */

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');

// Bootstrap data files so the controllers can load without crashing
let tmpData, tmpCategories, tmpReports, tmpQuestions;

const DATA_TEMPLATE       = path.join(__dirname, '../../data/data.template.json');
const CATEGORIES_TEMPLATE = path.join(__dirname, '../../data/categories.template.json');
const REPORTS_TEMPLATE    = path.join(__dirname, '../../data/reports.template.json');
const QUESTIONS_TEMPLATE  = path.join(__dirname, '../../data/questions.template.json');

function makeTmp(template) {
  const tmp = path.join(os.tmpdir(), `tmw-${Date.now()}-${Math.random()}.json`);
  fs.copyFileSync(template, tmp);
  return tmp;
}

let app;

beforeEach(() => {
  tmpData       = makeTmp(DATA_TEMPLATE);
  tmpCategories = makeTmp(CATEGORIES_TEMPLATE);
  tmpReports    = makeTmp(REPORTS_TEMPLATE);
  tmpQuestions  = makeTmp(QUESTIONS_TEMPLATE);

  process.env.TMW_DATA_FILE       = tmpData;
  process.env.TMW_CATEGORIES_FILE = tmpCategories;
  process.env.TMW_REPORTS_FILE    = tmpReports;
  process.env.TMW_QUESTIONS_FILE  = tmpQuestions;
  process.env.NODE_ENV            = 'test';

  jest.resetModules();

  // Build a minimal Express app that mirrors how the portal mounts trackmyweek:
  // session middleware first, then the router at /trackmyweek.
  const freshApp = express();
  freshApp.use(express.json());
  freshApp.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
  }));
  freshApp.use('/trackmyweek', require('../../server'));
  app = freshApp;
});

afterEach(() => {
  [tmpData, tmpCategories, tmpReports, tmpQuestions].forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
});

// ── Auth boundaries — unauthenticated requests redirect to /login?returnTo= ───────

describe('Unauthenticated TMW API routes redirect to login with returnTo', () => {
  const routes = [
    'GET  /trackmyweek/api/entries',
    'GET  /trackmyweek/api/categories',
    'GET  /trackmyweek/api/reports',
    'GET  /trackmyweek/api/questions',
    'GET  /trackmyweek/api/prebuilt/trend',
  ];

  test.each([
    ['GET',  '/trackmyweek/api/entries'],
    ['GET',  '/trackmyweek/api/categories'],
    ['GET',  '/trackmyweek/api/reports'],
    ['GET',  '/trackmyweek/api/questions'],
    ['GET',  '/trackmyweek/api/prebuilt/trend'],
  ])('%s %s redirects to /login?returnTo=<path>', async (method, route) => {
    const res = await request(app)[method.toLowerCase()](route);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(
      `/login?returnTo=${encodeURIComponent(route)}`
    );
  });
});
