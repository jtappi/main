# TrackMyWeek — Rebuild Spec v2

## What It Is

A personal daily life logger. Log events fast throughout the day. Explore your data
on your own terms — with a guided report builder you design and save permanently.

This is a private, single-user app. Auth is handled entirely by the portal (SSO).
TrackMyWeek has no login screen of its own.

---

## Core Principles

- **Log fast.** Minimum friction. Text + category + optional note. Done.
- **Your data, your view.** No fixed reports. You build what you want to see.
- **Your categories.** Add, rename, remove at any time.
- **Permanent.** Everything — entries, categories, saved reports — lives on the server.
- **Mobile-first logging.** The quick-entry sidebar is the primary view on mobile.
- **Spec Driven.** No code is written until the spec for that phase is approved.

---

## Data Models

### Entry
```json
{
  "id": 1,
  "text": "Took ibuprofen",
  "category": "Medications",
  "notes": "600mg, after lunch",
  "timestamp": "2026-03-10T13:30:00"
}
```

**Fields:**
- `id` — auto-incrementing integer
- `text` — required, free text, what happened
- `category` — required, must match an existing category name
- `notes` — optional, free text
- `timestamp` — auto-set at submission (EST). All derived values (day of week, month,
  time of day, week number, etc.) are computed from this at read time — never stored.

### Category
```json
{
  "id": 1,
  "name": "Medications",
  "icon": "💊",
  "color": "#4a90d9",
  "createdAt": "2026-03-10T09:00:00"
}
```

**Fields:**
- `id` — auto-incrementing integer
- `name` — required, unique
- `icon` — emoji, optional
- `color` — hex color, used in all charts
- `createdAt` — auto-set at creation

**Default categories (shipped, user can modify):**
Food, Medications, Health, Mood, Money, Tasks, Exercise, Hygiene

### SavedReport
```json
{
  "id": 1,
  "name": "Pain by day of week",
  "chartType": "bar",
  "measure": "count",
  "groupBy": "dayOfWeek",
  "filterCategories": ["Health"],
  "dateRange": "30days",
  "createdAt": "2026-03-10T09:00:00",
  "updatedAt": "2026-03-10T09:00:00"
}
```

**Fields:**
- `chartType` — one of: `bar`, `line`, `pie`, `trend`, `histogram`, `pivot`
- `measure` — `count` (number of entries) or `frequencyPerDay` (average per day)
- `groupBy` — `category`, `dayOfWeek`, `timeOfDay`, `month`, `week`
- `filterCategories` — array of category names to include (empty array = all)
- `dateRange` — `today`, `7days`, `30days`, `90days`, `alltime`

### Question
```json
{
  "id": 1710061200000,
  "question": "Why do I feel worse on Mondays?",
  "answer": null,
  "createdAt": "2026-03-10T09:00:00",
  "answeredAt": null
}
```

---

## Features

### 1. Log Entry (main screen)

**Desktop:**
- Text input with autocomplete (triggers at 3+ characters, pulls from entry history, max 3 suggestions)
- Category selector — your categories displayed as buttons with icon + name
- Optional notes field
- Submit button — disabled until text + category are both selected
- Success feedback on submit, form resets
- Sidebar: top 5 quick-entry buttons (most frequent recent items, one click to re-log)

**Mobile:**
- The quick-entry sidebar buttons are the **primary view** — prominent, easy to tap
- Full log form is accessible but secondary
- Optimized for one-handed, fast logging

### 2. View Data
- Chronological list of all entries, newest first
- Filter by category, keyword, date range
- Inline edit — **every field is editable**: text, category (dropdown of your categories),
  notes, timestamp
- Delete with confirmation
- Day view: all entries for a selected date, plotted by time of day, colored by category

### 3. Report Builder

**Pre-built reports (always available, pinned, cannot be deleted):**

1. **Entries Over Time** — trend/line chart of all entries plotted by day.
   Default time period: last 7 days.
   Selectable: today / 7 days / 30 days / 90 days / all time.

2. **Category Breakdown** — pie chart of entry count per category.
   Default time period: last 7 days.
   Selectable: today / 7 days / 30 days / 90 days / all time.

Both pre-built reports update live from current data and are always pinned at
the top of the report dashboard. Their time period selector is configurable but
the cards themselves cannot be deleted or reordered.

**Custom report builder (guided step-by-step flow):**
1. Pick a chart type: Bar, Line, Pie, Trend, Histogram, Pivot Table
2. Pick what to measure: count of entries, frequency per day
3. Pick what to group/pivot by: category, day of week, time of day, month, week
4. Optionally filter by one or more categories
5. Pick date range
6. Live preview updates as you configure each step
7. Name it and save

