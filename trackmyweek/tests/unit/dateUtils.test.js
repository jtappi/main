'use strict';

const { resolveDateRange, deriveFields, toLocalDatetimeInput } = require('../../lib/dateUtils');

// Pin "now" to a fixed point so date calculations are deterministic.
// 2026-03-13T12:00:00.000Z = noon UTC
const FIXED_NOW = new Date('2026-03-13T12:00:00.000Z');

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FIXED_NOW);
});

afterAll(() => {
  jest.useRealTimers();
});

describe('resolveDateRange()', () => {
  test('returns null for alltime', () => {
    expect(resolveDateRange('alltime')).toBeNull();
  });

  test('returns null for empty/falsy', () => {
    expect(resolveDateRange('')).toBeNull();
    expect(resolveDateRange(null)).toBeNull();
    expect(resolveDateRange(undefined)).toBeNull();
  });

  test('unknown key falls back to null', () => {
    expect(resolveDateRange('banana')).toBeNull();
  });

  test('today — start is midnight local time of current day', () => {
    const { start, end } = resolveDateRange('today');
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(2);
    expect(start.getDate()).toBe(13);
    expect(end.getTime()).toBeGreaterThanOrEqual(FIXED_NOW.getTime());
  });

  // The diff from midnight-N-days-ago to "now" (noon UTC) will always be
  // between N days and N+1 days because "now" is partway through today.
  // We assert the range is >= N and < N+1.
  test('7days — start is 7 days before now', () => {
    const { start, end } = resolveDateRange('7days');
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(7);
    expect(diffDays).toBeLessThan(8);
  });

  test('30days — diff is between 30 and 31 days', () => {
    const { start, end } = resolveDateRange('30days');
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(30);
    expect(diffDays).toBeLessThan(31);
  });

  test('90days — diff is between 90 and 91 days', () => {
    const { start, end } = resolveDateRange('90days');
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(90);
    expect(diffDays).toBeLessThan(91);
  });
});

describe('deriveFields()', () => {
  const TS_WEDNESDAY_MORNING = '2026-03-11T09:30:00.000Z';
  const TS_FRIDAY_EVENING    = '2026-03-13T19:45:00.000Z';

  test('returns an object with all expected keys', () => {
    const result = deriveFields(TS_WEDNESDAY_MORNING);
    expect(result).toHaveProperty('date');
    expect(result).toHaveProperty('hour');
    expect(result).toHaveProperty('timeOfDay');
    expect(result).toHaveProperty('dayOfWeek');
    expect(result).toHaveProperty('month');
    expect(result).toHaveProperty('week');
  });

  test('date is YYYY-MM-DD string', () => {
    const { date } = deriveFields(TS_WEDNESDAY_MORNING);
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('hour is a number 0-23', () => {
    const { hour } = deriveFields(TS_WEDNESDAY_MORNING);
    expect(typeof hour).toBe('number');
    expect(hour).toBeGreaterThanOrEqual(0);
    expect(hour).toBeLessThanOrEqual(23);
  });

  test('timeOfDay is one of morning/afternoon/evening/night', () => {
    const valid = new Set(['morning', 'afternoon', 'evening', 'night']);
    expect(valid.has(deriveFields(TS_WEDNESDAY_MORNING).timeOfDay)).toBe(true);
    expect(valid.has(deriveFields(TS_FRIDAY_EVENING).timeOfDay)).toBe(true);
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

  test('week matches YYYY-WNN format', () => {
    const { week } = deriveFields(TS_WEDNESDAY_MORNING);
    expect(week).toMatch(/^\d{4}-W\d{2}$/);
  });
});

describe('toLocalDatetimeInput()', () => {
  // These tests use Jest fake timers (already set above) and rely on the
  // Node process timezone. The assertions are written timezone-agnostically:
  // rather than asserting a specific hour value (which varies by offset),
  // we assert the round-trip property — converting a UTC ISO string to
  // a local input value and back must yield the same UTC instant.

  test('returns a string matching YYYY-MM-DDTHH:MM format', () => {
    const result = toLocalDatetimeInput('2026-03-14T21:00:00.000Z');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  test('round-trip: converting to local input and back yields the original UTC instant', () => {
    const original = '2026-03-14T21:00:00.000Z';
    const localStr = toLocalDatetimeInput(original);
    // new Date(localStr) interprets as local time, .toISOString() converts to UTC.
    // The result must match the original UTC instant (ignoring seconds/ms).
    const roundTripped = new Date(localStr).toISOString();
    // Compare up to minutes — datetime-local has no seconds precision.
    expect(roundTripped.slice(0, 16)).toBe(original.slice(0, 16).replace('Z', '').slice(0, 16));
    expect(new Date(roundTripped).getTime()).toBe(new Date(original).getTime());
  });

  test('result hour reflects local time, not UTC', () => {
    // Pick a UTC timestamp where UTC hour != local hour in any non-UTC timezone.
    const utcTs = '2026-03-14T21:30:00.000Z';
    const localStr = toLocalDatetimeInput(utcTs);
    // The local hour embedded in the string must equal what Date gives us locally.
    const d = new Date(utcTs);
    const expectedLocalHour = String(d.getHours()).padStart(2, '0');
    const embeddedHour = localStr.slice(11, 13);
    expect(embeddedHour).toBe(expectedLocalHour);
  });

  test('result minutes match the original timestamp minutes', () => {
    const utcTs = '2026-03-14T21:47:00.000Z';
    const localStr = toLocalDatetimeInput(utcTs);
    const embeddedMinutes = localStr.slice(14, 16);
    expect(embeddedMinutes).toBe('47');
  });

  test('handles midnight UTC correctly', () => {
    const result = toLocalDatetimeInput('2026-03-14T00:00:00.000Z');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    // Round-trip must be exact.
    expect(new Date(result).getTime()).toBe(new Date('2026-03-14T00:00:00.000Z').getTime());
  });

  test('handles end-of-day UTC correctly', () => {
    const result = toLocalDatetimeInput('2026-03-14T23:59:00.000Z');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(new Date(result).getTime()).toBe(new Date('2026-03-14T23:59:00.000Z').getTime());
  });
});
