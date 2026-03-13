/**
 * Integration tests — /trackmyweek/api/reports
 */

const request = require('supertest');

const mockData = {
  entries:    [
    { id: 1, text: 'Run',   category: 'Exercise', notes: '', timestamp: new Date().toISOString() },
    { id: 2, text: 'Apple', category: 'Food',     notes: '', timestamp: new Date().toISOString() },
  ],
  categories: [
    { id: 1, name: 'Exercise', icon: '🏃', color: '#2ecc71', createdAt: new Date().toISOString() },
    { id: 2, name: 'Food',     icon: '🍎', color: '#e74c3c', createdAt: new Date().toISOString() },
  ],
  reports: [],
};

jest.mock('../../lib/data', () => ({
  readFile:  jest.fn(async (key) => JSON.parse(JSON.stringify(mockData[key] || []))),
  writeFile: jest.fn(async (key, val) => { mockData[key] = val; }),
}));

const data = require('../../lib/data');
const app  = require('./testApp');

beforeEach(() => {
  mockData.reports = [
    {
      id: 1,
      name: 'My first report',
      chartType: 'bar',
      measure: 'count',
      groupBy: 'category',
      filterCategories: [],
      dateRange: '7days',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  data.readFile.mockImplementation(async (key) =>
    JSON.parse(JSON.stringify(mockData[key] || []))
  );
  data.writeFile.mockImplementation(async (key, val) => { mockData[key] = val; });
});

// ---------------------------------------------------------------------------
// GET /reports/schema
// ---------------------------------------------------------------------------

describe('GET /trackmyweek/api/reports/schema', () => {
  test('returns schema with required keys', async () => {
    const res = await request(app).get('/trackmyweek/api/reports/schema');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('CHART_TYPES');
    expect(res.body).toHaveProperty('MEASURES');
    expect(res.body).toHaveProperty('GROUP_BY_OPTIONS');
    expect(res.body).toHaveProperty('DATE_RANGES');
    expect(Array.isArray(res.body.CHART_TYPES)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GET /reports
// ---------------------------------------------------------------------------

describe('GET /trackmyweek/api/reports', () => {
  test('returns array of reports', async () => {
    const res = await request(app).get('/trackmyweek/api/reports');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// POST /reports
// ---------------------------------------------------------------------------

describe('POST /trackmyweek/api/reports', () => {
  test('creates report and returns 201', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/reports')
      .send({
        name: 'New report',
        chartType: 'pie',
        measure: 'count',
        groupBy: 'category',
        filterCategories: [],
        dateRange: '30days',
      });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New report');
    expect(res.body.id).toBeDefined();
  });

  test('returns 400 when required fields missing', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/reports')
      .send({ name: 'Incomplete' });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /reports/:id/data
// ---------------------------------------------------------------------------

describe('GET /trackmyweek/api/reports/:id/data', () => {
  test('returns labels and values arrays', async () => {
    const res = await request(app).get('/trackmyweek/api/reports/1/data');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.labels)).toBe(true);
    expect(Array.isArray(res.body.values)).toBe(true);
  });

  test('returns 404 for unknown report', async () => {
    const res = await request(app).get('/trackmyweek/api/reports/999/data');
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PUT /reports/:id
// ---------------------------------------------------------------------------

describe('PUT /trackmyweek/api/reports/:id', () => {
  test('updates report name', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/reports/1')
      .send({ name: 'Renamed report' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Renamed report');
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/reports/999')
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /reports/:id
// ---------------------------------------------------------------------------

describe('DELETE /trackmyweek/api/reports/:id', () => {
  test('deletes report and returns 200', async () => {
    const res = await request(app).delete('/trackmyweek/api/reports/1');
    expect(res.status).toBe(200);
    expect(mockData.reports.find((r) => r.id === 1)).toBeUndefined();
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/trackmyweek/api/reports/999');
    expect(res.status).toBe(404);
  });
});