**Report dashboard:**
- Pre-built reports pinned at top
- Custom saved reports below, reorderable, editable, deletable
- All reports render live from current data on every load

**Chart types:**
- `bar` — grouped or stacked bar chart
- `line` — line chart over time
- `pie` — proportional breakdown
- `trend` — time series, entries plotted by day with a smoothed trend line
- `histogram` — distribution (e.g. entries by hour of day, entries by day of week)
- `pivot` — two-dimensional table (e.g. category × day of week, with counts)

### 4. Category Manager
- View all categories: icon, color, name, total entry count
- Add new category: name + icon (emoji picker) + color picker
- Rename a category — cascades automatically to all existing entries
- Remove a category — blocked if entries exist unless user confirms and selects
  a category to reassign those entries to

### 5. Questions
- Add a question (something you want to investigate in your data)
- List all questions, unanswered first
- Click a question to expand and write/edit the answer
- Answered questions show answered date
- Delete a question

---

## Tech Stack

- **Server:** Node.js + Express, mounted at `/trackmyweek`, port 3001
- **Auth:** `requireAuth` from `core/auth/middleware` — portal session cookie is shared
- **Storage:** Local JSON files (gitignored) — migrated to MongoDB in a later phase
- **Frontend:** React + Vite, Chart.js for all visualizations
- **Build output:** Vite builds to `trackmyweek/client/dist/`, served as static files by Express
- **No separate CSS framework.** Style with Tailwind via Vite or plain CSS — decided in Phase 3.

---

## File Structure (target)

```
trackmyweek/
├── SPEC.md                          ← this file
├── server.js                        ← Express app, all routes, PREFIX = /trackmyweek
├── package.json                     ← server dependencies
├── lib/
│   └── data.js                      ← all file I/O helpers; routes never touch fs directly
├── controllers/
│   ├── entries.controller.js
│   ├── categories.controller.js
│   ├── reports.controller.js
│   └── questions.controller.js
├── data/
│   ├── data.json                    ← gitignored, runtime
│   ├── categories.json              ← gitignored, runtime
│   ├── reports.json                 ← gitignored, runtime
│   ├── questions.json               ← gitignored, runtime
│   ├── data.template.json           ← committed, empty array
│   ├── categories.template.json     ← committed, default 8 categories
│   ├── reports.template.json        ← committed, empty array
│   └── questions.template.json      ← committed, empty array
└── client/                          ← React + Vite frontend
    ├── index.html
    ├── vite.config.js
    ├── package.json                 ← client dependencies (React, Vite, Chart.js)
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── pages/
        │   ├── LogEntry.jsx
        │   ├── ViewData.jsx
        │   ├── Reports.jsx
        │   ├── Categories.jsx
        │   └── Questions.jsx
        ├── components/
        │   ├── Navigation.jsx
        │   ├── QuickEntry.jsx
        │   ├── EntryForm.jsx
        │   ├── ReportCard.jsx
        │   ├── ReportBuilder.jsx
        │   └── charts/
        │       ├── TrendChart.jsx
        │       ├── BarChart.jsx
        │       ├── PieChart.jsx
        │       ├── Histogram.jsx
        │       └── PivotTable.jsx
        └── api/
            └── client.js            ← all fetch calls to the Express API
```

---

## Build Order (Spec Driven)

Each phase is proposed, approved by the human, then built. No skipping ahead.

1. **Data layer** — template files, `lib/data.js` I/O helpers, schema constants
2. **Server** — all Express routes + controllers, auth middleware, `/trackmyweek` prefix
3. **Client scaffold** — Vite + React setup, routing, Navigation component, API client
4. **Log Entry UI** — LogEntry page, EntryForm, QuickEntry (mobile-first)
5. **View Data UI** — ViewData page, full inline editing, day view chart
6. **Report Builder UI** — ReportBuilder, all chart types, pre-built + custom reports, dashboard
7. **Category Manager UI** — Categories page, full CRUD with rename cascade
8. **Questions UI** — Questions page
9. **Tests** — Jest unit + integration for all server routes; Playwright E2E covering:
   - Log a new entry
   - Edit an entry inline (every field)
   - Create and save a custom report
   - Add and rename a category
   - Change pre-built report time period

---

## Session Startup Instructions (for Claude)

At the start of every new session working on this rebuild:

1. Read `CLAUDE.md` at repo root
2. Read this file (`trackmyweek/SPEC.md`)
3. Read any files relevant to the current phase before writing code
4. Ask the human which build phase we are working on
5. Propose the phase plan and wait for approval before writing any code
