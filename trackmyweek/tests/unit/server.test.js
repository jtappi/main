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
 * express-session is a portal dependency, not a trackmyweek dependency, so we
 * cannot require it here. Instead we inject a minimal session stub middleware
 * that sets req.session = {} (no user), which is all requireAuth needs to
 * determine the request is unauthenticated and issue a redirect.
 *
 * No data file bootstrapping is needed: requireAuth redirects before any
 * controller code runs, so the data layer is never reached.
 */

const request = require('supertest');
const express = require('express');

let app;

beforeEach(() => {
  process.env.NODE_ENV = 'test';
  jest.resetModules();

  // Build a minimal Express app that mirrors how the portal mounts trackmyweek.
  // The session stub sets req.session = {} with no user, simulating an
  // unauthenticated request without requiring express-session.
  const freshApp = express();
  freshApp.use(express.json());
  freshApp.use((req, _res, next) => {
    req.session = {};
    next();
  });
  freshApp.use('/trackmyweek', require('../../server'));
  app = freshApp;
});

// ── Auth boundaries — unauthenticated requests redirect to /login?returnTo= ───

describe('Unauthenticated TMW API routes redirect to login with returnTo', () => {
  test.each([
    ['GET', '/trackmyweek/api/entries'],
    ['GET', '/trackmyweek/api/categories'],
    ['GET', '/trackmyweek/api/reports'],
    ['GET', '/trackmyweek/api/questions'],
    ['GET', '/trackmyweek/api/prebuilt/trend'],
  ])('%s %s redirects to /login?returnTo=<path>', async (method, route) => {
    const res = await request(app)[method.toLowerCase()](route);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(
      `/login?returnTo=${encodeURIComponent(route)}`
    );
  });
});
