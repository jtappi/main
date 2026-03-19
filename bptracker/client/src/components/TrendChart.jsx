import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

/**
 * TrendChart — Chart.js line chart showing systolic, diastolic, heart rate over time.
 *
 * Props:
 *   readings   — full readings array
 *   range      — '7d' | '30d' | '90d' | 'all'
 *   onRange    — callback(range) when selector changes
 */
export default function TrendChart({ readings, range, onRange }) {
  const RANGES = [
    { value: '7d',  label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: 'all', label: 'All Time' },
  ];

  const filtered = useMemo(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const cutoff = {
      '7d':  now -  7 * day,
      '30d': now - 30 * day,
      '90d': now - 90 * day,
      'all': 0,
    }[range] ?? 0;
    return [...readings]
      .filter(r => new Date(r.timestamp).getTime() >= cutoff)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [readings, range]);

  const labels = filtered.map(r => {
    const d = new Date(r.timestamp);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Systolic',
        data: filtered.map(r => r.systolic),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.08)',
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Diastolic',
        data: filtered.map(r => r.diastolic),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.08)',
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Heart Rate',
        data: filtered.map(r => r.heartRate),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.08)',
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { font: { size: 12 }, boxWidth: 12, padding: 16 },
      },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: {
        ticks: { font: { size: 11 }, maxRotation: 45 },
        grid: { display: false },
      },
      y: {
        ticks: { font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
    },
  };

  if (!filtered.length) {
    return (
      <div className="trend-chart-section" data-testid="trend-chart">
        <div className="trend-chart-header">
          <span className="trend-chart-title">Trend</span>
          <RangeSelector range={range} onRange={onRange} ranges={RANGES} />
        </div>
        <div className="trend-chart-empty">No data for this range.</div>
      </div>
    );
  }

  return (
    <div className="trend-chart-section" data-testid="trend-chart">
      <div className="trend-chart-header">
        <span className="trend-chart-title">Trend</span>
        <RangeSelector range={range} onRange={onRange} ranges={RANGES} />
      </div>
      <div className="trend-chart-canvas-wrap">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}

function RangeSelector({ range, onRange, ranges }) {
  return (
    <div className="range-selector" data-testid="range-selector">
      {ranges.map(r => (
        <button
          key={r.value}
          className={`range-btn${range === r.value ? ' active' : ''}`}
          onClick={() => onRange(r.value)}
          data-testid={`range-btn-${r.value}`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
