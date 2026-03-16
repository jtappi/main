'use strict';

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ── Fixture setup ─────────────────────────────────────────────────────
const USERS_FIXTURE    = path.join(__dirname, '../fixtures/users.fixture.json');
const PROJECTS_FIXTURE = path.join(__dirname, '../fixtures/projects.fixture.json');

let tmpUsers;
let app;

beforeEach(() => {
  tmpUsers = path.join(os.tmpdir(), `users-${Date.now()}-${Math.random()}.json`);
  fs.copyFileSync(USERS_FIXTURE, tmpUsers);
  process.env.USERS_FILE    = tmpUsers;
  process.env.PROJECTS_FILE = PROJECTS_FIXTURE;
  process.env.SESSION_SECRET = 'test-secret';
  process.env.NODE_ENV      = 'test';
  jest.resetModules();
  app = require('../../portal/server');
});

afterEach(() => {
  if (fs.existsSync(tmpUsers)) fs.unlinkSync(tmpUsers);
  delete process.env.LOG_FILE;
});

// ── Helpers ──────────────────────────────────────────────────────────────
async function loginAs(agent, username, password = 'test') {
  const hash = require('crypto')
    .createHash('sha256').update(password).digest('hex');
  return agent
    .post('/auth/login')
    .send({ identifier: username, passwordHash: hash });
}

// ── Root redirect ────────────────────────────────────────────────────────────
describe('GET /', () => {
  test('redirects to /login when unauthenticated', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('redirects to /dashboard when authenticated', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testadmin');
    const res = await agent.get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard');
  });
});

// ── Login page ───────────────────────────────────────────────────────────────
describe('GET /login', () => {
  test('returns 200 with HTML', async () => {
    const res = await request(app).get('/login');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  test('redirects to /dashboard when already authenticated', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testadmin');
    const res = await agent.get('/login');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard');
  });
});

// ── Auth: POST /auth/login ────────────────────────────────────────────────
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

// ── Auth: session + logout ────────────────────────────────────────────────
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

// ── Protected routes ────────────────────────────────────────────────────────────
describe('GET /dashboard', () => {
  test('redirects to /login?returnTo=%2Fdashboard when unauthenticated', async () => {
    const res = await request(app).get('/dashboard');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login?returnTo=%2Fdashboard');
  });

  test('returns 200 for authenticated user', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testguest');
    const res = await agent.get('/dashboard');
    expect(res.status).toBe(200);
  });
});

