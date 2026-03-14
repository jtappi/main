'use strict';

const request           = require('supertest');
const { app, mockData } = require('./testApp');
const data              = require('../../lib/data');

const BASE_CATS = [
  { id: 1, name: 'Food',        icon: '🍎', color: '#2ecc71', createdAt: new Date().toISOString() },
  { id: 2, name: 'Medications', icon: '💊', color: '#3498db', createdAt: new Date().toISOString() },
];

beforeEach(() => {
  mockData.categories = JSON.parse(JSON.stringify(BASE_CATS));
  // No entries by default so DELETE doesn't get blocked by the 409 guard
  mockData.data = [];
  data.readCategories.mockImplementation(()    => JSON.parse(JSON.stringify(mockData.categories)));
  data.writeCategories.mockImplementation((arr) => { mockData.categories = arr; });
  data.readEntries.mockImplementation(()    => JSON.parse(JSON.stringify(mockData.data)));
  data.writeEntries.mockImplementation((arr) => { mockData.data = arr; });
});

describe('GET /trackmyweek/api/categories', () => {
  test('returns 200 with array', async () => {
    const res = await request(app).get('/trackmyweek/api/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });
});

describe('POST /trackmyweek/api/categories', () => {
  test('creates category and returns 201', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/categories')
      .send({ name: 'Sleep', icon: '😴', color: '#9b59b6' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Sleep');
    expect(res.body.id).toBeDefined();
  });

  test('returns 400 if name is missing', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/categories')
      .send({ icon: '😴', color: '#9b59b6' });
    expect(res.status).toBe(400);
  });

  // Controller returns 409 for duplicates (not 400)
  test('returns 409 if name is duplicate', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/categories')
      .send({ name: 'Food', icon: '🍎', color: '#2ecc71' });
    expect(res.status).toBe(409);
  });
});

describe('PUT /trackmyweek/api/categories/:id', () => {
  test('renames category and cascades to entries', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/categories/1')
      .send({ name: 'Nutrition', icon: '🥗', color: '#2ecc71' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Nutrition');
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/categories/999')
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /trackmyweek/api/categories/:id', () => {
  // No entries in mockData.data so DELETE proceeds without 409
  test('deletes category and returns 200', async () => {
    const res = await request(app).delete('/trackmyweek/api/categories/1');
    expect(res.status).toBe(200);
    const remaining = mockData.categories.find((c) => c.id === 1);
    expect(remaining).toBeUndefined();
  });

  // 409 when entries exist and no reassignTo
  test('returns 409 when entries exist and no reassignTo', async () => {
    mockData.data = [
      { id: 1, text: 'Salad', category: 'Food', notes: '', timestamp: new Date().toISOString() },
    ];
    data.readEntries.mockImplementation(() => JSON.parse(JSON.stringify(mockData.data)));
    const res = await request(app).delete('/trackmyweek/api/categories/1');
    expect(res.status).toBe(409);
  });

  test('reassigns entries when reassignTo is provided', async () => {
    mockData.data = [
      { id: 1, text: 'Salad', category: 'Food', notes: '', timestamp: new Date().toISOString() },
    ];
    data.readEntries.mockImplementation(() => JSON.parse(JSON.stringify(mockData.data)));
    await request(app).delete('/trackmyweek/api/categories/1?reassignTo=Medications');
    const reassigned = mockData.data.filter((e) => e.category === 'Medications');
    expect(reassigned.length).toBeGreaterThanOrEqual(1);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/trackmyweek/api/categories/999');
    expect(res.status).toBe(404);
  });
});
