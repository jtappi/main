'use strict';

/**
 * Integration tests for portal/server.js
 * Uses supertest to make real HTTP requests against the Express app.
 * Injects fixture data so no real users.json is touched.
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Point auth module at fixture data before requiring server
const USERS_FIXTURE = path.join(__dirname, '../fixtures/users.fixture.json');
const PROJECTS_FIXTURE = path.join(__dirname, '../fixtures/projects.fixture.json');

// We need to inject the fixture paths into the server.
// The server reads from env or defaults — we override via env vars.
process.env.USERS_FILE = USERS_FIXTURE;
process.env.PROJECTS_FILE = PROJECTS_FIXTURE;
process.env.SESSION_SECRET = 'test-secret-do-not-use-in-production';
process.env.PORTAL_PORT = '0'; // Let OS pick a free port

const app = require('../../portal/server');

// SHA256 of 'test' — matches fixture passwordHash
const VALID_HASH = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';

// ── Helper: get an authenticated agent ───────────────────────────────────────
async function loginAs(identifier) {
  const agent = request.agent(app);
  await agent
    .post('/auth/login')
    .send({ identifier, passwordHash: VALID_HASH })
    .expect(200);
  return agent;
}

// ── GET / ─────────────────────────────────────────────────────────────────────
describe('GET /', () => {
  test('redirects unauthenticated user to /login', async () => {
    await request(app).get('/').expect(302).expect('Location', '/login');
  });

  test('redirects authenticated user to /dashboard', async () => {
    const agent = await loginAs('testadmin');
    await agent.get('/').expect(302).expect('Location', '/dashboard');
  });
});

// ── GET /login ────────────────────────────────────────────────────────────────
describe('GET /login', () => {
  test('returns 200 for unauthenticated user', async () => {
    await request(app).get('/login').expect(200);
  });

  test('redirects authenticated user to /dashboard', async () => {
    const agent = await loginAs('testadmin');
    await agent.get('/login').expect(302).expect('Location', '/dashboard');
  });
});

// ── POST /auth/login ──────────────────────────────────────────────────────────
describe('POST /auth/login', () => {
  test('returns success for valid admin credentials (email)', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: 'admin@test.com', passwordHash: VALID_HASH })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.role).toBe('admin');
  });

  test('returns success for valid credentials (username)', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: 'testadmin', passwordHash: VALID_HASH })
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: 'testadmin', passwordHash: 'wronghash' })
      .expect(401);
    expect(res.body.success).toBe(false);
  });

  test('returns 401 for unknown user', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: 'nobody', passwordHash: VALID_HASH })
      .expect(401);
    expect(res.body.success).toBe(false);
  });

  test('returns 401 for inactive user', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: 'inactiveuser', passwordHash: VALID_HASH })
      .expect(401);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 when credentials missing', async () => {
    await request(app).post('/auth/login').send({}).expect(400);
  });
});

// ── GET /auth/session ─────────────────────────────────────────────────────────
describe('GET /auth/session', () => {
  test('returns authenticated:false for no session', async () => {
    const res = await request(app).get('/auth/session').expect(200);
    expect(res.body.authenticated).toBe(false);
  });

  test('returns authenticated:true with user info after login', async () => {
    const agent = await loginAs('testadmin');
    const res = await agent.get('/auth/session').expect(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.user.role).toBe('admin');
  });
});

// ── POST /auth/logout ─────────────────────────────────────────────────────────
describe('POST /auth/logout', () => {
  test('destroys session and returns success', async () => {
    const agent = await loginAs('testadmin');
    await agent.post('/auth/logout').expect(200);
    const res = await agent.get('/auth/session');
    expect(res.body.authenticated).toBe(false);
  });
});

// ── GET /dashboard ────────────────────────────────────────────────────────────
describe('GET /dashboard', () => {
  test('redirects unauthenticated user to /login', async () => {
    await request(app).get('/dashboard').expect(302).expect('Location', '/login');
  });

  test('returns 200 for authenticated user', async () => {
    const agent = await loginAs('testadmin');
    await agent.get('/dashboard').expect(200);
  });
});

// ── GET /admin ────────────────────────────────────────────────────────────────
describe('GET /admin', () => {
  test('returns 403 for unauthenticated user', async () => {
    await request(app).get('/admin').expect(403);
  });

  test('returns 403 for guest user', async () => {
    const agent = await loginAs('testguest');
    await agent.get('/admin').expect(403);
  });

  test('returns 200 for admin user', async () => {
    const agent = await loginAs('testadmin');
    await agent.get('/admin').expect(200);
  });
});

// ── GET /api/projects ─────────────────────────────────────────────────────────
describe('GET /api/projects', () => {
  test('redirects unauthenticated user to /login', async () => {
    await request(app).get('/api/projects').expect(302);
  });

  test('admin receives all projects', async () => {
    const agent = await loginAs('testadmin');
    const res = await agent.get('/api/projects').expect(200);
    expect(res.body.length).toBe(2);
  });

  test('guest receives only active granted projects', async () => {
    const agent = await loginAs('testguest');
    const res = await agent.get('/api/projects').expect(200);
    // guest has access to trackmyweek (active) but not disabled-project
    expect(res.body.every(p => p.status === 'active')).toBe(true);
    expect(res.body.every(p => p.id === 'trackmyweek')).toBe(true);
  });
});

// ── GET /admin/users ──────────────────────────────────────────────────────────
describe('GET /admin/users', () => {
  test('returns 403 for guest', async () => {
    const agent = await loginAs('testguest');
    await agent.get('/admin/users').expect(403);
  });

  test('returns user list for admin', async () => {
    const agent = await loginAs('testadmin');
    const res = await agent.get('/admin/users').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(3);
  });

  test('does not expose passwordHash in response', async () => {
    const agent = await loginAs('testadmin');
    const res = await agent.get('/admin/users').expect(200);
    res.body.forEach(u => expect(u.passwordHash).toBeUndefined());
  });
});

// ── GET /admin/projects ───────────────────────────────────────────────────────
describe('GET /admin/projects', () => {
  test('returns project list for admin', async () => {
    const agent = await loginAs('testadmin');
    const res = await agent.get('/admin/projects').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('returns 403 for guest', async () => {
    const agent = await loginAs('testguest');
    await agent.get('/admin/projects').expect(403);
  });
});
