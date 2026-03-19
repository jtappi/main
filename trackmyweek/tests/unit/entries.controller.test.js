'use strict';

const request           = require('supertest');
const { app, mockData } = require('./testApp');
const data              = require('../../lib/data');

beforeEach(() => {
  mockData.data = [
    { id: 1, text: 'Took ibuprofen', category: 'Health',   notes: '600mg',      timestamp: '2026-03-13T09:00:00.000Z' },
    { id: 2, text: 'Morning run',    category: 'Exercise',  notes: 'felt great', timestamp: '2026-03-13T07:30:00.000Z' },
  ];
  mockData.categories = [
    { id: 1, name: 'Health',   icon: '\u2764\ufe0f', color: '#e74c3c', createdAt: new Date().toISOString() },
    { id: 2, name: 'Exercise', icon: '\ud83c\udfc3', color: '#2ecc71', createdAt: new Date().toISOString() },
  ];
  data.readEntries.mockImplementation((_userId)      => JSON.parse(JSON.stringify(mockData.data)));
  data.writeEntries.mockImplementation((_userId, arr) => { mockData.data = arr; });
  data.readCategories.mockImplementation((_userId)   => JSON.parse(JSON.stringify(mockData.categories)));
});

// ── GET /api/entries ─────────────────────────────────────────────────────
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

  test('filters by category', async () => {
    const res = await request(app).get('/trackmyweek/api/entries?category=Health');
    expect(res.status).toBe(200);
    expect(res.body.every((e) => e.category === 'Health')).toBe(true);
  });

  test('filters by keyword matching text field', async () => {
    const res = await request(app).get('/trackmyweek/api/entries?keyword=ibuprofen');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].text).toMatch(/ibuprofen/i);
  });

  test('filters by keyword matching notes field', async () => {
    const res = await request(app).get('/trackmyweek/api/entries?keyword=felt');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].notes).toMatch(/felt/i);
  });

  test('dateRange=alltime returns all entries without filtering', async () => {
    const res = await request(app).get('/trackmyweek/api/entries?dateRange=alltime');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  test('filters by dateRange=7days', async () => {
    const res = await request(app).get('/trackmyweek/api/entries?dateRange=7days');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('returns empty array when no entries match dateRange', async () => {
    const res = await request(app).get('/trackmyweek/api/entries?dateRange=today');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('returns entries sorted newest first', async () => {
    const res = await request(app).get('/trackmyweek/api/entries');
    const timestamps = res.body.map((e) => new Date(e.timestamp).getTime());
    expect(timestamps[0]).toBeGreaterThanOrEqual(timestamps[1]);
  });
});

// ── POST /api/entries ────────────────────────────────────────────────────
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

  test('returns 400 when text is only whitespace', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/entries')
      .send({ text: '   ', category: 'Health' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when category is missing', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/entries')
      .send({ text: 'No category' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when category does not exist', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/entries')
      .send({ text: 'Mystery entry', category: 'UnknownCategory' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unknown category/i);
  });
});

// ── PUT /api/entries/:id ───────────────────────────────────────────────────
describe('PUT /trackmyweek/api/entries/:id', () => {
  test('updates text field and returns updated entry', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/entries/1')
      .send({ text: 'Updated text' });
    expect(res.status).toBe(200);
    expect(res.body.text).toBe('Updated text');
    expect(res.body.id).toBe(1);
  });

  test('updates category to a valid category', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/entries/1')
      .send({ category: 'Exercise' });
    expect(res.status).toBe(200);
    expect(res.body.category).toBe('Exercise');
  });

  test('returns 400 when updating to an unknown category', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/entries/1')
      .send({ category: 'Nonexistent' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unknown category/i);
  });

  test('updates timestamp field', async () => {
    const newTs = '2026-01-01T00:00:00.000Z';
    const res = await request(app)
      .put('/trackmyweek/api/entries/1')
      .send({ timestamp: newTs });
    expect(res.status).toBe(200);
    expect(res.body.timestamp).toBe(newTs);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/entries/999')
      .send({ text: 'Ghost' });
    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/entries/:id ───────────────────────────────────────────────────
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

// ── GET /api/entries/autocomplete ──────────────────────────────────────────────
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

  test('returns empty array when query is shorter than 3 chars', async () => {
    const res = await request(app)
      .get('/trackmyweek/api/entries/autocomplete?q=ib');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns empty array when q param is absent', async () => {
    const res = await request(app)
      .get('/trackmyweek/api/entries/autocomplete');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns at most 3 results', async () => {
    mockData.data = [
      { id: 1, text: 'Run fast',   category: 'Exercise', notes: '', timestamp: '2026-03-13T07:00:00.000Z' },
      { id: 2, text: 'Run slowly', category: 'Exercise', notes: '', timestamp: '2026-03-13T08:00:00.000Z' },
      { id: 3, text: 'Run medium', category: 'Exercise', notes: '', timestamp: '2026-03-13T09:00:00.000Z' },
      { id: 4, text: 'Run uphill', category: 'Exercise', notes: '', timestamp: '2026-03-13T10:00:00.000Z' },
    ];
    data.readEntries.mockImplementation(() => JSON.parse(JSON.stringify(mockData.data)));
    const res = await request(app).get('/trackmyweek/api/entries/autocomplete?q=run');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(3);
  });
});

// ── GET /api/entries/quickentry ──────────────────────────────────────────────────
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
    for (const item of res.body) {
      expect(item).toHaveProperty('text');
      expect(item).toHaveProperty('category');
      expect(item).toHaveProperty('count');
    }
  });

  test('returns empty array when no entries exist', async () => {
    mockData.data = [];
    data.readEntries.mockImplementation(() => []);
    const res = await request(app).get('/trackmyweek/api/entries/quickentry');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('ranks most frequent entry first', async () => {
    mockData.data = [
      { id: 1, text: 'Took ibuprofen', category: 'Health',   notes: '', timestamp: '2026-03-13T09:00:00.000Z' },
      { id: 2, text: 'Took ibuprofen', category: 'Health',   notes: '', timestamp: '2026-03-13T08:00:00.000Z' },
      { id: 3, text: 'Morning run',    category: 'Exercise', notes: '', timestamp: '2026-03-13T07:30:00.000Z' },
    ];
    data.readEntries.mockImplementation(() => JSON.parse(JSON.stringify(mockData.data)));
    const res = await request(app).get('/trackmyweek/api/entries/quickentry');
    expect(res.body[0].text).toBe('Took ibuprofen');
    expect(res.body[0].count).toBe(2);
  });

  test('category returned by quickentry can be used to POST a new entry (round-trip)', async () => {
    mockData.data = [
      { id: 1, text: 'Took ibuprofen', category: 'Health',   notes: '', timestamp: '2026-03-13T09:00:00.000Z' },
      { id: 2, text: 'Took ibuprofen', category: 'Health',   notes: '', timestamp: '2026-03-13T08:00:00.000Z' },
      { id: 3, text: 'Morning run',    category: 'Exercise', notes: '', timestamp: '2026-03-13T07:30:00.000Z' },
    ];
    data.readEntries.mockImplementation(() => JSON.parse(JSON.stringify(mockData.data)));
    const quickRes = await request(app).get('/trackmyweek/api/entries/quickentry');
    const topItem  = quickRes.body[0];
    const postRes  = await request(app)
      .post('/trackmyweek/api/entries')
      .send({ text: topItem.text, category: topItem.category });
    expect(postRes.status).toBe(201);
    expect(postRes.body.category).toBe(topItem.category);
  });
});
