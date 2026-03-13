import React from 'react';
import './PivotTable.css';

/**
 * PivotTable — two-dimensional count table.
 *
 * Props:
 *   labels  {string[]}   row labels (groupBy dimension)
 *   values  {number[]}   counts matching each label
 *   title   {string}
 *
 * For now renders a single-dimension table (groupBy × count).
 * A true 2D pivot requires a second groupBy dimension — v2 enhancement.
 */
export default function PivotTable({ labels, values, title }) {
  if (!labels || !labels.length) {
    return <p className="text-muted">No data available.</p>;
  }

  const total = values.reduce((s, v) => s + v, 0);

  return (
    <div className="pivot-table-wrap">
      <table className="pivot-table">
        <thead>
          <tr>
            <th>{title || 'Group'}</th>
            <th>Count</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {labels.map((label, i) => (
            <tr key={label}>
              <td>{label}</td>
              <td>{values[i]}</td>
              <td className="pivot-pct">
                {total > 0 ? ((values[i] / total) * 100).toFixed(1) : 0}%
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td><strong>Total</strong></td>
            <td><strong>{total}</strong></td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
