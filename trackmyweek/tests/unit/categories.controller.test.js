'use strict';

const request           = require('supertest');
const { app, mockData } = require('./testApp');
const data              = require('../../lib/data');

const BASE_CATS = [
  { id: 1, name: 'Food',        icon: '\ud83c\udf4e', color: '#2ecc71', createdAt: new Date().toISOString() },
  { id: 2, name: 'Medications', icon: '\ud83d\udc8a', color: '#3498db', createdAt: new Date().toISOString() },
];

beforeEach(() => {
  mockData.categories = JSON.parse(JSON.stringify(BASE_CATS));
  mockData.data = [];
  data.readCategories.mockImplementation(()    => JSON.parse(JSON.stringify(mockData.categories)));
  data.writeCategories.mockImplementation((arr) => { mockData.categories = arr; });
  data.readEntries.mockImplementation(()    => JSON.parse(JSON.stringify(mockData.data)));
  data.writeEntries.mockImplementation((arr) => { mockData.data = arr; });
});

// ── GET /api/categories ─────────────────────────────────────────────────────
describe('GET /trackmyweek/api/categories', () => {
  test('returns 200 with array', async () => {
    const res = await request(app).get('/trackmyweek/api/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  test('each category has an entryCount field', async () => {
    const res = await request(app).get('/trackmyweek/api/categories');
    res.body.forEach((cat) => expect(cat).toHaveProperty('entryCount'));
  });

  test('entryCount reflects actual entries', async () => {
    mockData.data = [
      { id: 1, text: 'Apple', category: 'Food', notes: '', timestamp: new Date().toISOString() },
      { id: 2, text: 'Pear',  category: 'Food', notes: '', timestamp: new Date().toISOString() },
    ];
    data.readEntries.mockImplementation(() => JSON.parse(JSON.stringify(mockData.data)));
    const res = await request(app).get('/trackmyweek/api/categories');
    const food = res.body.find((c) => c.name === 'Food');
    expect(food.entryCount).toBe(2);
  });
});

// ── POST /api/categories ────────────────────────────────────────────────────
describe('POST /trackmyweek/api/categories', () => {
  test('creates category and returns 201', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/categories')
      .send({ name: 'Sleep', icon: '\ud83d\ude34', color: '#9b59b6' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Sleep');
    expect(res.body.id).toBeDefined();
  });

  test('uses default color when color not provided', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/categories')
      .send({ name: 'Sleep' });
    expect(res.status).toBe(201);
    expect(res.body.color).toBe('#cccccc');
  });

  test('returns 400 if name is missing', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/categories')
      .send({ icon: '\ud83d\ude34', color: '#9b59b6' });
    expect(res.status).toBe(400);
  });

  test('returns 409 if name is duplicate (case-insensitive)', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/categories')
      .send({ name: 'food' });
    expect(res.status).toBe(409);
  });
});

// ── PUT /api/categories/:id ───────────────────────────────────────────────────
describe('PUT /trackmyweek/api/categories/:id', () => {
  test('renames category and cascades to entries', async () => {
    mockData.data = [
      { id: 1, text: 'Apple', category: 'Food', notes: '', timestamp: new Date().toISOString() },
    ];
    data.readEntries.mockImplementation(() => JSON.parse(JSON.stringify(mockData.data)));
    const res = await request(app)
      .put('/trackmyweek/api/categories/1')
      .send({ name: 'Nutrition' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Nutrition');
    // Cascade: entry should now use the new name
    expect(mockData.data.every((e) => e.category === 'Nutrition')).toBe(true);
  });

  test('updates icon and color without renaming', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/categories/1')
      .send({ icon: '\ud83c\udf55', color: '#ff0000' });
    expect(res.status).toBe(200);
    expect(res.body.icon).toBe('\ud83c\udf55');
    expect(res.body.color).toBe('#ff0000');
  });

  test('returns 409 when renamed to an existing category name', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/categories/1')
      .send({ name: 'Medications' });
    expect(res.status).toBe(409);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/categories/999')
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/categories/:id ──────────────────────────────────────────────────
describe('DELETE /trackmyweek/api/categories/:id', () => {
  test('deletes category and returns 200', async () => {
    const res = await request(app).delete('/trackmyweek/api/categories/1');
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(1);
    expect(res.body.reassigned).toBe(0);
    expect(mockData.categories.find((c) => c.id === 1)).toBeUndefined();
  });

  test('returns 409 when entries exist and no reassignTo', async () => {
    mockData.data = [
      { id: 1, text: 'Salad', category: 'Food', notes: '', timestamp: new Date().toISOString() },
    ];
    data.readEntries.mockImplementation(() => JSON.parse(JSON.stringify(mockData.data)));
    const res = await request(app).delete('/trackmyweek/api/categories/1');
    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('entryCount', 1);
  });

  test('reassigns entries and deletes category when reassignTo is valid', async () => {
    mockData.data = [
      { id: 1, text: 'Salad', category: 'Food', notes: '', timestamp: new Date().toISOString() },
    ];
    data.readEntries.mockImplementation(() => JSON.parse(JSON.stringify(mockData.data)));
    const res = await request(app)
      .delete('/trackmyweek/api/categories/1?reassignTo=Medications');
    expect(res.status).toBe(200);
    expect(res.body.reassigned).toBe(1);
    expect(mockData.data.every((e) => e.category === 'Medications')).toBe(true);
  });

  test('returns 400 when reassignTo target does not exist', async () => {
    mockData.data = [
      { id: 1, text: 'Salad', category: 'Food', notes: '', timestamp: new Date().toISOString() },
    ];
    data.readEntries.mockImplementation(() => JSON.parse(JSON.stringify(mockData.data)));
    const res = await request(app)
      .delete('/trackmyweek/api/categories/1?reassignTo=Nonexistent');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/trackmyweek/api/categories/999');
    expect(res.status).toBe(404);
  });
});
