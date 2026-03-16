# TODO

Low-urgency items to revisit when time permits.

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

- [ ] **Fix coverage PR comment body in `ci.yml`**
  The `Post coverage summary as PR comment` step in Job 1 uses `hashFiles()` inside
  the `body:` string, which is not evaluated in that context. Replace with a shell
  step that reads `coverage-summary.json` and builds the comment body with real
  numbers, similar to how the job summary step works. This is cosmetic — enforcement
  and job summary are unaffected.

---

## Code Coverage — Aspirational Targets

Current floors are the minimum enforced by CI thresholds. The aspirational target
for all projects is **100% branches/functions, 90% lines**. Explicit owner approval
is required to add or retain a per-file threshold exception.

### Portal
| Metric | Current floor | Target |
|--------|--------------|--------|
| Branches | 65% | 100% |
| Functions | 50% | 100% |
| Lines | 79% | 90% |

Uncovered lines in `server.js`: 90-111, 136, 234-240, 245, 259-266, 275-276.
Primarily: remote log fetching, HTTPS path, and error handling branches.

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
- [ ] Portal `server.js` uncovered branches — add integration tests for HTTPS path and remote log fetching
