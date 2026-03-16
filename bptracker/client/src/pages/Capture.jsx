import React, { useState, useEffect } from 'react';

/**
 * Capture — main capture view (Phase 3 stub).
 *
 * Shows:
 *   - Greeting with user's first name
 *   - Live date/time in MM/DD/YY h:mm am/pm format
 *   - Placeholder camera button (wired up in Phase 4)
 *
 * Full camera trigger, preview, extraction, and save flow implemented in Phase 4.
 */
export default function Capture({ user }) {
  const [now, setNow] = useState(new Date());

  // Update clock every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'there';

  const formatted = formatDateTime(now);

  return (
    <div className="capture-view" data-testid="capture-view">
      <div className="capture-header">
        <p className="capture-greeting" data-testid="capture-greeting">
          Hello, {firstName}
        </p>
        <p className="capture-datetime" data-testid="capture-datetime">
          {formatted}
        </p>
      </div>

      <div className="capture-cta">
        <button
          className="camera-btn"
          data-testid="capture-camera-btn"
          disabled
          title="Camera coming in Phase 4"
        >
          <span className="camera-btn-icon">&#128247;</span>
          <span className="camera-btn-label">Take Reading</span>
        </button>
      </div>

      <div className="capture-last" data-testid="capture-last-reading">
        <p className="capture-last-label">Last reading</p>
        <p className="capture-last-value">&mdash;</p>
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
  const month  = String(date.getMonth() + 1).padStart(2, '0');
  const day    = String(date.getDate()).padStart(2, '0');
  const year   = String(date.getFullYear()).slice(-2);
  let   hours  = date.getHours();
  const mins   = String(date.getMinutes()).padStart(2, '0');
  const ampm   = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${month}/${day}/${year} ${hours}:${mins} ${ampm}`;
}
