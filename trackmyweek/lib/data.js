'use strict';

/**
 * data.js — all file I/O for TrackMyWeek.
 *
 * Data is now scoped per user. Every public function accepts a userId as its
 * first argument. Files are stored as:
 *
 *   data/<name>.<userId>.json        e.g. data.bhattjk.json
 *
 * On first access for a given user, the runtime file is seeded from the
 * shared template (data.template.json, categories.template.json, etc.).
 *
 * Migration note: existing unscoped files (data.json, categories.json, etc.)
 * must be renamed on the server to include the owner's userId before deploying.
 * See the PR description for the exact commands.
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const RUNTIME  = (name, userId) => path.join(DATA_DIR, `${name}.${userId}.json`);
const TEMPLATE = (name)         => path.join(DATA_DIR, `${name}.template.json`);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Read a user-scoped JSON file. Seeds from template on first access.
 *
 * @param {string} name    e.g. 'data', 'categories', 'reports', 'questions'
 * @param {string} userId  the session user id
 * @returns {Array}
 */
function readFile(name, userId) {
  if (!userId) throw new Error('[data.js] userId is required');

  const runtimePath  = RUNTIME(name, userId);
  const templatePath = TEMPLATE(name);

  if (!fs.existsSync(runtimePath)) {
    if (!fs.existsSync(templatePath)) {
      throw new Error(`[data.js] Template not found: ${templatePath}`);
    }
    fs.copyFileSync(templatePath, runtimePath);
  }

  return JSON.parse(fs.readFileSync(runtimePath, 'utf8'));
}

/**
 * Write data back to a user-scoped runtime JSON file.
 *
 * @param {string} name
 * @param {string} userId
 * @param {Array}  data
 */
function writeFile(name, userId, data) {
  if (!userId) throw new Error('[data.js] userId is required');
  fs.writeFileSync(RUNTIME(name, userId), JSON.stringify(data, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// ID helpers
// ---------------------------------------------------------------------------

function nextIntId(items) {
  if (!items.length) return 1;
  return Math.max(...items.map((i) => i.id)) + 1;
}

function nextTimestampId() {
  return Date.now();
}

// ---------------------------------------------------------------------------
// Public API — Entries
// ---------------------------------------------------------------------------

function readEntries(userId)            { return readFile('data', userId); }
function writeEntries(userId, entries)  { writeFile('data', userId, entries); }

// ---------------------------------------------------------------------------
// Public API — Categories
// ---------------------------------------------------------------------------

function readCategories(userId)               { return readFile('categories', userId); }
function writeCategories(userId, categories)  { writeFile('categories', userId, categories); }

// ---------------------------------------------------------------------------
// Public API — Reports
// ---------------------------------------------------------------------------

function readReports(userId)            { return readFile('reports', userId); }
function writeReports(userId, reports)  { writeFile('reports', userId, reports); }

// ---------------------------------------------------------------------------
// Public API — Questions
// ---------------------------------------------------------------------------

function readQuestions(userId)              { return readFile('questions', userId); }
function writeQuestions(userId, questions)  { writeFile('questions', userId, questions); }

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  readEntries,
  writeEntries,
  readCategories,
  writeCategories,
  readReports,
  writeReports,
  readQuestions,
  writeQuestions,
  nextIntId,
  nextTimestampId,
};
