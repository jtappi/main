import React, { useState, useEffect, useCallback } from 'react';
import { getReports } from '../api/client';
import ReportCard from '../components/ReportCard';
import ReportBuilder from '../components/ReportBuilder';
import './Reports.css';

const PREBUILT = [
  { id: '__trend',      name: 'Entries Over Time',    type: 'trend' },
  { id: '__categories', name: 'Category Breakdown',   type: 'categories' },
];

export default function Reports() {
  const [reports, setReports]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editReport, setEditReport]   = useState(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getReports();
      setReports(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  function handleEdit(report) {
    setEditReport(report);
    setBuilderOpen(true);
  }

  function handleNew() {
    setEditReport(null);
    setBuilderOpen(true);
  }

  function handleSaved(saved) {
    setReports((prev) => {
      const exists = prev.find((r) => r.id === saved.id);
      return exists
        ? prev.map((r) => r.id === saved.id ? saved : r)
        : [...prev, saved];
    });
  }

  function handleDeleted(id) {
    setReports((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h1 className="page-title">Reports</h1>
        <button
          className="btn btn-primary"
          onClick={handleNew}
          data-testid="new-report-btn"
        >
          + New Report
        </button>
      </div>

      {error && <p className="error-msg">{error}</p>}

      {/* Pre-built pinned reports */}
      <section className="reports-section">
        <h2 className="reports-section-title">Overview</h2>
        <div className="reports-grid">
          {PREBUILT.map((pb) => (
            <ReportCard
              key={pb.id}
              report={{ id: pb.id, name: pb.name, dateRange: '7days' }}
              prebuilt={pb.type}
            />
          ))}
        </div>
      </section>

      {/* Custom saved reports */}
      <section className="reports-section">
        <h2 className="reports-section-title">My Reports</h2>
        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : reports.length === 0 ? (
          <div className="empty-reports card">
            <p className="text-muted">No saved reports yet.</p>
            <button
              className="btn btn-primary"
              onClick={handleNew}
              style={{ marginTop: 'var(--space-md)' }}
            >
              Build your first report
            </button>
          </div>
        ) : (
          <div className="reports-grid">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onEdit={handleEdit}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        )}
      </section>

      <ReportBuilder
        open={builderOpen}
        onClose={() => { setBuilderOpen(false); setEditReport(null); }}
        onSaved={handleSaved}
        editReport={editReport}
      />
    </div>
  );
}
