'use strict';

/**
 * prebuilt.controller.js
 *
 * GET /api/prebuilt/trend?dateRange=7days
 * GET /api/prebuilt/categories?dateRange=7days
 *
 * All operations are scoped to req.session.user.id.
 */

const express = require('express');
const router  = express.Router();
const { readEntries }                       = require('../lib/data');
const { resolveDateRange, deriveFields }    = require('../lib/dateUtils');
const { DATE_RANGES }                       = require('../lib/schema');

const VALID_DATE_RANGES = DATE_RANGES.map((d) => d.key);
const DEFAULT_RANGE     = '7days';

function getDateRange(query) {
  const key = VALID_DATE_RANGES.includes(query.dateRange)
    ? query.dateRange
    : DEFAULT_RANGE;
  return { key, ...resolveDateRange(key) };
}

// ---------------------------------------------------------------------------
// GET /api/prebuilt/trend
// ---------------------------------------------------------------------------

router.get('/trend', (req, res) => {
  const userId          = req.session.user.id;
  const { key, start, end } = getDateRange(req.query);

  const entries = readEntries(userId).filter((e) => {
    const ts = new Date(e.timestamp);
    return ts >= start && ts <= end;
  });

  const dayCounts = {};
  const cursor    = new Date(start);
  while (cursor <= end) {
    const label = cursor.toISOString().slice(0, 10);
    dayCounts[label] = 0;
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const entry of entries) {
    const label = entry.timestamp.slice(0, 10);
    if (label in dayCounts) dayCounts[label]++;
  }

  const labels = Object.keys(dayCounts).sort();
  const values = labels.map((l) => dayCounts[l]);

  res.json({ dateRange: key, labels, values });
});

// ---------------------------------------------------------------------------
// GET /api/prebuilt/categories
// ---------------------------------------------------------------------------

router.get('/categories', (req, res) => {
  const userId          = req.session.user.id;
  const { key, start, end } = getDateRange(req.query);

  const entries = readEntries(userId).filter((e) => {
    const ts = new Date(e.timestamp);
    return ts >= start && ts <= end;
  });

  const counts = {};
  for (const entry of entries) {
    counts[entry.category] = (counts[entry.category] || 0) + 1;
  }

  const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const values = labels.map((l) => counts[l]);

  res.json({ dateRange: key, labels, values });
});

module.exports = router;
