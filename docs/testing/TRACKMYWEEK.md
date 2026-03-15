# TrackMyWeek — Test Catalog

**Project:** TrackMyWeek (trackmyweek.com — activity logging, data viewing, reports, categories, questions)
**Test runner:** Jest + Supertest (unit), Playwright (E2E)
**Run commands:**
```bash
cd trackmyweek && npm test                                           # unit tests
npx playwright test --config=trackmyweek/client/playwright.ci.config.js  # E2E (CI)
npx playwright test --config=trackmyweek/client/playwright.config.js     # E2E (local)
```

---

## Table of Contents
- [Testing Tools](#testing-tools)
- [Critical Tests](#critical-tests)
- [Smoke Tests](#smoke-tests)
- [Regression Tests](#regression-tests)
- [Unit Tests](#unit-tests)
- [Coverage Gaps](#coverage-gaps)

---

## Testing Tools

| Tool | Version source | Purpose |
|------|---------------|--------|
| **Jest** | `trackmyweek/package.json` | Unit test runner |
| **Playwright** | root `package.json` | E2E browser automation |
| **Chromium** | Playwright-managed | Browser for E2E tests |

**Configs:**
- Jest: `trackmyweek/package.json` (`jest` key)
- Playwright (local): `trackmyweek/client/playwright.config.js`
- Playwright (CI): `trackmyweek/client/playwright.ci.config.js`
- E2E global setup: `trackmyweek/client/tests/e2e/global-setup.js` (seeds e2e-tmw user)
- E2E global teardown: `trackmyweek/client/tests/e2e/global-teardown.js` (removes e2e-tmw user)

**Note:** `@playwright/test` is owned by the **root** `package.json` only.
Never add it to `trackmyweek/client/package.json`.

---

## Critical Tests

Critical = app is broken for all users if this fails.

### E2E — `trackmyweek/client/tests/e2e/log-entry.spec.js`

| Status | Test | What it verifies |
|--------|------|------------------|
| ✅ | `submitting a complete entry succeeds` | Select category → fill text → POST to API → success shown. Core user journey. |
| 🔴 | `quick log item saves data` | User clicks a quick log item and the entry is persisted to the API |

### E2E — `trackmyweek/client/tests/e2e/categories.spec.js`

| Status | Test | What it verifies |
|--------|------|------------------|
| ✅ | `adding a new category persists and appears in list` | POST to API → new category renders in list |

### E2E — `trackmyweek/client/tests/e2e/questions.spec.js`

| Status | Test | What it verifies |
|--------|------|------------------|
| ✅ | `adding a new question persists and appears in list` | POST to API → new question renders in unanswered list |

---

## Smoke Tests

Smoke = a specific surface is broken if this fails, but the whole app still works.

### E2E — Navigation

| Status | Test | What it verifies |
|--------|------|------------------|
| 🔴 | `Log Entry page loads` | `/trackmyweek/log` is reachable and renders |
| 🔴 | `View Data page loads` | `/trackmyweek/view` is reachable and renders |
| 🔴 | `Reports page loads` | `/trackmyweek/reports` is reachable and renders |
| 🔴 | `Categories page loads` | `/trackmyweek/categories` is reachable and renders |
| 🔴 | `Questions page loads` | `/trackmyweek/questions` is reachable and renders |

> **Note:** The 5 navigation smoke tests above should be consolidated into a single
> `navigation.spec.js` file that visits each route and confirms it loads.

### E2E — `trackmyweek/client/tests/e2e/log-entry.spec.js`

| Status | Test | What it verifies |
|--------|------|------------------|
| ✅ | `page loads with category buttons from API` | `/trackmyweek/log` renders and `/api/categories` returned data |

### E2E — `trackmyweek/client/tests/e2e/view-data.spec.js`

| Status | Test | What it verifies |
|--------|------|------------------|
| ✅ | `page loads with day chart visible` | `/trackmyweek/view` renders, filter bar and day chart present |
| 🔴 | `day view renders data for today when entries exist` | Day chart shows values when the current day has at least one entry |
| 🔴 | `all entries view loads and renders rows` | Switching to all-entries view renders at least one row from the API |

### E2E — `trackmyweek/client/tests/e2e/categories.spec.js`

| Status | Test | What it verifies |
|--------|------|------------------|
| ✅ | `page loads with existing categories from API` | `/trackmyweek/categories` renders and `/api/categories` returned data |

### E2E — `trackmyweek/client/tests/e2e/questions.spec.js`

| Status | Test | What it verifies |
|--------|------|------------------|
| ✅ | `page loads with question form visible` | `/trackmyweek/questions` renders and the add-question form is present |
| 🔴 | `asked questions section renders` | Page shows the list of asked (unanswered) questions |
| 🔴 | `answered questions section renders` | Page shows the list of answered questions |

### E2E — `trackmyweek/client/tests/e2e/reports.spec.js`

| Status | Test | What it verifies |
|--------|------|------------------|
| ✅ | `page loads with pre-built report cards from API` | Reports page renders "Entries Over Time" and "Category Breakdown" cards |
| ✅ | `report builder opens and loads schema from API` | New Report button opens builder and chart types load from `/api/schema` |

---

## Regression Tests

Regression = written to prevent a previously-fixed bug from returning.

### E2E — `trackmyweek/client/tests/e2e/view-data.spec.js`

| Status | Test | Bug prevented |
|--------|------|---------------|
| ✅ | `timestamp cell displays local time, not raw UTC` | Timezone bug: timestamps were rendering in UTC instead of local time |
| ✅ | `editing timestamp input shows local time and round-trips to correct UTC` | Timezone bug: editing a timestamp was shifting the stored UTC value |
| ✅ | `cancelling edit does not alter stored timestamp` | Timezone bug: cancel was incorrectly writing the displayed local value back |

---

## Unit Tests

### `trackmyweek/tests/unit/entries.controller.test.js` — entries controller

| Status | Coverage |
|--------|----------|
| ✅ | CRUD operations on entries via testApp (create, read, update, delete, validation) |

### `trackmyweek/tests/unit/categories.controller.test.js` — categories controller

| Status | Coverage |
|--------|----------|
| ✅ | CRUD operations on categories via testApp (create, read, update, delete, validation) |

### `trackmyweek/tests/unit/questions.controller.test.js` — questions controller

| Status | Coverage |
|--------|----------|
| ✅ | CRUD operations on questions via testApp (create, read, update, delete) |

### `trackmyweek/tests/unit/reports.controller.test.js` — reports controller

| Status | Coverage |
|--------|----------|
| ✅ | Prebuilt reports, saved report CRUD, report schema via testApp |

### `trackmyweek/tests/unit/dateUtils.test.js` — `trackmyweek/lib/dateUtils.js`

| Status | Coverage |
|--------|----------|
| ✅ | UTC↔local conversion, edge cases, timezone offset handling |

---

## Coverage Gaps

These tests do not exist yet. They are the authoritative backlog for TrackMyWeek test coverage.
Do not remove an entry without adding the test.

| Priority | Type | File | What to test |
|----------|------|------|-------------|
| High | Smoke (E2E) | `navigation.spec.js` *(new)* | All 5 routes load: Log Entry, View Data, Reports, Categories, Questions |
| High | Critical (E2E) | `log-entry.spec.js` | Quick log item saves data to the API |
| Medium | Smoke (E2E) | `view-data.spec.js` | Day view renders chart values when today has entries |
| Medium | Smoke (E2E) | `view-data.spec.js` | All entries view loads and renders rows from API |
| Medium | Smoke (E2E) | `questions.spec.js` | Asked questions section renders |
| Medium | Smoke (E2E) | `questions.spec.js` | Answered questions section renders |
| Low | Integration | *(new)* | TrackMyWeek server routes — auth boundaries, data endpoints |
