import React, { useState, useMemo } from 'react';
import { updateReading, deleteReading } from '../api/client.js';

/**
 * HistoryTable — reading history, newest first.
 *
 * Features:
 *   - Inline notes editing (click pencil, edit, save/cancel)
 *   - Delete with confirmation dialog
 *   - Date range filter driven by parent range prop
 *
 * Props:
 *   readings    — full readings array
 *   range       — '7d' | '30d' | '90d' | 'all' (shared with TrendChart)
 *   onUpdate    — callback(updatedReading) to sync parent state
 *   onDelete    — callback(id) to sync parent state
 */
export default function HistoryTable({ readings, range, onUpdate, onDelete }) {
  const [editingId, setEditingId]       = useState(null);
  const [editNotes, setEditNotes]       = useState('');
  const [savingId, setSavingId]         = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId]     = useState(null);
  const [error, setError]               = useState(null);

  const filtered = useMemo(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const cutoff = {
      '7d':  now -  7 * day,
      '30d': now - 30 * day,
      '90d': now - 90 * day,
      'all': 0,
    }[range] ?? 0;
    return [...readings]
      .filter(r => new Date(r.timestamp).getTime() >= cutoff)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [readings, range]);

  function fmtDate(ts) {
    const d = new Date(ts);
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    const yr = String(d.getFullYear()).slice(2);
    let h = d.getHours();
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${mo}/${da}/${yr} ${h}:${mi}${ampm}`;
  }

  function confidenceBadge(c) {
    if (c === 'high')   return <span className="badge badge-high">High</span>;
    if (c === 'low')    return <span className="badge badge-low">Low</span>;
    if (c === 'manual') return <span className="badge badge-manual">Manual</span>;
    return null;
  }

  async function handleSaveNotes(id) {
    setSavingId(id);
    setError(null);
    try {
      const updated = await updateReading(id, { notes: editNotes });
      onUpdate(updated);
      setEditingId(null);
    } catch (err) {
      setError('Failed to save notes. Please try again.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id) {
    setDeletingId(id);
    setError(null);
    try {
      await deleteReading(id);
      onDelete(id);
      setConfirmDeleteId(null);
    } catch (err) {
      setError('Failed to delete reading. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  if (!filtered.length) {
    return (
      <div className="history-table-section" data-testid="history-table">
        <div className="history-table-title">History</div>
        <div className="history-empty">No readings for this range.</div>
      </div>
    );
  }

  return (
    <div className="history-table-section" data-testid="history-table">
      <div className="history-table-title">History</div>

      {error && (
        <div className="history-error" data-testid="history-error">{error}</div>
      )}

      {confirmDeleteId && (
        <div className="delete-confirm-overlay" data-testid="delete-confirm">
          <div className="delete-confirm-dialog">
            <p className="delete-confirm-msg">Delete this reading? This cannot be undone.</p>
            <div className="delete-confirm-actions">
              <button
                className="btn-secondary"
                onClick={() => setConfirmDeleteId(null)}
                disabled={!!deletingId}
                data-testid="delete-cancel-btn"
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={!!deletingId}
                data-testid="delete-confirm-btn"
              >
                {deletingId ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="history-list">
        {filtered.map(r => (
          <div key={r.id} className="history-row" data-testid={`history-row-${r.id}`}>
            <div className="history-row-top">
              <span className="history-row-date">{fmtDate(r.timestamp)}</span>
              {confidenceBadge(r.extractionConfidence)}
              <button
                className="history-delete-btn"
                onClick={() => setConfirmDeleteId(r.id)}
                aria-label="Delete reading"
                data-testid={`delete-btn-${r.id}`}
              >
                🗑
              </button>
            </div>

            <div className="history-row-values">
              <span className="history-bp">
                {r.systolic ?? '—'}<span className="history-sep">/</span>{r.diastolic ?? '—'}
              </span>
              <span className="history-hr">♥ {r.heartRate ?? '—'}</span>
            </div>

            <div className="history-row-notes">
              {editingId === r.id ? (
                <div className="notes-edit">
                  <textarea
                    className="notes-textarea"
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder="Add a note…"
                    rows={2}
                    data-testid={`notes-input-${r.id}`}
                  />
                  <div className="notes-edit-actions">
                    <button
                      className="btn-secondary notes-btn"
                      onClick={() => setEditingId(null)}
                      disabled={savingId === r.id}
                      data-testid={`notes-cancel-${r.id}`}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-primary notes-btn"
                      onClick={() => handleSaveNotes(r.id)}
                      disabled={savingId === r.id}
                      data-testid={`notes-save-${r.id}`}
                    >
                      {savingId === r.id ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="notes-view"
                  onClick={() => { setEditingId(r.id); setEditNotes(r.notes || ''); }}
                  data-testid={`notes-edit-btn-${r.id}`}
                >
                  {r.notes
                    ? <span className="notes-text">{r.notes}</span>
                    : <span className="notes-placeholder">✎ Add note</span>
                  }
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
