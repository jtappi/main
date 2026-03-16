'use strict';

/**
 * data.js — all file I/O for BP Tracker.
 *
 * Rules:
 *   - No route or controller ever imports `fs` directly.
 *   - All paths resolve relative to this file so the module works regardless
 *     of the process cwd.
 *   - Reads are synchronous via JSON.parse; writes are atomic enough for a
 *     single-user / small-team app (writeFileSync).
 *   - If the runtime data file does not exist, the template is copied in
 *     automatically on the first read.
 *   - All query functions that accept a user are role-aware: admin gets all
 *     records; guest gets only their own (scoped by userId).
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');

const RUNTIME  = (name) => path.join(DATA_DIR, `${name}.json`);
const TEMPLATE = (name) => path.join(DATA_DIR, `${name}.template.json`);

/** Retention window in milliseconds (90 days). */
const IMAGE_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Read a JSON file. If the runtime file does not exist, seed it from the
 * template and return the seeded contents.
 *
 * @param {string} name  e.g. 'readings'
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
// Public API — Readings
// ---------------------------------------------------------------------------

/**
 * Read all readings from disk.
 *
 * @returns {Array}
 */
function readReadings() {
  return readFile('readings');
}

/**
 * Write the full readings array back to disk.
 *
 * @param {Array} readings
 */
function writeReadings(readings) {
  writeFile('readings', readings);
}

/**
 * Filter readings by userId. Admin role bypasses the filter and gets all
 * records. Guest role receives only records where reading.userId === userId.
 *
 * @param {Array}  readings  - full readings array
 * @param {string} userId    - the requesting user's id
 * @param {string} role      - 'admin' | 'guest'
 * @returns {Array}
 */
function filterByUserId(readings, userId, role) {
  if (role === 'admin') return readings;
  return readings.filter((r) => r.userId === userId);
}

/**
 * Append a new reading to the readings file and return the updated array.
 *
 * @param {Object} reading  - fully-formed reading object (id already set)
 * @returns {Array}         - updated readings array
 */
function appendReading(reading) {
  const readings = readReadings();
  readings.push(reading);
  writeReadings(readings);
  return readings;
}

/**
 * Update an existing reading by id. Only the fields provided in `updates`
 * are merged — all other fields are preserved.
 *
 * @param {string} id
 * @param {Object} updates
 * @returns {Object|null}  - updated reading, or null if id not found
 */
function updateReading(id, updates) {
  const readings = readReadings();
  const index = readings.findIndex((r) => r.id === id);
  if (index === -1) return null;
  readings[index] = { ...readings[index], ...updates };
  writeReadings(readings);
  return readings[index];
}

/**
 * Delete a reading by id.
 *
 * @param {string} id
 * @returns {boolean}  - true if deleted, false if id not found
 */
function deleteReading(id) {
  const readings = readReadings();
  const index = readings.findIndex((r) => r.id === id);
  if (index === -1) return false;
  readings.splice(index, 1);
  writeReadings(readings);
  return true;
}

// ---------------------------------------------------------------------------
// Public API — Image cleanup
// ---------------------------------------------------------------------------

/**
 * Purge images older than IMAGE_RETENTION_MS (90 days).
 *
 * For each reading whose `createdAt` is older than the retention window:
 *   1. If an image file exists at the resolved path, delete it.
 *   2. Set `imageRef` to null on the reading record.
 *
 * The readings array is only written back to disk if at least one record
 * was modified, to avoid unnecessary I/O on startup.
 *
 * This function is safe to call on every server startup — it is idempotent.
 *
 * @returns {{ purged: number }}  number of images purged in this run
 */
function purgeExpiredImages() {
  if (!fs.existsSync(IMAGES_DIR)) return { purged: 0 };

  const readings = readReadings();
  const cutoff = Date.now() - IMAGE_RETENTION_MS;
  let purged = 0;
  let dirty = false;

  for (const reading of readings) {
    if (!reading.imageRef) continue;
    const createdAt = new Date(reading.createdAt).getTime();
    if (isNaN(createdAt) || createdAt >= cutoff) continue;

    const imagePath = path.join(DATA_DIR, reading.imageRef);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      purged++;
    }
    reading.imageRef = null;
    dirty = true;
  }

  if (dirty) writeReadings(readings);
  return { purged };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Readings
  readReadings,
  writeReadings,
  filterByUserId,
  appendReading,
  updateReading,
  deleteReading,

  // Image cleanup
  purgeExpiredImages,

  // Exposed for tests
  IMAGE_RETENTION_MS,
  DATA_DIR,
  IMAGES_DIR,
};
