'use strict';

const { requireAuth, requireAdmin, requireProjectAccess } = require('../../core/auth/middleware');

function makeReqRes(sessionUser = null) {
  const req = { session: { user: sessionUser } };
  const res = {
    _status: null,
    _json: null,
    _redirect: null,
    status(code) { this._status = code; return this; },
    json(data) { this._json = data; return this; },
    redirect(url) { this._redirect = url; }
  };
  const next = jest.fn();
  return { req, res, next };
}

// ── requireAuth ───────────────────────────────────────────────────────────────
describe('requireAuth', () => {
  test('calls next() when session user exists', () => {
    const { req, res, next } = makeReqRes({ id: '1', role: 'guest' });
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('returns 401 when no session', () => {
    const { req, res, next } = makeReqRes(null);
    requireAuth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });

  test('returns 401 when session exists but no user', () => {
    const req = { session: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ── requireAdmin ──────────────────────────────────────────────────────────────
describe('requireAdmin', () => {
  test('calls next() for admin user', () => {
    const { req, res, next } = makeReqRes({ id: '1', role: 'admin' });
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('returns 403 for guest user', () => {
    const { req, res, next } = makeReqRes({ id: '1', role: 'guest' });
    requireAdmin(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
  });

  test('returns 401 for unauthenticated request', () => {
    const { req, res, next } = makeReqRes(null);
    requireAdmin(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });
});

// ── requireProjectAccess ──────────────────────────────────────────────────────
describe('requireProjectAccess', () => {
  test('calls next() when admin (bypasses project check)', () => {
    const { req, res, next } = makeReqRes({ role: 'admin', projectAccess: [] });
    requireProjectAccess('trackmyweek')(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('calls next() when guest has access to project', () => {
    const { req, res, next } = makeReqRes({ role: 'guest', projectAccess: ['trackmyweek'] });
    requireProjectAccess('trackmyweek')(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('returns 403 when guest lacks access', () => {
    const { req, res, next } = makeReqRes({ role: 'guest', projectAccess: ['other'] });
    requireProjectAccess('trackmyweek')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
  });

  test('returns 401 for unauthenticated request', () => {
    const { req, res, next } = makeReqRes(null);
    requireProjectAccess('trackmyweek')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });
});
