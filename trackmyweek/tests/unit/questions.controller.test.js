/**
 * Integration tests — /trackmyweek/api/questions
 */

const request = require('supertest');

const mockData = { questions: [] };

jest.mock('../../lib/data', () => ({
  readFile:  jest.fn(async (key) => JSON.parse(JSON.stringify(mockData[key] || []))),
  writeFile: jest.fn(async (key, val) => { mockData[key] = val; }),
}));

const data = require('../../lib/data');
const app  = require('./testApp');

const NOW = new Date().toISOString();

beforeEach(() => {
  mockData.questions = [
    { id: 1, question: 'How am I doing?', answer: null,    createdAt: NOW, answeredAt: null },
    { id: 2, question: 'What went well?', answer: 'A lot', createdAt: NOW, answeredAt: NOW },
  ];
  data.readFile.mockImplementation(async (key) =>
    JSON.parse(JSON.stringify(mockData[key] || []))
  );
  data.writeFile.mockImplementation(async (key, val) => { mockData[key] = val; });
});

// ---------------------------------------------------------------------------
// GET /questions
// ---------------------------------------------------------------------------

describe('GET /trackmyweek/api/questions', () => {
  test('returns 200 with array', async () => {
    const res = await request(app).get('/trackmyweek/api/questions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  test('unanswered questions come first', async () => {
    const res = await request(app).get('/trackmyweek/api/questions');
    expect(res.body[0].answer).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// POST /questions
// ---------------------------------------------------------------------------

describe('POST /trackmyweek/api/questions', () => {
  test('creates question and returns 201', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/questions')
      .send({ question: 'What do I want to improve?' });
    expect(res.status).toBe(201);
    expect(res.body.question).toBe('What do I want to improve?');
    expect(res.body.answer).toBeNull();
    expect(res.body.answeredAt).toBeNull();
  });

  test('returns 400 if question text is missing', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/questions')
      .send({});
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PUT /questions/:id
// ---------------------------------------------------------------------------

describe('PUT /trackmyweek/api/questions/:id', () => {
  test('sets answer and answeredAt', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/questions/1')
      .send({ answer: 'Doing great!' });
    expect(res.status).toBe(200);
    expect(res.body.answer).toBe('Doing great!');
    expect(res.body.answeredAt).not.toBeNull();
  });

  test('can update question text', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/questions/1')
      .send({ question: 'How am I really doing?' });
    expect(res.status).toBe(200);
    expect(res.body.question).toBe('How am I really doing?');
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/questions/999')
      .send({ answer: 'Ghost' });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /questions/:id
// ---------------------------------------------------------------------------

describe('DELETE /trackmyweek/api/questions/:id', () => {
  test('deletes question and returns 200', async () => {
    const res = await request(app).delete('/trackmyweek/api/questions/1');
    expect(res.status).toBe(200);
    expect(mockData.questions.find((q) => q.id === 1)).toBeUndefined();
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/trackmyweek/api/questions/999');
    expect(res.status).toBe(404);
  });
});
