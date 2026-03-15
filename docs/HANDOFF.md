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
- **PR #62** — add Section 15 (deploy workflow) to CLAUDE.md

### Open PRs at end of session
None.

---

## Current state of main

### What's working
- Unit and integration tests passing
- Portal E2E tests: 13 passed ✅
- TrackMyWeek E2E tests passing ✅
- Test dashboard shows PR runs alongside push-to-main runs
- Portal route `GET /playwright-reports/*` working behind `requireAdmin`
- Playwright report pages load correctly at `https://trackmyweek.com/playwright-reports/{slug}/{suite}/`
- SSH deploy confirmed working — rsync reaches Mac Mini
- rsync guarded with directory existence checks

---

## Next session: priority order

### Step 1 — Set up prune cron (low urgency)
Prevents `~/apps/main/playwright-reports/` from growing unbounded on the Mac Mini.
```bash
crontab -e
```
Add line:
```
0 3 * * * bash ~/apps/main/scripts/prune-playwright-reports.sh >> ~/apps/main/logs/prune.log 2>&1
```

### Step 2 — Replace port 22 forwarding with Tailscale (low urgency)
See `docs/TODO.md` for details.

---

## Key files to read at next session start
1. `CLAUDE.md` — full working agreement (mandatory)
2. `docs/HANDOFF.md` — this file
3. `.github/workflows/ci.yml` — current CI state
4. `.github/workflows/e2e-on-demand.yml` — on-demand workflow
5. `portal/server.js` — server routes including playwright-reports
