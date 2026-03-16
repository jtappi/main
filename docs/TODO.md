# TODO

Low-urgency items to revisit when time permits.

---

## CI / Build

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

- [ ] **Application logging per project — structured logs with a per-project dashboard**
  Currently, all server output (stdout/stderr) goes to PM2 logs as an undifferentiated
  stream. As the platform grows with more subprojects, diagnosing issues requires
  `pm2 logs` and manual grepping. A proper observability layer should:
  1. **Structured logging per project** — each subproject writes structured JSON log
     entries (timestamp, level, project, message, context) to a dedicated log file
     or shared append-only JSONL file (similar to `logs/test-runs.jsonl`).
  2. **Per-project log dashboard** — an admin page (e.g. `/logs-dashboard`) that reads
     the structured log file and displays entries filterable by project, log level
     (info/warn/error), and time range. Modelled on the existing test dashboard.
  3. **Log rotation** — prevent unbounded log growth with a cron-based or size-based
     rotation strategy.
  Options to evaluate: custom implementation (consistent with the platform's JSON-file
  approach), or integrate a lightweight library like `pino` with file transport.
  Resolve after bptracker Phase 7 is complete.

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
