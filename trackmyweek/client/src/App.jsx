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
 * Layout when PortalTopBar is shown:
 *
 *   ┌─────────────────────────────────────┐
 *   │ PortalTopBar (full width, sticky)   │
 *   ├────────┬────────────────────────────┤
 *   │ Nav    │ Main content               │
 *   │ sidebar│                            │
 *   └────────┴────────────────────────────┘
 *
 * The `has-top-bar` class on `.app` is used by Navigation.css to offset
 * the fixed sidebar below the top bar height.
 */
function AppShell() {
  const user       = useSession();
  const showTopBar = user && (user.projectAccess.length > 1 || user.role === 'admin');

  return (
    <div className={`app${showTopBar ? ' has-top-bar' : ''}`}>
      {showTopBar && <PortalTopBar userName={user.name} />}
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
