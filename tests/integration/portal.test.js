'use strict';

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ── Fixture setup ─────────────────────────────────────────────────────────────
const USERS_FIXTURE = path.join(__dirname, '../fixtures/users.fixture.json');
const PROJECTS_FIXTURE = path.join(__dirname, '../fixtures/projects.fixture.json');

let tmpUsers;
let app;

beforeEach(() => {
  tmpUsers = path.join(os.tmpdir(), `users-${Date.now()}-${Math.random()}.json`);
  fs.copyFileSync(USERS_FIXTURE, tmpUsers);
  process.env.USERS_FILE = tmpUsers;
  process.env.PROJECTS_FILE = PROJECTS_FIXTURE;
  process.env.SESSION_SECRET = 'test-secret';
  process.env.NODE_ENV = 'test';
  jest.resetModules();
  app = require('../../portal/server');
});

afterEach(() => {
  if (fs.existsSync(tmpUsers)) fs.unlinkSync(tmpUsers);
});

// ── Helpers ───────────────────────────────────────────────────────────────────
async function loginAs(agent, username, password = 'test') {
  const hash = require('crypto')
    .createHash('sha256').update(password).digest('hex');
  return agent
    .post('/auth/login')
    .send({ identifier: username, passwordHash: hash });
}

// ── Root redirect ─────────────────────────────────────────────────────────────
describe('GET /', () => {
  test('redirects to /login when unauthenticated', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });
});

// ── Login page ────────────────────────────────────────────────────────────────
describe('GET /login', () => {
  test('returns 200 with HTML', async () => {
    const res = await request(app).get('/login');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });
});

// ── Auth: POST /auth/login ────────────────────────────────────────────────────
describe('POST /auth/login', () => {
  test('returns success and role for valid admin', async () => {
    const agent = request.agent(app);
    const res = await loginAs(agent, 'testadmin');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.role).toBe('admin');
  });

  test('returns success for valid guest', async () => {
    const agent = request.agent(app);
    const res = await loginAs(agent, 'testguest');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.role).toBe('guest');
  });

  test('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: 'testadmin', passwordHash: 'badhash' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('returns 401 for inactive user', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        identifier: 'inactiveuser',
        passwordHash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
      });
    expect(res.status).toBe(401);
  });

  test('returns 400 when body is missing fields', async () => {
    const res = await request(app).post('/auth/login').send({});
    expect(res.status).toBe(400);
  });
});

// ── Auth: session + logout ────────────────────────────────────────────────────
describe('GET /auth/session', () => {
  test('returns authenticated:false when not logged in', async () => {
    const res = await request(app).get('/auth/session');
    expect(res.body.authenticated).toBe(false);
  });

  test('returns authenticated:true with user after login', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testadmin');
    const res = await agent.get('/auth/session');
    expect(res.body.authenticated).toBe(true);
    expect(res.body.user.username).toBe('testadmin');
    expect(res.body.user.passwordHash).toBeUndefined();
  });
});

describe('POST /auth/logout', () => {
  test('destroys session', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testadmin');
    await agent.post('/auth/logout');
    const res = await agent.get('/auth/session');
    expect(res.body.authenticated).toBe(false);
  });
});

// ── Protected routes ──────────────────────────────────────────────────────────
describe('GET /dashboard', () => {
  // requireAuth redirects unauthenticated browsers to /login (302).
  // Supertest does not follow redirects, so we assert 302.
  test('redirects to /login when unauthenticated', async () => {
    const res = await request(app).get('/dashboard');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('returns 200 for authenticated user', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testguest');
    const res = await agent.get('/dashboard');
    expect(res.status).toBe(200);
  });
});

describe('GET /admin', () => {
  // requireAdmin returns 403 for any non-admin (including unauthenticated)
  // because it checks role directly without a prior auth gate.
  test('returns 403 when unauthenticated', async () => {
    const res = await request(app).get('/admin');
    expect(res.status).toBe(403);
  });

  test('returns 403 for authenticated guest user', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testguest');
    const res = await agent.get('/admin');
    expect(res.status).toBe(403);
  });

  test('returns 200 for admin user', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testadmin');
    const res = await agent.get('/admin');
    expect(res.status).toBe(200);
  });
});

// ── API: projects ─────────────────────────────────────────────────────────────
describe('GET /api/projects', () => {
  // requireAuth redirects unauthenticated requests to /login (302)
  test('redirects to /login when unauthenticated', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('returns projects for authenticated guest with access', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testguest');
    const res = await agent.get('/api/projects');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('admin sees all projects including disabled', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testadmin');
    const res = await agent.get('/api/projects');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });
});

// ── Admin: user management ────────────────────────────────────────────────────
describe('Admin user CRUD', () => {
  test('GET /admin/users returns user list for admin', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testadmin');
    const res = await agent.get('/admin/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach(u => expect(u.passwordHash).toBeUndefined());
  });

  test('GET /admin/users returns 403 for guest', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testguest');
    const res = await agent.get('/admin/users');
    expect(res.status).toBe(403);
  });

  test('POST /admin/users creates a guest user without exposing passwordHash', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testadmin');
    const res = await agent.post('/admin/users').send({
      name: 'New User', email: 'new@test.com',
      username: 'newuser', password: 'pass123',
      projectAccess: ['trackmyweek']
    });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('guest');
    expect(res.body.passwordHash).toBeUndefined();
  });

  test('POST /admin/users returns 400 for missing fields', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testadmin');
    const res = await agent.post('/admin/users').send({ name: 'Incomplete' });
    expect(res.status).toBe(400);
  });

  test('PUT /admin/users/:id updates a user', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testadmin');
    const res = await agent
      .put('/admin/users/test-guest-001')
      .send({ active: false });
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(false);
    expect(res.body.passwordHash).toBeUndefined();
  });

  test('DELETE /admin/users/:id removes a user', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testadmin');
    const res = await agent.delete('/admin/users/test-guest-001');
    expect(res.status).toBe(200);
    const list = await agent.get('/admin/users');
    expect(list.body.find(u => u.id === 'test-guest-001')).toBeUndefined();
  });

  test('DELETE /admin/users/:id prevents self-deletion', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testadmin');
    const session = await agent.get('/auth/session');
    const adminId = session.body.user.id;
    const res = await agent.delete(`/admin/users/${adminId}`);
    expect(res.status).toBe(400);
  });
});
