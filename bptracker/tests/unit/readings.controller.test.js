'use strict';

/**
 * readings.controller.test.js
 *
 * Integration tests for the BP Tracker readings API.
 * Uses supertest against a minimal Express app that mounts the bptracker
 * router with a mocked session user and mocked data layer.
 */

const request = require('supertest');
const express = require('express');

// ── Session user fixtures ─────────────────────────────────────────────
const ADMIN_USER = { id: 'admin-001', role: 'admin' };
const GUEST_USER = { id: 'guest-001', role: 'guest' };

// ── Mock readings ────────────────────────────────────────────────────────────
const OWNED_READING = {
  id: 'r-001', userId: 'admin-001',
  systolic: 120, diastolic: 80, heartRate: 70,
  timestamp: '2026-01-01T08:00:00.000Z', notes: null,
  extractionConfidence: 'manual', imageRef: null,
  createdAt: '2026-01-01T08:00:00.000Z',
};
const LEGACY_READING = {
  id: 'r-legacy',
  // No userId field — simulates a reading saved before user scoping
  systolic: 118, diastolic: 78, heartRate: 68,
  timestamp: '2025-12-01T08:00:00.000Z', notes: null,
  extractionConfidence: 'high', imageRef: null,
  createdAt: '2025-12-01T08:00:00.000Z',
};
const OTHER_READING = {
  id: 'r-002', userId: 'guest-001',
  systolic: 130, diastolic: 85, heartRate: 75,
  timestamp: '2026-01-02T08:00:00.000Z', notes: null,
  extractionConfidence: 'manual', imageRef: null,
  createdAt: '2026-01-02T08:00:00.000Z',
};

// ── Mock data layer ─────────────────────────────────────────────────────────
let mockReadings = [];

jest.mock('../../lib/data', () => ({
  readReadings:    jest.fn(() => JSON.parse(JSON.stringify(mockReadings))),
  filterByUserId:  jest.fn((readings, userId, role) =>
    role === 'admin' ? readings : readings.filter(r => r.userId === userId)
  ),
  appendReading:   jest.fn((r) => { mockReadings.push(r); }),
  updateReading:   jest.fn((id, updates) => {
    const idx = mockReadings.findIndex(r => r.id === id);
    if (idx === -1) return null;
    mockReadings[idx] = { ...mockReadings[idx], ...updates };
    return mockReadings[idx];
  }),
  deleteReading:   jest.fn((id) => {
    const idx = mockReadings.findIndex(r => r.id === id);
    if (idx === -1) return false;
    mockReadings.splice(idx, 1);
    return true;
  }),
}));

jest.mock('../../../core/auth/middleware', () => ({
  requireAuth: (_req, _res, next) => next(),
}));

// ── App factory ──────────────────────────────────────────────────────────────────
function makeApp(sessionUser) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = { user: sessionUser };
    next();
  });
  app.use('/api/readings', require('../../controllers/readings.controller'));
  return app;
}

beforeEach(() => {
  mockReadings = [
    JSON.parse(JSON.stringify(OWNED_READING)),
    JSON.parse(JSON.stringify(LEGACY_READING)),
    JSON.parse(JSON.stringify(OTHER_READING)),
  ];
  jest.clearAllMocks();
  // Re-wire mocks after clearAllMocks
  const data = require('../../lib/data');
  data.readReadings.mockImplementation(() => JSON.parse(JSON.stringify(mockReadings)));
  data.filterByUserId.mockImplementation((readings, userId, role) =>
    role === 'admin' ? readings : readings.filter(r => r.userId === userId)
  );
  data.appendReading.mockImplementation((r) => { mockReadings.push(r); });
  data.updateReading.mockImplementation((id, updates) => {
    const idx = mockReadings.findIndex(r => r.id === id);
    if (idx === -1) return null;
    mockReadings[idx] = { ...mockReadings[idx], ...updates };
    return mockReadings[idx];
  });
  data.deleteReading.mockImplementation((id) => {
    const idx = mockReadings.findIndex(r => r.id === id);
    if (idx === -1) return false;
    mockReadings.splice(idx, 1);
    return true;
  });
});

// ── GET /api/readings ──────────────────────────────────────────────────────────────────
describe('GET /api/readings', () => {
  test('admin receives all readings including legacy', async () => {
    const res = await request(makeApp(ADMIN_USER)).get('/api/readings');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);
  });

  test('guest receives only their own readings', async () => {
    const res = await request(makeApp(GUEST_USER)).get('/api/readings');
    expect(res.status).toBe(200);
    expect(res.body.every(r => r.userId === GUEST_USER.id)).toBe(true);
  });

  test('guest does not receive legacy readings without userId', async () => {
    const res = await request(makeApp(GUEST_USER)).get('/api/readings');
    expect(res.status).toBe(200);
    expect(res.body.find(r => r.id === 'r-legacy')).toBeUndefined();
  });
});

