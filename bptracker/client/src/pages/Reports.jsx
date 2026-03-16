import React, { useState, useEffect, useCallback } from 'react';
import { getReadings } from '../api/client.js';
import SummaryCards from '../components/SummaryCards.jsx';
import TrendChart from '../components/TrendChart.jsx';
import HistoryTable from '../components/HistoryTable.jsx';

/**
 * Reports — full reports view.
 *
 * Fetches readings on mount, manages range state shared between
 * TrendChart and HistoryTable, handles loading and empty states.
 */
export default function Reports({ user }) {
  const [readings, setReadings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [range,    setRange]    = useState('30d');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReadings();
      setReadings(data);
    } catch (err) {
      setError('Could not load readings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleUpdate(updated) {
    setReadings(prev => prev.map(r => r.id === updated.id ? updated : r));
  }

  function handleDelete(id) {
    setReadings(prev => prev.filter(r => r.id !== id));
  }

  if (loading) {
    return (
      <div className="reports-view" data-testid="reports-view">
        <div className="reports-loading" data-testid="reports-loading">
          <div className="spinner" />
          <span>Loading readings…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports-view" data-testid="reports-view">
        <div className="reports-error" data-testid="reports-error">
          <p>{error}</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={load}
            data-testid="reports-retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!readings.length) {
    return (
      <div className="reports-view" data-testid="reports-view">
        <h1 className="reports-heading">Reports</h1>
        <div className="reports-empty" data-testid="reports-empty">
          No readings yet. Take your first reading to see your data here.
        </div>
      </div>
    );
  }

  return (
    <div className="reports-view" data-testid="reports-view">
      <h1 className="reports-heading">Reports</h1>

      <SummaryCards readings={readings} />

      <TrendChart
        readings={readings}
        range={range}
        onRange={setRange}
      />

      <HistoryTable
        readings={readings}
        range={range}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}
