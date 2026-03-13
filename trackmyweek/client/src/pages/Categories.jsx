import React, { useState, useEffect, useCallback } from 'react';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../api/client';
import './Categories.css';

const EMOJI_SUGGESTIONS = [
  '💊','🍎','❤️','😊','💰','✅','🏃','🚿',
  '😴','📚','🎮','🎵','☕','🧘','🌿','🔥',
  '🩺','💉','🧠','😤','😢','💪','🥗','🥤',
];

const COLOR_SUGGESTIONS = [
  '#6c63ff','#2ecc71','#e74c3c','#f39c12',
  '#3498db','#9b59b6','#1abc9c','#e67e22',
  '#e91e63','#00bcd4','#8bc34a','#ff5722',
];

const DEFAULT_ICON  = '📌';
const DEFAULT_COLOR = '#6c63ff';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  // Add-new form
  const [newName, setNewName]   = useState('');
  const [newIcon, setNewIcon]   = useState(DEFAULT_ICON);
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);
  const [adding, setAdding]     = useState(false);

  // Inline edit: { id, name, icon, color } | null
  const [editing, setEditing] = useState(null);

  // Delete confirm: id | null
  const [confirmDelete, setConfirmDelete] = useState(null);
  // Reassign target when deleting a category that has entries
  const [reassignTo, setReassignTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCategories(await getCategories());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ---------------------------------------------------------------------------
  // Add
  // ---------------------------------------------------------------------------
  async function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError('');
    try {
      const created = await createCategory({
        name:  newName.trim(),
        icon:  newIcon,
        color: newColor,
      });
      setCategories((prev) => [...prev, created]);
      setNewName('');
      setNewIcon(DEFAULT_ICON);
      setNewColor(DEFAULT_COLOR);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Inline edit
  // ---------------------------------------------------------------------------
  function startEdit(cat) {
    setEditing({ id: cat.id, name: cat.name, icon: cat.icon, color: cat.color });
    setConfirmDelete(null);
  }

  function cancelEdit() { setEditing(null); }

  async function commitEdit() {
    if (!editing || !editing.name.trim()) return;
    setError('');
    try {
      const updated = await updateCategory(editing.id, {
        name:  editing.name.trim(),
        icon:  editing.icon,
        color: editing.color,
      });
      setCategories((prev) => prev.map((c) => c.id === updated.id ? updated : c));
    } catch (err) {
      setError(err.message);
    } finally {
      setEditing(null);
    }
  }

  function handleEditKey(e) {
    if (e.key === 'Enter')  { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') { cancelEdit(); }
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  function startDelete(cat) {
    setConfirmDelete(cat.id);
    setReassignTo('');
    setEditing(null);
  }

  async function handleDelete(id) {
    setError('');
    try {
      await deleteCategory(id, reassignTo || null);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmDelete(null);
      setReassignTo('');
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const otherCats = categories.filter((c) => c.id !== confirmDelete);

  return (
    <div className="categories-page">
      <h1 className="page-title">Categories</h1>

      {error && <p className="error-msg">{error}</p>}

      {/* Add new category */}
      <div className="cat-add-card card">
        <h2 className="cat-add-title">Add Category</h2>
        <form className="cat-add-form" onSubmit={handleAdd}>
          {/* Icon picker */}
          <div className="cat-field">
            <label className="cat-label">Icon</label>
            <div className="emoji-grid">
              {EMOJI_SUGGESTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  className={`emoji-btn${newIcon === e ? ' emoji-btn--selected' : ''}`}
                  onClick={() => setNewIcon(e)}
                >
                  {e}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={newIcon}
              onChange={(ev) => setNewIcon(ev.target.value)}
              className="emoji-custom-input"
              maxLength={4}
              placeholder="or type any emoji"
            />
          </div>

          {/* Color picker */}
          <div className="cat-field">
            <label className="cat-label">Color</label>
            <div className="color-grid">
              {COLOR_SUGGESTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch${newColor === c ? ' color-swatch--selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setNewColor(c)}
                  title={c}
                />
              ))}
              <input
                type="color"
                value={newColor}
                onChange={(ev) => setNewColor(ev.target.value)}
                className="color-custom-input"
                title="Custom color"
              />
            </div>
          </div>

          {/* Name */}
          <div className="cat-field cat-field--row">
            <span className="cat-preview" style={{ borderColor: newColor }}>
              {newIcon}
            </span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Category name"
              className="cat-name-input"
              data-testid="new-cat-name"
              maxLength={40}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={adding || !newName.trim()}
              data-testid="add-cat-btn"
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      </div>

      {/* Category list */}
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <ul className="cat-list" data-testid="category-list">
          {categories.map((cat) => {
            const isEditing = editing?.id === cat.id;
            const isDeleting = confirmDelete === cat.id;

            return (
              <li
                key={cat.id}
                className={`cat-row card${
                  isDeleting ? ' cat-row--deleting' : ''
                }${
                  isEditing  ? ' cat-row--editing'  : ''
                }`}
                data-testid={`cat-row-${cat.id}`}
              >
                {isEditing ? (
                  /* ── Edit mode ── */
                  <div className="cat-edit-form">
                    <div className="cat-edit-top">
                      {/* Mini emoji grid */}
                      <div className="emoji-grid emoji-grid--sm">
                        {EMOJI_SUGGESTIONS.map((e) => (
                          <button
                            key={e}
                            type="button"
                            className={`emoji-btn emoji-btn--sm${
                              editing.icon === e ? ' emoji-btn--selected' : ''
                            }`}
                            onClick={() => setEditing((ed) => ({ ...ed, icon: e }))}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                      {/* Mini color grid */}
                      <div className="color-grid color-grid--sm">
                        {COLOR_SUGGESTIONS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`color-swatch color-swatch--sm${
                              editing.color === c ? ' color-swatch--selected' : ''
                            }`}
                            style={{ background: c }}
                            onClick={() => setEditing((ed) => ({ ...ed, color: c }))}
                          />
                        ))}
                        <input
                          type="color"
                          value={editing.color}
                          onChange={(ev) => setEditing((ed) => ({ ...ed, color: ev.target.value }))}
                          className="color-custom-input"
                        />
                      </div>
                    </div>
                    <div className="cat-edit-row">
                      <span className="cat-preview" style={{ borderColor: editing.color }}>
                        {editing.icon}
                      </span>
                      <input
                        autoFocus
                        type="text"
                        value={editing.name}
                        onChange={(e) => setEditing((ed) => ({ ...ed, name: e.target.value }))}
                        onKeyDown={handleEditKey}
                        className="cat-name-input"
                        data-testid={`edit-name-${cat.id}`}
                        maxLength={40}
                      />
                      <button className="btn btn-primary" onClick={commitEdit}>Save</button>
                      <button className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </div>
                ) : isDeleting ? (
                  /* ── Delete confirm ── */
                  <div className="cat-delete-confirm">
                    <span className="cat-icon" style={{ borderColor: cat.color }}>{cat.icon}</span>
                    <span className="cat-name">{cat.name}</span>
                    <div className="cat-delete-body">
                      <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                        Delete <strong>{cat.name}</strong>? Entries in this category will be:
                      </p>
                      <div className="reassign-options">
                        <label className="reassign-option">
                          <input
                            type="radio"
                            name={`reassign-${cat.id}`}
                            value=""
                            checked={reassignTo === ''}
                            onChange={() => setReassignTo('')}
                          />
                          Left uncategorised
                        </label>
                        {otherCats.map((oc) => (
                          <label key={oc.id} className="reassign-option">
                            <input
                              type="radio"
                              name={`reassign-${cat.id}`}
                              value={oc.name}
                              checked={reassignTo === oc.name}
                              onChange={() => setReassignTo(oc.name)}
                            />
                            Moved to {oc.icon} {oc.name}
                          </label>
                        ))}
                      </div>
                      <div className="cat-delete-actions">
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDelete(cat.id)}
                          data-testid={`confirm-delete-${cat.id}`}
                        >
                          Delete
                        </button>
                        <button
                          className="btn btn-ghost"
                          onClick={() => setConfirmDelete(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── Display mode ── */
                  <div className="cat-display">
                    <span
                      className="cat-icon"
                      style={{ borderColor: cat.color }}
                    >
                      {cat.icon}
                    </span>
                    <span className="cat-name">{cat.name}</span>
                    <div className="cat-actions">
                      <button
                        className="btn btn-ghost cat-action-btn"
                        onClick={() => startEdit(cat)}
                        title="Edit"
                        data-testid={`edit-btn-${cat.id}`}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn btn-ghost cat-action-btn"
                        onClick={() => startDelete(cat)}
                        title="Delete"
                        data-testid={`delete-btn-${cat.id}`}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
