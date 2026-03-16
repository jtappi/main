import React, { useState, useEffect, useRef } from 'react';
import { getEntries, getCategories } from '../api/client';
import './DayChart.css';

const CHART_H     = 160;  // canvas draw height in px
const PAD_TOP     = 12;   // space above the highest point
const PAD_BOTTOM  = 22;   // space for x-axis labels
const PAD_LEFT    = 36;   // space for y-axis labels
const PAD_RIGHT   = 8;

export default function DayChart() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate]             = useState(today);
  const [entries, setEntries]       = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(false);
  const canvasRef                   = useRef(null);

  // Load categories once
  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  // Load entries for selected date
  useEffect(() => {
    setLoading(true);
    getEntries({ dateRange: 'alltime' })
      .then((all) => {
        const filtered = all
          .filter((e) => e.timestamp.slice(0, 10) === date)
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setEntries(filtered);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [date]);

  // Build category color map
  const colorMap = {};
  for (const cat of categories) colorMap[cat.name] = cat.color;

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.offsetWidth;
    if (W === 0) return;

    canvas.width  = W;
    canvas.height = CHART_H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, CHART_H);

    // Plot area bounds
    const plotX = PAD_LEFT;
    const plotY = PAD_TOP;
    const plotW = W - PAD_LEFT - PAD_RIGHT;
    const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;

    // Background
    ctx.fillStyle = '#1a1d27';
    ctx.fillRect(0, 0, W, CHART_H);

    // Helper: convert hour (0.0–24.0) to canvas x
    const toX = (h) => plotX + (h / 24) * plotW;
    // Helper: convert count to canvas y
    const toY = (c, max) => plotY + plotH - (max === 0 ? 0 : (c / max) * plotH);

    // Hour grid lines
    ctx.strokeStyle = '#2e3146';
    ctx.lineWidth = 1;
    for (let h = 0; h <= 24; h += 6) {
      const x = Math.round(toX(h));
      ctx.beginPath();
      ctx.moveTo(x, plotY);
      ctx.lineTo(x, plotY + plotH);
      ctx.stroke();
    }

    // X-axis labels
    ctx.fillStyle = '#7b7f9e';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    for (const h of [0, 6, 12, 18]) {
      const label = h === 0 ? '12am' : h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`;
      ctx.fillText(label, toX(h), CHART_H - 6);
    }

    // Empty state
    if (!entries.length) {
      ctx.fillStyle = '#7b7f9e';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('No entries for this day', W / 2, plotY + plotH / 2);
      return;
    }

    const total = entries.length;

    // Y-axis labels: 0, midpoint, total
    ctx.fillStyle = '#7b7f9e';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('0',     plotX - 4, toY(0,     total) + 3);
    ctx.fillText(total,   plotX - 4, toY(total, total) + 3);
    if (total >= 4) {
      const mid = Math.round(total / 2);
      ctx.fillText(mid, plotX - 4, toY(mid, total) + 3);
    }

    // Build step points: [x, y, color] pairs for each entry in time order
    // Start at (0, 0) and step up by 1 for each entry at its timestamp x
    const points = [{ x: toX(0), y: toY(0, total), color: null }];
    let count = 0;
    for (const entry of entries) {
      const d = new Date(entry.timestamp);
      const h = d.getHours() + d.getMinutes() / 60;
      count++;
      const x     = toX(h);
      const y     = toY(count, total);
      const color = colorMap[entry.category] || '#6c63ff';
      // Horizontal segment at previous count up to this x, then step up
      points.push({ x, y: toY(count - 1, total), color }); // end of flat segment
      points.push({ x, y, color });                          // top of step
    }
    // Extend line to end of day
    points.push({ x: toX(24), y: toY(total, total), color: null });

    // Area fill under the step line
    ctx.beginPath();
    ctx.moveTo(points[0].x, toY(0, total));
    for (const p of points) ctx.lineTo(p.x, p.y);
    ctx.lineTo(toX(24), toY(0, total));
    ctx.closePath();
    ctx.fillStyle = 'rgba(108, 99, 255, 0.10)';
    ctx.fill();

    // Draw step line segments, each colored by the category that triggered the step
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const cur  = points[i];
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(cur.x, cur.y);
      ctx.strokeStyle = cur.color || prev.color || '#6c63ff';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    // Dots at each step point (the moment an entry was logged)
    // Skip the synthetic start and end points
    let dotCount = 0;
    for (const entry of entries) {
      dotCount++;
      const d     = new Date(entry.timestamp);
      const h     = d.getHours() + d.getMinutes() / 60;
      const x     = toX(h);
      const y     = toY(dotCount, total);
      const color = colorMap[entry.category] || '#6c63ff';

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#1a1d27';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => { draw(); });
    observer.observe(canvas);
    draw();
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
