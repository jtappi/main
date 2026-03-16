# TODO

Low-urgency items to revisit when time permits.

---

## BP Tracker — UI Improvements

- [ ] **Display the last 5 readings on the Capture screen**
  Show a compact, clean table of the 5 most recent readings directly on the Capture
  view (below the camera button), so the user can see their recent history without
  switching to the Reports tab. Columns: Date, Systolic/Diastolic, Heart Rate.
  Load via the existing `getReadings()` API call on mount.

- [ ] **User-adjustable text size with cached preference**
  Add a text size control (e.g. small / medium / large toggle) accessible from the
  Capture or Reports view. The selected size should scale the key reading values
  (BP numbers, heart rate) and history table text. Persist the preference in
  `localStorage` so it survives page reloads and app restarts. Apply the preference
  on mount before first render to avoid a flash of unsized text.

---

## CI / Build

- [ ] **Re-enable CI on push to main when a second contributor joins**
  CI currently runs on `pull_request` only — the `push` trigger was removed on
  2026-03-16 because this is a solo-contributor repo and running tests twice
  (once on PR, once post-merge) added CI minutes with no safety benefit.

  **To re-enable:** Add `push: branches: [main]` back to the `on:` block in
  `.github/workflows/ci.yml` and remove this TODO item.

  **Trigger:** Do this as soon as a second contributor opens their first PR.
  With multiple contributors, post-merge CI catches integration regressions
  that can't be caught on individual PRs.

- [ ] **Split `ci.yml` into per-project workflow files**
  The current single `ci.yml` uses path filters to scope jobs, but as the monorepo
  grows this becomes increasingly complex to maintain — a CI change for one project
  risks breaking another, and the `if` conditions grow with every new project added.

  **Target architecture:**
  | File | Triggers on |
  |------|------------|
  | `ci-portal.yml` | `portal/**`, `core/**` |
  | `ci-trackmyweek.yml` | `trackmyweek/**` |
  | `ci-bptracker.yml` | `bptracker/**` |
  | `ci-e2e.yml` | `portal/**`, `core/**`, `trackmyweek/**` |

  Each project owns its pipeline. Adding a new project means creating a new file,
  not editing a shared one.

  **Key consideration before splitting:** The shared `logs/test-runs.jsonl` commit
  step (used by the test dashboard) will cause rebase conflicts if two workflows
  run concurrently and both try to push to `main` at the same moment. Resolve the
  log delivery mechanism first — options include: a serialised log workflow that
  runs after all others complete, or switching to a GitHub API append rather than
  a git commit.

  **Trigger:** Do this when a third or fourth project joins and the single-file
  complexity becomes the bottleneck. Not needed yet.

- [ ] **Do not run E2E tests on merge for new subprojects that don't touch shared code**
  Currently, every merge to `main` triggers the full CI pipeline including E2E tests.
  For new subprojects (e.g. `bptracker`) that have no portal integration yet, running
  E2E against the portal is wasteful and produces noise. The CI workflow should be
  updated so that E2E runs are skipped or scoped to only the projects that were actually
  changed. Options to evaluate:
  1. **Path-based job conditions** — use `paths` filters on the E2E job so it only
     runs when files under `portal/`, `tests/e2e/`, or `core/` are changed.
  2. **Separate E2E workflow** — split E2E into its own `e2e.yml` triggered only on
     changes to portal/core paths, rather than running in the main `ci.yml` for all pushes.
  Resolve before Phase 7 (CI integration) of the bptracker build.

---

## Observability

- [ ] **Server-side logging per project with a log viewer dashboard**
  Currently, application errors are only visible via `pm2 logs` on the Mac Mini.
  There is no per-project log stream, no log history, and no way to view logs from
  the browser. This makes debugging production issues (e.g. extraction failures in
  bptracker) slow and requires SSH access.

  **What to build:**
  - A lightweight structured logger for each subproject that writes JSON log lines
    to per-project log files (e.g. `logs/bptracker.jsonl`, `logs/portal.jsonl`).
    Each entry includes: timestamp, level (info/warn/error), project, message, and
    optional metadata object.
  - A **Log Viewer** admin-only page at `/logs` on the portal that reads the log
    files and displays them in a filterable table: filter by project, level, and
    date range. Similar architecture to the existing Test Dashboard.
  - Log rotation: cap each log file at a configurable size (e.g. 5MB) and keep
    the last N rotated files. Never let logs grow unbounded.

  **Why this matters:**
  - Extraction failures in bptracker (Anthropic API errors, parse failures) are
    currently invisible without SSH. A log viewer would surface these immediately.
  - As more subprojects are added, a centralized log viewer becomes the primary
    debugging tool for all runtime issues.

  **Scope:** Design as a new subproject or as an extension of the portal admin panel.
  Decide before building.

---

## Security

- [ ] **Replace port 22 forwarding with Tailscale**
  Currently port 22 is open on the router to allow GitHub Actions to rsync Playwright
  reports to the Mac Mini. Tailscale would eliminate the need for a public-facing SSH
  port entirely — CI connects over the private WireGuard tunnel instead.
  Free for personal use, ~10 min setup.
  See: https://tailscale.com/kb/1160/github-actions

---

## Maintenance

- [ ] **Set up Playwright report prune cron on Mac Mini**
  Prevents `~/apps/main/playwright-reports/` from growing unbounded.
  ```bash
  crontab -e
  ```
  Add line:
  ```
  0 3 * * * bash ~/apps/main/scripts/prune-playwright-reports.sh >> ~/apps/main/logs/prune.log 2>&1
  ```

