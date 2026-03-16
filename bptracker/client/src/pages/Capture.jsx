import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReadings } from '../api/client.js';
import Preview from './Preview.jsx';

/**
 * Capture — main capture view.
 *
 * Responsibilities:
 *   - Show greeting, live clock, last 5 readings mini-table
 *   - Trigger native device camera via hidden file input
 *   - Read selected image as base64 and pass to Preview inline
 *   - Render Preview inline (not a separate route) so URL stays /bptracker
 *     until the save completes, at which point we navigate to /bptracker/success
 */
export default function Capture({ user }) {
  const [now,           setNow]           = useState(new Date());
  const [recentReadings, setRecentReadings] = useState([]);
  const [captureState,  setCaptureState]  = useState('idle'); // idle | previewing
  const [imageData,     setImageData]     = useState(null);
  const [imageType,     setImageType]     = useState('image/jpeg');
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
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
    // Reset so the same file can be re-selected after a retake
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

  function handleSaved(reading) {
    // Prepend new reading and keep top 5
    setRecentReadings(prev => [reading, ...prev].slice(0, 5));
    setImageData(null);
    setImagePreviewUrl(null);
    setCaptureState('idle');
    navigate('/bptracker/success', { state: { reading } });
  }

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

/**
 * Format a Date as MM/DD/YY h:mm am/pm
 * Exported so Preview.jsx and Success.jsx can import it without circular deps.
 */
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

/** Format a Date as MM/DD h:mm am/pm (compact, no year) */
function formatShortDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  let   hours = date.getHours();
  const mins  = String(date.getMinutes()).padStart(2, '0');
  const ampm  = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${month}/${day} ${hours}:${mins}${ampm}`;
}
