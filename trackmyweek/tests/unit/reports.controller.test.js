'use strict';

const request           = require('supertest');
const { app, mockData } = require('./testApp');
const data              = require('../../lib/data');

const BASE_REPORT = {
  id: 1, name: 'My first report', chartType: 'bar', measure: 'count',
  groupBy: 'category', filterCategories: [], dateRange: 'alltime',
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  mockData.data = [
    { id: 1, text: 'Run',   category: 'Exercise', notes: '', timestamp: '2026-03-13T07:00:00.000Z' },
    { id: 2, text: 'Apple', category: 'Food',     notes: '', timestamp: '2026-03-13T12:00:00.000Z' },
    { id: 3, text: 'Jog',   category: 'Exercise', notes: '', timestamp: '2026-03-11T07:00:00.000Z' },
  ];
  mockData.categories = [
    { id: 1, name: 'Exercise', icon: '\ud83c\udfc3', color: '#2ecc71', createdAt: new Date().toISOString() },
    { id: 2, name: 'Food',     icon: '\ud83c\udf4e', color: '#e74c3c', createdAt: new Date().toISOString() },
  ];
  mockData.reports = [JSON.parse(JSON.stringify(BASE_REPORT))];
  data.readEntries.mockImplementation(()     => JSON.parse(JSON.stringify(mockData.data)));
  data.readCategories.mockImplementation(()  => JSON.parse(JSON.stringify(mockData.categories)));
  data.readReports.mockImplementation(()     => JSON.parse(JSON.stringify(mockData.reports)));
  data.writeReports.mockImplementation((arr) => { mockData.reports = arr; });
});

// ── GET /api/reports/schema ───────────────────────────────────────────────────
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

// ── GET /api/reports ──────────────────────────────────────────────────────────────
describe('GET /trackmyweek/api/reports', () => {
  test('returns array of reports', async () => {
    const res = await request(app).get('/trackmyweek/api/reports');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });
});

// ── POST /api/reports ──────────────────────────────────────────────────────────────
describe('POST /trackmyweek/api/reports', () => {
  test('creates report and returns 201', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/reports')
      .send({ name: 'New report', chartType: 'pie', measure: 'count',
              groupBy: 'category', filterCategories: [], dateRange: '30days' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New report');
    expect(res.body.id).toBeDefined();
    expect(Array.isArray(res.body.filterCategories)).toBe(true);
  });

  test('defaults filterCategories to [] when not provided', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/reports')
      .send({ name: 'No filter', chartType: 'bar', measure: 'count',
              groupBy: 'category', dateRange: '7days' });
    expect(res.status).toBe(201);
    expect(res.body.filterCategories).toEqual([]);
  });

  test('returns 400 when required fields missing', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/reports')
      .send({ name: 'Incomplete' });
    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  test('returns 400 for invalid chartType', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/reports')
      .send({ name: 'Bad', chartType: 'notachart', measure: 'count',
              groupBy: 'category', dateRange: '7days' });
    expect(res.status).toBe(400);
  });
});

