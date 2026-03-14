'use strict';

/**
 * dateUtils.js — date helpers for TrackMyWeek.
 *
 * resolveDateRange(key)        — converts a dateRange key to { start, end } Date objects.
 *                                Returns null for 'alltime', unknown keys, and falsy values.
 * deriveFields(timestamp)      — extracts human-readable fields from an ISO timestamp.
 * toLocalDatetimeInput(isoStr) — converts a UTC ISO string to a YYYY-MM-DDTHH:MM string
 *                                in the local timezone, suitable for a datetime-local input.
 *
 * Public API (what controllers and tests expect):
 *
 * resolveDateRange:
 *   'today'          → { start: midnight local, end: now }
 *   '7days'          → { start: 7 days ago midnight, end: now }
 *   '30days'         → { start: 30 days ago midnight, end: now }
 *   '90days'         → { start: 90 days ago midnight, end: now }
 *   'alltime' / ''   → null
 *   unknown key      → null
 *
 * deriveFields returns:
 *   date      {string}  'YYYY-MM-DD'
 *   hour      {number}  0–23
 *   timeOfDay {string}  'morning' | 'afternoon' | 'evening' | 'night'
 *   dayOfWeek {string}  'Monday' etc.
 *   month     {string}  'January' etc.
 *   week      {string}  'YYYY-WNN'
 *
 * toLocalDatetimeInput:
 *   '2026-03-14T21:00:00.000Z' in UTC-4 → '2026-03-14T17:00'
 *
 * Internal aliases (used by report engine):
 *   hourBlock  → same as timeOfDay  (kept for controller back-compat)
 *   weekKey    → same as week
 *   dateKey    → same as date
 */

const DAY_NAMES   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

/**
 * Resolve a dateRange key to { start, end } Date objects.
 * Returns null for 'alltime', falsy, or unknown keys.
 */
function resolveDateRange(key) {
  if (!key) return null;

  const end   = new Date();
  const start = new Date();

  switch (key) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      return { start, end };

    case '7days':
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end };

    case '30days':
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, end };

    case '90days':
      start.setDate(start.getDate() - 90);
      start.setHours(0, 0, 0, 0);
      return { start, end };

    case 'alltime':
    default:
      return null;
  }
}

/**
 * Derive human-readable fields from an ISO 8601 timestamp string.
 */
function deriveFields(timestamp) {
  const d = new Date(timestamp);

  const dayOfWeek = DAY_NAMES[d.getDay()];
  const month     = MONTH_NAMES[d.getMonth()];
  const hour      = d.getHours();
  const date      = d.toISOString().slice(0, 10);

  // timeOfDay bucket
  let timeOfDay;
  if (hour >= 5 && hour < 12)       timeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
  else                              timeOfDay = 'night';

  // ISO week number (Monday-based)
  const jan4    = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.ceil(
    ((d - jan4) / 86400000 + jan4.getDay() + 1) / 7
  );
  const week    = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

  return {
    // Primary API (what tests and controllers use)
    date,
    hour,
    timeOfDay,
    dayOfWeek,
    month,
    week,
    // Back-compat aliases for report engine
    hourBlock: timeOfDay,
    weekKey:   week,
    dateKey:   date,
  };
}

/**
 * Convert a UTC ISO string to the local datetime-local input format (YYYY-MM-DDTHH:MM).
 *
 * The datetime-local input has no timezone concept — it displays whatever string
 * it receives literally. We must convert from UTC to local wall-clock time before
 * populating the input, otherwise the displayed time is off by the user's UTC offset.
 *
 * Example (UTC-4 / EDT):
 *   '2026-03-14T21:00:00.000Z'  →  '2026-03-14T17:00'
 */
function toLocalDatetimeInput(isoString) {
  const d   = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return [
    d.getFullYear(), '-', pad(d.getMonth() + 1), '-', pad(d.getDate()),
    'T', pad(d.getHours()), ':', pad(d.getMinutes()),
  ].join('');
}

module.exports = { resolveDateRange, deriveFields, toLocalDatetimeInput };
