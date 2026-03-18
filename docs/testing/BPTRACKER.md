# BP Tracker — Test Catalog

**Project:** bptracker
**Path:** `bptracker/`
**Port:** 3002
**Stack:** Node.js + Express + React + Vite + Chart.js

---

## Overview

BP Tracker is a mobile-first blood pressure logging app. Users photograph their BP monitor;
Gemini Vision extracts the readings automatically. Manual entry is also available directly
from the Capture screen. All tests are scoped to the bptracker subproject. Auth is
inherited from `core/` and is not re-tested here.

---

## Test File Locations

```
bptracker/
+-- tests/
|   +-- unit/
|   |   +-- data.test.js                   <- lib/data.js I/O helpers
|   |   +-- readings.controller.test.js    <- readings controller CRUD (15 tests) ✅
+-- client/
    +-- tests/
        +-- e2e/
            +-- capture.spec.js            <- not yet written 🔴
            +-- reports.spec.js            <- not yet written 🔴
```

---

## Unit Tests

### `tests/unit/data.test.js` — `lib/data.js`

| Test | Classification | Status |
|------|---------------|--------|
| readReadings seeds from template when file does not exist | Unit | ✅ |
| readReadings returns parsed array when file exists | Unit | ✅ |
| writeReadings persists data to file | Unit | ✅ |
| filterByUserId returns only matching records for guest | Unit | ✅ |
| filterByUserId returns all records for admin role | Unit | ✅ |
| appendReading adds record and returns updated array | Unit | ✅ |
| updateReading edits matching record by id | Unit | ✅ |
| updateReading returns null when id not found | Unit | ✅ |
| deleteReading removes matching record | Unit | ✅ |
| deleteReading returns false when id not found | Unit | ✅ |
| purgeExpiredImages deletes files older than retention window | Unit | ✅ |
| purgeExpiredImages skips files within retention window | Unit | ✅ |

### `tests/unit/readings.controller.test.js` — `controllers/readings.controller.js`

Added in PR #109.

| Test | Classification | Status |
|------|---------------|--------|
| GET — admin receives all readings including legacy | Integration | ✅ |
| GET — guest receives only their own readings | Integration | ✅ |
| GET — guest does not receive legacy readings without userId | Integration | ✅ |
| DELETE — admin can delete their own reading | Integration | ✅ |
| DELETE — admin can delete a legacy reading without userId | Integration | ✅ |
| DELETE — admin cannot delete another user's reading (403) | Integration | ✅ |
| DELETE — guest can delete their own reading | Integration | ✅ |
| DELETE — guest cannot delete another user's reading (403) | Integration | ✅ |
| DELETE — returns 404 for unknown id | Integration | ✅ |
| PUT — admin can edit their own reading | Integration | ✅ |
| PUT — admin can edit a legacy reading without userId | Integration | ✅ |
| PUT — admin cannot edit another user's reading (403) | Integration | ✅ |
| PUT — guest can edit their own reading | Integration | ✅ |
| PUT — returns 400 when no valid fields provided | Integration | ✅ |
| PUT — returns 404 for unknown id | Integration | ✅ |
| POST — creates a reading with the session userId | Integration | ✅ |
| POST — returns 400 when required fields are missing | Integration | ✅ |
| POST — returns 400 when systolic is not an integer | Integration | ✅ |

---

## Integration Tests

| Test | Classification | Status |
|------|---------------|--------|
| GET /bptracker/api/readings — unauthenticated returns 401/redirect | Integration | 🔴 |
| POST /bptracker/api/extract — unauthenticated returns 401/redirect | Integration | 🔴 |
| POST /bptracker/api/extract — valid image returns extracted values | Integration | 🔴 |
| POST /bptracker/api/extract — Gemini API failure returns extraction_failed | Integration | 🔴 |
| POST /bptracker/api/extract — all-null values returns image_unreadable | Integration | 🔴 |

---

## E2E Tests

### `client/tests/e2e/capture.spec.js` — not yet written

| Test | Classification | Status |
|------|---------------|--------|
| Capture view loads with user name and current date | Smoke | 🔴 |
| Camera button triggers file input | Smoke | 🔴 |
| "Enter manually" button appears on Capture screen | Smoke | 🔴 |
| Tapping "Enter manually" shows ManualEntry form inline | Critical | 🔴 |
| Manual entry form validates and saves, shows success screen | Critical | 🔴 |
| Cancel on manual entry returns to idle Capture screen | Critical | 🔴 |
| After image selected, extracted values appear on preview screen | Critical | 🔴 |
| Save Reading succeeds and shows success screen | Critical | 🔴 |
| Retake returns user to capture view without saving | Critical | 🔴 |
| Manual entry form shown when extraction fails | Critical | 🔴 |

### `client/tests/e2e/reports.spec.js` — not yet written

| Test | Classification | Status |
|------|---------------|--------|
| Reports view loads and summary cards render | Smoke | 🔴 |
| History table shows readings newest first | Smoke | 🔴 |
| Delete reading removes it from history table | Critical | 🔴 |
| Inline notes edit persists after save | Critical | 🔴 |

---

## data-testid Inventory

Full inventory lives in `tests/TESTIDS.md`. BP Tracker testids added so far:

| Component | data-testid | Notes |
|-----------|-------------|-------|
| Capture.jsx | `capture-view` | Outer container, all states |
| Capture.jsx | `capture-greeting` | Idle + manual states |
| Capture.jsx | `capture-datetime` | Idle state only |
| Capture.jsx | `capture-camera-btn` | Idle state only |
| Capture.jsx | `capture-file-input` | Hidden file input |
| Capture.jsx | `capture-manual-btn` | "Enter manually" button, idle state |
| Capture.jsx | `manual-entry-section` | Inline manual form wrapper, manual state |
| Capture.jsx | `recent-readings` | Recent readings table |
| ManualEntry.jsx | `manual-entry` | Form container |
| ManualEntry.jsx | `manual-systolic` | Systolic input |
| ManualEntry.jsx | `manual-diastolic` | Diastolic input |
| ManualEntry.jsx | `manual-heartrate` | Heart rate input |
| ManualEntry.jsx | `manual-save-error` | Save error message |
| ManualEntry.jsx | `manual-cancel-btn` | Secondary button ("Retake" from Preview, "Cancel" from Capture) |
| ManualEntry.jsx | `manual-save-btn` | Primary save button |
| Preview.jsx | `preview-view` | Outer container |
| Preview.jsx | `preview-retake-btn` | Back button |
| Preview.jsx | `preview-image` | Photo thumbnail |
| Preview.jsx | `preview-extracting` | Spinner |
| Preview.jsx | `preview-systolic` | Systolic input |
| Preview.jsx | `preview-diastolic` | Diastolic input |
| Preview.jsx | `preview-heartrate` | Heart rate input |
| Preview.jsx | `preview-notes` | Notes textarea |
| Preview.jsx | `preview-save-btn` | Save button |
| Success.jsx | `success-view` | Outer container |
| Success.jsx | `success-reading-summary` | Saved values display |
| Success.jsx | `success-done-btn` | Done button |
| Success.jsx | `success-reports-btn` | View Reports button |

---

## Coverage Targets

Per `CLAUDE.md` Section 17. Floors to be set after first CI run with coverage.
Aspirational targets:

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
