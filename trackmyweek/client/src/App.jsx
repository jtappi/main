import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import RequireAuth, { useSession } from './components/RequireAuth';
import PortalTopBar from './components/PortalTopBar';
import LogEntry from './pages/LogEntry';
import ViewData from './pages/ViewData';
import Reports from './pages/Reports';
import Categories from './pages/Categories';
import Questions from './pages/Questions';
import './styles/global.css';

/**
 * AppShell — rendered inside RequireAuth so it has access to SessionContext.
 *
 * Layout:
 *
 *   ┌─────────────────────────────────────┐
 *   │ PortalTopBar (full width, sticky)   │  ← always shown, z-index 200
 *   ├────────┬────────────────────────────┤
 *   │ Nav    │ Main content               │  ← nav fixed, top offset by bar height
 *   │ sidebar│                            │
 *   └────────┴────────────────────────────┘
 *
 * The PortalTopBar is always rendered. `.has-top-bar` is always applied to
 * `.app` so the fixed sidebar nav is always correctly offset below the bar.
 *
 * showDashboardLink is true for admins and multi-project users.
 * Single-project guests are auto-redirected here by the portal and have no
 * dashboard to return to, so the back link is hidden for them.
 */
function AppShell() {
  const user = useSession();
  const showDashboardLink = user && (user.projectAccess.length > 1 || user.role === 'admin');

  return (
    <div className="app has-top-bar">
      <PortalTopBar userName={user?.name} showDashboardLink={showDashboardLink} />
      <div className="app-body">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/log" replace />} />
            <Route path="/log" element={<LogEntry />} />
            <Route path="/view" element={<ViewData />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/questions" element={<Questions />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/trackmyweek">
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    </BrowserRouter>
  );
}
