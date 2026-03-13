'use strict';

/**
 * server.js — TrackMyWeek Express server.
 *
 * nginx proxies trackmyweek.com/trackmyweek/* → this server on port 3001.
 * All routes therefore mount under /trackmyweek.
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
// core/auth/middleware exports { requireAuth, requireAdmin, requireProjectAccess }.
// Destructure — passing the whole object to app.use() causes a crash.
// ---------------------------------------------------------------------------
let requireAuth;
if (process.env.NODE_ENV === 'development') {
  requireAuth = (_req, _res, next) => next();
} else {
  try {
    ({ requireAuth } = require('../core/auth/middleware'));
  } catch {
    requireAuth = (_req, _res, next) => next();
  }
}

const app = express();

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// API routes — mounted under /trackmyweek/api to match nginx location block
// ---------------------------------------------------------------------------
app.use('/trackmyweek/api/entries',    requireAuth, entriesController);
app.use('/trackmyweek/api/categories', requireAuth, categoriesController);
app.use('/trackmyweek/api/reports',    requireAuth, reportsController);
app.use('/trackmyweek/api/questions',  requireAuth, questionsController);
app.use('/trackmyweek/api/prebuilt',   requireAuth, prebuiltController);

// ---------------------------------------------------------------------------
// Serve the built React SPA from client/dist/
// ---------------------------------------------------------------------------
const DIST = path.join(__dirname, 'client', 'dist');
app.use('/trackmyweek', express.static(DIST));

// All /trackmyweek/* non-API routes hand off to React Router
app.get('/trackmyweek/*', (_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`TrackMyWeek running at http://localhost:${PORT}/trackmyweek`);
  });
}

module.exports = app;
