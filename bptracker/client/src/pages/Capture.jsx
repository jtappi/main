import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReadings, extractReading } from '../api/client.js';
import { formatDateTime } from './Capture.jsx';
import Preview from './Preview.jsx';

/**
 * Capture — main capture view.
 *
 * Responsibilities:
 *   - Show greeting, live clock, last reading summary
 *   - Trigger native device camera via hidden file input
 *   - Read selected image as base64 and pass to Preview
 *   - Render Preview inline (not a separate route) so URL stays /bptracker
 */
export default function Capture({ user }) {
  const [now, setNow]               = useState(new Date());
  const [lastReading, setLastReading] = useState(null);
  const [captureState, setCaptureState] = useState('idle'); // idle | previewing
  const [imageData, setImageData]   = useState(null);
  const [imageType, setImageType]   = useState('image/jpeg');
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Live clock — updates every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch last reading on mount
  useEffect(() => {
    getReadings()
      .then((readings) => {
        if (readings.length > 0) {
          // Sort newest first by timestamp
          const sorted = [...readings].sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
          );
          setLastReading(sorted[0]);
        }
      })
      .catch(() => {
        // Non-fatal — last reading summary is informational only
      });
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'there';

  function handleCameraClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected after a retake
    e.target.value = '';

    const mediaType = file.type || 'image/jpeg';
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
    setLastReading(reading);
    setCaptureState('idle');
    setImageData(null);
    setImagePreviewUrl(null);
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
        {/* Hidden file input — triggers native camera on mobile */}
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

      <div className="capture-last" data-testid="capture-last-reading">
        {lastReading ? (
          <>
            <p className="capture-last-label">Last reading</p>
            <p className="capture-last-date">
              {formatDateTime(new Date(lastReading.timestamp))}
            </p>
            <p className="capture-last-value">
              {lastReading.systolic} / {lastReading.diastolic}
              <span className="capture-last-hr"> &hearts; {lastReading.heartRate}</span>
            </p>
          </>
        ) : (
          <>
            <p className="capture-last-label">Last reading</p>
            <p className="capture-last-value">&mdash;</p>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Format a Date as MM/DD/YY h:mm am/pm
 *
 * @param {Date} date
 * @returns {string}
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
