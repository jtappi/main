'use strict';

const request           = require('supertest');
const { app, mockData } = require('./testApp');
const data              = require('../../lib/data');

beforeEach(() => {
  mockData.data = [
    { id: 1, text: 'Took ibuprofen', category: 'Health',   notes: '600mg', timestamp: '2026-03-13T09:00:00.000Z' },
    { id: 2, text: 'Morning run',    category: 'Exercise',  notes: '',      timestamp: '2026-03-13T07:30:00.000Z' },
  ];
  mockData.categories = [
    { id: 1, name: 'Health',   icon: '❤️', color: '#e74c3c', createdAt: new Date().toISOString() },
    { id: 2, name: 'Exercise', icon: '🏃', color: '#2ecc71', createdAt: new Date().toISOString() },
  ];
  data.readEntries.mockImplementation(()    => JSON.parse(JSON.stringify(mockData.data)));
  data.writeEntries.mockImplementation((arr) => { mockData.data = arr; });
  data.readCategories.mockImplementation(() => JSON.parse(JSON.stringify(mockData.categories)));
});

describe('GET /trackmyweek/api/entries', () => {
  test('returns 200 with array of entries', async () => {
    const res = await request(app).get('/trackmyweek/api/entries');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  test('entries have expected shape', async () => {
    const res = await request(app).get('/trackmyweek/api/entries');
    const entry = res.body[0];
    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('text');
    expect(entry).toHaveProperty('category');
    expect(entry).toHaveProperty('timestamp');
  });
});

describe('POST /trackmyweek/api/entries', () => {
  test('creates an entry and returns 201', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/entries')
      .send({ text: 'New entry', category: 'Health', notes: '' });
    expect(res.status).toBe(201);
    expect(res.body.text).toBe('New entry');
    expect(res.body.id).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });

  test('returns 400 when text is missing', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/entries')
      .send({ category: 'Health' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 when category is missing', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/entries')
      .send({ text: 'No category' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /trackmyweek/api/entries/:id', () => {
  test('updates text field and returns updated entry', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/entries/1')
      .send({ text: 'Updated text' });
    expect(res.status).toBe(200);
    expect(res.body.text).toBe('Updated text');
    expect(res.body.id).toBe(1);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/entries/999')
      .send({ text: 'Ghost' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /trackmyweek/api/entries/:id', () => {
  test('deletes entry and returns 200', async () => {
    const res = await request(app).delete('/trackmyweek/api/entries/1');
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(1);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/trackmyweek/api/entries/999');
    expect(res.status).toBe(404);
  });
});

describe('GET /trackmyweek/api/entries/autocomplete', () => {
  test('returns matching strings for query', async () => {
    const res = await request(app)
      .get('/trackmyweek/api/entries/autocomplete?q=ibu');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((s) => s.toLowerCase().includes('ibu'))).toBe(true);
  });

  test('returns empty array for no match', async () => {
    const res = await request(app)
      .get('/trackmyweek/api/entries/autocomplete?q=zzznomatch');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /trackmyweek/api/entries/quickentry', () => {
  test('returns an array', async () => {
    const res = await request(app).get('/trackmyweek/api/entries/quickentry');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('returns at most 5 entries', async () => {
    const res = await request(app).get('/trackmyweek/api/entries/quickentry');
    expect(res.body.length).toBeLessThanOrEqual(5);
  });

  test('each item includes text, category, and count', async () => {
    const res = await request(app).get('/trackmyweek/api/entries/quickentry');
    expect(res.status).toBe(200);
    for (const item of res.body) {
      expect(item).toHaveProperty('text');
      expect(item).toHaveProperty('category');
      expect(item).toHaveProperty('count');
      expect(typeof item.category).toBe('string');
      expect(item.category.length).toBeGreaterThan(0);
    }
  });

  test('category returned by quickentry can be used to POST a new entry (round-trip)', async () => {
    // Step 1 — seed multiple entries so quickentry has data to rank
    mockData.data = [
      { id: 1, text: 'Took ibuprofen', category: 'Health',   notes: '', timestamp: '2026-03-13T09:00:00.000Z' },
      { id: 2, text: 'Took ibuprofen', category: 'Health',   notes: '', timestamp: '2026-03-13T08:00:00.000Z' },
      { id: 3, text: 'Morning run',    category: 'Exercise', notes: '', timestamp: '2026-03-13T07:30:00.000Z' },
    ];
    data.readEntries.mockImplementation(() => JSON.parse(JSON.stringify(mockData.data)));

    // Step 2 — fetch quickentry
    const quickRes = await request(app).get('/trackmyweek/api/entries/quickentry');
    expect(quickRes.status).toBe(200);
    expect(quickRes.body.length).toBeGreaterThan(0);

    // Step 3 — take the top item and POST it back exactly as the client would
    const topItem = quickRes.body[0];
    expect(topItem.category).toBeDefined();

    const postRes = await request(app)
      .post('/trackmyweek/api/entries')
      .send({ text: topItem.text, category: topItem.category });

    // Step 4 — must be 201, not 400
    expect(postRes.status).toBe(201);
    expect(postRes.body.text).toBe(topItem.text);
    expect(postRes.body.category).toBe(topItem.category);
  });
});
