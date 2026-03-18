import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReadings, saveReading } from '../api/client.js';
import Preview from './Preview.jsx';
import ManualEntry from '../components/ManualEntry.jsx';

/**
 * Capture — main capture view.
 *
 * captureState:
 *   'idle'       — default: camera button + manual entry button
 *   'previewing' — photo taken, showing Preview inline
 *   'manual'     — manual entry form shown inline (no photo)
 */
export default function Capture({ user }) {
  const [now,              setNow]              = useState(new Date());
  const [recentReadings,   setRecentReadings]   = useState([]);
  const [captureState,     setCaptureState]     = useState('idle');
  const [imageData,        setImageData]        = useState(null);
  const [imageType,        setImageType]        = useState('image/jpeg');
  const [imagePreviewUrl,  setImagePreviewUrl]  = useState(null);
  const [saving,           setSaving]           = useState(false);
  const [saveError,        setSaveError]        = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Live clock — updates every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch readings on mount — keep top 5 most recent
  useEffect(() => {
    getReadings()
      .then((readings) => {
        if (readings.length > 0) {
          const sorted = [...readings].sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
          );
          setRecentReadings(sorted.slice(0, 5));
        }
      })
      .catch(() => {
        // Non-fatal — history table is informational only
      });
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'there';

  function handleCameraClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const mediaType  = file.type || 'image/jpeg';
    const previewUrl = URL.createObjectURL(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(',')[1];
      setImageData(base64);
      setImageType(mediaType);
      setImagePreviewUrl(previewUrl);
      setCaptureState('previewing');
    };
    reader.readAsDataURL(file);
  }

  function handleRetake() {
    setImageData(null);
    setImagePreviewUrl(null);
    setCaptureState('idle');
  }

  // Called by Preview after a successful photo-based save
  function handleSaved(reading) {
    setRecentReadings(prev => [reading, ...prev].slice(0, 5));
    setImageData(null);
    setImagePreviewUrl(null);
    setCaptureState('idle');
    navigate('/bptracker/success', { state: { reading } });
  }

  // Called by ManualEntry when the user submits values directly
  async function handleManualSave(values) {
    setSaveError(null);
    setSaving(true);
    try {
      const reading = await saveReading({
        ...values,
        timestamp:            new Date().toISOString(),
        extractionConfidence: 'manual',
        notes:                null,
      });
      setRecentReadings(prev => [reading, ...prev].slice(0, 5));
      setCaptureState('idle');
      navigate('/bptracker/success', { state: { reading } });
    } catch (err) {
      setSaveError('Could not save reading. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Manual entry state ─────────────────────────────────────────────────
  if (captureState === 'manual') {
    return (
      <div className="capture-view" data-testid="capture-view">
        <div className="capture-header">
          <p className="capture-greeting" data-testid="capture-greeting">
            Hello, {firstName}
          </p>
        </div>
        <div className="manual-entry-inline" data-testid="manual-entry-section">
          <p className="manual-entry-heading">Enter Reading Manually</p>
          <ManualEntry
            onSave={handleManualSave}
            onCancel={() => { setSaveError(null); setCaptureState('idle'); }}
            saving={saving}
            saveError={saveError}
            cancelLabel="Cancel"
          />
        </div>
      </div>
    );
  }

  // ── Preview state ───────────────────────────────────────────────────────
  if (captureState === 'previewing') {
    return (
      <Preview
        imageData={imageData}
        imageType={imageType}
        imagePreviewUrl={imagePreviewUrl}
        onRetake={handleRetake}
        onSaved={handleSaved}
        user={user}
      />
    );
  }

  // ── Idle state ────────────────────────────────────────────────────────────
  return (
    <div className="capture-view" data-testid="capture-view">
      <div className="capture-header">
        <p className="capture-greeting" data-testid="capture-greeting">
          Hello, {firstName}
        </p>
        <p className="capture-datetime" data-testid="capture-datetime">
          {formatDateTime(now)}
        </p>
      </div>

      <div className="capture-cta">
        <button
          className="camera-btn"
          data-testid="capture-camera-btn"
          onClick={handleCameraClick}
          aria-label="Take blood pressure reading"
        >
          <span className="camera-btn-icon">&#128247;</span>
          <span className="camera-btn-label">Take Reading</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          data-testid="capture-file-input"
        />
      </div>

      <button
        className="manual-entry-btn"
        data-testid="capture-manual-btn"
        onClick={() => setCaptureState('manual')}
      >
        Enter manually
      </button>

      <RecentReadingsTable readings={recentReadings} />
    </div>
  );
}

/**
 * RecentReadingsTable — compact last-5 readings shown on the Capture screen.
 */
function RecentReadingsTable({ readings }) {
  if (!readings.length) {
    return (
      <div className="recent-readings" data-testid="recent-readings">
        <p className="recent-readings-empty">No readings yet — take your first reading above.</p>
      </div>
    );
  }

  return (
    <div className="recent-readings" data-testid="recent-readings">
      <p className="recent-readings-label">Recent readings</p>
      <table className="recent-readings-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>BP</th>
            <th>HR</th>
          </tr>
        </thead>
        <tbody>
          {readings.map((r) => (
            <tr key={r.id} data-testid={`recent-row-${r.id}`}>
              <td className="recent-date">{formatShortDate(new Date(r.timestamp))}</td>
              <td className="recent-bp">
                <span className="recent-sys">{r.systolic ?? '—'}</span>
                <span className="recent-sep">/</span>
                <span className="recent-dia">{r.diastolic ?? '—'}</span>
              </td>
              <td className="recent-hr">{r.heartRate ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function formatDateTime(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  const year  = String(date.getFullYear()).slice(-2);
  let   hours = date.getHours();
  const mins  = String(date.getMinutes()).padStart(2, '0');
  const ampm  = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${month}/${day}/${year} ${hours}:${mins} ${ampm}`;
}

function formatShortDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  let   hours = date.getHours();
  const mins  = String(date.getMinutes()).padStart(2, '0');
  const ampm  = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${month}/${day} ${hours}:${mins}${ampm}`;
}
