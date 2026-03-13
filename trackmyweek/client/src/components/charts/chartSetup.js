/**
 * chartSetup.js — registers all Chart.js components once.
 * Import this file in any component that uses react-chartjs-2.
 */
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const BASE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: '#e8eaf0', font: { size: 12 } },
    },
    tooltip: {
      backgroundColor: '#1a1d27',
      borderColor: '#2e3146',
      borderWidth: 1,
      titleColor: '#e8eaf0',
      bodyColor: '#7b7f9e',
    },
  },
  scales: {
    x: {
      ticks: { color: '#7b7f9e' },
      grid:  { color: '#2e3146' },
    },
    y: {
      ticks: { color: '#7b7f9e' },
      grid:  { color: '#2e3146' },
      beginAtZero: true,
    },
  },
};

export const NO_SCALE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: { color: '#e8eaf0', font: { size: 12 }, padding: 16 },
    },
    tooltip: {
      backgroundColor: '#1a1d27',
      borderColor: '#2e3146',
      borderWidth: 1,
      titleColor: '#e8eaf0',
      bodyColor: '#7b7f9e',
    },
  },
};
