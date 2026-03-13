import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import './chartSetup.js';
import { NO_SCALE_OPTIONS } from './chartSetup.js';

/**
 * PieChart — doughnut chart for category breakdowns.
 * Props: labels {string[]}, values {number[]}, colors {string[]}
 */
export default function PieChart({ labels, values, colors }) {
  const defaultColors = [
    '#6c63ff','#2ecc71','#e74c3c','#f39c12',
    '#3498db','#9b59b6','#1abc9c','#e67e22',
  ];

  const data = {
    labels,
    datasets: [{
      data:            values,
      backgroundColor: colors || defaultColors.slice(0, labels.length),
      borderColor:     '#0f1117',
      borderWidth:     2,
      hoverOffset:     6,
    }],
  };

  return <Doughnut data={data} options={NO_SCALE_OPTIONS} />;
}
