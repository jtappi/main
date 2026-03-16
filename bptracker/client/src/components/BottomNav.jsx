import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * BottomNav — two-tab navigation bar + text size toggle.
 *
 * Props:
 *   textSize   — 'sm' | 'md' | 'lg'
 *   onTextSize — callback(size)
 */
export default function BottomNav({ textSize, onTextSize }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isCapture = location.pathname === '/bptracker' || location.pathname === '/bptracker/';
  const isReports = location.pathname.startsWith('/bptracker/reports');

  return (
    <nav className="bottom-nav" data-testid="bottom-nav">
      <button
        className={`bottom-nav-btn${isCapture ? ' active' : ''}`}
        data-testid="nav-capture-btn"
        onClick={() => navigate('/bptracker')}
      >
        <span className="bottom-nav-icon">&#128247;</span>
        <span className="bottom-nav-label">Capture</span>
      </button>

      <div className="text-size-toggle" data-testid="text-size-toggle">
        {['sm', 'md', 'lg'].map((s) => (
          <button
            key={s}
            className={`text-size-btn${textSize === s ? ' active' : ''}`}
            onClick={() => onTextSize(s)}
            aria-label={`Text size ${s}`}
            data-testid={`text-size-${s}`}
          >
            {s === 'sm' ? 'S' : s === 'md' ? 'M' : 'L'}
          </button>
        ))}
      </div>

      <button
        className={`bottom-nav-btn${isReports ? ' active' : ''}`}
        data-testid="nav-reports-btn"
        onClick={() => navigate('/bptracker/reports')}
      >
        <span className="bottom-nav-icon">&#128202;</span>
        <span className="bottom-nav-label">Reports</span>
      </button>
    </nav>
  );
}
