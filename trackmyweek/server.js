'use strict';

/**
 * server.js — TrackMyWeek Express server.
 *
 * trackmyweek.com is a standalone domain — all routes mount at root.
 * In development (NODE_ENV=development) requireAuth is bypassed.
 */

const path    = require('path');
const express = require('express');
const cors    = require('cors');

const entriesController    = require('./controllers/entries.controller');
const categoriesController = require('./controllers/categories.controller');
const reportsController    = require('./controllers/reports.controller');
const questionsController  = require('./controllers/questions.controller');
const prebuiltController   = require('./controllers/prebuilt.controller');

// ---------------------------------------------------------------------------
// Auth middleware
// core/auth/middleware exports { requireAuth, requireAdmin, requireProjectAccess }
// We must destructure — passing the whole object to app.use() causes a crash.
// In development the real middleware is replaced with a pass-through.
// ---------------------------------------------------------------------------
let requireAuth;
if (process.env.NODE_ENV === 'development') {
  requireAuth = (_req, _res, next) => next();
} else {
  try {
    ({ requireAuth } = require('../core/auth/middleware'));
  } catch {
    // Running outside the monorepo (e.g. standalone deploy) — skip auth
    requireAuth = (_req, _res, next) => next();
  }
}

const app = express();

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.use('/api/entries',    requireAuth, entriesController);
app.use('/api/categories', requireAuth, categoriesController);
app.use('/api/reports',    requireAuth, reportsController);
app.use('/api/questions',  requireAuth, questionsController);
app.use('/api/prebuilt',   requireAuth, prebuiltController);

// ---------------------------------------------------------------------------
// Serve the built React SPA from client/dist/
// ---------------------------------------------------------------------------
const DIST = path.join(__dirname, 'client', 'dist');
app.use(express.static(DIST));

// All non-API routes hand off to React Router
app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`TrackMyWeek running on http://localhost:${PORT}`);
  });
}

module.exports = app;