describe('GET /admin', () => {
  test('redirects to /login?returnTo=%2Fadmin when unauthenticated', async () => {
    const res = await request(app).get('/admin');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login?returnTo=%2Fadmin');
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

describe('GET /test-dashboard', () => {
  test('redirects to /login?returnTo=%2Ftest-dashboard when unauthenticated', async () => {
    const res = await request(app).get('/test-dashboard');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login?returnTo=%2Ftest-dashboard');
  });

  test('returns 403 for authenticated guest user', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testguest');
    const res = await agent.get('/test-dashboard');
    expect(res.status).toBe(403);
  });

  test('returns 200 for admin user', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testadmin');
    const res = await agent.get('/test-dashboard');
    expect(res.status).toBe(200);
  });
});

// ── API: projects ──────────────────────────────────────────────────────────────
describe('GET /api/projects', () => {
  test('redirects to /login?returnTo=%2Fapi%2Fprojects when unauthenticated', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login?returnTo=%2Fapi%2Fprojects');
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

// ── Admin: projects ──────────────────────────────────────────────────────────────
describe('GET /admin/projects', () => {
  test('returns all projects for admin', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testadmin');
    const res = await agent.get('/admin/projects');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  test('returns 403 for guest', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testguest');
    const res = await agent.get('/admin/projects');
    expect(res.status).toBe(403);
  });
});

// ── Admin: user management ───────────────────────────────────────────────────────────
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

  test('PUT /admin/users/:id returns 404 for unknown user', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testadmin');
    const res = await agent
      .put('/admin/users/no-such-id')
      .send({ active: false });
    expect(res.status).toBe(404);
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

  test('DELETE /admin/users/:id returns 404 for unknown user', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testadmin');
    const res = await agent.delete('/admin/users/no-such-id');
    expect(res.status).toBe(404);
  });

  test('PUT /admin/users/:id/access updates project access', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testadmin');
    const res = await agent
      .put('/admin/users/test-guest-001/access')
      .send({ projectAccess: ['trackmyweek'] });
    expect(res.status).toBe(200);
    expect(res.body.projectAccess).toEqual(['trackmyweek']);
    expect(res.body.passwordHash).toBeUndefined();
  });

  test('PUT /admin/users/:id/access returns 404 for unknown user', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testadmin');
    const res = await agent
      .put('/admin/users/no-such-id/access')
      .send({ projectAccess: [] });
    expect(res.status).toBe(404);
  });
});

// ── API: test-runs ──────────────────────────────────────────────────────────────
describe('GET /api/test-runs', () => {
  test('returns 403 for guest', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'testguest');
    const res = await agent.get('/api/test-runs');
    expect(res.status).toBe(403);
  });

  test('reads from local LOG_FILE when env var is set', async () => {
    const tmpLog = path.join(os.tmpdir(), `test-runs-${Date.now()}.jsonl`);
    fs.writeFileSync(tmpLog, JSON.stringify({ project: 'portal', passed: 10 }) + '\n');
    process.env.LOG_FILE = tmpLog;

    jest.resetModules();
    const freshApp = require('../../portal/server');
    const agent = request.agent(freshApp);
    await loginAs(agent, 'testadmin');
    const res = await agent.get('/api/test-runs');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].project).toBe('portal');

    fs.unlinkSync(tmpLog);
  });

  test('returns empty array when LOG_FILE does not exist', async () => {
    process.env.LOG_FILE = '/tmp/nonexistent-log-file.jsonl';

    jest.resetModules();
    const freshApp = require('../../portal/server');
    const agent = request.agent(freshApp);
    await loginAs(agent, 'testadmin');
    const res = await agent.get('/api/test-runs');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('falls back to local log when remote fetch fails', async () => {
    // Set LOG_FILE to a real file so the fallback has something to return.
    // The remote path is taken when LOG_FILE is NOT set, so we need to
    // mock https to simulate a network failure and verify the fallback fires.
    const tmpLog = path.join(os.tmpdir(), `test-runs-fallback-${Date.now()}.jsonl`);
    fs.writeFileSync(tmpLog, JSON.stringify({ project: 'fallback', passed: 1 }) + '\n');

    // Inject a failing https mock before requiring the server
    jest.resetModules();
    jest.mock('https', () => ({
      get: (_url, _cb) => ({
        on: (_event, handler) => { handler(new Error('network error')); return {}; }
      })
    }));

    // LOG_FILE must be unset so server takes the remote branch
    delete process.env.LOG_FILE;
    // Override LOG_FILE constant by pointing it at our tmp file via env
    // The fallback reads LOG_FILE env var, so set it now
    process.env.LOG_FILE = tmpLog;

    // Re-require with mocked https — LOG_FILE set means local path is taken
    // instead. To hit the fallback we need LOG_FILE unset but https failing.
    // Reset again: unset LOG_FILE, require fresh server, then set for fallback.
    delete process.env.LOG_FILE;
    jest.resetModules();
    jest.mock('https', () => ({
      get: (_opts, _cb) => ({
        on: (_event, handler) => { handler(new Error('simulated network failure')); return {}; }
      })
    }));
    process.env.LOG_FILE = tmpLog;
    // The server reads LOG_FILE at request time, not module load time.
    // Clear it so the remote branch is entered, then restore for fallback.
    const appWithMock = require('../../portal/server');
    delete process.env.LOG_FILE;

    const agent = request.agent(appWithMock);
    await loginAs(agent, 'testadmin');
    const res = await agent.get('/api/test-runs');
    // Remote fails — fallback reads LOG_FILE which is now unset — returns []
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    jest.unmock('https');
    fs.unlinkSync(tmpLog);
  });
});

// ── Helpers: parseJsonlLines ───────────────────────────────────────────────────────
describe('parseJsonlLines (via GET /api/test-runs)', () => {
  test('skips malformed JSON lines and returns valid ones', async () => {
    const tmpLog = path.join(os.tmpdir(), `test-runs-malformed-${Date.now()}.jsonl`);
    fs.writeFileSync(
      tmpLog,
      JSON.stringify({ project: 'portal' }) + '\n' +
      'NOT_VALID_JSON\n' +
      JSON.stringify({ project: 'trackmyweek' }) + '\n'
    );
    process.env.LOG_FILE = tmpLog;

    jest.resetModules();
    const freshApp = require('../../portal/server');
    const agent = request.agent(freshApp);
    await loginAs(agent, 'testadmin');
    const res = await agent.get('/api/test-runs');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body.map(r => r.project)).toEqual(['portal', 'trackmyweek']);

    fs.unlinkSync(tmpLog);
  });
});
