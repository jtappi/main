import React from 'react';
import { Bar } from 'react-chartjs-2';
import './chartSetup.js';
import { BASE_OPTIONS } from './chartSetup.js';

/**
 * Histogram — distribution bar chart (e.g. entries by hour of day).
 * Visually identical to BarChart but semantically distinct —
 * labels represent bins, not categories.
 * Props: labels {string[]}, values {number[]}, title {string}
 */
export default function Histogram({ labels, values, title }) {
  const data = {
    labels,
    datasets: [{
      label:           title || 'Frequency',
      data:            values,
      backgroundColor: 'rgba(108, 99, 255, 0.7)',
      borderColor:     '#6c63ff',
      borderWidth:     1,
      borderRadius:    2,
    }],
  };

  const options = {
    ...BASE_OPTIONS,
    plugins: {
      ...BASE_OPTIONS.plugins,
      legend: { display: false },
    },
  };

  return <Bar data={data} options={options} />;
}
