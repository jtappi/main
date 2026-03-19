'use strict';

const request           = require('supertest');
const { app, mockData } = require('./testApp');
const data              = require('../../lib/data');

beforeEach(() => {
  mockData.questions = [
    { id: 1001, question: 'Why did I skip the gym?', answer: null,           createdAt: '2026-03-13T10:00:00.000Z', answeredAt: null },
    { id: 1002, question: 'How was my energy today?', answer: 'Pretty good', createdAt: '2026-03-12T10:00:00.000Z', answeredAt: '2026-03-12T12:00:00.000Z' },
  ];
  data.readQuestions.mockImplementation((_userId)      => JSON.parse(JSON.stringify(mockData.questions)));
  data.writeQuestions.mockImplementation((_userId, arr) => { mockData.questions = arr; });
});

// ── GET /api/questions ──────────────────────────────────────────────────────
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
    expect(res.body[1].answer).not.toBeNull();
  });
});

// ── POST /api/questions ─────────────────────────────────────────────────────
describe('POST /trackmyweek/api/questions', () => {
  test('creates question and returns 201', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/questions')
      .send({ question: 'New question?' });
    expect(res.status).toBe(201);
    expect(res.body.question).toBe('New question?');
    expect(res.body.id).toBeDefined();
    expect(res.body.answer).toBeNull();
  });

  test('returns 400 if question text is missing', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/questions')
      .send({});
    expect(res.status).toBe(400);
  });

  test('returns 400 if question text is only whitespace', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/questions')
      .send({ question: '   ' });
    expect(res.status).toBe(400);
  });
});

// ── PUT /api/questions/:id ──────────────────────────────────────────────────
describe('PUT /trackmyweek/api/questions/:id', () => {
  test('updates question text', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/questions/1001')
      .send({ question: 'Why did I skip the gym again?' });
    expect(res.status).toBe(200);
    expect(res.body.question).toBe('Why did I skip the gym again?');
  });

  test('sets answer and marks answeredAt', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/questions/1001')
      .send({ answer: 'I was tired.' });
    expect(res.status).toBe(200);
    expect(res.body.answer).toBe('I was tired.');
    expect(res.body.answeredAt).not.toBeNull();
  });

  test('clears answer when set to null', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/questions/1002')
      .send({ answer: null });
    expect(res.status).toBe(200);
    expect(res.body.answer).toBeNull();
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/questions/9999')
      .send({ answer: 'Ghost' });
    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/questions/:id ───────────────────────────────────────────────
describe('DELETE /trackmyweek/api/questions/:id', () => {
  test('deletes question and returns 200', async () => {
    const res = await request(app).delete('/trackmyweek/api/questions/1001');
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(1001);
    expect(mockData.questions.find((q) => q.id === 1001)).toBeUndefined();
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/trackmyweek/api/questions/9999');
    expect(res.status).toBe(404);
  });
});
