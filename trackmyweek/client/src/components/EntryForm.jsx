import React, { useState, useEffect } from 'react';
import { createEntry, getCategories } from '../api/client';
import Autocomplete from './Autocomplete';
import './EntryForm.css';

/**
 * EntryForm — the main log entry form.
 *
 * Props:
 *   onSuccess  {fn}  called after a successful entry submission
 */
export default function EntryForm({ onSuccess }) {
  const [text, setText]           = useState('');
  const [category, setCategory]   = useState('');
  const [notes, setNotes]         = useState('');
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setError('Could not load categories.'));
  }, []);

  const canSubmit = text.trim().length > 0 && category !== '' && !submitting;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await createEntry({ text: text.trim(), category, notes: notes.trim() });
      setSuccess(true);
      setTimeout(() => {
        setText('');
        setCategory('');
        setNotes('');
        setSuccess(false);
        onSuccess?.();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="entry-form card" onSubmit={handleSubmit} data-testid="entry-form">
      <h2 className="entry-form-title">Log something</h2>

      {/* Text + autocomplete */}
      <div className="entry-form-field">
        <label className="entry-form-label" htmlFor="entry-text">What happened?</label>
        <Autocomplete
          value={text}
          onChange={setText}
          onSelect={setText}
          placeholder="e.g. Took ibuprofen"
          disabled={submitting}
        />
      </div>

      {/* Category buttons */}
      <div className="entry-form-field">
        <label className="entry-form-label">Category</label>
        <div className="category-grid" data-testid="category-grid">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`category-btn${
                category === cat.name ? ' category-btn--selected' : ''
              }`}
              style={{
                '--cat-color': cat.color,
                borderColor: category === cat.name ? cat.color : undefined,
              }}
              onClick={() => setCategory(cat.name === category ? '' : cat.name)}
              data-testid={`category-btn-${cat.name}`}
            >
              <span className="category-btn-icon">{cat.icon}</span>
              <span className="category-btn-name">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="entry-form-field">
        <label className="entry-form-label" htmlFor="entry-notes">
          Notes <span className="text-muted">(optional)</span>
        </label>
        <textarea
          id="entry-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any extra detail..."
          rows={2}
          disabled={submitting}
          data-testid="entry-notes-input"
        />
      </div>

      {/* Feedback */}
      {error   && <p className="error-msg"  data-testid="entry-error">{error}</p>}
      {success && <p className="success-msg" data-testid="entry-success">✅ Logged!</p>}

      {/* Submit */}
      <button
        type="submit"
        className="btn btn-primary entry-form-submit"
        disabled={!canSubmit}
        data-testid="entry-submit"
      >
        {submitting ? 'Saving…' : 'Log it'}
      </button>
    </form>
  );
}
