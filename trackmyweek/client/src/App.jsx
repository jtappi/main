import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import RequireAuth from './components/RequireAuth';
import LogEntry from './pages/LogEntry';
import ViewData from './pages/ViewData';
import Reports from './pages/Reports';
import Categories from './pages/Categories';
import Questions from './pages/Questions';

/**
 * App.jsx — root component.
 *
 * basename="/trackmyweek" matches the nginx location block and Vite base.
 * React Router strips the prefix from every path match internally.
 *
 * All routes are wrapped in RequireAuth which checks /auth/session on mount
 * and redirects to /login?returnTo=<current path> if unauthenticated.
 */
export default function App() {
  return (
    <BrowserRouter basename="/trackmyweek">
      <RequireAuth>
        <div className="app">
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
      </RequireAuth>
    </BrowserRouter>
  );
}
