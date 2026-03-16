# BP Tracker — Subproject Specification

**Version:** 1.0
**Date:** 2026-03-16
**Status:** APPROVED

---

## 1. Vision

A mobile-first, single-purpose personal health app that eliminates the friction of manual blood pressure logging. The user taps one button, photographs their BP monitor, and walks away — the image is analyzed by Claude Vision, the readings are extracted automatically, and the record is timestamped and saved. Over time, the data becomes a shareable, visual health history patients can bring to any healthcare provider visit.

---

## 2. Core Principles

- **Zero manual data entry.** The camera is the input. Claude Vision does the reading.
- **Tap → shoot → done.** The entire capture flow must be completable in under 10 seconds.
- **Mobile-first, always.** Every screen is designed for a phone in one hand.
- **Your data, clearly presented.** Reports are pre-built and always ready — no configuration required.
- **Shareable.** The reporting dashboard is designed to be shown to a healthcare provider as-is.
- **Spec Driven.** No code is written until the spec for that phase is approved.

---

## 3. Technology Stack

| Component | Technology |
|-----------|------------|
| Server | Node.js + Express, port 3002 |
| Auth | `requireAuth` from `core/auth/middleware` (portal SSO, inherited) |
| Storage | Local JSON files (gitignored) — migrate to MongoDB in a later phase |
| Frontend | React + Vite |
| Image Analysis | Anthropic Claude Vision API (`claude-sonnet-4-20250514`) |
| Charts | Chart.js |
| Styling | Plain CSS, light theme matching portal |

---

## 4. URL & Port

| Item | Value |
|------|-------|
| Subpath | `/bptracker` |
| Port | `3002` |
| Full URL | `trackmyweek.com/bptracker` |
| Folder | `bptracker/` at monorepo root |
| CI slug | `bptracker` |

---

## 5. Who Uses This App

| Role | Access |
|------|--------|
| Admin | Full access — all readings, all users' readings, all reports |
| Guest | Own readings only — capture, view history, view own reports |

Each guest's readings are scoped by their `userId` from `core/data/users.json`. Access to the app is gated by `projectAccess` on the user record, exactly as every other subproject. No guest can read or write another user's data.

---

## 6. Data Model

