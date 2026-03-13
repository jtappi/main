/**
 * server.js — TrackMyWeek Express server.
 *
 * Mount point: / (root) because trackmyweek.com is the dedicated domain.
 * In development (NODE_ENV=development) the requireAuth middleware is
 * bypassed so you can test without credentials.
 */

const path    = require('path');
const express = require('express');
const cors    = require('cors');

const entriesController    = require('./controllers/entries.controller');
const categoriesController = require('./controllers/categories.controller');
const reportsController    = require('./controllers/reports.controller');
const questionsController  = require('./controllers/questions.controller');
const prebuiltController   = require('./controllers/prebuilt.controller');

// Auth middleware — bypassed in development
let requireAuth;
try {
  requireAuth = require('../core/auth/middleware');
} catch {
  requireAuth = (_req, _res, next) => next();
}
if (process.env.NODE_ENV === 'development') {
  requireAuth = (_req, _res, next) => next();
}

const app = express();

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// API routes — all under /api (no /trackmyweek prefix)
// ---------------------------------------------------------------------------
app.use('/api/entries',    requireAuth, entriesController);
app.use('/api/categories', requireAuth, categoriesController);
app.use('/api/reports',    requireAuth, reportsController);
app.use('/api/questions',  requireAuth, questionsController);
app.use('/api/prebuilt',   requireAuth, prebuiltController);

// ---------------------------------------------------------------------------
// Serve the built React SPA
// ---------------------------------------------------------------------------
const DIST = path.join(__dirname, 'client', 'dist');
app.use(express.static(DIST));

// All non-API routes — hand off to React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`TrackMyWeek running on http://localhost:${PORT}`);
  });
}

module.exports = app;
