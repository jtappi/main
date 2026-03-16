import React, { useState, useEffect } from 'react';
import { extractReading, saveReading } from '../api/client.js';
import ManualEntry from '../components/ManualEntry.jsx';

/**
 * Preview — shown after user takes a photo.
 *
 * Flow:
 *   1. Mount: call extractReading() immediately, show spinner
 *   2a. Success: show editable extracted values + notes + Retake / Save
 *   2b. image_unreadable: show error + Retake
 *   2c. extraction_failed: show ManualEntry fallback
 *   3. Save: call saveReading(), call onSaved(reading) on success
 *      On network error: show toast, keep user on this screen
 */
export default function Preview({ imageData, imageType, imagePreviewUrl, onRetake, onSaved, user }) {
  const [extractState, setExtractState] = useState('loading'); // loading | success | unreadable | failed
  const [systolic,   setSystolic]   = useState('');
  const [diastolic,  setDiastolic]  = useState('');
  const [heartRate,  setHeartRate]  = useState('');
  const [confidence, setConfidence] = useState('high');
  const [notes,      setNotes]      = useState('');
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState(null);
  // Track whether user has manually edited any extracted value
  const [userEdited, setUserEdited] = useState(false);

  useEffect(() => {
    extractReading(imageData, imageType)
      .then((result) => {
        setSystolic(result.systolic !== null ? String(result.systolic) : '');
        setDiastolic(result.diastolic !== null ? String(result.diastolic) : '');
        setHeartRate(result.heartRate !== null ? String(result.heartRate) : '');
        setConfidence(result.confidence);
        setExtractState('success');
      })
      .catch((err) => {
        if (err.message === 'image_unreadable') {
          setExtractState('unreadable');
        } else {
          setExtractState('failed');
        }
      });
  }, [imageData, imageType]);

  function handleValueChange(setter) {
    return (e) => {
      setter(e.target.value);
      setUserEdited(true);
    };
  }

  async function handleSave(overrideValues) {
    setSaveError(null);
    setSaving(true);

    const values = overrideValues || {
      systolic:  systolic  !== '' ? parseInt(systolic,  10) : null,
      diastolic: diastolic !== '' ? parseInt(diastolic, 10) : null,
      heartRate: heartRate !== '' ? parseInt(heartRate, 10) : null,
    };

    const effectiveConfidence = overrideValues
      ? 'manual'
      : userEdited ? 'manual' : confidence;

    try {
      const reading = await saveReading({
        ...values,
        timestamp:            new Date().toISOString(),
        extractionConfidence: effectiveConfidence,
        notes:                notes.trim() || null,
      });
      onSaved(reading);
    } catch (err) {
      setSaveError('Could not save reading. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────
  if (extractState === 'loading') {
    return (
      <div className="preview-view" data-testid="preview-view">
        <button className="preview-back-btn" onClick={onRetake} data-testid="preview-retake-btn">
          &larr; Back
        </button>
        {imagePreviewUrl && (
          <img src={imagePreviewUrl} alt="BP monitor" className="preview-image" data-testid="preview-image" />
        )}
        <div className="preview-extracting" data-testid="preview-extracting">
          <div className="spinner" aria-label="Extracting readings"></div>
          <p>Extracting readings&hellip;</p>
        </div>
      </div>
    );
  }

  // ── Unreadable state ───────────────────────────────────────────────────
  if (extractState === 'unreadable') {
    return (
      <div className="preview-view" data-testid="preview-view">
        <button className="preview-back-btn" onClick={onRetake} data-testid="preview-retake-btn">
          &larr; Back
        </button>
        {imagePreviewUrl && (
          <img src={imagePreviewUrl} alt="BP monitor" className="preview-image" data-testid="preview-image" />
        )}
        <div className="preview-error" data-testid="preview-unreadable">
          <p>Could not read the monitor display.</p>
          <p className="preview-error-hint">Please retake in better light.</p>
        </div>
        <div className="preview-actions">
          <button className="btn-secondary" onClick={onRetake} data-testid="preview-retake-btn-unreadable">
            Retake
          </button>
        </div>
      </div>
    );
  }

  // ── Extraction failed — show manual entry ──────────────────────────────
  if (extractState === 'failed') {
    return (
      <div className="preview-view" data-testid="preview-view">
        <button className="preview-back-btn" onClick={onRetake} data-testid="preview-retake-btn">
          &larr; Back
        </button>
        {imagePreviewUrl && (
          <img src={imagePreviewUrl} alt="BP monitor" className="preview-image" data-testid="preview-image" />
        )}
        <div className="preview-error" data-testid="preview-failed">
          <p>Extraction service unavailable.</p>
          <p className="preview-error-hint">Enter readings manually below.</p>
        </div>
        <ManualEntry
          onSave={handleSave}
          onRetake={onRetake}
          saving={saving}
          saveError={saveError}
        />
      </div>
    );
  }

  // ── Success — show extracted values ────────────────────────────────────
  return (
    <div className="preview-view" data-testid="preview-view">
      <button className="preview-back-btn" onClick={onRetake} data-testid="preview-retake-btn">
        &larr; Back
      </button>

      {imagePreviewUrl && (
        <img src={imagePreviewUrl} alt="BP monitor" className="preview-image" data-testid="preview-image" />
      )}

      {confidence === 'low' && (
        <div className="preview-confidence-warning" data-testid="preview-confidence-warning">
          &#9888; Low confidence &mdash; please verify before saving
        </div>
      )}

      <div className="preview-fields">
        <div className="preview-field">
          <label className="preview-field-label" htmlFor="preview-systolic">Systolic</label>
          <input
            id="preview-systolic"
            className="preview-field-input"
            type="number"
            inputMode="numeric"
            value={systolic}
            onChange={handleValueChange(setSystolic)}
            data-testid="preview-systolic"
          />
        </div>
        <div className="preview-field">
          <label className="preview-field-label" htmlFor="preview-diastolic">Diastolic</label>
          <input
            id="preview-diastolic"
            className="preview-field-input"
            type="number"
            inputMode="numeric"
            value={diastolic}
            onChange={handleValueChange(setDiastolic)}
            data-testid="preview-diastolic"
          />
        </div>
        <div className="preview-field">
          <label className="preview-field-label" htmlFor="preview-heartrate">Heart Rate</label>
          <input
            id="preview-heartrate"
            className="preview-field-input"
            type="number"
            inputMode="numeric"
            value={heartRate}
            onChange={handleValueChange(setHeartRate)}
            data-testid="preview-heartrate"
          />
        </div>
      </div>

      <div className="preview-notes">
        <label className="preview-field-label" htmlFor="preview-notes">Notes (optional)</label>
        <textarea
          id="preview-notes"
          className="preview-notes-input"
          placeholder="Add a note&hellip;"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          data-testid="preview-notes"
        />
      </div>

      {saveError && (
        <div className="preview-save-error" data-testid="preview-save-error">
          {saveError}
        </div>
      )}

      <div className="preview-actions">
        <button
          className="btn-secondary"
          onClick={onRetake}
          disabled={saving}
          data-testid="preview-retake-btn-main"
        >
          Retake
        </button>
        <button
          className="btn-primary"
          onClick={() => handleSave()}
          disabled={saving}
          data-testid="preview-save-btn"
        >
          {saving ? 'Saving…' : 'Save Reading'}
        </button>
      </div>
    </div>
  );
}
