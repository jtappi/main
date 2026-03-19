/**
 * client.js — all fetch calls to the BP Tracker Express API.
 *
 * Single source of truth for all network calls.
 * Every function returns the parsed JSON response or throws on error.
 */

const BASE = '/bptracker/api';

/**
 * Fetch all readings for the current user.
 * Admin receives all users' readings.
 *
 * @returns {Promise<Array>}
 */
export async function getReadings() {
  const res = await fetch(`${BASE}/readings`, { credentials: 'include' });
  if (!res.ok) throw new Error(`getReadings failed: ${res.status}`);
  return res.json();
}

/**
 * Save a new reading.
 *
 * @param {Object} reading - { systolic, diastolic, heartRate, timestamp, imageRef, extractionConfidence, notes }
 * @returns {Promise<Object>} saved reading
 */
export async function saveReading(reading) {
  const res = await fetch(`${BASE}/readings`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reading),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `saveReading failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Update notes or corrected values on an existing reading.
 *
 * @param {string} id
 * @param {Object} updates - allowed fields: notes, systolic, diastolic, heartRate, extractionConfidence
 * @returns {Promise<Object>} updated reading
 */
export async function updateReading(id, updates) {
  const res = await fetch(`${BASE}/readings/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `updateReading failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Delete a reading by id.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteReading(id) {
  const res = await fetch(`${BASE}/readings/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `deleteReading failed: ${res.status}`);
  }
}

/**
 * Send a base64 image to the server for Gemini Vision extraction.
 * Returns extracted values — does NOT save the reading.
 *
 * @param {string} imageData - base64-encoded image string
 * @param {string} mediaType - e.g. 'image/jpeg'
 * @returns {Promise<{ systolic, diastolic, heartRate, confidence }>}
 */
export async function extractReading(imageData, mediaType = 'image/jpeg') {
  const res = await fetch(`${BASE}/extract`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageData, mediaType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `extractReading failed: ${res.status}`);
  }
  return res.json();
}
