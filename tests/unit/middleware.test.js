'use strict';

const { requireAuth, requireAdmin, requireProjectAccess } = require('../../core/auth/middleware');

// ── Helpers ───────────────────────────────────────────────────────────────────
function mockRes() {
  const res = {};
  res.redirect = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

// ── requireAuth ───────────────────────────────────────────────────────────────
describe('requireAuth', () => {
  test('calls next() when session has user', () => {
    const req = { session: { user: { id: '1' } } };
    const res = mockRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  test('redirects to /login when no session', () => {
    const req = { session: {} };
    const res = mockRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/login');
    expect(next).not.toHaveBeenCalled();
  });

  test('redirects to /login when session is null', () => {
    const req = { session: null };
    const res = mockRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/login');
  });
});

// ── requireAdmin ──────────────────────────────────────────────────────────────
describe('requireAdmin', () => {
  test('calls next() for admin user', () => {
    const req = { session: { user: { role: 'admin' } } };
    const res = mockRes();
    const next = jest.fn();
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('returns 403 for guest user', () => {
    const req = { session: { user: { role: 'guest' } } };
    const res = mockRes();
    const next = jest.fn();
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Admin access required' });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 403 when no session', () => {
    const req = { session: {} };
    const res = mockRes();
    const next = jest.fn();
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('returns 403 when session is null', () => {
    const req = { session: null };
    const res = mockRes();
    const next = jest.fn();
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ── requireProjectAccess ──────────────────────────────────────────────────────
describe('requireProjectAccess', () => {
  const mw = requireProjectAccess('trackmyweek');

  test('calls next() for admin regardless of projectAccess', () => {
    const req = { session: { user: { role: 'admin', projectAccess: [] } } };
    const res = mockRes();
    const next = jest.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('calls next() for guest with access to project', () => {
    const req = { session: { user: { role: 'guest', projectAccess: ['trackmyweek'] } } };
    const res = mockRes();
    const next = jest.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('returns 403 for guest without access', () => {
    const req = { session: { user: { role: 'guest', projectAccess: [] } } };
    const res = mockRes();
    const next = jest.fn();
    mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('redirects to /login when no session', () => {
    const req = { session: null };
    const res = mockRes();
    const next = jest.fn();
    mw(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/login');
  });

  test('redirects to /login when session has no user', () => {
    const req = { session: {} };
    const res = mockRes();
    const next = jest.fn();
    mw(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/login');
  });
});
