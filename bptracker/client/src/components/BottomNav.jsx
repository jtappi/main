import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * BottomNav — two-tab bottom navigation bar.
 * Highlights the active tab based on current route.
 */
export default function BottomNav() {
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
