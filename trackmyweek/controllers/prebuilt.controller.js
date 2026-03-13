'use strict';

/**
 * prebuilt.controller.js
 *
 * Serves data for the two pinned pre-built reports that are always
 * available on the report dashboard.
 *
 * GET /api/prebuilt/trend?dateRange=7days
 *   Returns entries-per-day counts for the "Entries Over Time" trend chart.
 *   Response: { dateRange, labels: ["2026-03-06", ...], values: [3, 1, ...] }
 *
 * GET /api/prebuilt/categories?dateRange=7days
 *   Returns per-category entry counts for the "Category Breakdown" pie chart.
 *   Response: { dateRange, labels: ["Food", ...], values: [5, 3, ...] }
 */

const express = require('express');
const router  = express.Router();
const { readEntries }               = require('../lib/data');
const { resolveDateRange, deriveFields } = require('../lib/dateUtils');
const { DATE_RANGES }               = require('../lib/schema');

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
  const { key, start, end } = getDateRange(req.query);

  const entries = readEntries().filter((e) => {
    const ts = new Date(e.timestamp);
    return ts >= start && ts <= end;
  });

  // Build a label for every day in the range so days with 0 entries appear
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
  const { key, start, end } = getDateRange(req.query);

  const entries = readEntries().filter((e) => {
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
