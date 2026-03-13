# TrackMyWeek — Rebuild Spec

## What It Is

A personal daily life logger. Throughout the day you log events — what you did, ate,
spent, how you felt — tagged with a category and optional notes. The app keeps a
permanent record you can view, filter, and analyze over time.

This is a private, single-user app. Auth is handled entirely by the portal (SSO).
TrackMyWeek has no login screen of its own.

---

## Core Principles

- **Simple to log.** The entry form must be fast. Fewer fields, less friction.
- **Useful to review.** Data should surface patterns, not just dump rows.
- **No bloat.** Every feature must earn its place. When in doubt, cut it.
- **Spec Driven.** No code is written until the spec for that layer is approved.

---

## Data Model

### Entry
```json
{
  "id": 1,
  "text": "Took ibuprofen",
  "category": "Medication",
  "notes": "600mg, after lunch",
  "day": "Monday",
  "month": "March",
  "time": "1:30:00 PM",
  "timestamp": "2026-03-10T13:30:00"
}
```

**Fields:**
- `id` — auto-incrementing integer
- `text` — required, free text, what happened
- `category` — required, one of the fixed categories below
- `notes` — optional, free text
- `day`, `month`, `time`, `timestamp` — auto-set at submission time (EST)

**Removed from old model:** `cost`, `calories` — cut for simplicity.

### Categories (fixed list)
Home, Medication, Bill, Health, Pain, Food, TO DO, Exercise

### Question
```json
{
  "id": 1698765432000,
  "question": "Why do I feel worse on Mondays?",
  "answer": null,
  "creationDate": "3/10/2026, 9:00:00 AM",
  "answeredDate": null
}
```

---

## Features

### 1. Log Entry (main screen)
- Text input with autocomplete (triggers at 3+ characters, pulls from history, max 3 suggestions)
- Category selector (8 buttons with icons)
- Optional notes field
- Submit button (disabled until text + category selected)
- Top 5 quick-entry buttons in sidebar (most frequent recent items, click to re-log)
- Success feedback on submit, form resets

### 2. View All Data
- Sortable table: text, category, notes, day, month, time
- Click any cell (except notes/actions) to filter table by that value
- Reset filter button
- Inline row editing: text, category (dropdown), notes, timestamp
- Delete with confirmation
- Daily chart: entries plotted by time of day, colored/grouped by category
- Date picker to select which day's chart to show (defaults to today)

### 3. Analyze Data — User-Configurable Visualizations
The analyze screen is the most important evolution from the old app.
Rather than fixed static tables, the user controls what they see.

**Required visualizations (v1):**
- Category breakdown — bar or pie chart, configurable date range
- Entry frequency over time — line chart, entries per day, configurable date range
- Top entries by count — sortable table, configurable date range
- Last entry timestamp — always visible
- Daily average — always visible

**User controls:**
- Date range selector: today / 7 days / 30 days / 90 days / all time
- Chart type toggle where applicable (e.g. bar vs pie for category breakdown)
- Each visualization is a collapsible card — user can show/hide each one
- Configuration is persisted in localStorage so it survives page refresh

**Future (not v1):**
- Custom date range picker
- Cross-category correlation (e.g. Pain vs Exercise on same days)
- Export to CSV

### 4. Questions
- Add a question (text input)
- List all questions, unanswered first
- Click a question to expand and write/edit the answer
- Answered questions show answered date
- Delete a question

---

## What Was Cut

| Feature | Reason |
|---------|--------|
| Cost field | Not being used consistently, adds form friction |
| Calories field | Same — only useful for Food, not worth the complexity |
| Eisenhower Matrix | Becomes its own separate project |
| Login screen | Portal SSO handles auth — no separate login needed |
| Vendored JS libs | Replaced with CDN refs |
| `index2.html`, junk files | Dev scraps, removed |

---

## Tech Stack

- **Server:** Node.js + Express, mounted at `/trackmyweek`, port 3001
- **Auth:** `requireAuth` from `core/auth/middleware` — portal session cookie is shared
- **Storage:** Local JSON files (gitignored), migrated to MongoDB in Phase 5
- **Frontend:** Vanilla JS + Bootstrap 4 (CDN) + Chart.js (CDN)
- **No build step.** No React, no bundler. Keep it simple.

---

## File Structure (target)

```
trackmyweek/
├── SPEC.md                        ← this file
├── server.js                      ← Express app, all routes, PREFIX = /trackmyweek
├── package.json
├── controllers/
│   └── questions.controller.js
├── data/
│   ├── data.json                  ← gitignored, runtime
│   ├── data.template.json         ← committed, empty array
│   ├── questions.json             ← gitignored, runtime
│   └── questions.template.json   ← committed, empty array
└── public/
    ├── index.html                 ← log entry screen
    ├── view-data.html
    ├── analyze-data.html
    ├── script.js                  ← index page logic
    ├── view-data.js
    ├── analyze-data.js
    ├── navigation.js              ← shared nav/logout
    └── css/
        └── styles.css
```

---

## Build Order (Spec Driven)

Each phase is proposed, approved, then built. No skipping ahead.

1. **Data layer** — finalize Entry schema, seed data format, file I/O helpers
2. **Server** — all Express routes with correct `/trackmyweek` prefix, auth middleware
3. **Log Entry UI** — index.html, script.js, navigation.js
4. **View Data UI** — view-data.html, view-data.js
5. **Analyze Data UI** — analyze-data.html, analyze-data.js, configurable charts
6. **Questions UI** — questions page (new, not in old app's nav)
7. **Tests** — unit + integration for server routes

---

## Session Startup Instructions (for Claude)

At the start of every new session working on this rebuild:

1. Read `CLAUDE.md` at repo root
2. Read this file (`trackmyweek/SPEC.md`)
3. Read `trackmyweek/server.js` to understand current state
4. Ask the human which build phase we are working on
5. Do not write any code until the phase spec is confirmed
