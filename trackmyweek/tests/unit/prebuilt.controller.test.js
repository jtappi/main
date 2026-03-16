'use strict';

const request           = require('supertest');
const { app, mockData } = require('./testApp');
const data              = require('../../lib/data');

// Seed data: two entries within the last 7 days, one older (2020)
const RECENT_TS  = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
const OLDER_TS   = '2020-01-15T10:00:00.000Z';

beforeEach(() => {
  mockData.data = [
    { id: 1, text: 'Run',   category: 'Exercise', notes: '', timestamp: RECENT_TS },
    { id: 2, text: 'Apple', category: 'Food',     notes: '', timestamp: RECENT_TS },
    { id: 3, text: 'Walk',  category: 'Exercise', notes: '', timestamp: OLDER_TS  },
  ];
  data.readEntries.mockImplementation(() => JSON.parse(JSON.stringify(mockData.data)));
});

// ── GET /api/prebuilt/trend ────────────────────────────────────────────────────
describe('GET /trackmyweek/api/prebuilt/trend', () => {
  test('returns 200 with dateRange, labels, and values', async () => {
    const res = await request(app).get('/trackmyweek/api/prebuilt/trend');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('dateRange');
    expect(Array.isArray(res.body.labels)).toBe(true);
    expect(Array.isArray(res.body.values)).toBe(true);
  });

  test('labels are YYYY-MM-DD date strings', async () => {
    const res = await request(app).get('/trackmyweek/api/prebuilt/trend');
    res.body.labels.forEach((l) => expect(l).toMatch(/^\d{4}-\d{2}-\d{2}$/));
  });

  test('values are non-negative integers', async () => {
    const res = await request(app).get('/trackmyweek/api/prebuilt/trend');
    res.body.values.forEach((v) => {
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThanOrEqual(0);
    });
  });

  test('defaults to 7days when no dateRange param given', async () => {
    const res = await request(app).get('/trackmyweek/api/prebuilt/trend');
    expect(res.body.dateRange).toBe('7days');
    // 7days range has 7 or 8 labels (one per day in window)
    expect(res.body.labels.length).toBeGreaterThanOrEqual(7);
    expect(res.body.labels.length).toBeLessThanOrEqual(8);
  });

  test('falls back to 7days for invalid dateRange param', async () => {
    const res = await request(app)
      .get('/trackmyweek/api/prebuilt/trend?dateRange=banana');
    expect(res.status).toBe(200);
    expect(res.body.dateRange).toBe('7days');
  });

  test('accepts 30days dateRange', async () => {
    const res = await request(app)
      .get('/trackmyweek/api/prebuilt/trend?dateRange=30days');
    expect(res.status).toBe(200);
    expect(res.body.dateRange).toBe('30days');
    expect(res.body.labels.length).toBeGreaterThanOrEqual(30);
  });

  test('counts recent entries in values array', async () => {
    const res = await request(app).get('/trackmyweek/api/prebuilt/trend');
    const total = res.body.values.reduce((sum, v) => sum + v, 0);
    // Only the 2 recent entries fall within 7days; the old one does not
    expect(total).toBe(2);
  });

  test('includes a label for every day in the range (zero-filling)', async () => {
    // Empty data — all day counts should be 0, but all labels should still appear
    mockData.data = [];
    data.readEntries.mockImplementation(() => []);
    const res = await request(app).get('/trackmyweek/api/prebuilt/trend');
    expect(res.body.values.every((v) => v === 0)).toBe(true);
    expect(res.body.labels.length).toBeGreaterThanOrEqual(7);
  });
});

// ── GET /api/prebuilt/categories ─────────────────────────────────────────────────
describe('GET /trackmyweek/api/prebuilt/categories', () => {
  test('returns 200 with dateRange, labels, and values', async () => {
    const res = await request(app).get('/trackmyweek/api/prebuilt/categories');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('dateRange');
    expect(Array.isArray(res.body.labels)).toBe(true);
    expect(Array.isArray(res.body.values)).toBe(true);
  });

  test('labels are category names', async () => {
    const res = await request(app).get('/trackmyweek/api/prebuilt/categories');
    res.body.labels.forEach((l) => expect(typeof l).toBe('string'));
  });

  test('values are positive integers', async () => {
    const res = await request(app).get('/trackmyweek/api/prebuilt/categories');
    res.body.values.forEach((v) => {
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThan(0);
    });
  });

  test('defaults to 7days and excludes old entries', async () => {
    const res = await request(app).get('/trackmyweek/api/prebuilt/categories');
    expect(res.body.dateRange).toBe('7days');
    // Only 2 recent entries — the Walk (Exercise) from 2020 should be excluded
    const total = res.body.values.reduce((sum, v) => sum + v, 0);
    expect(total).toBe(2);
  });

  test('falls back to 7days for invalid dateRange', async () => {
    const res = await request(app)
      .get('/trackmyweek/api/prebuilt/categories?dateRange=invalid');
    expect(res.status).toBe(200);
    expect(res.body.dateRange).toBe('7days');
  });

  test('accepts 30days dateRange', async () => {
    const res = await request(app)
      .get('/trackmyweek/api/prebuilt/categories?dateRange=30days');
    expect(res.status).toBe(200);
    expect(res.body.dateRange).toBe('30days');
  });

  test('sorts labels by count descending', async () => {
    const res = await request(app).get('/trackmyweek/api/prebuilt/categories');
    const values = res.body.values;
    for (let i = 1; i < values.length; i++) {
      expect(values[i - 1]).toBeGreaterThanOrEqual(values[i]);
    }
  });

  test('returns empty labels and values when no entries in range', async () => {
    mockData.data = [];
    data.readEntries.mockImplementation(() => []);
    const res = await request(app).get('/trackmyweek/api/prebuilt/categories');
    expect(res.body.labels).toEqual([]);
    expect(res.body.values).toEqual([]);
  });
});
