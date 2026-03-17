'use strict';

/**
 * questions.controller.js
 *
 * GET    /api/questions        — list all, unanswered first
 * POST   /api/questions        — create question
 * PUT    /api/questions/:id    — update text or answer
 * DELETE /api/questions/:id    — delete question
 *
 * All operations are scoped to req.session.user.id.
 */

const express = require('express');
const router  = express.Router();
const {
  readQuestions,
  writeQuestions,
  nextTimestampId,
} = require('../lib/data');

// ---------------------------------------------------------------------------
// GET /api/questions
// ---------------------------------------------------------------------------

router.get('/', (req, res) => {
  const userId    = req.session.user.id;
  const questions = readQuestions(userId);

  questions.sort((a, b) => {
    if (!a.answer && b.answer)  return -1;
    if (a.answer  && !b.answer) return  1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  res.json(questions);
});

// ---------------------------------------------------------------------------
// POST /api/questions
// ---------------------------------------------------------------------------

router.post('/', (req, res) => {
  const userId   = req.session.user.id;
  const { question } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'question text is required' });
  }

  const questions   = readQuestions(userId);
  const now         = new Date().toISOString();
  const newQuestion = {
    id:         nextTimestampId(),
    question:   question.trim(),
    answer:     null,
    createdAt:  now,
    answeredAt: null,
  };

  questions.push(newQuestion);
  writeQuestions(userId, questions);

  res.status(201).json(newQuestion);
});

// ---------------------------------------------------------------------------
// PUT /api/questions/:id
// ---------------------------------------------------------------------------

router.put('/:id', (req, res) => {
  const userId    = req.session.user.id;
  const id        = parseInt(req.params.id, 10);
  const questions = readQuestions(userId);
  const index     = questions.findIndex((q) => q.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Question not found' });
  }

  const { question, answer } = req.body;
  const existing             = questions[index];

  const wasAnswered = !!existing.answer;
  const nowAnswered = answer !== undefined ? !!answer : wasAnswered;

  questions[index] = {
    ...existing,
    ...(question !== undefined && { question: question.trim() }),
    ...(answer   !== undefined && { answer: answer ? answer.trim() : null }),
    answeredAt:
      nowAnswered && !wasAnswered
        ? new Date().toISOString()
        : existing.answeredAt,
  };

  writeQuestions(userId, questions);
  res.json(questions[index]);
});

// ---------------------------------------------------------------------------
// DELETE /api/questions/:id
// ---------------------------------------------------------------------------

router.delete('/:id', (req, res) => {
  const userId    = req.session.user.id;
  const id        = parseInt(req.params.id, 10);
  const questions = readQuestions(userId);
  const index     = questions.findIndex((q) => q.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Question not found' });
  }

  questions.splice(index, 1);
  writeQuestions(userId, questions);

  res.json({ deleted: id });
});

module.exports = router;
