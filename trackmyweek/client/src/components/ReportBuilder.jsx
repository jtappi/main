import React, { useState, useEffect } from 'react';
import { getReportSchema, createReport, updateReport } from '../api/client';
import TrendChart from './charts/TrendChart';
import BarChart from './charts/BarChart';
import PieChart from './charts/PieChart';
import Histogram from './charts/Histogram';
import PivotTable from './charts/PivotTable';
import './ReportBuilder.css';

const CHART_ICONS = {
  trend:     '📈',
  bar:       '📊',
  line:      '📉',
  pie:       '🦴',
  histogram: '📏',
  pivot:     '🔢',
};

/**
 * ReportBuilder — slide-in panel for creating or editing a custom report.
 *
 * Props:
 *   open        {bool}
 *   onClose     {fn}
 *   onSaved     {fn}    called with saved report object
 *   editReport  {object|null}  if set, pre-fills the form for editing
 */
export default function ReportBuilder({ open, onClose, onSaved, editReport }) {
  const [schema, setSchema]           = useState(null);
  const [step, setStep]               = useState(1);
  const [name, setName]               = useState('');
  const [chartType, setChartType]     = useState('');
  const [measure, setMeasure]         = useState('');
  const [groupBy, setGroupBy]         = useState('');
  const [filterCategories, setFilterCategories] = useState([]);
  const [dateRange, setDateRange]     = useState('7days');
  const [previewData, setPreviewData] = useState(null);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  // Load schema on open
  useEffect(() => {
    if (open) {
      getReportSchema().then(setSchema).catch(() => {});
    }
  }, [open]);

  // Pre-fill when editing
  useEffect(() => {
    if (editReport) {
      setName(editReport.name || '');
      setChartType(editReport.chartType || '');
      setMeasure(editReport.measure || '');
      setGroupBy(editReport.groupBy || '');
      setFilterCategories(editReport.filterCategories || []);
      setDateRange(editReport.dateRange || '7days');
      setStep(1);
    } else {
      resetForm();
    }
  }, [editReport, open]);

  function resetForm() {
    setStep(1); setName(''); setChartType('');
    setMeasure(''); setGroupBy('');
    setFilterCategories([]); setDateRange('7days');
    setPreviewData(null); setError('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  // Build a preview payload from current selections
  function buildPreview() {
    if (!chartType || !measure || !groupBy) return null;
    // Simulate what the server would return for preview purposes
    return { chartType, measure, groupBy, dateRange, filterCategories };
  }

  const canAdvance = [
    true,                           // step 1: chart type
    !!chartType,                    // step 2: measure
    !!chartType && !!measure,       // step 3: groupBy
    !!chartType && !!measure && !!groupBy, // step 4: filter
    !!chartType && !!measure && !!groupBy, // step 5: date range
    !!chartType && !!measure && !!groupBy, // step 6: preview + name
  ];

  async function handleSave() {
    if (!name.trim()) { setError('Please give this report a name.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = { name: name.trim(), chartType, measure, groupBy, filterCategories, dateRange };
      const saved = editReport
        ? await updateReport(editReport.id, payload)
        : await createReport(payload);
      onSaved?.(saved);
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="builder-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="builder-panel" data-testid="report-builder">
        <div className="builder-header">
          <h2 className="builder-title">{editReport ? 'Edit Report' : 'New Report'}</h2>
          <button className="btn btn-ghost" onClick={handleClose}>✕</button>
        </div>

        {/* Step indicators */}
        <div className="builder-steps">
          {[1,2,3,4,5,6].map((s) => (
            <button
              key={s}
              className={`builder-step-dot${
                s === step ? ' builder-step-dot--active' :
                s < step  ? ' builder-step-dot--done' : ''
              }`}
              onClick={() => s < step && setStep(s)}
              disabled={s > step}
            >
              {s < step ? '✓' : s}
            </button>
          ))}
        </div>

        <div className="builder-body">

          {/* Step 1: Chart type */}
          {step === 1 && (
            <div className="builder-step">
              <h3 className="builder-step-title">Choose a chart type</h3>
              <div className="chart-type-grid">
                {schema?.CHART_TYPES?.map((ct) => (
                  <button
                    key={ct.key}
                    className={`chart-type-btn${chartType === ct.key ? ' chart-type-btn--selected' : ''}`}
                    onClick={() => setChartType(ct.key)}
                    data-testid={`chart-type-${ct.key}`}
                  >
                    <span className="chart-type-icon">{CHART_ICONS[ct.key] || '📊'}</span>
                    <span className="chart-type-label">{ct.label}</span>
                    <span className="chart-type-desc">{ct.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Measure */}
          {step === 2 && (
            <div className="builder-step">
              <h3 className="builder-step-title">What do you want to measure?</h3>
              <div className="option-list">
                {schema?.MEASURES?.map((m) => (
                  <button
                    key={m.key}
                    className={`option-btn${measure === m.key ? ' option-btn--selected' : ''}`}
                    onClick={() => setMeasure(m.key)}
                    data-testid={`measure-${m.key}`}
                  >
                    <strong>{m.label}</strong>
                    <span className="text-muted">{m.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Group by */}
          {step === 3 && (
            <div className="builder-step">
              <h3 className="builder-step-title">Group results by</h3>
              <div className="option-list">
                {schema?.GROUP_BY_OPTIONS?.map((g) => (
                  <button
                    key={g.key}
                    className={`option-btn${groupBy === g.key ? ' option-btn--selected' : ''}`}
                    onClick={() => setGroupBy(g.key)}
                    data-testid={`groupby-${g.key}`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Category filter */}
          {step === 4 && (
            <div className="builder-step">
              <h3 className="builder-step-title">Filter by category</h3>
              <p className="text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                Leave all unchecked to include every category.
              </p>
              <div className="option-list">
                {schema?.CATEGORIES?.map((cat) => {
                  const checked = filterCategories.includes(cat.name);
                  return (
                    <label key={cat.name} className="filter-cat-row">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setFilterCategories((prev) =>
                            checked ? prev.filter((c) => c !== cat.name) : [...prev, cat.name]
                          );
                        }}
                      />
                      <span>{cat.icon} {cat.name}</span>
                    </label>
                  );
                }) ?? (
                  <p className="text-muted">Categories will appear here once loaded.</p>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Date range */}
          {step === 5 && (
            <div className="builder-step">
              <h3 className="builder-step-title">Date range</h3>
              <div className="option-list">
                {schema?.DATE_RANGES?.map((dr) => (
                  <button
                    key={dr.key}
                    className={`option-btn${dateRange === dr.key ? ' option-btn--selected' : ''}`}
                    onClick={() => setDateRange(dr.key)}
                    data-testid={`daterange-${dr.key}`}
                  >
                    {dr.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 6: Name + save */}
          {step === 6 && (
            <div className="builder-step">
              <h3 className="builder-step-title">Name your report</h3>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pain by day of week"
                className="builder-name-input"
                data-testid="report-name-input"
                autoFocus
              />
              <div className="builder-summary">
                <p className="text-muted">
                  <strong>{chartType}</strong> chart · {measure} · grouped by {groupBy} · {dateRange}
                  {filterCategories.length > 0 && ` · ${filterCategories.join(', ')}`}
                </p>
              </div>
              {error && <p className="error-msg">{error}</p>}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="builder-footer">
          {step > 1 && (
            <button className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>Back</button>
          )}
          <span style={{ flex: 1 }} />
          {step < 6 ? (
            <button
              className="btn btn-primary"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance[step - 1]}
              data-testid="builder-next"
            >
              Next
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !name.trim()}
              data-testid="builder-save"
            >
              {saving ? 'Saving…' : editReport ? 'Update' : 'Save Report'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
