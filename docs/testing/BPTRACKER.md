# BP Tracker — Test Catalog

**Project:** bptracker
**Path:** `bptracker/`
**Port:** 3002
**Stack:** Node.js + Express + React + Vite + Chart.js
**Status:** Pre-build (no tests yet)

---

## Overview

BP Tracker is a mobile-first blood pressure logging app. Users photograph their BP monitor;
Claude Vision extracts the readings automatically. All tests are scoped to the bptracker
subproject. Auth is inherited from `core/` and is not re-tested here.

---

## Test File Locations

```
bptracker/
+-- tests/
|   +-- unit/
|   |   +-- data.test.js             <- lib/data.js I/O helpers
|   |   +-- extract.test.js          <- Claude Vision response parsing + validation
|   |   +-- readings.test.js         <- readings controller CRUD logic
|   +-- integration/
|       +-- readings.api.test.js     <- all readings API routes
|       +-- extract.api.test.js      <- POST /extract with mocked Claude
+-- client/
    +-- tests/
        +-- e2e/
            +-- global-setup.js
            +-- global-teardown.js
            +-- capture.spec.js
            +-- reports.spec.js
```

---

## Unit Tests

### `tests/unit/data.test.js` — `lib/data.js`

| Test | Classification | Status |
|------|---------------|--------|
| readReadings returns empty array when file does not exist | Unit | 🔴 |
| readReadings returns parsed array when file exists | Unit | 🔴 |
| writeReadings persists data to file | Unit | 🔴 |
| filterByUserId returns only matching records | Unit | 🔴 |
| filterByUserId returns all records for admin role | Unit | 🔴 |
| appendReading adds record and returns updated array | Unit | 🔴 |
| updateReading edits matching record by id | Unit | 🔴 |
| updateReading returns null when id not found | Unit | 🔴 |
| deleteReading removes matching record | Unit | 🔴 |
| deleteReading returns false when id not found | Unit | 🔴 |

### `tests/unit/extract.test.js` — `controllers/extract.controller.js`

| Test | Classification | Status |
|------|---------------|--------|
| parseClaudeResponse returns structured object for valid JSON | Unit | 🔴 |
| parseClaudeResponse returns extraction_failed for unparseable output | Unit | 🔴 |
| validateRanges passes all values within plausible range | Unit | 🔴 |
| validateRanges overrides confidence to low for out-of-range systolic | Unit | 🔴 |
| validateRanges overrides confidence to low for out-of-range diastolic | Unit | 🔴 |
| validateRanges overrides confidence to low for out-of-range heart rate | Unit | 🔴 |
| validateRanges handles null values without throwing | Unit | 🔴 |
| all-null response returns image_unreadable error state | Unit | 🔴 |

### `tests/unit/readings.test.js` — `controllers/readings.controller.js`

| Test | Classification | Status |
|------|---------------|--------|
| getReadings returns scoped readings for guest | Unit | 🔴 |
| getReadings returns all readings for admin | Unit | 🔴 |
| createReading saves record with correct userId and timestamp | Unit | 🔴 |
| createReading rejects missing required fields | Unit | 🔴 |
| updateReading allows owner to edit notes | Unit | 🔴 |
| updateReading rejects edit by non-owner guest | Unit | 🔴 |
| deleteReading removes record for owner | Unit | 🔴 |
| deleteReading rejects deletion by non-owner guest | Unit | 🔴 |

---

## Integration Tests

### `tests/integration/readings.api.test.js`

| Test | Classification | Status |
|------|---------------|--------|
| GET /bptracker/api/readings — unauthenticated returns 401 | Integration | 🔴 |
| GET /bptracker/api/readings — guest returns own readings only | Integration | 🔴 |
| GET /bptracker/api/readings — admin returns all readings | Integration | 🔴 |
| POST /bptracker/api/readings — saves reading and returns 201 | Integration | 🔴 |
| POST /bptracker/api/readings — rejects invalid payload with 400 | Integration | 🔴 |
| PUT /bptracker/api/readings/:id — owner can update notes | Integration | 🔴 |
| PUT /bptracker/api/readings/:id — non-owner returns 403 | Integration | 🔴 |
| DELETE /bptracker/api/readings/:id — owner can delete | Integration | 🔴 |
| DELETE /bptracker/api/readings/:id — non-owner returns 403 | Integration | 🔴 |

