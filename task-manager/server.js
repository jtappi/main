'use strict';

/**
 * server.js — Task Manager Express router.
 *
 * This module exports a configured Express router that the portal mounts
 * at /task-manager. It does NOT start its own HTTP server.
 *
 * By mounting inside the portal, the task-manager routes share the portal's
 * session middleware automatically — so requireAuth works correctly without
 * any cross-port session sharing.
 *
 * For local standalone development only, running this file directly with
 * NODE_ENV=development will spin up a temporary server on port 3004.
 */

const express = require('express');
const fs      = require('fs');
const path    = require('path');

const DATA_FILE = path.join(__dirname, 'tasks.json');

// Seed an empty data file on first run if none exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ tasks: [], closedLog: [] }, null, 2), 'utf8');
}

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
};

// ---------------------------------------------------------------------------
// Build the router
// ---------------------------------------------------------------------------
const router = express.Router();

// GET /task-manager/api/tasks
router.get('/api/tasks', (req, res) => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
  } catch (e) {
    res.status(500).json({ error: 'Error reading tasks' });
  }
});

// POST /task-manager/api/tasks
router.post('/api/tasks', (req, res) => {
  try {
    const payload = req.body;
    if (payload === undefined || payload === null) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    const count = Array.isArray(payload)
      ? payload.length
      : Array.isArray(payload.tasks)
        ? payload.tasks.length
        : 0;
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
    res.json({ ok: true, count });
  } catch (e) {
    res.status(400).json({ error: 'Invalid JSON' });
  }
});

// Static assets (index.html, app.js, style.css)
router.use(express.static(path.join(__dirname)));

// Fallback — serve index.html for the root
router.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ---------------------------------------------------------------------------
// Export the router for mounting in the portal
// ---------------------------------------------------------------------------
module.exports = router;

// ---------------------------------------------------------------------------
// Standalone dev server (NODE_ENV=development only)
// ---------------------------------------------------------------------------
if (require.main === module) {
  if (process.env.NODE_ENV !== 'development') {
    console.error('task-manager/server.js is not meant to run standalone in production.');
    console.error('Mount it in the portal instead: app.use(\'/task-manager\', require(\'../task-manager/server\')).');
    process.exit(1);
  }
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use('/task-manager', router);
  const PORT = process.env.PORT || 3004;
  app.listen(PORT, () => {
    console.log(`Task Manager dev server running at http://localhost:${PORT}/task-manager`);
  });
}
