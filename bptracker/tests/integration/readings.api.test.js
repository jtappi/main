'use strict';

/**
 * readings.api.test.js — integration tests for /bptracker/api/readings
 *
 * jest.mock() calls are hoisted by Jest to the top of this file before any
 * require() runs. This ensures the mocks are in place when server.js and the
 * controllers load their dependencies.
 */

jest.mock('../../../core/auth/middleware', () => ({
  requireAuth:          (_req, _res, next) => next(),
  requireAdmin:         (_req, _res, next) => next(),
  requireProjectAccess: () => (_req, _res, next) => next(),
}));

const mockReadReadings   = jest.fn();
const mockFilterByUserId = jest.fn((readings) => readings);
const mockAppendReading  = jest.fn();
const mockUpdateReading  = jest.fn();
const mockDeleteReading  = jest.fn();

jest.mock('../../lib/data', () => ({
  readReadings:       mockReadReadings,
  writeReadings:      jest.fn(),
  filterByUserId:     mockFilterByUserId,
  appendReading:      mockAppendReading,
  updateReading:      mockUpdateReading,
  deleteReading:      mockDeleteReading,
  purgeExpiredImages: jest.fn(() => ({ purged: 0 })),
  IMAGE_RETENTION_MS: 90 * 24 * 60 * 60 * 1000,
  DATA_DIR:           '/tmp/bptracker-test',
  IMAGES_DIR:         '/tmp/bptracker-test/images',
}));

const request = require('supertest');
const express = require('express');

function buildApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.session = { user }; next(); });
  app.use('/bptracker', require('../../server'));
  return app;
}

