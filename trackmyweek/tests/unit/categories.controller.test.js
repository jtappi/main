/**
 * Integration tests — /trackmyweek/api/categories
 */

const request = require('supertest');

const mockData = {
  entries:    [],
  categories: [],
};

jest.mock('../../lib/data', () => ({
  readFile:  jest.fn(async (key) => JSON.parse(JSON.stringify(mockData[key] || []))),
  writeFile: jest.fn(async (key, val) => { mockData[key] = val; }),
}));

const data = require('../../lib/data');
const app  = require('./testApp');

const BASE_CATS = [
  { id: 1, name: 'Food',        icon: '🍎', color: '#2ecc71', createdAt: new Date().toISOString() },
  { id: 2, name: 'Medications', icon: '💊', color: '#3498db', createdAt: new Date().toISOString() },
];

beforeEach(() => {
  mockData.categories = JSON.parse(JSON.stringify(BASE_CATS));
  mockData.entries    = [
    { id: 1, text: 'Salad', category: 'Food',        notes: '', timestamp: new Date().toISOString() },
    { id: 2, text: 'Ibu',   category: 'Medications', notes: '', timestamp: new Date().toISOString() },
  ];
  data.readFile.mockImplementation(async (key) =>
    JSON.parse(JSON.stringify(mockData[key] || []))
  );
  data.writeFile.mockImplementation(async (key, val) => { mockData[key] = val; });
});

// ---------------------------------------------------------------------------
// GET /categories
// ---------------------------------------------------------------------------

describe('GET /trackmyweek/api/categories', () => {
  test('returns 200 with array', async () => {
    const res = await request(app).get('/trackmyweek/api/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// POST /categories
// ---------------------------------------------------------------------------

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

  test('returns 400 if name is duplicate', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/categories')
      .send({ name: 'Food', icon: '🍎', color: '#2ecc71' });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PUT /categories/:id
// ---------------------------------------------------------------------------

describe('PUT /trackmyweek/api/categories/:id', () => {
  test('renames category and cascades to entries', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/categories/1')
      .send({ name: 'Nutrition', icon: '🥗', color: '#2ecc71' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Nutrition');
    const entriesWithOldName = mockData.entries.filter((e) => e.category === 'Food');
    expect(entriesWithOldName.length).toBe(0);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/categories/999')
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /categories/:id
// ---------------------------------------------------------------------------

describe('DELETE /trackmyweek/api/categories/:id', () => {
  test('deletes category, leaves entries uncategorised by default', async () => {
    const res = await request(app).delete('/trackmyweek/api/categories/1');
    expect(res.status).toBe(200);
    const remaining = mockData.categories.find((c) => c.id === 1);
    expect(remaining).toBeUndefined();
  });

  test('reassigns entries when reassignTo is provided', async () => {
    await request(app)
      .delete('/trackmyweek/api/categories/1?reassignTo=Medications');
    const reassigned = mockData.entries.filter((e) => e.category === 'Medications');
    expect(reassigned.length).toBeGreaterThanOrEqual(1);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/trackmyweek/api/categories/999');
    expect(res.status).toBe(404);
  });
});
