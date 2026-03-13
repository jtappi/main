/**
 * Integration tests — /trackmyweek/api/entries
 *
 * Uses supertest to fire real HTTP requests against the Express app.
 * Stubs lib/data.js so no files are read or written to disk.
 */

const request = require('supertest');

// --- Stub data layer before requiring the app ---
const mockData = {
  entries:    [],
  categories: [
    { id: 1, name: 'Health', icon: '❤️', color: '#e74c3c', createdAt: new Date().toISOString() },
  ],
};

jest.mock('../../lib/data', () => ({
  readFile:  jest.fn(async (key) => JSON.parse(JSON.stringify(mockData[key] || []))),
  writeFile: jest.fn(async () => {}),
}));

const data = require('../../lib/data');
const app  = require('../../server');

beforeEach(() => {
  // Reset to a clean set of entries before each test
  mockData.entries = [
    {
      id:        1,
      text:      'Took ibuprofen',
      category:  'Health',
      notes:     '600mg',
      timestamp: '2026-03-13T09:00:00.000Z',
    },
    {
      id:        2,
      text:      'Morning run',
      category:  'Exercise',
      notes:     '',
      timestamp: '2026-03-13T07:30:00.000Z',
    },
  ];
  data.readFile.mockImplementation(async (key) =>
    JSON.parse(JSON.stringify(mockData[key] || []))
  );
  data.writeFile.mockImplementation(async (key, val) => {
    mockData[key] = val;
  });
});

// ---------------------------------------------------------------------------
// GET /entries
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// POST /entries
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// PUT /entries/:id
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// DELETE /entries/:id
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// GET /entries/autocomplete
// ---------------------------------------------------------------------------

describe('GET /trackmyweek/api/entries/autocomplete', () => {
  test('returns matches for query', async () => {
    const res = await request(app)
      .get('/trackmyweek/api/entries/autocomplete?q=ibu');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((e) => e.text.toLowerCase().includes('ibu'))).toBe(true);
  });

  test('returns empty array for no match', async () => {
    const res = await request(app)
      .get('/trackmyweek/api/entries/autocomplete?q=zzznomatch');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// GET /entries/quickentry
// ---------------------------------------------------------------------------

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
});