---

## Test Dashboard

Items specifically tied to the Test Dashboard (`/test-dashboard`, `portal/public/assets/test-dashboard.js`).

- [ ] **Not all test runs are being recorded in the dashboard**
  The following run types are expected to appear in the dashboard but may be missing
  or inconsistently logged:
  - **PR Checks:** Unit, Integration, and E2E runs triggered by `pull_request` events
  - **On Demand:** E2E runs triggered via `workflow_dispatch`
  Investigate `scripts/log-test-run.js`, `logs/test-runs.jsonl`, and the CI log commit
  steps to identify which run types are being dropped or logged under wrong project slugs.
  Cross-reference with the dashboard filter options (branch, trigger, project) to confirm
  what is actually arriving vs. what is expected.

- [ ] **E2E test durations appear inaccurate on the dashboard**
  Duration values shown for E2E suites do not reflect actual elapsed time. Investigate
  how duration is captured in the Playwright JSON output (`/tmp/*-e2e-results.json`),
  how `scripts/log-test-run.js` reads and stores it, and how `test-dashboard.js`
  renders it. Determine whether the issue is at capture, storage, or display time.

- [ ] **Add unit/integration tests for the Test Dashboard server-side code**
  `portal/public/assets/test-dashboard.js` is client-side browser JavaScript and is
  excluded from the current Jest coverage collection. Two approaches to consider:
  1. **Extract pure logic** (data transformation, filtering, aggregation functions)
     into a separate `portal/lib/dashboard-utils.js` module that can be unit tested
     in Node with Jest — then the browser file imports from it.
  2. **Add Playwright component tests** that render the dashboard page against a
     mock `/api/test-runs` response and assert that suite cards, history rows, and
     filters behave correctly.
  The server-side route (`GET /api/test-runs`) already has integration test coverage.
  This item is about the client-side rendering logic.

- [ ] **Surface unit test coverage data on the Test Dashboard (or a new coverage dashboard)**
  Currently, Jest coverage results are uploaded as CI artifacts and shown in the GitHub
  Actions job summary and PR comments. They are not visible on the Test Dashboard.
  Options to evaluate:
  1. **Extend the existing Test Dashboard** — add a Coverage tab or section that reads
     `coverage-summary.json` committed to the repo (similar to how `test-runs.jsonl`
     is read from GitHub raw). This requires committing `coverage-summary.json` as part
     of the CI run rather than only uploading it as an artifact.
  2. **New Coverage Dashboard** — a separate admin page (`/coverage-dashboard`) that
     reads committed coverage summaries and shows per-project trend lines over time.
  3. **Integrate a dedicated service** (Codecov, Coveralls) — tracked separately under
     Testing Infrastructure below. Provides history, PR diffs, and line-level annotation
     without requiring a custom dashboard.
  Decide on approach before building. The key question is whether coverage history over
  time is needed (favours option 2 or 3) or just the latest snapshot (option 1 is sufficient).

---

## Testing Infrastructure

- [ ] **CI tooling: auto-validate test file references in `docs/testing/`**
  A CI lint step that parses the diff of any PR, detects new test files added
  (`tests/**/*.test.js`, `tests/**/*.spec.js`, `trackmyweek/client/tests/**/*.spec.js`),
  and fails with a clear message if the corresponding `docs/testing/<PROJECT>.md` was
  not updated in the same PR. Prevents the test catalog from going stale.

- [ ] **CI tooling: auto-regenerate `docs/testing/README.md` index**
  A script that scans `docs/testing/*.md` (excluding `README.md`) and regenerates
  the project table in `README.md`. Run as a CI step or pre-commit hook.
  Ensures the index never diverges from the actual catalog files as new projects are added.

- [ ] **Dedicated coverage service (Codecov or Coveralls)**
  Once coverage floors are stable, integrate a service that tracks coverage trends
  over time, shows per-PR diffs, and posts inline PR comments with line-level detail.
  Current approach (CI artifacts + job summary) is sufficient for enforcement but
  doesn't show historical trends or per-line annotation.

---

## Code Coverage — Aspirational Targets

Current floors are the minimum enforced by CI thresholds. The aspirational target
for all projects is **100% branches/functions, 90% lines**. Explicit owner approval
is required to add or retain a per-file threshold exception.

### Portal
| Metric | Current floor | Target |
|--------|--------------|--------|
| Branches | 80% | 100% |
| Functions | 85% | 100% |
| Lines | 90% | 90% ✅ |

### TrackMyWeek
| Metric | Current floor | Target |
|--------|--------------|--------|
| Branches | 65% | 100% |
| Functions | 80% | 100% |
| Lines | 78% | 90% |

**Per-file exception (requires owner approval to remove or lower):**
- `controllers/prebuilt.controller.js` — floor: 0% branches, 10% functions, 25% lines.
  Nearly zero test coverage. Open a dedicated PR to bring this up to target.
  Tracked below.

---

## Test Coverage Gaps

Test coverage gaps are tracked in the project catalogs — that is the single source of truth.
Do not duplicate gap entries here.

- [`docs/testing/PORTAL.md`](./testing/PORTAL.md) — Coverage Gaps section
- [`docs/testing/TRACKMYWEEK.md`](./testing/TRACKMYWEEK.md) — Coverage Gaps section

**Priority items to close next:**
- [ ] `trackmyweek/controllers/prebuilt.controller.js` — write unit tests to reach target coverage
- [ ] Portal `server.js` — `loadTestRunsRemote` success path (mock `https.get` with valid JSONL stream)
