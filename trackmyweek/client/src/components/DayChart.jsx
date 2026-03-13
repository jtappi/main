import React, { useState, useEffect, useRef } from 'react';
import { getEntries, getCategories } from '../api/client';
import './DayChart.css';

/**
 * DayChart — scatter plot of entries for a selected date, by time of day.
 *
 * X axis: hour of day (0–23)
 * Y axis: entry index within that hour (stacks overlapping entries)
 * Each point is colored by category and shows entry text on hover.
 */
export default function DayChart() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate]           = useState(today);
  const [entries, setEntries]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]     = useState(false);
  const canvasRef                 = useRef(null);
  const chartRef                  = useRef(null);

  // Load categories once
  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  // Load entries for selected date
  useEffect(() => {
    setLoading(true);
    getEntries({ dateRange: 'alltime' })
      .then((all) => {
        const filtered = all.filter((e) => e.timestamp.slice(0, 10) === date);
        setEntries(filtered);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [date]);

  // Build category color map
  const colorMap = {};
  for (const cat of categories) colorMap[cat.name] = cat.color;

  // Draw chart using Canvas API (no extra dependency)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width  = canvas.offsetWidth;
    const H = canvas.height = 120;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#1a1d27';
    ctx.fillRect(0, 0, W, H);

    // Hour grid lines
    ctx.strokeStyle = '#2e3146';
    ctx.lineWidth = 1;
    for (let h = 0; h <= 24; h++) {
      const x = Math.round((h / 24) * W);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // Hour labels
    ctx.fillStyle = '#7b7f9e';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    for (const h of [0, 6, 12, 18, 24]) {
      const x = (h / 24) * W;
      const label = h === 0 ? '12am' : h === 12 ? '12pm' : h === 24 ? '' : h > 12 ? `${h-12}pm` : `${h}am`;
      ctx.fillText(label, x, H - 4);
    }

    if (!entries.length) {
      ctx.fillStyle = '#7b7f9e';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('No entries for this day', W / 2, H / 2 - 8);
      return;
    }

    // Group entries by hour to stack dots
    const byHour = {};
    for (const entry of entries) {
      const d = new Date(entry.timestamp);
      const h = d.getHours() + d.getMinutes() / 60;
      const hKey = Math.floor(h);
      byHour[hKey] = (byHour[hKey] || 0) + 1;
      const stack = byHour[hKey];
      const x = (h / 24) * W;
      const y = H - 24 - (stack - 1) * 14;
      const color = colorMap[entry.category] || '#6c63ff';

      // Draw dot
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#0f1117';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [entries, categories]);

  return (
    <div className="day-chart card" data-testid="day-chart">
      <div className="day-chart-header">
        <h3 className="day-chart-title">Day View</h3>
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          className="day-chart-date"
          data-testid="day-chart-date"
        />
      </div>
      {loading ? (
        <p className="text-muted" style={{ padding: '1rem 0' }}>Loading…</p>
      ) : (
        <canvas ref={canvasRef} className="day-chart-canvas" />
      )}
      <div className="day-chart-legend">
        {categories.map((cat) => (
          <span key={cat.id} className="day-chart-legend-item">
            <span className="day-chart-legend-dot" style={{ background: cat.color }} />
            {cat.name}
          </span>
        ))}
      </div>
    </div>
  );
}
