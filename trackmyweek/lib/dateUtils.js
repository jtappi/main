'use strict';

/**
 * dateUtils.js — date helpers for TrackMyWeek.
 *
 * resolveDateRange(key)  — converts a dateRange key to { start, end } Date objects
 * deriveFields(timestamp) — extracts dayOfWeek, month, hourBlock, weekKey from an ISO timestamp
 *
 * All times are handled in local server time (EST per spec).
 */

const DAY_NAMES  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

/**
 * Resolve a dateRange key to absolute start/end Date objects.
 *
 * @param {string} key  one of: today, 7days, 30days, 90days, alltime
 * @returns {{ start: Date, end: Date }}
 */
function resolveDateRange(key) {
  const end   = new Date();
  const start = new Date();

  switch (key) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case '7days':
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case '30days':
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
    case '90days':
      start.setDate(start.getDate() - 89);
      start.setHours(0, 0, 0, 0);
      break;
    case 'alltime':
    default:
      start.setFullYear(2000, 0, 1);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { start, end };
}

/**
 * Derive human-readable fields from an ISO 8601 timestamp string.
 * Used by the report engine to group entries by dimension.
 *
 * @param {string} timestamp  ISO 8601, e.g. "2026-03-10T13:30:00"
 * @returns {{
 *   dayOfWeek: string,   // e.g. "Tuesday"
 *   month:     string,   // e.g. "March"
 *   hourBlock: string,   // e.g. "1 PM"
 *   weekKey:   string,   // e.g. "2026-W10"
 *   dateKey:   string,   // e.g. "2026-03-10"
 * }}
 */
function deriveFields(timestamp) {
  const d = new Date(timestamp);

  const dayOfWeek = DAY_NAMES[d.getDay()];
  const month     = MONTH_NAMES[d.getMonth()];

  const hour      = d.getHours();
  const ampm      = hour < 12 ? 'AM' : 'PM';
  const hour12    = hour % 12 === 0 ? 12 : hour % 12;
  const hourBlock = `${hour12} ${ampm}`;

  // ISO week number (Monday-based)
  const jan4      = new Date(d.getFullYear(), 0, 4);
  const weekNum   = Math.ceil(
    ((d - jan4) / 86400000 + jan4.getDay() + 1) / 7
  );
  const weekKey   = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

  const dateKey   = d.toISOString().slice(0, 10);

  return { dayOfWeek, month, hourBlock, weekKey, dateKey };
}

module.exports = { resolveDateRange, deriveFields };
