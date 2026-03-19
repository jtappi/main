'use strict';

/**
 * entries.controller.js
 *
 * GET    /api/entries                        — list all, with optional filters
 * GET    /api/entries/autocomplete?q=        — up to 3 matching entry texts
 * GET    /api/entries/quickentry             — top 5 most frequent recent entries
 * POST   /api/entries                        — create entry
 * PUT    /api/entries/:id                    — update any field
 * DELETE /api/entries/:id                    — delete entry
 *
 * All operations are scoped to req.session.user.id.
 */

const express = require('express');
const router  = express.Router();
const {
  readEntries,
  writeEntries,
  readCategories,
  nextIntId,
} = require('../lib/data');
const { resolveDateRange } = require('../lib/dateUtils');

// ---------------------------------------------------------------------------
// GET /api/entries/autocomplete?q=
// ---------------------------------------------------------------------------

router.get('/autocomplete', (req, res) => {
  const userId = req.session.user.id;
  const q      = (req.query.q || '').toLowerCase().trim();
  if (q.length < 3) return res.json([]);

  const entries = readEntries(userId);
  const seen    = new Set();
  const matches = [];

  for (const entry of entries) {
    const text = entry.text.toLowerCase();
    if (text.includes(q) && !seen.has(entry.text)) {
      seen.add(entry.text);
      matches.push(entry.text);
      if (matches.length === 3) break;
    }
  }

  res.json(matches);
});

// ---------------------------------------------------------------------------
// GET /api/entries/quickentry
// ---------------------------------------------------------------------------

router.get('/quickentry', (req, res) => {
  const userId  = req.session.user.id;
  const entries = readEntries(userId);

  const counts   = {};
  const category = {};

  for (const entry of entries) {
    if (!counts[entry.text]) {
      counts[entry.text]   = 0;
      category[entry.text] = entry.category;
    }
    counts[entry.text]++;
  }

  const top5 = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([text, count]) => ({ text, category: category[text], count }));

  res.json(top5);
});

// ---------------------------------------------------------------------------
// GET /api/entries
// ---------------------------------------------------------------------------

router.get('/', (req, res) => {
  const userId = req.session.user.id;
  let entries  = readEntries(userId);

  const { category, keyword, dateRange } = req.query;

  if (category) {
    entries = entries.filter((e) => e.category === category);
  }

  if (keyword) {
    const kw = keyword.toLowerCase();
    entries = entries.filter(
      (e) =>
        e.text.toLowerCase().includes(kw) ||
        (e.notes && e.notes.toLowerCase().includes(kw))
    );
  }

  if (dateRange) {
    const range = resolveDateRange(dateRange);
    if (range) {
      const { start, end } = range;
      entries = entries.filter((e) => {
        const ts = new Date(e.timestamp);
        return ts >= start && ts <= end;
      });
    }
  }

  entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json(entries);
});

// ---------------------------------------------------------------------------
// POST /api/entries
// ---------------------------------------------------------------------------

router.post('/', (req, res) => {
  const userId              = req.session.user.id;
  const { text, category, notes } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (!category || !category.trim()) {
    return res.status(400).json({ error: 'category is required' });
  }

  const categories = readCategories(userId);
  if (!categories.find((c) => c.name === category)) {
    return res.status(400).json({ error: `Unknown category: ${category}` });
  }

  const entries  = readEntries(userId);
  const newEntry = {
    id:        nextIntId(entries),
    text:      text.trim(),
    category:  category.trim(),
    notes:     notes ? notes.trim() : '',
    timestamp: new Date().toISOString(),
  };

  entries.unshift(newEntry);
  writeEntries(userId, entries);

  res.status(201).json(newEntry);
});

// ---------------------------------------------------------------------------
// PUT /api/entries/:id
// ---------------------------------------------------------------------------

router.put('/:id', (req, res) => {
  const userId  = req.session.user.id;
  const id      = parseInt(req.params.id, 10);
  const entries = readEntries(userId);
  const index   = entries.findIndex((e) => e.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  const { text, category, notes, timestamp } = req.body;

  if (category) {
    const categories = readCategories(userId);
    if (!categories.find((c) => c.name === category)) {
      return res.status(400).json({ error: `Unknown category: ${category}` });
    }
  }

  const updated = {
    ...entries[index],
    ...(text      !== undefined && { text: text.trim() }),
    ...(category  !== undefined && { category: category.trim() }),
    ...(notes     !== undefined && { notes: notes.trim() }),
    ...(timestamp !== undefined && { timestamp }),
  };

  entries[index] = updated;
  writeEntries(userId, entries);

  res.json(updated);
});

// ---------------------------------------------------------------------------
// DELETE /api/entries/:id
// ---------------------------------------------------------------------------

router.delete('/:id', (req, res) => {
  const userId  = req.session.user.id;
  const id      = parseInt(req.params.id, 10);
  const entries = readEntries(userId);
  const index   = entries.findIndex((e) => e.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  entries.splice(index, 1);
  writeEntries(userId, entries);

  res.json({ deleted: id });
});

module.exports = router;
