'use strict';

/**
 * readings.api.test.js — integration tests for /bptracker/api/readings
 *
 * All file I/O is mocked via testApp.js. No disk access occurs.
 * Auth middleware is mocked — session user is injected per test.
 */

const request = require('supertest');
const data    = require('../../lib/data');
const { buildApp } = require('../unit/testApp');

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
    data.readReadings.mockReturnValue([reading]);
    data.filterByUserId.mockReturnValue([reading]);

    const app = buildApp({ user: { id: 'user-001', role: 'guest' } });
    const res = await request(app).get('/bptracker/api/readings');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('reading-001');
    expect(data.filterByUserId).toHaveBeenCalledWith([reading], 'user-001', 'guest');
  });

  test('returns all readings for admin user', async () => {
    const readings = [
      makeReading({ id: 'r1', userId: 'user-001' }),
      makeReading({ id: 'r2', userId: 'user-002' }),
    ];
    data.readReadings.mockReturnValue(readings);
    data.filterByUserId.mockReturnValue(readings);

    const app = buildApp({ user: { id: 'admin-001', role: 'admin' } });
    const res = await request(app).get('/bptracker/api/readings');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(data.filterByUserId).toHaveBeenCalledWith(readings, 'admin-001', 'admin');
  });

  test('returns empty array when user has no readings', async () => {
    data.readReadings.mockReturnValue([]);
    data.filterByUserId.mockReturnValue([]);

    const app = buildApp({ user: { id: 'user-001', role: 'guest' } });
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
    data.appendReading.mockImplementation((r) => [r]);

    const app = buildApp({ user: { id: 'user-001', role: 'guest' } });
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
    expect(data.appendReading).toHaveBeenCalledTimes(1);
  });

  test('returns 400 when required fields are missing', async () => {
    const app = buildApp({ user: { id: 'user-001', role: 'guest' } });
    const res = await request(app)
      .post('/bptracker/api/readings')
      .send({ systolic: 122 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/);
    expect(data.appendReading).not.toHaveBeenCalled();
  });

  test('returns 400 when systolic is not an integer', async () => {
    const app = buildApp({ user: { id: 'user-001', role: 'guest' } });
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
    data.readReadings.mockReturnValue([reading]);
    data.updateReading.mockReturnValue({ ...reading, notes: 'felt tired' });

    const app = buildApp({ user: { id: 'user-001', role: 'guest' } });
    const res = await request(app)
      .put('/bptracker/api/readings/reading-001')
      .send({ notes: 'felt tired' });

    expect(res.status).toBe(200);
    expect(res.body.notes).toBe('felt tired');
    expect(data.updateReading).toHaveBeenCalledWith('reading-001', { notes: 'felt tired' });
  });

  test('returns 403 when user tries to edit another user\'s reading', async () => {
    const reading = makeReading({ userId: 'user-002' });
    data.readReadings.mockReturnValue([reading]);

    const app = buildApp({ user: { id: 'user-001', role: 'guest' } });
    const res = await request(app)
      .put('/bptracker/api/readings/reading-001')
      .send({ notes: 'hacked' });

    expect(res.status).toBe(403);
    expect(data.updateReading).not.toHaveBeenCalled();
  });

  test('returns 404 when reading does not exist', async () => {
    data.readReadings.mockReturnValue([]);

    const app = buildApp({ user: { id: 'user-001', role: 'guest' } });
    const res = await request(app)
      .put('/bptracker/api/readings/nonexistent')
      .send({ notes: 'x' });

    expect(res.status).toBe(404);
  });

  test('returns 400 when no valid update fields are provided', async () => {
    const reading = makeReading({ userId: 'user-001' });
    data.readReadings.mockReturnValue([reading]);

    const app = buildApp({ user: { id: 'user-001', role: 'guest' } });
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
    data.readReadings.mockReturnValue([reading]);
    data.deleteReading.mockReturnValue(true);

    const app = buildApp({ user: { id: 'user-001', role: 'guest' } });
    const res = await request(app).delete('/bptracker/api/readings/reading-001');

    expect(res.status).toBe(204);
    expect(data.deleteReading).toHaveBeenCalledWith('reading-001');
  });

  test('returns 403 when user tries to delete another user\'s reading', async () => {
    const reading = makeReading({ userId: 'user-002' });
    data.readReadings.mockReturnValue([reading]);

    const app = buildApp({ user: { id: 'user-001', role: 'guest' } });
    const res = await request(app).delete('/bptracker/api/readings/reading-001');

    expect(res.status).toBe(403);
    expect(data.deleteReading).not.toHaveBeenCalled();
  });

  test('returns 404 when reading does not exist', async () => {
    data.readReadings.mockReturnValue([]);

    const app = buildApp({ user: { id: 'user-001', role: 'guest' } });
    const res = await request(app).delete('/bptracker/api/readings/nonexistent');

    expect(res.status).toBe(404);
  });
});
