import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatDateTime } from './Capture.jsx';

/**
 * Success — shown after a reading is saved.
 *
 * Receives the saved reading via react-router location state.
 * Auto-dismisses to /bptracker after 3 seconds.
 */
export default function Success() {
  const navigate = useNavigate();
  const location = useLocation();
  const reading  = location.state?.reading;

  useEffect(() => {
    const timer = setTimeout(() => navigate('/bptracker'), 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  const timestamp = reading?.timestamp
    ? formatDateTime(new Date(reading.timestamp))
    : null;

  return (
    <div className="success-view" data-testid="success-view">
      <div className="success-icon" aria-hidden="true">&#9989;</div>

      <p className="success-heading">Reading saved!</p>

      {reading && (
        <div className="success-summary" data-testid="success-reading-summary">
          <p className="success-values">
            {reading.systolic} / {reading.diastolic}
            <span className="success-hr"> &hearts; {reading.heartRate}</span>
          </p>
          {timestamp && (
            <p className="success-timestamp">{timestamp}</p>
          )}
        </div>
      )}

      <div className="success-actions">
        <button
          className="btn-secondary"
          onClick={() => navigate('/bptracker')}
          data-testid="success-done-btn"
        >
          Done
        </button>
        <button
          className="btn-primary"
          onClick={() => navigate('/bptracker/reports')}
          data-testid="success-reports-btn"
        >
          View Reports
        </button>
      </div>
    </div>
  );
}
