import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Capture from './pages/Capture.jsx';
import Reports from './pages/Reports.jsx';
import BottomNav from './components/BottomNav.jsx';

/**
 * App — top-level component.
 *
 * Fetches the current session user from the portal on mount.
 * All pages receive the user object as a prop.
 *
 * Routes:
 *   /bptracker          -> Capture (default)
 *   /bptracker/reports  -> Reports
 */
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/auth/session', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
          // Not authenticated — redirect to portal login
          window.location.href = '/login?returnTo=/bptracker';
        }
      })
      .catch(() => {
        window.location.href = '/login?returnTo=/bptracker';
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="app-loading" data-testid="app-loading">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <BrowserRouter>
      <div className="app-shell">
        <div className="app-content">
          <Routes>
            <Route path="/bptracker" element={<Capture user={user} />} />
            <Route path="/bptracker/reports" element={<Reports user={user} />} />
            <Route path="*" element={<Navigate to="/bptracker" replace />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
