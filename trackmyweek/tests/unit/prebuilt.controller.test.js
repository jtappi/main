'use strict';

const request           = require('supertest');
const { app, mockData } = require('./testApp');
const data              = require('../../lib/data');

const now      = new Date();
const today    = now.toISOString();
const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();

beforeEach(() => {
  mockData.data = [
    { id: 1, text: 'Run',       category: 'Exercise', notes: '', timestamp: today },
    { id: 2, text: 'Apple',     category: 'Food',     notes: '', timestamp: today },
    { id: 3, text: 'Pushups',   category: 'Exercise', notes: '', timestamp: twoDaysAgo },
  ];
  data.readEntries.mockImplementation((_userId) => JSON.parse(JSON.stringify(mockData.data)));
});

// ── GET /api/prebuilt/trend ────────────────────────────────────────────────
describe('GET /trackmyweek/api/prebuilt/trend', () => {
  test('returns dateRange, labels array, values array', async () => {
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

  test('labels and values have equal length', async () => {
    const res = await request(app).get('/trackmyweek/api/prebuilt/trend');
    expect(res.body.labels.length).toBe(res.body.values.length);
  });

  test('days with no entries appear as 0 in values', async () => {
    const res = await request(app).get('/trackmyweek/api/prebuilt/trend?dateRange=7days');
    const hasZero = res.body.values.some((v) => v === 0);
    expect(hasZero).toBe(true);
  });

  test('accepts valid dateRange param', async () => {
    const res = await request(app).get('/trackmyweek/api/prebuilt/trend?dateRange=30days');
    expect(res.status).toBe(200);
    expect(res.body.dateRange).toBe('30days');
  });

  test('falls back to 7days for invalid dateRange', async () => {
    const res = await request(app).get('/trackmyweek/api/prebuilt/trend?dateRange=invalid');
    expect(res.status).toBe(200);
    expect(res.body.dateRange).toBe('7days');
  });
});

// ── GET /api/prebuilt/categories ──────────────────────────────────────────
describe('GET /trackmyweek/api/prebuilt/categories', () => {
  test('returns dateRange, labels array, values array', async () => {
    const res = await request(app).get('/trackmyweek/api/prebuilt/categories');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('dateRange');
    expect(Array.isArray(res.body.labels)).toBe(true);
    expect(Array.isArray(res.body.values)).toBe(true);
  });

  test('labels are category names', async () => {
    const res = await request(app).get('/trackmyweek/api/prebuilt/categories');
    expect(res.body.labels).toContain('Exercise');
    expect(res.body.labels).toContain('Food');
  });

  test('values match entry counts per category', async () => {
    const res = await request(app).get('/trackmyweek/api/prebuilt/categories');
    const exerciseIdx = res.body.labels.indexOf('Exercise');
    expect(res.body.values[exerciseIdx]).toBeGreaterThanOrEqual(1);
  });

  test('accepts valid dateRange param', async () => {
    const res = await request(app).get('/trackmyweek/api/prebuilt/categories?dateRange=30days');
    expect(res.status).toBe(200);
    expect(res.body.dateRange).toBe('30days');
  });

  test('returns empty labels and values when no entries in range', async () => {
    mockData.data = [];
    data.readEntries.mockImplementation(() => []);
    const res = await request(app).get('/trackmyweek/api/prebuilt/categories');
    expect(res.status).toBe(200);
    expect(res.body.labels).toEqual([]);
    expect(res.body.values).toEqual([]);
  });
});
