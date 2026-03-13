'use strict';

/**
 * categories.controller.js
 *
 * GET    /api/categories           — list all categories
 * POST   /api/categories           — create category
 * PUT    /api/categories/:id       — update category (name cascades to entries)
 * DELETE /api/categories/:id       — delete (requires reassignTo if entries exist)
 */

const express = require('express');
const router  = express.Router();
const {
  readCategories,
  writeCategories,
  readEntries,
  writeEntries,
  nextIntId,
} = require('../lib/data');

// ---------------------------------------------------------------------------
// GET /api/categories
// ---------------------------------------------------------------------------

router.get('/', (req, res) => {
  const categories = readCategories();
  const entries    = readEntries();

  // Annotate each category with its entry count
  const result = categories.map((cat) => ({
    ...cat,
    entryCount: entries.filter((e) => e.category === cat.name).length,
  }));

  res.json(result);
});

// ---------------------------------------------------------------------------
// POST /api/categories
// ---------------------------------------------------------------------------

router.post('/', (req, res) => {
  const { name, icon, color } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const categories = readCategories();

  if (categories.find((c) => c.name.toLowerCase() === name.trim().toLowerCase())) {
    return res.status(409).json({ error: `Category already exists: ${name.trim()}` });
  }

  const newCategory = {
    id:        nextIntId(categories),
    name:      name.trim(),
    icon:      icon  ? icon.trim()  : '',
    color:     color ? color.trim() : '#cccccc',
    createdAt: new Date().toISOString(),
  };

  categories.push(newCategory);
  writeCategories(categories);

  res.status(201).json(newCategory);
});

// ---------------------------------------------------------------------------
// PUT /api/categories/:id
// If name changes, cascades to all entries atomically.
// ---------------------------------------------------------------------------

router.put('/:id', (req, res) => {
  const id         = parseInt(req.params.id, 10);
  const categories = readCategories();
  const index      = categories.findIndex((c) => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const { name, icon, color } = req.body;
  const oldName = categories[index].name;

  if (name && name.trim() !== oldName) {
    // Check uniqueness
    const conflict = categories.find(
      (c) => c.id !== id && c.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (conflict) {
      return res.status(409).json({ error: `Category name already in use: ${name.trim()}` });
    }
  }

  const newName = name ? name.trim() : oldName;

  categories[index] = {
    ...categories[index],
    name:  newName,
    ...(icon  !== undefined && { icon:  icon.trim() }),
    ...(color !== undefined && { color: color.trim() }),
  };

  writeCategories(categories);

  // Cascade rename to all entries atomically
  if (newName !== oldName) {
    const entries = readEntries();
    const updated = entries.map((e) =>
      e.category === oldName ? { ...e, category: newName } : e
    );
    writeEntries(updated);
  }

  res.json(categories[index]);
});

// ---------------------------------------------------------------------------
// DELETE /api/categories/:id
// Blocked if entries exist unless ?reassignTo=<categoryName> is provided.
// ---------------------------------------------------------------------------

router.delete('/:id', (req, res) => {
  const id         = parseInt(req.params.id, 10);
  const categories = readCategories();
  const index      = categories.findIndex((c) => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const catName  = categories[index].name;
  const entries  = readEntries();
  const affected = entries.filter((e) => e.category === catName);

  if (affected.length > 0) {
    const reassignTo = req.query.reassignTo;

    if (!reassignTo) {
      return res.status(409).json({
        error:       `Category "${catName}" has ${affected.length} entries. Provide ?reassignTo=<categoryName> to reassign them.`,
        entryCount:  affected.length,
      });
    }

    const target = categories.find(
      (c) => c.name.toLowerCase() === reassignTo.toLowerCase() && c.id !== id
    );
    if (!target) {
      return res.status(400).json({ error: `Reassign target not found: ${reassignTo}` });
    }

    const reassigned = entries.map((e) =>
      e.category === catName ? { ...e, category: target.name } : e
    );
    writeEntries(reassigned);
  }

  categories.splice(index, 1);
  writeCategories(categories);

  res.json({ deleted: id, reassigned: affected.length });
});

module.exports = router;
