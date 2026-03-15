# Session Handoff — trackmyweek.com / jtappi/main

This document is the authoritative handoff for the next Claude session.
Read `CLAUDE.md` in full before doing anything else, then read this file.

---

## What was accomplished this session

### Merged PRs (all on main, all merged)
- **PR #55** — fix ViewData timestamp timezone bug + unit/E2E tests
- **PR #56** — fix all Playwright E2E failures (cookie.secure CI fix + selector fixes)
- **PR #57** — trim E2E to critical flows + smoke checks; CLAUDE.md Section 2.6 added
- **PR #58** — log all CI events (push + PR) to test dashboard; CLAUDE.md Section 12 updated
- **PR #59** — Playwright report hosting on server with PR comments
- **PR #60** — fix CI log commit detached HEAD + report slug + SSH deploy
- **PR #61** — fix express.Router for playwright-reports static serving

### Open PRs at end of session
None.

---

## Current state of main

### What's working
- Unit and integration tests passing
- E2E auth fixed (`cookie.secure && !process.env.CI`)
- Test dashboard shows PR runs alongside push-to-main runs
- Portal route `GET /playwright-reports/*` working behind `requireAdmin`
- CI log commit steps use cp/checkout/pull pattern — no stash conflicts
- Report slug set in dedicated step before deploy — no double-slash in URLs
- SSH deploy confirmed working — rsync reaches Mac Mini
- rsync guarded with directory existence checks — no failure if no report generated
- Playwright report pages load correctly at `https://trackmyweek.com/playwright-reports/{slug}/{suite}/`

### Known limitation
- Portal E2E tests are currently failing in CI (unrelated to the above fixes).
  Reports for the `portal` suite will be empty until those tests pass.
- trackmyweek E2E reports only contain `index.html` (no `data/` or `trace/` dirs)
  because the CI runner sets `CI=true` which causes Playwright to embed everything
  into `index.html` as a self-contained file. This is correct behavior.

---

## Deploy workflow reminder

After merging any PR that changes server-side code, always run on the Mac Mini:

```bash
cd ~/apps/main
git pull origin main
pm2 restart portal
```

**Both steps are required.** `pm2 restart` alone reloads the process but does not
pull new code from GitHub. Always `git pull` first.

---

## Infrastructure

- Port 22 forwarded through Xfinity router to Mac Mini at `10.0.0.98`
- `DEPLOY_HOST` set to `jitendrabhatt@<external-ip>` via `gh secret set`
- `DEPLOY_SSH_KEY` set to base64-encoded private key via `gh secret set`
- TODO: Replace port 22 forwarding with Tailscale (see `docs/TODO.md`)

---

## Next session: priority order

### Step 1 — Fix portal E2E tests (medium priority)
The portal E2E suite is failing in CI. Investigate and fix.

### Step 2 — Set up prune cron (low urgency)
```bash
crontab -e
```
Add line:
```
0 3 * * * bash ~/apps/main/scripts/prune-playwright-reports.sh >> ~/apps/main/logs/prune.log 2>&1
```

### Step 3 — Replace port 22 forwarding with Tailscale (low urgency)
See `docs/TODO.md` for details.

---

## Key files to read at next session start
1. `CLAUDE.md` — full working agreement (mandatory)
2. `docs/HANDOFF.md` — this file
3. `.github/workflows/ci.yml` — current CI state
4. `.github/workflows/e2e-on-demand.yml` — on-demand workflow
5. `portal/server.js` — server routes including playwright-reports
