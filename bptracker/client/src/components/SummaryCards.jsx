import React from 'react';

/**
 * SummaryCards — three stat cards shown at the top of the Reports view.
 *
 * Cards:
 *   1. 30-day average  (systolic / diastolic / heart rate)
 *   2. 30-day median   (systolic / diastolic / heart rate)
 *   3. 7-day average   (systolic / diastolic / heart rate)
 *
 * Props:
 *   readings  — full readings array (already filtered to current user by API)
 */
export default function SummaryCards({ readings }) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const last30 = readings.filter(r => now - new Date(r.timestamp).getTime() <= 30 * day);
  const last7  = readings.filter(r => now - new Date(r.timestamp).getTime() <=  7 * day);

  function avg(arr, field) {
    const vals = arr.map(r => r[field]).filter(v => v != null);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  function median(arr, field) {
    const vals = arr.map(r => r[field]).filter(v => v != null).sort((a, b) => a - b);
    if (!vals.length) return null;
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 === 0
      ? Math.round((vals[mid - 1] + vals[mid]) / 2)
      : vals[mid];
  }

  const cards = [
    {
      label: '30-Day Avg',
      sys:  avg(last30, 'systolic'),
      dia:  avg(last30, 'diastolic'),
      hr:   avg(last30, 'heartRate'),
      testid: 'summary-card-30avg',
    },
    {
      label: '30-Day Median',
      sys:  median(last30, 'systolic'),
      dia:  median(last30, 'diastolic'),
      hr:   median(last30, 'heartRate'),
      testid: 'summary-card-30med',
    },
    {
      label: '7-Day Avg',
      sys:  avg(last7, 'systolic'),
      dia:  avg(last7, 'diastolic'),
      hr:   avg(last7, 'heartRate'),
      testid: 'summary-card-7avg',
    },
  ];

  function fmt(v) { return v != null ? v : '—'; }

  return (
    <div className="summary-cards" data-testid="summary-cards">
      {cards.map(card => (
        <div key={card.label} className="summary-card" data-testid={card.testid}>
          <div className="summary-card-label">{card.label}</div>
          <div className="summary-card-bp">
            <span className="summary-card-sys">{fmt(card.sys)}</span>
            <span className="summary-card-sep">/</span>
            <span className="summary-card-dia">{fmt(card.dia)}</span>
          </div>
          <div className="summary-card-hr">
            ♥ {fmt(card.hr)}
          </div>
        </div>
      ))}
    </div>
  );
}
