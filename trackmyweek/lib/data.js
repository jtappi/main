'use strict';

/**
 * data.js — all file I/O for TrackMyWeek.
 *
 * Rules:
 *   - No route or controller ever imports `fs` directly.
 *   - All paths resolve relative to this file so the module works regardless
 *     of the process cwd.
 *   - Reads are synchronous-style via JSON.parse; writes are atomic enough
 *     for a single-user app (writeFileSync).
 *   - If a runtime data file does not exist, the corresponding template is
 *     copied in automatically on the first read.
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR     = path.join(__dirname, '..', 'data');
const RUNTIME      = (name) => path.join(DATA_DIR, `${name}.json`);
const TEMPLATE     = (name) => path.join(DATA_DIR, `${name}.template.json`);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Read a JSON file. If the runtime file does not exist, seed it from the
 * template and return the seeded contents.
 *
 * @param {string} name  e.g. 'data', 'categories', 'reports', 'questions'
 * @returns {Array}
 */
function readFile(name) {
  const runtimePath  = RUNTIME(name);
  const templatePath = TEMPLATE(name);

  if (!fs.existsSync(runtimePath)) {
    if (!fs.existsSync(templatePath)) {
      throw new Error(`[data.js] Template not found: ${templatePath}`);
    }
    fs.copyFileSync(templatePath, runtimePath);
  }

  const raw = fs.readFileSync(runtimePath, 'utf8');
  return JSON.parse(raw);
}

/**
 * Write data back to a runtime JSON file.
 *
 * @param {string} name
 * @param {Array}  data
 */
function writeFile(name, data) {
  const runtimePath = RUNTIME(name);
  fs.writeFileSync(runtimePath, JSON.stringify(data, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// ID helpers
// ---------------------------------------------------------------------------

/**
 * Return the next integer ID for entries, categories, or reports.
 * Finds the current maximum `id` in the array and adds 1.
 * Returns 1 if the array is empty.
 *
 * @param {Array<{id: number}>} items
 * @returns {number}
 */
function nextIntId(items) {
  if (!items.length) return 1;
  return Math.max(...items.map((i) => i.id)) + 1;
}

/**
 * Return the next ID for questions (timestamp-based, matches spec).
 *
 * @returns {number}
 */
function nextTimestampId() {
  return Date.now();
}

// ---------------------------------------------------------------------------
// Public API — Entries
// ---------------------------------------------------------------------------

function readEntries()          { return readFile('data'); }
function writeEntries(entries)  { writeFile('data', entries); }

// ---------------------------------------------------------------------------
// Public API — Categories
// ---------------------------------------------------------------------------

function readCategories()             { return readFile('categories'); }
function writeCategories(categories)  { writeFile('categories', categories); }

// ---------------------------------------------------------------------------
// Public API — Reports
// ---------------------------------------------------------------------------

function readReports()          { return readFile('reports'); }
function writeReports(reports)  { writeFile('reports', reports); }

// ---------------------------------------------------------------------------
// Public API — Questions
// ---------------------------------------------------------------------------

function readQuestions()            { return readFile('questions'); }
function writeQuestions(questions)  { writeFile('questions', questions); }

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Entries
  readEntries,
  writeEntries,

  // Categories
  readCategories,
  writeCategories,

  // Reports
  readReports,
  writeReports,

  // Questions
  readQuestions,
  writeQuestions,

  // ID helpers
  nextIntId,
  nextTimestampId,
};
