'use strict';

const request           = require('supertest');
const { app, mockData } = require('./testApp');
const data              = require('../../lib/data');

const NOW = new Date().toISOString();

beforeEach(() => {
  mockData.questions = [
    { id: 1, question: 'How am I doing?', answer: null,         createdAt: NOW, answeredAt: null },
    { id: 2, question: 'What went well?', answer: 'A lot',      createdAt: NOW, answeredAt: NOW },
    { id: 3, question: 'What improved?',  answer: 'Many things', createdAt: NOW, answeredAt: NOW },
  ];
  data.readQuestions.mockImplementation(()    => JSON.parse(JSON.stringify(mockData.questions)));
  data.writeQuestions.mockImplementation((arr) => { mockData.questions = arr; });
});

// ── GET /api/questions ─────────────────────────────────────────────────────
describe('GET /trackmyweek/api/questions', () => {
  test('returns 200 with all questions', async () => {
    const res = await request(app).get('/trackmyweek/api/questions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(3);
  });

  test('unanswered questions come first', async () => {
    const res = await request(app).get('/trackmyweek/api/questions');
    expect(res.body[0].answer).toBeNull();
  });

  test('answered questions are sorted by createdAt descending after unanswered', async () => {
    const res = await request(app).get('/trackmyweek/api/questions');
    const answered = res.body.filter((q) => q.answer !== null);
    // All answered items should come after unanswered
    const firstAnsweredIndex = res.body.findIndex((q) => q.answer !== null);
    const lastUnansweredIndex = res.body.findLastIndex((q) => q.answer === null);
    expect(firstAnsweredIndex).toBeGreaterThan(lastUnansweredIndex);
  });
});

// ── POST /api/questions ────────────────────────────────────────────────────
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

  test('returns 400 if question is only whitespace', async () => {
    const res = await request(app)
      .post('/trackmyweek/api/questions')
      .send({ question: '   ' });
    expect(res.status).toBe(400);
  });
});

// ── PUT /api/questions/:id ───────────────────────────────────────────────────
describe('PUT /trackmyweek/api/questions/:id', () => {
  test('sets answer and answeredAt on previously unanswered question', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/questions/1')
      .send({ answer: 'Doing great!' });
    expect(res.status).toBe(200);
    expect(res.body.answer).toBe('Doing great!');
    expect(res.body.answeredAt).not.toBeNull();
  });

  test('does not overwrite answeredAt when question was already answered', async () => {
    const originalAnsweredAt = mockData.questions[1].answeredAt;
    const res = await request(app)
      .put('/trackmyweek/api/questions/2')
      .send({ answer: 'Updated answer' });
    expect(res.status).toBe(200);
    expect(res.body.answeredAt).toBe(originalAnsweredAt);
  });

  test('clears answer back to null', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/questions/2')
      .send({ answer: null });
    expect(res.status).toBe(200);
    expect(res.body.answer).toBeNull();
  });

  test('can update question text without affecting answer', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/questions/1')
      .send({ question: 'How am I really doing?' });
    expect(res.status).toBe(200);
    expect(res.body.question).toBe('How am I really doing?');
    expect(res.body.answer).toBeNull();
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app)
      .put('/trackmyweek/api/questions/999')
      .send({ answer: 'Ghost' });
    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/questions/:id ───────────────────────────────────────────────────
describe('DELETE /trackmyweek/api/questions/:id', () => {
  test('deletes question and returns 200', async () => {
    const res = await request(app).delete('/trackmyweek/api/questions/1');
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(1);
    expect(mockData.questions.find((q) => q.id === 1)).toBeUndefined();
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/trackmyweek/api/questions/999');
    expect(res.status).toBe(404);
  });
});
