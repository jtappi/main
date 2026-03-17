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

/**
 * AppShell — rendered inside RequireAuth so it has access to SessionContext.
 * Conditionally shows the PortalTopBar when the user has more than one project.
 */
function AppShell() {
  const user = useSession();
  const showTopBar = user && (user.projectAccess.length > 1 || user.role === 'admin');

  return (
    <div className="app">
      {showTopBar && <PortalTopBar userName={user.name} />}
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
  );
}

/**
 * App.jsx — root component.
 *
 * basename="/trackmyweek" matches the nginx location block and Vite base.
 * React Router strips the prefix from every path match internally.
 *
 * All routes are wrapped in RequireAuth which checks /auth/session on mount
 * and redirects to /login?returnTo=<current path> if unauthenticated.
 * RequireAuth also provides SessionContext so AppShell can read user data.
 */
export default function App() {
  return (
    <BrowserRouter basename="/trackmyweek">
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    </BrowserRouter>
  );
}
