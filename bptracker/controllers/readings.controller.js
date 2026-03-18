'use strict';

/**
 * readings.controller.js — CRUD for BP readings.
 *
 * All reads are scoped by userId + role via filterByUserId.
 * PUT and DELETE enforce ownership — a guest can only modify their own records.
 * Admin can read all records but cannot modify another user's record
 * (ownership check applies to all roles on mutating operations).
 *
 * Legacy records: readings saved before user scoping was introduced have no
 * userId field (undefined/null). These are treated as owned by the requesting
 * user when that user is admin, since prior to user isolation there was only
 * one user. Guests will never see legacy records (filterByUserId excludes them)
 * so they can never attempt to mutate one.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const {
  readReadings,
  filterByUserId,
  appendReading,
  updateReading,
  deleteReading,
} = require('../lib/data');

const router = express.Router();

/**
 * ownershipCheck — returns true if the requesting user may mutate this record.
 *
 * Rules:
 *   1. If the reading has a userId that matches the requester — allowed.
 *   2. If the reading has no userId (legacy record pre-dating user isolation)
 *      AND the requester is admin — allowed. The admin is the only user who
 *      can see legacy records (filterByUserId passes them through for admins),
 *      so this is safe.
 *   3. Everything else — denied.
 */
function canMutate(reading, userId, role) {
  if (reading.userId === userId) return true;
  if (!reading.userId && role === 'admin') return true;
  return false;
}

// ---------------------------------------------------------------------------
// GET /api/readings
// Returns readings scoped to the current user (admin gets all).
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  try {
    const { id: userId, role } = req.session.user;
    const all = readReadings();
    const scoped = filterByUserId(all, userId, role);
    res.json(scoped);
  } catch (err) {
    console.error('[readings] GET error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve readings.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/readings
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  try {
    const { id: userId } = req.session.user;
    const { systolic, diastolic, heartRate, timestamp, imageRef, extractionConfidence, notes } = req.body;

    if (systolic === undefined || diastolic === undefined || heartRate === undefined || !timestamp) {
      return res.status(400).json({ error: 'systolic, diastolic, heartRate, and timestamp are required.' });
    }

    if (systolic !== null && !Number.isInteger(systolic)) {
      return res.status(400).json({ error: 'systolic must be an integer or null.' });
    }
    if (diastolic !== null && !Number.isInteger(diastolic)) {
      return res.status(400).json({ error: 'diastolic must be an integer or null.' });
    }
    if (heartRate !== null && !Number.isInteger(heartRate)) {
      return res.status(400).json({ error: 'heartRate must be an integer or null.' });
    }

    const validConfidence = ['high', 'low', 'manual'];
    const confidence = validConfidence.includes(extractionConfidence) ? extractionConfidence : 'manual';

    const reading = {
      id:                   uuidv4(),
      userId,
      systolic:             systolic !== undefined ? systolic : null,
      diastolic:            diastolic !== undefined ? diastolic : null,
      heartRate:            heartRate !== undefined ? heartRate : null,
      timestamp,
      imageRef:             imageRef || null,
      extractionConfidence: confidence,
      notes:                notes || null,
      createdAt:            new Date().toISOString(),
    };

    appendReading(reading);
    res.status(201).json(reading);
  } catch (err) {
    console.error('[readings] POST error:', err.message);
    res.status(500).json({ error: 'Failed to save reading.' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/readings/:id
// ---------------------------------------------------------------------------
router.put('/:id', (req, res) => {
  try {
    const { id: userId, role } = req.session.user;
    const { id } = req.params;

    const all = readReadings();
    const existing = all.find((r) => r.id === id);

    if (!existing) {
      return res.status(404).json({ error: 'Reading not found.' });
    }
    if (!canMutate(existing, userId, role)) {
      return res.status(403).json({ error: 'You do not have permission to edit this reading.' });
    }

    const allowed = ['systolic', 'diastolic', 'heartRate', 'notes', 'extractionConfidence'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    const updated = updateReading(id, updates);
    res.json(updated);
  } catch (err) {
    console.error('[readings] PUT error:', err.message);
    res.status(500).json({ error: 'Failed to update reading.' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/readings/:id
// ---------------------------------------------------------------------------
router.delete('/:id', (req, res) => {
  try {
    const { id: userId, role } = req.session.user;
    const { id } = req.params;

    const all = readReadings();
    const existing = all.find((r) => r.id === id);

    if (!existing) {
      return res.status(404).json({ error: 'Reading not found.' });
    }
    if (!canMutate(existing, userId, role)) {
      return res.status(403).json({ error: 'You do not have permission to delete this reading.' });
    }

    deleteReading(id);
    res.status(204).send();
  } catch (err) {
    console.error('[readings] DELETE error:', err.message);
    res.status(500).json({ error: 'Failed to delete reading.' });
  }
});

module.exports = router;
