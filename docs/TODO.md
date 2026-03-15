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

---

## Test Coverage Gaps

Test coverage gaps are tracked in the project catalogs — that is the single source of truth.
Do not duplicate gap entries here.

- [`docs/testing/PORTAL.md`](./testing/PORTAL.md) — Coverage Gaps section
- [`docs/testing/TRACKMYWEEK.md`](./testing/TRACKMYWEEK.md) — Coverage Gaps section
