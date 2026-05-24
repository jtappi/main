# Task Manager — Test Catalog

**Project:** task-manager
**Path:** `task-manager/`
**Port:** 3004
**Stack:** Node.js + Express (no client build — static HTML/CSS/JS served directly)

---

## Overview

Task Manager is a personal to-do list app with a kanban board (V1), timeline, and
Mon–Fri calendar swimlane (V2). The server is a thin Express router with two API
endpoints — `GET /api/tasks` and `POST /api/tasks` — backed by a local `tasks.json`
file. Auth is inherited from `core/` and is not re-tested here.

---

## Test File Locations

```
task-manager/
└── tests/
    └── integration/
        └── tasks.api.test.js    ← GET + POST /api/tasks (8 tests) ✅
```

---

## Integration Tests

### `tests/integration/tasks.api.test.js`

Added in feat/task-manager-integration.

#### GET /task-manager/api/tasks

| Test | Classification | Status |
|------|---------------|--------|
| returns empty tasks and closedLog on a fresh data file | Integration | ✅ |
| returns existing tasks when the data file has tasks | Integration | ✅ |
| returns 500 when the data file cannot be read | Integration | ✅ |

#### POST /task-manager/api/tasks

| Test | Classification | Status |
|------|---------------|--------|
| saves tasks and returns ok:true with correct count | Integration | ✅ |
| saves an array payload and returns count equal to array length | Integration | ✅ |
| saves an empty tasks array and returns count of 0 | Integration | ✅ |
| persists changes that are then returned by a subsequent GET | Integration | ✅ |
| returns 400 when body is not valid JSON | Integration | ✅ |

---

## E2E Tests

### Not yet written

| Test | Classification | Status |
|------|---------------|--------|
| Task Manager loads at /task-manager after login | Smoke | 🔴 |
| Adding a task in V1 appears in the correct column | Critical | 🔴 |
| Marking a task done removes it from the active board | Critical | 🔴 |
| Switching to V2 renders the timeline | Smoke | 🔴 |
| Unauthenticated access to /task-manager redirects to /login | Critical | 🔴 |

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
