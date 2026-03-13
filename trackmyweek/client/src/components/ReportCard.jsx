import React, { useState, useEffect } from 'react';
import { getReportData, getPrebuiltTrend, getPrebuiltCategories, deleteReport } from '../api/client';
import TrendChart from './charts/TrendChart';
import BarChart from './charts/BarChart';
import PieChart from './charts/PieChart';
import Histogram from './charts/Histogram';
import PivotTable from './charts/PivotTable';
import './ReportCard.css';

const DATE_RANGE_LABELS = {
  today:   'Today',
  '7days':  'Last 7 days',
  '30days': 'Last 30 days',
  '90days': 'Last 90 days',
  alltime:  'All time',
};

const DATE_RANGE_OPTIONS = Object.entries(DATE_RANGE_LABELS);

/**
 * ReportCard — renders a single report (pre-built or custom).
 *
 * Props:
 *   report      {object}   report config
 *   prebuilt    {string}   'trend' | 'categories' | undefined
 *   onEdit      {fn}       called with report when edit clicked
 *   onDeleted   {fn}       called with report.id after deletion
 */
export default function ReportCard({ report, prebuilt, onEdit, onDeleted }) {
  const [chartData, setChartData]     = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [dateRange, setDateRange]     = useState(report?.dateRange || '7days');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      let data;
      if (prebuilt === 'trend') {
        data = await getPrebuiltTrend(dateRange);
      } else if (prebuilt === 'categories') {
        data = await getPrebuiltCategories(dateRange);
      } else {
        data = await getReportData(report.id);
      }
      setChartData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteReport(report.id);
      onDeleted?.(report.id);
    } catch (err) {
      setError(err.message);
    }
  }

  function renderChart() {
    if (!chartData) return null;
    const { labels, values, chartType: type } = chartData;
    const ct = type || (prebuilt === 'categories' ? 'pie' : 'trend');

    switch (ct) {
      case 'trend':
      case 'line':     return <TrendChart labels={labels} values={values} title={report?.name} />;
      case 'bar':      return <BarChart   labels={labels} values={values} title={report?.name} />;
      case 'pie':      return <PieChart   labels={labels} values={values} />;
      case 'histogram':return <Histogram  labels={labels} values={values} title={report?.name} />;
      case 'pivot':    return <PivotTable labels={labels} values={values} title={report?.name} />;
      default:         return <BarChart   labels={labels} values={values} title={report?.name} />;
    }
  }

  const isPivot = chartData?.chartType === 'pivot';

  return (
    <div className="report-card card" data-testid="report-card">
      <div className="report-card-header">
        <h3 className="report-card-title">{report?.name}</h3>
        <div className="report-card-controls">
          {/* Date range selector — for pre-built reports */}
          {prebuilt && (
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="report-date-select"
              data-testid="report-date-range"
            >
              {DATE_RANGE_OPTIONS.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          )}
          {/* Edit / delete — custom reports only */}
          {!prebuilt && (
            <>
              <button
                className="btn btn-ghost report-card-btn"
                onClick={() => onEdit?.(report)}
                title="Edit report"
              >
                ✏️
              </button>
              {confirmDelete ? (
                <span className="delete-confirm">
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>Delete?</span>
                  <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: '0.8rem' }} onClick={handleDelete}>Yes</button>
                  <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: '0.8rem' }} onClick={() => setConfirmDelete(false)}>No</button>
                </span>
              ) : (
                <button
                  className="btn btn-ghost report-card-btn"
                  onClick={() => setConfirmDelete(true)}
                  title="Delete report"
                >
                  🗑️
                </button>
              )}
            </>
          )}
          <button
            className="btn btn-ghost report-card-btn"
            onClick={loadData}
            title="Refresh"
          >
            🔄
          </button>
        </div>
      </div>

      <div className={`report-card-chart${isPivot ? ' report-card-chart--pivot' : ''}`}>
        {loading && <p className="text-muted">Loading…</p>}
        {error   && <p className="error-msg">{error}</p>}
        {!loading && !error && chartData && (
          chartData.labels?.length === 0
            ? <p className="text-muted">No data for this period.</p>
            : renderChart()
        )}
      </div>

      {!prebuilt && report?.dateRange && (
        <p className="report-card-meta text-muted">
          {DATE_RANGE_LABELS[report.dateRange]} · {report.groupBy} · {report.measure}
        </p>
      )}
    </div>
  );
}