### `bptracker/data/readings.json`
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "systolic": 122,
    "diastolic": 78,
    "heartRate": 64,
    "timestamp": "2026-03-16T08:45:00",
    "imageRef": "readings/2026-03-16T08-45-00-userId.jpg",
    "extractionConfidence": "high | low | manual",
    "notes": "string | null",
    "createdAt": "ISO timestamp"
  }
]
```

**Field notes:**
- `userId` — links to `core/data/users.json`; all queries are always scoped by this
- `systolic` / `diastolic` / `heartRate` — integers extracted by Claude Vision; null if extraction failed
- `timestamp` — set at the moment the photo is taken on the client (device local time, stored as ISO 8601)
- `imageRef` — relative path under `bptracker/data/images/`; null if image was not saved
- `extractionConfidence` — `high` = all three values cleanly extracted; `low` = one or more uncertain; `manual` = user edited values before saving
- `notes` — optional free-text the user can add or edit after capture

### `bptracker/data/readings.template.json`
```json
[]
```

### Image Retention Policy

Images stored in `bptracker/data/images/` are retained for **90 days** from the reading's `createdAt` timestamp. A scheduled cleanup job (to be implemented in Phase 2) scans the images directory on server startup and deletes any image whose corresponding reading is older than 90 days. The `imageRef` field on the reading is set to `null` after the image is deleted — the reading record itself is kept permanently.

---

## 7. API Specification

All routes require `requireAuth`. Readings are always scoped to `req.session.user.id` unless the caller is Admin.

### Readings Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/bptracker/api/readings` | All readings for current user (Admin gets all users') | Auth |
| `POST` | `/bptracker/api/readings` | Save a new reading | Auth |
| `PUT` | `/bptracker/api/readings/:id` | Edit notes or correct extracted values | Auth (own only) |
| `DELETE` | `/bptracker/api/readings/:id` | Delete a reading | Auth (own only) |

### Image Extraction Route

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/bptracker/api/extract` | Accept base64 image, call Claude Vision, return extracted values | Auth |

The `/extract` endpoint never saves data — it only returns the extracted values. Saving is a separate explicit `POST /readings` call. This keeps capture and persistence cleanly separated and allows the user to review and correct before committing.

### Static & App Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/bptracker` | Serves React app shell |
| `GET` | `/bptracker/*` | React client-side routing catch-all |

---

## 8. Claude Vision — Extraction Specification

**Model:** `claude-sonnet-4-20250514`

**Server-side prompt (never exposed to client):**
```
You are a medical data extraction assistant. You will be given an image of a blood pressure monitor display.

Extract exactly these three values:
1. Systolic pressure (the top/larger number, mmHg)
2. Diastolic pressure (the bottom/smaller number, mmHg)
3. Heart rate / pulse (beats per minute)

Respond ONLY with a JSON object in this exact format, nothing else:
{
  "systolic": <integer or null>,
  "diastolic": <integer or null>,
  "heartRate": <integer or null>,
  "confidence": "high" | "low"
}

Use "high" confidence when all three values are clearly readable.
Use "low" confidence when the image is blurry, partially obscured, or any value is uncertain.
Use null for any individual value you cannot read with confidence.
```

**Server-side validation after extraction:**
- All three values must be integers or null
- Systolic: plausible range 60–250
- Diastolic: plausible range 40–150
- Heart rate: plausible range 30–200
- If any value is outside plausible range, override `confidence` to `low` regardless of model response
- The raw Claude response is never forwarded to the client — only the validated, structured result

**Error states returned to client:**
- `extraction_failed` — Claude returned unparseable output
- `low_confidence` — returned with values so user can review before saving
- `image_unreadable` — all three values came back null

---

## 9. UI Specification

### 9.1 Main Screen (`/bptracker`)

The entire app lives on one page with two views toggled by a bottom nav: **Capture** (default) and **Reports**.

**Capture view layout:**

```
+-----------------------------+
|  Good morning, [First Name] |
|  Mon 03/16/26  8:45 am      |
|                             |
|   +---------------------+   |
|   |                     |   |
|   |  [Camera Button]    |   |
|   |  Take Reading       |   |
|   |                     |   |
|   +---------------------+   |
|                             |
|   Last reading: 03/15/26    |
|   122 / 78  Heart 64        |
|                             |
+-----------------------------+
|  [Capture]     [Reports]    |
+-----------------------------+
```

- User's **first name only** at top
- Current date/time in `MM/DD/YY h:mm am/pm` format, live-updating
- Large, thumb-friendly camera button — primary CTA
- Most recent reading summary below the button
- Bottom nav: Capture | Reports

### 9.2 Capture Flow

**Step 1 — Camera trigger**

On button tap, open the device camera using `<input type="file" accept="image/*" capture="environment">`. No third-party camera library. This is the native mobile camera trigger — works on iOS Safari and Android Chrome without permissions prompts beyond the first use.

**Step 2 — Preview + extraction screen**

Shown immediately after photo is taken. Claude Vision call begins immediately in the background.

```
+-----------------------------+
|  <- Back                    |
|                             |
|  [Image Preview]            |
|                             |
|  Extracting readings...     |
|  [spinner]                  |
+-----------------------------+
```

Once extraction completes:

```
+-----------------------------+
|  <- Back                    |
|                             |
|  [Image Preview]            |
|                             |
|  Systolic:    [122]         |
|  Diastolic:   [ 78]         |
|  Heart Rate:  [ 64]         |
|                             |
|  ! Low confidence -- please |
|    verify before saving     |  <- shown only if confidence = low
|                             |
|  Notes: [optional text]     |
|                             |
|  [Retake]   [Save Reading]  |
+-----------------------------+
```

- All three extracted values are **editable inline** before saving — any edit sets `extractionConfidence` to `manual`
- Low confidence warning is shown if `confidence = low`; user must correct or explicitly proceed
- Retake discards the image and returns to the camera
- Save Reading calls `POST /bptracker/api/readings` with the final values

**Step 3 — Success screen**

```
+-----------------------------+
|                             |
|          [checkmark]        |
|   Reading saved!            |
|                             |
|   122 / 78  Heart 64        |
|   Mon 03/16/26  8:45 am     |
|                             |
|   [Done]   [View Reports]   |
|                             |
+-----------------------------+
```

Auto-dismisses to Capture screen after 3 seconds, or user taps Done.

### 9.3 Reports View

Three sections, displayed vertically, scrollable on mobile.

**Section A — Summary Cards**

Three cards displayed in a row:
- 30-day average (systolic / diastolic / heart rate)
- 30-day median (systolic / diastolic / heart rate)
- 7-day average (systolic / diastolic / heart rate)

**Section B — Trend Chart**

- Line chart with three lines: Systolic (red), Diastolic (blue), Heart Rate (green)
- X-axis: date; Y-axis: value
- Date range selector: Last 7 days | 30 days | 90 days | All time
- Chart.js, responsive, renders cleanly at mobile width

**Section C — Reading History Table**

- Newest first
- Columns: Date/Time | Systolic | Diastolic | Heart Rate | Notes
- Each row has a delete button (confirmation required) and inline edit for notes
- Date range filter matches the trend chart selector
- Compact layout on mobile

---

## 10. Error Handling

| Scenario | Behavior |
|----------|---------|
| Camera permission denied | Show: "Camera access is required. Please allow camera access in your browser settings." |
| Image unreadable / all null | Show: "Could not read the monitor display. Please retake in better light." with Retake button |
| Claude API call fails | Show: "Extraction service unavailable. You can enter readings manually." — reveals manual entry form |
| Network error on save | Show error toast; keep user on preview screen so data is not lost |
| Unauthenticated | `requireAuth` redirects to `/login?returnTo=/bptracker` |

**Manual entry fallback form** (shown when extraction fails):
- Three number inputs: Systolic, Diastolic, Heart Rate
- Same Save/Cancel flow as the normal preview screen
- Reading saved with `extractionConfidence: "manual"`

---

## 11. Security Requirements

All requirements from `CLAUDE.md` Section 0.6 apply. Additionally:

- Images sent to `/bptracker/api/extract` are processed in memory — never written to disk until the user confirms the save
- Saved images stored in `bptracker/data/images/` (gitignored), named `<timestamp>-<userId>.jpg`
- All reading queries scoped by `userId` — a guest can never read or write another user's readings
- `ANTHROPIC_API_KEY` stored in `.env` — never hardcoded, never logged, never returned in any API response
- Image files are not served as static files — they are read by the server only when the requesting user owns the reading
- `imageRef` storage path is never exposed in any API response

---

## 12. File Structure

```
bptracker/
+-- SPEC.md                          <- this file
+-- server.js                        <- Express app, all routes, PREFIX = /bptracker
+-- package.json                     <- server deps (express, uuid, @anthropic-ai/sdk)
+-- package-lock.json                <- committed
+-- .gitignore                       <- covers data/*.json, data/images/
+-- controllers/
|   +-- readings.controller.js       <- CRUD for readings
|   +-- extract.controller.js        <- Claude Vision call + validation
+-- lib/
|   +-- data.js                      <- all file I/O; controllers never touch fs directly
+-- data/
|   +-- readings.json                <- gitignored, runtime
|   +-- readings.template.json       <- committed, empty array
|   +-- images/                      <- gitignored, uploaded images (90-day retention)
+-- tests/
|   +-- unit/
|   |   +-- data.test.js             <- lib/data.js I/O helpers
|   |   +-- extract.test.js          <- Claude response parsing + range validation
|   |   +-- readings.test.js         <- readings controller logic
|   +-- integration/
|       +-- readings.api.test.js     <- all readings routes, auth + scoping
|       +-- extract.api.test.js      <- POST /extract with mocked Claude
+-- client/
    +-- index.html
    +-- vite.config.js
    +-- package.json                 <- React, Vite, Chart.js (no @playwright/test)
    +-- package-lock.json            <- committed
    +-- playwright.config.js         <- local dev E2E config
    +-- playwright.ci.config.js      <- CI E2E config (no webServer block)
    +-- src/
    |   +-- main.jsx
    |   +-- App.jsx
    |   +-- pages/
    |   |   +-- Capture.jsx          <- main capture view
    |   |   +-- Preview.jsx          <- image preview + extracted values
    |   |   +-- Success.jsx          <- save confirmation
    |   |   +-- Reports.jsx          <- reports view
    |   +-- components/
    |   |   +-- BottomNav.jsx
    |   |   +-- SummaryCards.jsx
    |   |   +-- TrendChart.jsx
    |   |   +-- HistoryTable.jsx
    |   |   +-- ManualEntry.jsx      <- fallback when extraction fails
    |   +-- api/
    |       +-- client.js            <- all fetch calls to the Express API
    +-- tests/
        +-- e2e/
            +-- global-setup.js
            +-- global-teardown.js
            +-- capture.spec.js
            +-- reports.spec.js
```

---

## 13. Testing Strategy

Inherits the three-tier model from `CLAUDE.md` exactly.

### Unit Tests (`bptracker/tests/unit/`)

| File | What it covers |
|------|----------------|
| `data.test.js` | All `lib/data.js` I/O helpers — read, write, append, filter by userId |
| `extract.test.js` | Claude response parsing, range validation, confidence override logic |
| `readings.test.js` | CRUD logic in `readings.controller.js` — happy path + all error branches |

### Integration Tests (`bptracker/tests/integration/`)

| File | What it covers |
|------|----------------|
| `readings.api.test.js` | All four readings routes — auth enforcement, userId scoping, response shape |
| `extract.api.test.js` | `POST /extract` — mocked Claude response, validates server-side parsing and error states |

### E2E Tests (`bptracker/client/tests/e2e/`)

| Spec | What it covers |
|------|----------------|
| `capture.spec.js` | Full capture flow with mocked image input; confirm extracted values appear; save succeeds |
| `reports.spec.js` | Reports view loads with data; trend chart renders; date range selector updates data |

**Excluded from E2E (lower-level tests):**
- Camera permission dialogs (browser-controlled)
- Client-side form validation on manual entry inputs
- Spinner visibility during extraction (timing-sensitive)

### Coverage Targets

Per `CLAUDE.md` Section 17:
1. Run `npm run test:coverage` after first tests are written; record actual numbers
2. Set `coverageThreshold` in `bptracker/package.json` at those measured numbers
3. Add `coverage-bptracker` artifact upload to `ci.yml` (Phase 7)
4. Document floors in `docs/TODO.md`

Aspiational targets: 100% branches, 100% functions, 90% lines.

---

## 14. CI Integration

Three additions required to `.github/workflows/ci.yml` in Phase 7:

1. Jest step: `cd bptracker && npm test -- --ci --forceExit --json --outputFile=/tmp/bptracker-jest-results.json`
2. Log step: `node scripts/log-test-run.js /tmp/bptracker-jest-results.json --project=bptracker`
3. Coverage step: `cd bptracker && npm run test:coverage -- --ci --forceExit`
4. Coverage artifact upload: `coverage-bptracker`, retained 14 days

The test dashboard auto-discovers `bptracker` from log data — no dashboard code changes needed.

---

## 15. Deployment

- Port `3002` reserved in Nginx config and root `SPEC.md` port table
- `bptracker/data/readings.json` seeded from template on first deploy only (safe copy pattern per `CLAUDE.md` Section 13)
- `bptracker/data/images/` directory created on first deploy if it does not exist
- PM2 starts `bptracker/server.js` as process named `bptracker`
- `core/data/projects.json` entry added when server is running (Phase 2)

**First-deploy commands:**
```bash
[ -f bptracker/data/readings.json ] || cp bptracker/data/readings.template.json bptracker/data/readings.json
mkdir -p bptracker/data/images
pm2 start bptracker/server.js --name bptracker
```

---

## 16. Build Order (Spec Driven)

Each phase proposed, approved, then built. No skipping.

| Phase | What Gets Built |
|-------|----------------|
| **1** | Data layer — `lib/data.js`, template files, schema constants, image cleanup job |
| **2** | Server + controllers — all Express routes, auth middleware, `/bptracker` prefix, `extract.controller.js` with Claude Vision integration |
| **3** | Client scaffold — Vite + React setup, routing, `BottomNav`, API client |
| **4** | Capture UI — `Capture.jsx`, camera trigger, `Preview.jsx` with extraction display + inline edit, `Success.jsx`, `ManualEntry.jsx` fallback |
| **5** | Reports UI — `Reports.jsx`, `SummaryCards.jsx`, `TrendChart.jsx`, `HistoryTable.jsx` with inline notes edit + delete |
| **6** | Tests — all Jest unit + integration; Playwright E2E for capture and reports flows |
| **7** | CI integration — ci.yml additions, coverage thresholds, dashboard validation |

---

## 17. Documentation Checklist (before Phase 1 PR)

- [x] `bptracker/SPEC.md` committed (this file)
- [x] `docs/testing/BPTRACKER.md` created
- [x] `docs/testing/README.md` updated with bptracker row
- [x] Port `3002` added to root `SPEC.md` port table
- [ ] `core/data/projects.json` entry added (Phase 2, when server is running)
- [ ] `tests/TESTIDS.md` entries added as components are built (Phase 4+)

---

## 18. Session Startup Instructions (for Claude)

At the start of every new session working on this app:

1. Read `CLAUDE.md` at repo root
2. Read this file (`bptracker/SPEC.md`)
3. Read any files relevant to the current phase before writing code
4. Ask the human which build phase we are working on
5. Propose the phase plan and wait for approval before writing any code
