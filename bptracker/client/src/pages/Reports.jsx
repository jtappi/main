import React, { useState, useEffect, useCallback } from 'react';
import { getReadings, getUsers } from '../api/client.js';
import SummaryCards from '../components/SummaryCards.jsx';
import TrendChart from '../components/TrendChart.jsx';
import HistoryTable from '../components/HistoryTable.jsx';

/**
 * Reports — full reports view.
 *
 * Fetches all readings on mount (admin gets everyone's, guest gets their own).
 * For admin users, client-side filters by selectedUserId when one is chosen.
 * Also fetches the bptracker user list (admin only) and hands it up to App
 * via setBptrackerUsers so the PortalTopBar dropdown stays populated.
 *
 * Props:
 *   user             {Object}   — session user from App
 *   selectedUserId   {string}   — '' means all users; a user id means that user only
 *   bptrackerUsers   {Array}    — [{id, name}] list from /api/users (admin only)
 *   setBptrackerUsers {Function} — setter from App to store user list
 */
export default function Reports({ user, selectedUserId, bptrackerUsers, setBptrackerUsers }) {
  const [readings,    setReadings]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [range,       setRange]       = useState('30d');

  const isAdmin = user.role === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [readingsData, usersData] = await Promise.all([
        getReadings(),
        isAdmin && bptrackerUsers.length === 0 ? getUsers() : Promise.resolve(null),
      ]);
      setReadings(readingsData);
      if (usersData !== null) {
        setBptrackerUsers(usersData);
      }
    } catch (err) {
      setError('Could not load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, setBptrackerUsers]);

  useEffect(() => { load(); }, [load]);

  function handleUpdate(updated) {
    setReadings(prev => prev.map(r => r.id === updated.id ? updated : r));
  }

  function handleDelete(id) {
    setReadings(prev => prev.filter(r => r.id !== id));
  }

  // Apply admin user filter — if a specific user is selected, show only their readings.
  // For non-admins selectedUserId is always '' so this is a no-op.
  const visibleReadings = selectedUserId
    ? readings.filter(r => r.userId === selectedUserId)
    : readings;

  // Heading label: show whose data we're looking at when a user is selected
  const selectedUser = bptrackerUsers.find(u => u.id === selectedUserId);
  const headingLabel = selectedUser ? `Reports — ${selectedUser.name}` : 'Reports';

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

  if (!visibleReadings.length) {
    return (
      <div className="reports-view" data-testid="reports-view">
        <h1 className="reports-heading">{headingLabel}</h1>
        <div className="reports-empty" data-testid="reports-empty">
          {selectedUser
            ? `No readings found for ${selectedUser.name}.`
            : 'No readings yet. Take your first reading to see your data here.'}
        </div>
      </div>
    );
  }

  return (
    <div className="reports-view" data-testid="reports-view">
      <h1 className="reports-heading">{headingLabel}</h1>

      <SummaryCards readings={visibleReadings} />

      <TrendChart
        readings={visibleReadings}
        range={range}
        onRange={setRange}
      />

      <HistoryTable
        readings={visibleReadings}
        range={range}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}