// ── GET /api/reports/:id/data ───────────────────────────────────────────────────
describe('GET /trackmyweek/api/reports/:id/data', () => {
  test('returns labels and values arrays for alltime groupBy category', async () => {
    const res = await request(app).get('/trackmyweek/api/reports/1/data');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.labels)).toBe(true);
    expect(Array.isArray(res.body.values)).toBe(true);
    expect(res.body.labels).toContain('Exercise');
    expect(res.body.labels).toContain('Food');
  });

  test('applies filterCategories when set', async () => {
    mockData.reports = [{ ...BASE_REPORT, filterCategories: ['Exercise'] }];
    data.readReports.mockImplementation(() => JSON.parse(JSON.stringify(mockData.reports)));
    const res = await request(app).get('/trackmyweek/api/reports/1/data');
    expect(res.status).toBe(200);
    expect(res.body.labels).not.toContain('Food');
    expect(res.body.labels).toContain('Exercise');
  });

  test('measure frequencyPerDay returns decimal values', async () => {
    mockData.reports = [{ ...BASE_REPORT, measure: 'frequencyPerDay', dateRange: '7days' }];
    data.readReports.mockImplementation(() => JSON.parse(JSON.stringify(mockData.reports)));
    const res = await request(app).get('/trackmyweek/api/reports/1/data');
    expect(res.status).toBe(200);
    res.body.values.forEach((v) => expect(typeof v).toBe('number'));
  });

  test('groupBy dayOfWeek returns day-name labels', async () => {
    mockData.reports = [{ ...BASE_REPORT, groupBy: 'dayOfWeek', dateRange: 'alltime' }];
    data.readReports.mockImplementation(() => JSON.parse(JSON.stringify(mockData.reports)));
    const res = await request(app).get('/trackmyweek/api/reports/1/data');
    expect(res.status).toBe(200);
    const validDays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    res.body.labels.forEach((l) => expect(validDays).toContain(l));
  });

  test('groupBy timeOfDay returns time-block labels', async () => {
    mockData.reports = [{ ...BASE_REPORT, groupBy: 'timeOfDay', dateRange: 'alltime' }];
    data.readReports.mockImplementation(() => JSON.parse(JSON.stringify(mockData.reports)));
    const res = await request(app).get('/trackmyweek/api/reports/1/data');
    expect(res.status).toBe(200);
    const validBlocks = ['morning','afternoon','evening','night'];
    res.body.labels.forEach((l) => expect(validBlocks).toContain(l));
  });

  test('groupBy month returns month-name labels', async () => {
    mockData.reports = [{ ...BASE_REPORT, groupBy: 'month', dateRange: 'alltime' }];
    data.readReports.mockImplementation(() => JSON.parse(JSON.stringify(mockData.reports)));
    const res = await request(app).get('/trackmyweek/api/reports/1/data');
    expect(res.status).toBe(200);
    expect(res.body.labels.length).toBeGreaterThan(0);
  });

  test('groupBy week returns YYYY-WNN labels', async () => {
    mockData.reports = [{ ...BASE_REPORT, groupBy: 'week', dateRange: 'alltime' }];
    data.readReports.mockImplementation(() => JSON.parse(JSON.stringify(mockData.reports)));
    const res = await request(app).get('/trackmyweek/api/reports/1/data');
    expect(res.status).toBe(200);
    res.body.labels.forEach((l) => expect(l).toMatch(/^\d{4}-W\d{2}$/));
  });

  test('dateRange alltime does not filter any entries', async () => {
    const res = await request(app).get('/trackmyweek/api/reports/1/data');
    expect(res.body.total).toBe(3);
  });

  test('dateRange 7days filters entries by date', async () => {
    mockData.reports = [{ ...BASE_REPORT, dateRange: '7days' }];
    data.readReports.mockImplementation(() => JSON.parse(JSON.stringify(mockData.reports)));
    const res = await request(app).get('/trackmyweek/api/reports/1/data');
    expect(res.status).toBe(200);
    expect(typeof res.body.total).toBe('number');
  });

  test('returns 404 for unknown report', async () => {
    const res = await request(app).get('/trackmyweek/api/reports/999/data');
    expect(res.status).toBe(404);
  });
});

// ── PUT /api/reports/:id ────────────────────────────────────────────────────────────
describe('PUT /trackmyweek/api/reports/:id', () => {
  test('updates report name', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/reports/1')
      .send({ name: 'Renamed report' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Renamed report');
  });

  test('updates multiple fields at once', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/reports/1')
      .send({ chartType: 'pie', measure: 'frequencyPerDay', dateRange: '30days' });
    expect(res.status).toBe(200);
    expect(res.body.chartType).toBe('pie');
    expect(res.body.measure).toBe('frequencyPerDay');
    expect(res.body.dateRange).toBe('30days');
  });

  test('returns 400 for invalid chartType on update', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/reports/1')
      .send({ chartType: 'invalidtype' });
    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  test('returns 400 for invalid measure on update', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/reports/1')
      .send({ measure: 'invalidmeasure' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid groupBy on update', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/reports/1')
      .send({ groupBy: 'invalidgroupby' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid dateRange on update', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/reports/1')
      .send({ dateRange: 'invaliddaterange' });
    expect(res.status).toBe(400);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/reports/999')
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/reports/:id ──────────────────────────────────────────────────────────
describe('DELETE /trackmyweek/api/reports/:id', () => {
  test('deletes report and returns 200', async () => {
    const res = await request(app).delete('/trackmyweek/api/reports/1');
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(1);
    expect(mockData.reports.find((r) => r.id === 1)).toBeUndefined();
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/trackmyweek/api/reports/999');
    expect(res.status).toBe(404);
  });
});