### `tests/integration/extract.api.test.js`

| Test | Classification | Status |
|------|---------------|--------|
| POST /bptracker/api/extract — unauthenticated returns 401 | Integration | 🔴 |
| POST /bptracker/api/extract — valid image returns extracted values | Integration | 🔴 |
| POST /bptracker/api/extract — Claude returns low confidence, propagated to client | Integration | 🔴 |
| POST /bptracker/api/extract — Claude API failure returns extraction_failed | Integration | 🔴 |
| POST /bptracker/api/extract — all-null values returns image_unreadable | Integration | 🔴 |
| POST /bptracker/api/extract — out-of-range values override confidence to low | Integration | 🔴 |

---

## E2E Tests

### `client/tests/e2e/capture.spec.js`

| Test | Classification | Status |
|------|---------------|--------|
| Capture view loads with user name and current date | Smoke | 🔴 |
| Camera button triggers file input | Smoke | 🔴 |
| After image selected, extracted values appear on preview screen | Critical | 🔴 |
| Low confidence warning shown when confidence = low | Critical | 🔴 |
| Extracted values are editable before saving | Critical | 🔴 |
| Save Reading succeeds and shows success screen | Critical | 🔴 |
| Success screen auto-dismisses after 3 seconds | Smoke | 🔴 |
| Retake returns user to capture view without saving | Critical | 🔴 |
| Manual entry form shown when extraction fails | Critical | 🔴 |

### `client/tests/e2e/reports.spec.js`

| Test | Classification | Status |
|------|---------------|--------|
| Reports view loads and summary cards render | Smoke | 🔴 |
| Trend chart renders with correct data lines | Critical | 🔴 |
| Date range selector updates chart and table | Critical | 🔴 |
| History table shows readings newest first | Smoke | 🔴 |
| Delete reading removes it from history table | Critical | 🔴 |
| Inline notes edit persists after save | Critical | 🔴 |

---

## data-testid Inventory

To be populated in `tests/TESTIDS.md` as components are built in Phase 4+.

Expected testids (not yet implemented):

| Component | data-testid | Notes |
|-----------|-------------|-------|
| Capture.jsx | `capture-greeting` | User name + date display |
| Capture.jsx | `capture-camera-btn` | Primary camera trigger button |
| Capture.jsx | `capture-last-reading` | Last reading summary |
| Preview.jsx | `preview-image` | Image preview element |
| Preview.jsx | `preview-systolic` | Editable systolic input |
| Preview.jsx | `preview-diastolic` | Editable diastolic input |
| Preview.jsx | `preview-heartrate` | Editable heart rate input |
| Preview.jsx | `preview-confidence-warning` | Low confidence warning banner |
| Preview.jsx | `preview-notes` | Optional notes input |
| Preview.jsx | `preview-retake-btn` | Retake button |
| Preview.jsx | `preview-save-btn` | Save Reading button |
| Success.jsx | `success-message` | Confirmation message |
| Success.jsx | `success-reading-summary` | Saved values display |
| Success.jsx | `success-done-btn` | Done button |
| Success.jsx | `success-reports-btn` | View Reports button |
| ManualEntry.jsx | `manual-systolic` | Manual systolic input |
| ManualEntry.jsx | `manual-diastolic` | Manual diastolic input |
| ManualEntry.jsx | `manual-heartrate` | Manual heart rate input |
| Reports.jsx | `reports-summary-cards` | Summary cards container |
| Reports.jsx | `reports-trend-chart` | Chart.js canvas |
| Reports.jsx | `reports-date-range` | Date range selector |
| Reports.jsx | `reports-history-table` | History table |
| BottomNav.jsx | `nav-capture-btn` | Capture tab |
| BottomNav.jsx | `nav-reports-btn` | Reports tab |

---

## Coverage Targets

Per `CLAUDE.md` Section 17 and `bptracker/SPEC.md` Section 13.

Floors to be set after first test run. Aspirational targets:

| Metric | Target |
|--------|--------|
| Branches | 100% |
| Functions | 100% |
| Lines | 90% |

---

## Rules for This Catalog

1. Every PR that adds a new test must update this file in the same PR.
2. Every `🔴` entry must remain until the test is written — do not delete backlog items.
3. When a test is added, change `🔴` to `✅` in the same commit as the test file.
4. New `data-testid` values must be added to both this file and `tests/TESTIDS.md` in the same commit as the component.
