'use strict';

/**
 * server.js — TrackMyWeek Express app.
 *
 * Mounted at /trackmyweek on port 3001.
 * Auth is enforced by requireAuth on every route — the portal session
 * cookie is shared across all apps in this monorepo.
 *
 * Static client files are served from client/dist/ (populated by Phase 3
 * Vite build). Until then, a 404 on / is expected and harmless.
 */

const path    = require('path');
const express = require('express');
const cors    = require('cors');

const { requireAuth } = require('../core/auth/middleware');

const entriesController    = require('./controllers/entries.controller');
const categoriesController = require('./controllers/categories.controller');
const reportsController    = require('./controllers/reports.controller');
const questionsController  = require('./controllers/questions.controller');
const prebuiltController   = require('./controllers/prebuilt.controller');

const app    = express();
const PREFIX = '/trackmyweek';
const PORT   = process.env.TRACKMYWEEK_PORT || 3001;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(cors());
app.use(express.json());

// Serve built React client (populated after `npm run build` in client/)
app.use(
  PREFIX,
  express.static(path.join(__dirname, 'client', 'dist'))
);

// ---------------------------------------------------------------------------
// Auth — all API routes require a valid portal session
// ---------------------------------------------------------------------------

app.use(`${PREFIX}/api`, requireAuth);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use(`${PREFIX}/api/entries`,    entriesController);
app.use(`${PREFIX}/api/categories`, categoriesController);
app.use(`${PREFIX}/api/reports`,    reportsController);
app.use(`${PREFIX}/api/questions`,  questionsController);
app.use(`${PREFIX}/api/prebuilt`,   prebuiltController);

// ---------------------------------------------------------------------------
// SPA fallback — serve index.html for any non-API route under PREFIX
// (React Router handles client-side navigation)
// ---------------------------------------------------------------------------

app.get(`${PREFIX}/*`, (req, res) => {
  const indexPath = path.join(__dirname, 'client', 'dist', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ error: 'Client not built yet. Run: cd client && npm run build' });
    }
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`TrackMyWeek running at http://localhost:${PORT}${PREFIX}`);
  });
}

module.exports = app;
