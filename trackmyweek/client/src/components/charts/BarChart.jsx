import React from 'react';
import { Bar } from 'react-chartjs-2';
import './chartSetup.js';
import { BASE_OPTIONS } from './chartSetup.js';

/**
 * BarChart — vertical bar chart.
 * Props: labels {string[]}, values {number[]}, title {string}, colors {string[]}
 */
export default function BarChart({ labels, values, title, colors }) {
  const defaultColors = labels.map((_, i) => {
    const palette = ['#6c63ff','#2ecc71','#e74c3c','#f39c12','#3498db','#9b59b6','#1abc9c','#e67e22'];
    return palette[i % palette.length];
  });

  const data = {
    labels,
    datasets: [{
      label:           title || 'Count',
      data:            values,
      backgroundColor: colors || defaultColors,
      borderRadius:    4,
      borderSkipped:   false,
    }],
  };

  return <Bar data={data} options={BASE_OPTIONS} />;
}
