import React, { useState, useEffect, useCallback } from 'react';
import { getEntries, getCategories, updateEntry, deleteEntry } from '../api/client';
import DayChart from '../components/DayChart';
import './ViewData.css';

const DATE_RANGE_OPTIONS = [
  { value: '',        label: 'All time' },
  { value: 'today',   label: 'Today' },
  { value: '7days',   label: 'Last 7 days' },
  { value: '30days',  label: 'Last 30 days' },
  { value: '90days',  label: 'Last 90 days' },
];

// ---------------------------------------------------------------------------
// Timezone helpers
// ---------------------------------------------------------------------------

// Convert a UTC ISO string to the local datetime-local input format (YYYY-MM-DDTHH:MM).
// The datetime-local input has no timezone concept — it displays whatever string
// it receives literally. We must convert from UTC to local wall-clock time before
// populating the input, otherwise the displayed time is off by the user's UTC offset.
function toLocalDatetimeInput(isoString) {
  const d   = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return [
    d.getFullYear(), '-', pad(d.getMonth() + 1), '-', pad(d.getDate()),
    'T', pad(d.getHours()), ':', pad(d.getMinutes()),
  ].join('');
}

export default function ViewData() {
  const [entries, setEntries]       = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  // Filters
  const [keyword, setKeyword]       = useState('');
  const [category, setCategory]     = useState('');
  const [dateRange, setDateRange]   = useState('');

  // Inline edit state: { id, field, value } | null
  const [editing, setEditing]       = useState(null);

  // Delete confirm state: entryId | null
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (dateRange) params.dateRange = dateRange;
      const data = await getEntries(params);
      setEntries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { loadEntries(); }, [loadEntries]);
  useEffect(() => { getCategories().then(setCategories).catch(() => {}); }, []);

  // Client-side filter on keyword + category
  const filtered = entries.filter((e) => {
    const kw = keyword.toLowerCase();
    const matchKw = !kw ||
      e.text.toLowerCase().includes(kw) ||
      (e.notes && e.notes.toLowerCase().includes(kw));
    const matchCat = !category || e.category === category;
    return matchKw && matchCat;
  });

  const hasFilters = keyword || category || dateRange;

  function resetFilters() {
    setKeyword('');
    setCategory('');
    setDateRange('');
  }

  // ---------------------------------------------------------------------------
  // Inline editing
  // ---------------------------------------------------------------------------

  function startEdit(id, field, value) {
    // For timestamp fields, convert the stored UTC ISO string to local time so
    // the datetime-local input displays the correct wall-clock time.
    const editValue = field === 'timestamp' ? toLocalDatetimeInput(value) : value;
    setEditing({ id, field, value: editValue });
  }

  function cancelEdit() {
    setEditing(null);
  }

  async function commitEdit() {
    if (!editing) return;
    const { id, field, value } = editing;
    const original = entries.find((e) => e.id === id);
    if (!original) { cancelEdit(); return; }

    // For timestamp, convert the local datetime-local string back to a UTC ISO
    // string before comparing or sending to the server.
    const sendValue = field === 'timestamp'
      ? new Date(value).toISOString()
      : value;

    if (original[field] === sendValue) { cancelEdit(); return; }

    try {
      const updated = await updateEntry(id, { [field]: sendValue });
      setEntries((prev) => prev.map((e) => e.id === id ? updated : e));
    } catch (err) {
      setError(err.message);
    } finally {
      cancelEdit();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter')  { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') { cancelEdit(); }
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  async function handleDelete(id) {
    try {
      await deleteEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmDelete(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function renderCell(entry, field) {
    const isEditing = editing?.id === entry.id && editing?.field === field;

    if (isEditing) {
      if (field === 'category') {
        return (
          <select
            autoFocus
            value={editing.value}
            onChange={(e) => setEditing((ed) => ({ ...ed, value: e.target.value }))}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="edit-select"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
            ))}
          </select>
        );
      }
      if (field === 'timestamp') {
        return (
          <input
            autoFocus
            type="datetime-local"
            value={editing.value}
            onChange={(e) => setEditing((ed) => ({ ...ed, value: e.target.value }))}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="edit-input"
          />
        );
      }
      return (
        <input
          autoFocus
          type="text"
          value={editing.value}
          onChange={(e) => setEditing((ed) => ({ ...ed, value: e.target.value }))}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className="edit-input"
        />
      );
    }

    // Display mode — click to edit
    const displayValue = field === 'timestamp'
      ? new Date(entry.timestamp).toLocaleString()
      : entry[field] || <span className="text-muted">—</span>;

    return (
      <span
        className="editable-cell"
        onClick={() => startEdit(entry.id, field, entry[field] || '')}
        title="Click to edit"
        data-testid={`cell-${field}-${entry.id}`}
      >
        {field === 'category' ? (
          <span
            className="category-badge"
            style={{ borderColor: categories.find(c => c.name === entry.category)?.color }}
          >
            {categories.find(c => c.name === entry.category)?.icon} {entry.category}
          </span>
        ) : displayValue}
      </span>
    );
  }

  return (
    <div className="view-data-page">
      <h1 className="page-title">View Data</h1>

      <DayChart />

      {/* Filter bar */}
      <div className="filter-bar card" data-testid="filter-bar">
        <input
          type="text"
          placeholder="Search entries…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="filter-input"
          data-testid="filter-keyword"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="filter-select"
          data-testid="filter-category"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
          ))}
        </select>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="filter-select"
          data-testid="filter-daterange"
        >
          {DATE_RANGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            className="btn btn-ghost"
            onClick={resetFilters}
            data-testid="filter-reset"
          >
            Reset
          </button>
        )}
      </div>

      {/* Error */}
      {error && <p className="error-msg">{error}</p>}

      {/* Entry count */}
      {!loading && (
        <p className="text-muted entry-count">
          {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
          {hasFilters && ` (filtered from ${entries.length})`}
        </p>
      )}

      {/* Entries table */}
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <p>{hasFilters ? 'No entries match your filters.' : 'No entries yet. Start logging!'}</p>
          {hasFilters && (
            <button className="btn btn-ghost" onClick={resetFilters} style={{ marginTop: '0.5rem' }}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="entries-table-wrap">
          <table className="entries-table" data-testid="entries-table">
            <thead>
              <tr>
                <th>Text</th>
                <th>Category</th>
                <th>Notes</th>
                <th>Timestamp</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr
                  key={entry.id}
                  className={`entry-row${confirmDelete === entry.id ? ' entry-row--deleting' : ''}`}
                  data-testid={`entry-row-${entry.id}`}
                >
                  <td>{renderCell(entry, 'text')}</td>
                  <td>{renderCell(entry, 'category')}</td>
                  <td>{renderCell(entry, 'notes')}</td>
                  <td>{renderCell(entry, 'timestamp')}</td>
                  <td className="entry-actions">
                    {confirmDelete === entry.id ? (
                      <span className="delete-confirm">
                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>Delete?</span>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                          onClick={() => handleDelete(entry.id)}
                          data-testid={`confirm-delete-${entry.id}`}
                        >
                          Yes
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                          onClick={() => setConfirmDelete(null)}
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <button
                        className="btn btn-ghost delete-btn"
                        onClick={() => setConfirmDelete(entry.id)}
                        title="Delete entry"
                        data-testid={`delete-btn-${entry.id}`}
                      >
                        🗑️
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
