import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Capture from './pages/Capture.jsx';
import Reports from './pages/Reports.jsx';
import Success from './pages/Success.jsx';
import BottomNav from './components/BottomNav.jsx';
import PortalTopBar from './components/PortalTopBar.jsx';

// Valid text size values and the localStorage key
const TEXT_SIZES = ['sm', 'md', 'lg'];
const TEXT_SIZE_KEY = 'bptracker-text-size';

/**
 * Read text size from localStorage synchronously before first render
 * to avoid a flash of unsized text.
 */
function getInitialTextSize() {
  try {
    const stored = localStorage.getItem(TEXT_SIZE_KEY);
    if (stored && TEXT_SIZES.includes(stored)) return stored;
  } catch {}
  return 'md';
}

/**
 * App — top-level component.
 *
 * Manages:
 *   - Session user fetch
 *   - Text size preference (localStorage-backed, applied as CSS class on app-shell)
 *   - PortalTopBar: always shown. showDashboardLink is true only for admins
 *     and multi-project users — single-project guests have no dashboard to
 *     return to (the portal auto-redirected them here directly).
 *
 * Routes:
 *   /bptracker           -> Capture (default)
 *   /bptracker/reports   -> Reports
 *   /bptracker/success   -> Success (after save)
 */
export default function App() {
  const [user,     setUser]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [textSize, setTextSize] = useState(getInitialTextSize);

  useEffect(() => {
    fetch('/auth/session', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
          window.location.href = '/login?returnTo=/bptracker';
        }
      })
      .catch(() => {
        window.location.href = '/login?returnTo=/bptracker';
      })
      .finally(() => setLoading(false));
  }, []);

  function handleTextSize(size) {
    if (!TEXT_SIZES.includes(size)) return;
    setTextSize(size);
    try { localStorage.setItem(TEXT_SIZE_KEY, size); } catch {}
  }

  if (loading) {
    return (
      <div className="app-loading" data-testid="app-loading">
        <p>Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  const showDashboardLink = user.projectAccess.length > 1 || user.role === 'admin';

  return (
    <BrowserRouter>
      <div className={`app-shell text-${textSize}`} data-testid="app-shell">
        <PortalTopBar userName={user.name} showDashboardLink={showDashboardLink} />
        <div className="app-content">
          <Routes>
            <Route path="/bptracker"         element={<Capture user={user} />} />
            <Route path="/bptracker/reports" element={<Reports user={user} />} />
            <Route path="/bptracker/success" element={<Success />} />
            <Route path="*"                  element={<Navigate to="/bptracker" replace />} />
          </Routes>
        </div>
        <BottomNav textSize={textSize} onTextSize={handleTextSize} />
      </div>
    </BrowserRouter>
  );
}
