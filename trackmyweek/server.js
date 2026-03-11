'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express    = require('express');
const session    = require('express-session');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
const fs         = require('fs');
const crypto     = require('crypto');

const { requireAuth } = require('../core/auth/middleware');

const app  = express();
const PORT = process.env.TRACKMYWEEK_PORT || 3001;

const DATA_FILE = process.env.TMW_DATA_FILE ||
  path.join(__dirname, 'data/data.json');

const QUESTIONS_FILE = process.env.TMW_QUESTIONS_FILE ||
  path.join(__dirname, 'data/questions.json');

// Ensure data.json exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]), 'utf8');
}

// ── Trust proxy ────────────────────────────────────────────────
app.set('trust proxy', 1);

// ── Nonce middleware ───────────────────────────────────────────
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

// ── Security headers ──────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://code.jquery.com",
        "https://stackpath.bootstrapcdn.com",
        "https://cdnjs.cloudflare.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdnjs.cloudflare.com",
        "https://stackpath.bootstrapcdn.com",
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "https://cdnjs.cloudflare.com",
        "https://fonts.gstatic.com",
        "data:"
      ],
      imgSrc: ["'self'", "data:", "blob:"]
    }
  }
}));

// ── Rate limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});
app.use(limiter);

// ── Sessions (shared secret with portal) ──────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge:   24 * 60 * 60 * 1000
  }
}));

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static files ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Helpers ───────────────────────────────────────────────────
function toISOStringEST(date) {
  const d = new Date(date.getTime() - (5 * 60 * 60 * 1000));
  return d.toISOString().slice(0, -1);
}

// ── Routes ────────────────────────────────────────────────────
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/index.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Submit new entry
app.post('/submit', requireAuth, (req, res) => {
  const { text, category, cost, notes, calories } = req.body;

  if (!text || typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ message: 'Text is required' });
  }
  if (!category || typeof category !== 'string' || category.trim() === '') {
    return res.status(400).json({ message: 'Category is required' });
  }

  const sanitizedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const now = new Date();
  const timestamp = toISOStringEST(now);
  const entry = {
    text: sanitizedText,
    category,
    cost:     cost     || null,
    notes:    notes    || null,
    calories: calories || null,
    day:   now.toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'long' }),
    month: now.toLocaleString('en-US', { timeZone: 'America/New_York', month: 'long' }),
    time:  now.toLocaleTimeString('en-US', { timeZone: 'America/New_York' }),
    timestamp
  };

  fs.readFile(DATA_FILE, (err, data) => {
    if (err) return res.status(500).json({ message: 'Internal server error' });
    const jsonData = JSON.parse(data);
    entry.id = jsonData.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
    jsonData.push(entry);
    fs.writeFile(DATA_FILE, JSON.stringify(jsonData, null, 2), err => {
      if (err) return res.status(500).json({ message: 'Internal server error' });
      res.json({ message: 'Text saved successfully!' });
    });
  });
});

// Search entries
app.get('/search', requireAuth, (req, res) => {
  const query = (req.query.query || '').toLowerCase();
  if (!query || query.trim() === '') {
    return res.status(400).json({ message: 'Invalid query' });
  }
  fs.readFile(DATA_FILE, (err, data) => {
    if (err) return res.status(500).json({ message: 'Internal server error' });
    const json = JSON.parse(data);
    const results = json.filter(item => item.text.toLowerCase().includes(query));
    const unique = results.filter((item, i, self) =>
      i === self.findIndex(t => t.text.toLowerCase() === item.text.toLowerCase())
    );
    res.json(unique);
  });
});

// Get all data
app.get('/data', requireAuth, (req, res) => {
  fs.readFile(DATA_FILE, (err, data) => {
    if (err) return res.status(500).json({ message: 'Internal server error' });
    res.json(JSON.parse(data));
  });
});

// Top items
app.get('/top-items', requireAuth, (req, res) => {
  fs.readFile(DATA_FILE, (err, data) => {
    if (err) return res.status(500).json({ error: 'Internal Server Error' });
    const json = JSON.parse(data);
    const itemStats = json.reduce((acc, item) => {
      if (item.text) {
        if (!acc[item.text] || new Date(item.timestamp) > new Date(acc[item.text].latestTimestamp)) {
          acc[item.text] = {
            count: (acc[item.text]?.count || 0) + 1,
            latestTimestamp: item.timestamp,
            latestItem: item
          };
        } else {
          acc[item.text].count += 1;
        }
      }
      return acc;
    }, {});
    const topItems = Object.entries(itemStats)
      .sort(([, a], [, b]) => b.count !== a.count
        ? b.count - a.count
        : new Date(b.latestTimestamp) - new Date(a.latestTimestamp))
      .slice(0, 5)
      .map(([, stats]) => ({ ...stats.latestItem, category: stats.latestItem.category || 'none' }));
    res.json(topItems);
  });
});

// Update entry
app.put('/data/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ success: false, message: 'Internal server error' });
    const jsonData = JSON.parse(data);
    const index = jsonData.findIndex(item => item.id === id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Item not found' });
    jsonData[index] = { ...jsonData[index], ...req.body };
    fs.writeFile(DATA_FILE, JSON.stringify(jsonData, null, 2), 'utf8', err => {
      if (err) return res.status(500).json({ success: false, message: 'Internal server error' });
      res.json({ success: true, message: 'Item updated successfully' });
    });
  });
});

// Delete entry
app.delete('/data/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ success: false, message: 'Internal server error' });
    let jsonData = JSON.parse(data);
    const index = jsonData.findIndex(item => item.id === id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Item not found' });
    jsonData.splice(index, 1);
    fs.writeFile(DATA_FILE, JSON.stringify(jsonData, null, 2), 'utf8', err => {
      if (err) return res.status(500).json({ success: false, message: 'Internal server error' });
      res.json({ success: true, message: 'Item deleted successfully' });
    });
  });
});

// ── Questions routes ──────────────────────────────────────────
const questionsController = require('./controllers/questions.controller');
app.get('/questions',        requireAuth, questionsController.getQuestions);
app.post('/questions',       requireAuth, questionsController.saveQuestion);
app.put('/questions/:id',    requireAuth, questionsController.updateAnswer);
app.delete('/questions/:id', requireAuth, questionsController.deleteQuestion);

// ── Start ─────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`TrackMyWeek running on port ${PORT}`);
  });
}

module.exports = app;
