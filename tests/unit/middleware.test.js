'use strict';

const { requireAuth, requireAdmin, requireProjectAccess } = require('../../core/auth/middleware');

// Builds a mock req/res/next that covers all response methods the middleware uses
function makeReqRes(sessionUser = null, url = '/dashboard') {
  const req = {
    session:     sessionUser !== null ? { user: sessionUser } : {},
    originalUrl: url,
  };
  const res = {
    _status:   null,
    _json:     null,
    _redirect: null,
    _sent:     null,
    status(code) { this._status = code; return this; },
    json(data)   { this._json = data;   return this; },
    send(data)   { this._sent = data;   return this; },
    redirect(url){ this._redirect = url; }
  };
  const next = jest.fn();
  return { req, res, next };
}

// ── requireAuth ──────────────────────────────────────────────
describe('requireAuth', () => {
  test('calls next() when session user exists', () => {
    const { req, res, next } = makeReqRes({ id: '1', role: 'guest' });
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('redirects to /login?returnTo=<url> when session has no user', () => {
    const { req, res, next } = makeReqRes(null, '/dashboard');
    requireAuth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._redirect).toBe('/login?returnTo=%2Fdashboard');
  });

  test('encodes the original URL in the returnTo parameter', () => {
    const { req, res, next } = makeReqRes(null, '/admin?tab=users');
    requireAuth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._redirect).toBe('/login?returnTo=%2Fadmin%3Ftab%3Dusers');
  });

  test('redirects to /login?returnTo=/ when req has no session at all', () => {
    const req = { originalUrl: '/' };
    const res = { _redirect: null, redirect(url) { this._redirect = url; } };
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._redirect).toBe('/login?returnTo=%2F');
  });
});

// ── requireAdmin ─────────────────────────────────────────────
describe('requireAdmin', () => {
  test('calls next() for admin user', () => {
    const { req, res, next } = makeReqRes({ id: '1', role: 'admin' });
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('returns 403 for authenticated guest user', () => {
    const { req, res, next } = makeReqRes({ id: '1', role: 'guest' });
    requireAdmin(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
  });

  test('returns 403 for unauthenticated request (no user in session)', () => {
    const { req, res, next } = makeReqRes(null);
    requireAdmin(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
  });
});

// ── requireProjectAccess ───────────────────────────────────────────────
describe('requireProjectAccess', () => {
  test('calls next() when admin (bypasses project check)', () => {
    const { req, res, next } = makeReqRes({ role: 'admin', projectAccess: [] });
    requireProjectAccess('trackmyweek')(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('calls next() when guest has access to the project', () => {
    const { req, res, next } = makeReqRes({ role: 'guest', projectAccess: ['trackmyweek'] });
    requireProjectAccess('trackmyweek')(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('redirects to /dashboard?denied=<projectId> when guest lacks access', () => {
    // Previously returned a raw 403. Now redirects so the user lands somewhere
    // useful with a contextual banner instead of a blank error page.
    const { req, res, next } = makeReqRes({ role: 'guest', projectAccess: ['other'] });
    requireProjectAccess('trackmyweek')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._redirect).toBe('/dashboard?denied=trackmyweek');
  });

  test('redirects to /login?returnTo=<url> for unauthenticated request', () => {
    const req = { session: {}, originalUrl: '/trackmyweek/log' };
    const res = { _redirect: null, redirect(url) { this._redirect = url; } };
    const next = jest.fn();
    requireProjectAccess('trackmyweek')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._redirect).toBe('/login?returnTo=%2Ftrackmyweek%2Flog');
  });

  test('redirects to /login?returnTo=<url> when no session at all', () => {
    const req = { originalUrl: '/trackmyweek/log' };
    const res = { _redirect: null, redirect(url) { this._redirect = url; } };
    const next = jest.fn();
    requireProjectAccess('trackmyweek')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._redirect).toBe('/login?returnTo=%2Ftrackmyweek%2Flog');
  });
});
