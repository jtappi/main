/**
 * client.js — all fetch calls to the TrackMyWeek Express API.
 *
 * BASE matches the nginx location block: /trackmyweek/api.
 * No component ever calls fetch() directly — always use this module.
 */

const BASE = '/trackmyweek/api';

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const msg = data.error || data.errors?.join(', ') || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

export const getEntries = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request('GET', `/entries${qs ? '?' + qs : ''}`);
};

export const getAutocomplete = (q) =>
  request('GET', `/entries/autocomplete?q=${encodeURIComponent(q)}`);

export const getQuickEntry = () => request('GET', '/entries/quickentry');

export const createEntry = (body) => request('POST', '/entries', body);

export const updateEntry = (id, body) => request('PUT', `/entries/${id}`, body);

export const deleteEntry = (id) => request('DELETE', `/entries/${id}`);

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const getCategories = () => request('GET', '/categories');

export const createCategory = (body) => request('POST', '/categories', body);

export const updateCategory = (id, body) => request('PUT', `/categories/${id}`, body);

export const deleteCategory = (id, reassignTo) => {
  const qs = reassignTo ? `?reassignTo=${encodeURIComponent(reassignTo)}` : '';
  return request('DELETE', `/categories/${id}${qs}`);
};

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export const getReports = () => request('GET', '/reports');

export const getReportSchema = () => request('GET', '/reports/schema');

export const getReportData = (id) => request('GET', `/reports/${id}/data`);

export const createReport = (body) => request('POST', '/reports', body);

export const updateReport = (id, body) => request('PUT', `/reports/${id}`, body);

export const deleteReport = (id) => request('DELETE', `/reports/${id}`);

// ---------------------------------------------------------------------------
// Pre-built reports
// ---------------------------------------------------------------------------

export const getPrebuiltTrend = (dateRange = '7days') =>
  request('GET', `/prebuilt/trend?dateRange=${dateRange}`);

export const getPrebuiltCategories = (dateRange = '7days') =>
  request('GET', `/prebuilt/categories?dateRange=${dateRange}`);

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export const getQuestions = () => request('GET', '/questions');

export const createQuestion = (body) => request('POST', '/questions', body);

export const updateQuestion = (id, body) => request('PUT', `/questions/${id}`, body);

export const deleteQuestion = (id) => request('DELETE', `/questions/${id}`);
