import React, { useState } from 'react';

const RANGES = {
  systolic:  { min: 60,  max: 250 },
  diastolic: { min: 40,  max: 150 },
  heartRate: { min: 30,  max: 200 },
};

/**
 * ManualEntry — fallback form shown when Claude Vision extraction fails.
 *
 * Validates that each entered value is an integer within plausible range.
 * Calls onSave({ systolic, diastolic, heartRate }) with parsed integers.
 */
export default function ManualEntry({ onSave, onRetake, saving, saveError }) {
  const [systolic,  setSystolic]  = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [errors,    setErrors]    = useState({});

  function validate() {
    const errs = {};
    const fields = { systolic, diastolic, heartRate };
    for (const [field, raw] of Object.entries(fields)) {
      if (raw === '') {
        errs[field] = 'Required';
        continue;
      }
      const val = parseInt(raw, 10);
      if (isNaN(val) || String(val) !== raw.trim()) {
        errs[field] = 'Must be a whole number';
        continue;
      }
      const { min, max } = RANGES[field];
      if (val < min || val > max) {
        errs[field] = `Must be between ${min} and ${max}`;
      }
    }
    return errs;
  }

  function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    onSave({
      systolic:  parseInt(systolic,  10),
      diastolic: parseInt(diastolic, 10),
      heartRate: parseInt(heartRate, 10),
    });
  }

  return (
    <div className="manual-entry" data-testid="manual-entry">
      <div className="preview-fields">
        <div className="preview-field">
          <label className="preview-field-label" htmlFor="manual-systolic">Systolic</label>
          <input
            id="manual-systolic"
            className={`preview-field-input${errors.systolic ? ' input-error' : ''}`}
            type="number"
            inputMode="numeric"
            value={systolic}
            onChange={(e) => setSystolic(e.target.value)}
            data-testid="manual-systolic"
          />
          {errors.systolic && <p className="field-error">{errors.systolic}</p>}
        </div>
        <div className="preview-field">
          <label className="preview-field-label" htmlFor="manual-diastolic">Diastolic</label>
          <input
            id="manual-diastolic"
            className={`preview-field-input${errors.diastolic ? ' input-error' : ''}`}
            type="number"
            inputMode="numeric"
            value={diastolic}
            onChange={(e) => setDiastolic(e.target.value)}
            data-testid="manual-diastolic"
          />
          {errors.diastolic && <p className="field-error">{errors.diastolic}</p>}
        </div>
        <div className="preview-field">
          <label className="preview-field-label" htmlFor="manual-heartrate">Heart Rate</label>
          <input
            id="manual-heartrate"
            className={`preview-field-input${errors.heartRate ? ' input-error' : ''}`}
            type="number"
            inputMode="numeric"
            value={heartRate}
            onChange={(e) => setHeartRate(e.target.value)}
            data-testid="manual-heartrate"
          />
          {errors.heartRate && <p className="field-error">{errors.heartRate}</p>}
        </div>
      </div>

      {saveError && (
        <div className="preview-save-error" data-testid="manual-save-error">
          {saveError}
        </div>
      )}

      <div className="preview-actions">
        <button
          className="btn-secondary"
          onClick={onRetake}
          disabled={saving}
          data-testid="manual-retake-btn"
        >
          Retake
        </button>
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
          data-testid="manual-save-btn"
        >
          {saving ? 'Saving…' : 'Save Reading'}
        </button>
      </div>
    </div>
  );
}
