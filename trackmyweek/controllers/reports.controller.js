'use strict';

/**
 * reports.controller.js
 *
 * GET    /api/reports               — list all saved reports
 * GET    /api/reports/schema        — return all valid schema constants
 * GET    /api/reports/:id/data      — run report, return chart-ready data
 * POST   /api/reports               — create saved report
 * PUT    /api/reports/:id           — update report config or name
 * DELETE /api/reports/:id           — delete saved report
 *
 * All operations are scoped to req.session.user.id.
 */

const express = require('express');
const router  = express.Router();
const {
  readReports,
  writeReports,
  readEntries,
  nextIntId,
} = require('../lib/data');
const {
  CHART_TYPES,
  DATE_RANGES,
  GROUP_BY_OPTIONS,
  MEASURES,
} = require('../lib/schema');
const { resolveDateRange, deriveFields } = require('../lib/dateUtils');

const VALID_CHART_TYPES = CHART_TYPES.map((c) => c.key);
const VALID_DATE_RANGES  = DATE_RANGES.map((d) => d.key);
const VALID_GROUP_BY     = GROUP_BY_OPTIONS.map((g) => g.key);
const VALID_MEASURES     = MEASURES.map((m) => m.key);

// ---------------------------------------------------------------------------
// GET /api/reports/schema
// ---------------------------------------------------------------------------

router.get('/schema', (req, res) => {
  res.json({ CHART_TYPES, DATE_RANGES, GROUP_BY_OPTIONS, MEASURES });
});

// ---------------------------------------------------------------------------
// GET /api/reports
// ---------------------------------------------------------------------------

router.get('/', (req, res) => {
  const userId = req.session.user.id;
  res.json(readReports(userId));
});

// ---------------------------------------------------------------------------
// POST /api/reports
// ---------------------------------------------------------------------------

router.post('/', (req, res) => {
  const userId = req.session.user.id;
  const { name, chartType, measure, groupBy, filterCategories, dateRange } = req.body;

  const errors = [];
  if (!name || !name.trim())                  errors.push('name is required');
  if (!VALID_CHART_TYPES.includes(chartType)) errors.push(`invalid chartType: ${chartType}`);
  if (!VALID_MEASURES.includes(measure))      errors.push(`invalid measure: ${measure}`);
  if (!VALID_GROUP_BY.includes(groupBy))      errors.push(`invalid groupBy: ${groupBy}`);
  if (!VALID_DATE_RANGES.includes(dateRange)) errors.push(`invalid dateRange: ${dateRange}`);

  if (errors.length) return res.status(400).json({ errors });

  const reports   = readReports(userId);
  const now       = new Date().toISOString();
  const newReport = {
    id:               nextIntId(reports),
    name:             name.trim(),
    chartType,
    measure,
    groupBy,
    filterCategories: Array.isArray(filterCategories) ? filterCategories : [],
    dateRange,
    createdAt:        now,
    updatedAt:        now,
  };

  reports.push(newReport);
  writeReports(userId, reports);

  res.status(201).json(newReport);
});

// ---------------------------------------------------------------------------
// PUT /api/reports/:id
// ---------------------------------------------------------------------------

router.put('/:id', (req, res) => {
  const userId  = req.session.user.id;
  const id      = parseInt(req.params.id, 10);
  const reports = readReports(userId);
  const index   = reports.findIndex((r) => r.id === id);

  if (index === -1) return res.status(404).json({ error: 'Report not found' });

  const { name, chartType, measure, groupBy, filterCategories, dateRange } = req.body;
  const errors = [];

  if (chartType && !VALID_CHART_TYPES.includes(chartType)) errors.push(`invalid chartType: ${chartType}`);
  if (measure   && !VALID_MEASURES.includes(measure))      errors.push(`invalid measure: ${measure}`);
  if (groupBy   && !VALID_GROUP_BY.includes(groupBy))      errors.push(`invalid groupBy: ${groupBy}`);
  if (dateRange && !VALID_DATE_RANGES.includes(dateRange)) errors.push(`invalid dateRange: ${dateRange}`);

  if (errors.length) return res.status(400).json({ errors });

  reports[index] = {
    ...reports[index],
    ...(name             !== undefined && { name: name.trim() }),
    ...(chartType        !== undefined && { chartType }),
    ...(measure          !== undefined && { measure }),
    ...(groupBy          !== undefined && { groupBy }),
    ...(filterCategories !== undefined && { filterCategories }),
    ...(dateRange        !== undefined && { dateRange }),
    updatedAt: new Date().toISOString(),
  };

  writeReports(userId, reports);
  res.json(reports[index]);
});

// ---------------------------------------------------------------------------
// DELETE /api/reports/:id
// ---------------------------------------------------------------------------

router.delete('/:id', (req, res) => {
  const userId  = req.session.user.id;
  const id      = parseInt(req.params.id, 10);
  const reports = readReports(userId);
  const index   = reports.findIndex((r) => r.id === id);

  if (index === -1) return res.status(404).json({ error: 'Report not found' });

  reports.splice(index, 1);
  writeReports(userId, reports);

  res.json({ deleted: id });
});

// ---------------------------------------------------------------------------
// GET /api/reports/:id/data
// ---------------------------------------------------------------------------

router.get('/:id/data', (req, res) => {
  const userId  = req.session.user.id;
  const id      = parseInt(req.params.id, 10);
  const reports = readReports(userId);
  const report  = reports.find((r) => r.id === id);

  if (!report) return res.status(404).json({ error: 'Report not found' });

  const data = runReport(report, userId);
  res.json(data);
});

// ---------------------------------------------------------------------------
// Report engine
// ---------------------------------------------------------------------------

function runReport(report, userId) {
  const range = resolveDateRange(report.dateRange);
  let entries = readEntries(userId);

  if (range) {
    const { start, end } = range;
    entries = entries.filter((e) => {
      const ts = new Date(e.timestamp);
      return ts >= start && ts <= end;
    });
  }

  if (report.filterCategories && report.filterCategories.length > 0) {
    entries = entries.filter((e) => report.filterCategories.includes(e.category));
  }

  const groups = {};
  for (const entry of entries) {
    const key = getDimensionKey(entry, report.groupBy);
    groups[key] = (groups[key] || 0) + 1;
  }

  const totalDays = range
    ? Math.max(1, Math.ceil((range.end - range.start) / (1000 * 60 * 60 * 24)))
    : 1;

  const labels = Object.keys(groups).sort();
  const values = labels.map((label) => {
    const count = groups[label];
    return report.measure === 'frequencyPerDay'
      ? parseFloat((count / totalDays).toFixed(2))
      : count;
  });

  return {
    reportId:  report.id,
    chartType: report.chartType,
    measure:   report.measure,
    groupBy:   report.groupBy,
    dateRange: report.dateRange,
    labels,
    values,
    total:     entries.length,
  };
}

function getDimensionKey(entry, groupBy) {
  const d = deriveFields(entry.timestamp);
  switch (groupBy) {
    case 'category':  return entry.category;
    case 'dayOfWeek': return d.dayOfWeek;
    case 'timeOfDay': return d.hourBlock;
    case 'month':     return d.month;
    case 'week':      return d.weekKey;
    default:          return entry.category;
  }
}

module.exports = router;
