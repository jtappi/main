import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import LogEntry from './pages/LogEntry';
import ViewData from './pages/ViewData';
import Reports from './pages/Reports';
import Categories from './pages/Categories';
import Questions from './pages/Questions';

/**
 * App.jsx — root component.
 *
 * All routes are nested under /trackmyweek/ to match the Express mount point.
 * The basename prop on BrowserRouter ensures React Router strips the prefix
 * from every path match.
 */
export default function App() {
  return (
    <BrowserRouter basename="/trackmyweek">
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
    </BrowserRouter>
  );
}
