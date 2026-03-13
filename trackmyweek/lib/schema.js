'use strict';

/**
 * schema.js — single source of truth for all TrackMyWeek constants.
 *
 * Imported by server-side controllers and (via the API) reflected to the
 * React client. Never duplicated elsewhere.
 */

/** The 8 default categories seeded on first deploy. */
const CATEGORIES_DEFAULT = [
  { id: 1, name: 'Food',        icon: '🍽️',  color: '#e67e22' },
  { id: 2, name: 'Medications', icon: '💊',  color: '#3498db' },
  { id: 3, name: 'Health',      icon: '🩺',  color: '#2ecc71' },
  { id: 4, name: 'Mood',        icon: '😊',  color: '#9b59b6' },
  { id: 5, name: 'Money',       icon: '💰',  color: '#f1c40f' },
  { id: 6, name: 'Tasks',       icon: '✅',  color: '#1abc9c' },
  { id: 7, name: 'Exercise',    icon: '🏃',  color: '#e74c3c' },
  { id: 8, name: 'Hygiene',     icon: '🚿',  color: '#34495e' },
];

/**
 * Valid date range keys used by the report builder and pre-built reports.
 * The server resolves these to actual start timestamps at query time.
 */
const DATE_RANGES = [
  { key: 'today',   label: 'Today' },
  { key: '7days',   label: 'Last 7 days' },
  { key: '30days',  label: 'Last 30 days' },
  { key: '90days',  label: 'Last 90 days' },
  { key: 'alltime', label: 'All time' },
];

/** Chart types supported by the report builder. */
const CHART_TYPES = [
  { key: 'trend',     label: 'Trend',       description: 'Entries plotted by day with a smoothed trend line' },
  { key: 'bar',       label: 'Bar',         description: 'Grouped or stacked bar chart' },
  { key: 'line',      label: 'Line',        description: 'Line chart over time' },
  { key: 'pie',       label: 'Pie',         description: 'Proportional breakdown' },
  { key: 'histogram', label: 'Histogram',   description: 'Distribution by hour of day or day of week' },
  { key: 'pivot',     label: 'Pivot Table', description: 'Two-dimensional count table' },
];

/** Dimensions a report can group or pivot by. */
const GROUP_BY_OPTIONS = [
  { key: 'category',   label: 'Category' },
  { key: 'dayOfWeek',  label: 'Day of week' },
  { key: 'timeOfDay',  label: 'Time of day' },
  { key: 'month',      label: 'Month' },
  { key: 'week',       label: 'Week' },
];

/** What a report measures. */
const MEASURES = [
  { key: 'count',          label: 'Count',            description: 'Total number of entries' },
  { key: 'frequencyPerDay', label: 'Frequency / day', description: 'Average entries per day' },
];

module.exports = {
  CATEGORIES_DEFAULT,
  DATE_RANGES,
  CHART_TYPES,
  GROUP_BY_OPTIONS,
  MEASURES,
};