// ── DELETE /api/readings/:id ───────────────────────────────────────────────────────
describe('DELETE /api/readings/:id', () => {
  test('admin can delete their own reading', async () => {
    const res = await request(makeApp(ADMIN_USER)).delete('/api/readings/r-001');
    expect(res.status).toBe(204);
  });

  test('admin can delete a legacy reading without userId', async () => {
    const res = await request(makeApp(ADMIN_USER)).delete('/api/readings/r-legacy');
    expect(res.status).toBe(204);
  });

  test('admin cannot delete another user\'s reading', async () => {
    const res = await request(makeApp(ADMIN_USER)).delete('/api/readings/r-002');
    expect(res.status).toBe(403);
  });

  test('guest can delete their own reading', async () => {
    const res = await request(makeApp(GUEST_USER)).delete('/api/readings/r-002');
    expect(res.status).toBe(204);
  });

  test('guest cannot delete another user\'s reading', async () => {
    const res = await request(makeApp(GUEST_USER)).delete('/api/readings/r-001');
    expect(res.status).toBe(403);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(makeApp(ADMIN_USER)).delete('/api/readings/no-such-id');
    expect(res.status).toBe(404);
  });
});

// ── PUT /api/readings/:id ───────────────────────────────────────────────────────────────
describe('PUT /api/readings/:id', () => {
  test('admin can edit their own reading', async () => {
    const res = await request(makeApp(ADMIN_USER))
      .put('/api/readings/r-001')
      .send({ notes: 'Updated note' });
    expect(res.status).toBe(200);
    expect(res.body.notes).toBe('Updated note');
  });

  test('admin can edit a legacy reading without userId', async () => {
    const res = await request(makeApp(ADMIN_USER))
      .put('/api/readings/r-legacy')
      .send({ notes: 'Legacy note' });
    expect(res.status).toBe(200);
    expect(res.body.notes).toBe('Legacy note');
  });

  test('admin cannot edit another user\'s reading', async () => {
    const res = await request(makeApp(ADMIN_USER))
      .put('/api/readings/r-002')
      .send({ notes: 'Nope' });
    expect(res.status).toBe(403);
  });

  test('guest can edit their own reading', async () => {
    const res = await request(makeApp(GUEST_USER))
      .put('/api/readings/r-002')
      .send({ notes: 'My note' });
    expect(res.status).toBe(200);
  });

  test('returns 400 when no valid fields provided', async () => {
    const res = await request(makeApp(ADMIN_USER))
      .put('/api/readings/r-001')
      .send({ unknownField: 'x' });
    expect(res.status).toBe(400);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(makeApp(ADMIN_USER))
      .put('/api/readings/no-such-id')
      .send({ notes: 'Ghost' });
    expect(res.status).toBe(404);
  });

  test('returns 400 when extractionConfidence is not a valid value', async () => {
    const res = await request(makeApp(ADMIN_USER))
      .put('/api/readings/r-001')
      .send({ extractionConfidence: 'bogus' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/extractionConfidence/);
  });

  test('accepts valid extractionConfidence values', async () => {
    for (const confidence of ['high', 'low', 'manual']) {
      const res = await request(makeApp(ADMIN_USER))
        .put('/api/readings/r-001')
        .send({ extractionConfidence: confidence });
      expect(res.status).toBe(200);
      expect(res.body.extractionConfidence).toBe(confidence);
    }
  });
});

// ── POST /api/readings ─────────────────────────────────────────────────────────────────
describe('POST /api/readings', () => {
  const VALID_BODY = {
    systolic: 120, diastolic: 80, heartRate: 70,
    timestamp: '2026-03-01T08:00:00.000Z',
  };

  test('creates a reading with the session userId', async () => {
    const res = await request(makeApp(ADMIN_USER))
      .post('/api/readings')
      .send(VALID_BODY);
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(ADMIN_USER.id);
    expect(res.body.id).toBeDefined();
  });

  test('returns 400 when required fields are missing', async () => {
    const res = await request(makeApp(ADMIN_USER))
      .post('/api/readings')
      .send({ systolic: 120 });
    expect(res.status).toBe(400);
  });

  test('returns 400 when systolic is not an integer', async () => {
    const res = await request(makeApp(ADMIN_USER))
      .post('/api/readings')
      .send({ ...VALID_BODY, systolic: 'notanumber' });
    expect(res.status).toBe(400);
  });
});
