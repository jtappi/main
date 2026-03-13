import React from 'react';
import { Line } from 'react-chartjs-2';
import './chartSetup.js';
import { BASE_OPTIONS } from './chartSetup.js';

/**
 * TrendChart — line chart with area fill, used for Entries Over Time.
 * Props: labels {string[]}, values {number[]}, title {string}
 */
export default function TrendChart({ labels, values, title }) {
  const data = {
    labels,
    datasets: [{
      label:           title || 'Entries',
      data:            values,
      borderColor:     '#6c63ff',
      backgroundColor: 'rgba(108, 99, 255, 0.15)',
      pointBackgroundColor: '#6c63ff',
      pointRadius:     3,
      pointHoverRadius: 6,
      fill:            true,
      tension:         0.4,
    }],
  };

  const options = {
    ...BASE_OPTIONS,
    plugins: {
      ...BASE_OPTIONS.plugins,
      legend: { display: false },
    },
  };

  return <Line data={data} options={options} />;
}
