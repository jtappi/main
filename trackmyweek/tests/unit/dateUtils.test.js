/**
 * Unit tests — lib/dateUtils.js
 *
 * Tests resolveDateRange() and deriveFields() without any I/O.
 */

const { resolveDateRange, deriveFields } = require('../../lib/dateUtils');

// Pin "now" so date calculations are deterministic
const FIXED_NOW = new Date('2026-03-13T12:00:00.000Z');

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FIXED_NOW);
});

afterAll(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// resolveDateRange
// ---------------------------------------------------------------------------

describe('resolveDateRange()', () => {
  test('returns null for alltime', () => {
    expect(resolveDateRange('alltime')).toBeNull();
  });

  test('returns null for empty/falsy', () => {
    expect(resolveDateRange('')).toBeNull();
    expect(resolveDateRange(null)).toBeNull();
    expect(resolveDateRange(undefined)).toBeNull();
  });

  test('today — start is midnight UTC of current day', () => {
    const result = resolveDateRange('today');
    expect(result).not.toBeNull();
    const { start, end } = result;
    expect(start.getUTCHours()).toBe(0);
    expect(start.getUTCMinutes()).toBe(0);
    expect(start.getUTCFullYear()).toBe(2026);
    expect(start.getUTCMonth()).toBe(2); // March = 2
    expect(start.getUTCDate()).toBe(13);
    expect(end.getTime()).toBeGreaterThanOrEqual(FIXED_NOW.getTime());
  });

  test('7days — start is ~7 days before now', () => {
    const { start, end } = resolveDateRange('7days');
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(7, 0);
  });

  test('30days — diff is ~30 days', () => {
    const { start, end } = resolveDateRange('30days');
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(30, 0);
  });

  test('90days — diff is ~90 days', () => {
    const { start, end } = resolveDateRange('90days');
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(90, 0);
  });

  test('unknown key falls back to null', () => {
    expect(resolveDateRange('banana')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deriveFields
// ---------------------------------------------------------------------------

describe('deriveFields()', () => {
  const TS_WEDNESDAY_MORNING = '2026-03-11T09:30:00.000Z'; // Wednesday
  const TS_FRIDAY_EVENING    = '2026-03-13T19:45:00.000Z'; // Friday

  test('returns an object with expected keys', () => {
    const result = deriveFields(TS_WEDNESDAY_MORNING);
    expect(result).toHaveProperty('date');
    expect(result).toHaveProperty('dayOfWeek');
    expect(result).toHaveProperty('hour');
    expect(result).toHaveProperty('timeOfDay');
    expect(result).toHaveProperty('month');
    expect(result).toHaveProperty('week');
  });

  test('date is YYYY-MM-DD string', () => {
    const { date } = deriveFields(TS_WEDNESDAY_MORNING);
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('hour is a number 0-23', () => {
    const { hour } = deriveFields(TS_WEDNESDAY_MORNING);
    expect(hour).toBeGreaterThanOrEqual(0);
    expect(hour).toBeLessThanOrEqual(23);
  });

  test('timeOfDay buckets are one of expected values', () => {
    const buckets = new Set(['morning', 'afternoon', 'evening', 'night']);
    const { timeOfDay: t1 } = deriveFields(TS_WEDNESDAY_MORNING);
    const { timeOfDay: t2 } = deriveFields(TS_FRIDAY_EVENING);
    expect(buckets.has(t1)).toBe(true);
    expect(buckets.has(t2)).toBe(true);
  });

  test('dayOfWeek is a non-empty string', () => {
    const { dayOfWeek } = deriveFields(TS_WEDNESDAY_MORNING);
    expect(typeof dayOfWeek).toBe('string');
    expect(dayOfWeek.length).toBeGreaterThan(0);
  });

  test('month is a non-empty string', () => {
    const { month } = deriveFields(TS_WEDNESDAY_MORNING);
    expect(typeof month).toBe('string');
    expect(month.length).toBeGreaterThan(0);
  });

  test('week is a string matching YYYY-WNN or similar', () => {
    const { week } = deriveFields(TS_WEDNESDAY_MORNING);
    expect(typeof week).toBe('string');
    expect(week.length).toBeGreaterThan(0);
  });
});