function makeReading(overrides = {}) {
  return {
    id:                   'reading-001',
    userId:               'user-001',
    systolic:             122,
    diastolic:            78,
    heartRate:            64,
    timestamp:            '2026-03-16T08:00:00',
    imageRef:             null,
    extractionConfidence: 'high',
    notes:                null,
    createdAt:            '2026-03-16T08:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// GET /bptracker/api/readings
// ---------------------------------------------------------------------------
describe('GET /bptracker/api/readings', () => {
  test('returns scoped readings for guest user', async () => {
    const reading = makeReading();
    mockReadReadings.mockReturnValue([reading]);
    mockFilterByUserId.mockReturnValue([reading]);

    const app = buildApp({ id: 'user-001', role: 'guest' });
    const res = await request(app).get('/bptracker/api/readings');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('reading-001');
    expect(mockFilterByUserId).toHaveBeenCalledWith([reading], 'user-001', 'guest');
  });

  test('returns all readings for admin user', async () => {
    const readings = [
      makeReading({ id: 'r1', userId: 'user-001' }),
      makeReading({ id: 'r2', userId: 'user-002' }),
    ];
    mockReadReadings.mockReturnValue(readings);
    mockFilterByUserId.mockReturnValue(readings);

    const app = buildApp({ id: 'admin-001', role: 'admin' });
    const res = await request(app).get('/bptracker/api/readings');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(mockFilterByUserId).toHaveBeenCalledWith(readings, 'admin-001', 'admin');
  });

  test('returns empty array when user has no readings', async () => {
    mockReadReadings.mockReturnValue([]);
    mockFilterByUserId.mockReturnValue([]);

    const app = buildApp({ id: 'user-001', role: 'guest' });
    const res = await request(app).get('/bptracker/api/readings');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// POST /bptracker/api/readings
// ---------------------------------------------------------------------------
describe('POST /bptracker/api/readings', () => {
  test('saves reading and returns 201 with reading object', async () => {
    mockAppendReading.mockImplementation((r) => [r]);

    const app = buildApp({ id: 'user-001', role: 'guest' });
    const res = await request(app)
      .post('/bptracker/api/readings')
      .send({
        systolic:             122,
        diastolic:            78,
        heartRate:            64,
        timestamp:            '2026-03-16T08:00:00',
        extractionConfidence: 'high',
      });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe('user-001');
    expect(res.body.systolic).toBe(122);
    expect(res.body.diastolic).toBe(78);
    expect(res.body.heartRate).toBe(64);
    expect(res.body.id).toBeDefined();
    expect(mockAppendReading).toHaveBeenCalledTimes(1);
  });

  test('returns 400 when required fields are missing', async () => {
    const app = buildApp({ id: 'user-001', role: 'guest' });
    const res = await request(app)
      .post('/bptracker/api/readings')
      .send({ systolic: 122 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/);
    expect(mockAppendReading).not.toHaveBeenCalled();
  });

  test('returns 400 when systolic is not an integer', async () => {
    const app = buildApp({ id: 'user-001', role: 'guest' });
    const res = await request(app)
      .post('/bptracker/api/readings')
      .send({ systolic: 'abc', diastolic: 78, heartRate: 64, timestamp: '2026-03-16T08:00:00' });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PUT /bptracker/api/readings/:id
// ---------------------------------------------------------------------------
describe('PUT /bptracker/api/readings/:id', () => {
  test('owner can update notes on their own reading', async () => {
    const reading = makeReading({ userId: 'user-001' });
    mockReadReadings.mockReturnValue([reading]);
    mockUpdateReading.mockReturnValue({ ...reading, notes: 'felt tired' });

    const app = buildApp({ id: 'user-001', role: 'guest' });
    const res = await request(app)
      .put('/bptracker/api/readings/reading-001')
      .send({ notes: 'felt tired' });

    expect(res.status).toBe(200);
    expect(res.body.notes).toBe('felt tired');
    expect(mockUpdateReading).toHaveBeenCalledWith('reading-001', { notes: 'felt tired' });
  });

  test('returns 403 when user tries to edit another user\'s reading', async () => {
    const reading = makeReading({ userId: 'user-002' });
    mockReadReadings.mockReturnValue([reading]);

    const app = buildApp({ id: 'user-001', role: 'guest' });
    const res = await request(app)
      .put('/bptracker/api/readings/reading-001')
      .send({ notes: 'hacked' });

    expect(res.status).toBe(403);
    expect(mockUpdateReading).not.toHaveBeenCalled();
  });

  test('returns 404 when reading does not exist', async () => {
    mockReadReadings.mockReturnValue([]);

    const app = buildApp({ id: 'user-001', role: 'guest' });
    const res = await request(app)
      .put('/bptracker/api/readings/nonexistent')
      .send({ notes: 'x' });

    expect(res.status).toBe(404);
  });

  test('returns 400 when no valid update fields are provided', async () => {
    const reading = makeReading({ userId: 'user-001' });
    mockReadReadings.mockReturnValue([reading]);

    const app = buildApp({ id: 'user-001', role: 'guest' });
    const res = await request(app)
      .put('/bptracker/api/readings/reading-001')
      .send({ unknownField: 'ignored' });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// DELETE /bptracker/api/readings/:id
// ---------------------------------------------------------------------------
describe('DELETE /bptracker/api/readings/:id', () => {
  test('owner can delete their own reading', async () => {
    const reading = makeReading({ userId: 'user-001' });
    mockReadReadings.mockReturnValue([reading]);
    mockDeleteReading.mockReturnValue(true);

    const app = buildApp({ id: 'user-001', role: 'guest' });
    const res = await request(app).delete('/bptracker/api/readings/reading-001');

    expect(res.status).toBe(204);
    expect(mockDeleteReading).toHaveBeenCalledWith('reading-001');
  });

  test('returns 403 when user tries to delete another user\'s reading', async () => {
    const reading = makeReading({ userId: 'user-002' });
    mockReadReadings.mockReturnValue([reading]);

    const app = buildApp({ id: 'user-001', role: 'guest' });
    const res = await request(app).delete('/bptracker/api/readings/reading-001');

    expect(res.status).toBe(403);
    expect(mockDeleteReading).not.toHaveBeenCalled();
  });

  test('returns 404 when reading does not exist', async () => {
    mockReadReadings.mockReturnValue([]);

    const app = buildApp({ id: 'user-001', role: 'guest' });
    const res = await request(app).delete('/bptracker/api/readings/nonexistent');

    expect(res.status).toBe(404);
  });
});
