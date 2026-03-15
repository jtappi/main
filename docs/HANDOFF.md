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
- **PR #59** — Playwright report hosting on server with PR comments (**MERGED BUT BROKEN** — see issues below)

### Open PRs at end of session
None. Confirmed with `list_pull_requests`.

---

## Current state of main

### What's working
- Unit and integration tests passing
- E2E auth fixed (`cookie.secure && !process.env.CI`)
- Test dashboard shows PR runs alongside push-to-main runs
- Portal route `GET /playwright-reports/*` exists behind `requireAdmin` (added in PR #59)
- CI attempts to deploy reports via rsync after E2E runs (broken — see Bug 3)

### What's broken — four active bugs from PR #59

---

## Bug 1: PR auto-merged despite failing tests

**What happened:** PR #59 merged with two failing CI steps because branch protection
is disabled. The "Require status checks to pass" rule was removed in an earlier session
to allow the CI bot to push log commits to `main` directly.

**Fix options:**
- Accept the risk and rely on convention (current state)
- Re-enable branch protection + add `github-actions[bot]` to bypass list if GitHub
  free plan ever supports it
- No immediate code change required

---

## Bug 2: Double slash in report URLs

**Symptom:**
```
https://trackmyweek.com/playwright-reports//portal/
https://trackmyweek.com/playwright-reports//trackmyweek/
```

**Root cause:** `REPORT_SLUG` env var was empty when the PR comment step ran.
The deploy step writes `REPORT_SLUG` to `$GITHUB_ENV`, but only if it reaches
that line. Because the deploy step failed (Bug 3) before completing, `REPORT_SLUG`
was never set — so the comment used an empty string → double slash.

**Fix:** This is a symptom of Bug 3. Fix Bug 3 and this resolves. Additionally,
set `REPORT_SLUG` in a dedicated step *before* the deploy step so it is always
available regardless of whether deploy succeeds or fails:

```yaml
- name: Set report slug
  if: always()
  run: |
    if [ "${{ github.event_name }}" = "pull_request" ]; then
      SLUG="PR-${{ github.event.pull_request.number }}"
    else
      SLUG="push-$(echo '${{ github.sha }}' | cut -c1-7)"
    fi
    echo "REPORT_SLUG=${SLUG}" >> $GITHUB_ENV
```

Then remove the slug calculation from inside the deploy step.

---

## Bug 3: Deploy step fails (SSH/rsync error)

**Symptom:** `Error: Process completed with exit code 1` on "Deploy Playwright reports
to server" step. No SSH error detail shown (secrets are redacted in logs).

### What has already been confirmed (do NOT re-check these)
- ✅ `DEPLOY_SSH_KEY` and `DEPLOY_HOST` secrets are set in GitHub
- ✅ The user typed `n` on the keygen overwrite prompt — the existing key pair is intact
- ✅ Public key IS already present in `~/.ssh/authorized_keys` (confirmed end of session)
- ✅ `playwright-reports/` directory exists at `~/apps/main/playwright-reports/`

### Remaining causes to investigate
1. **Mac Mini not reachable from GitHub Actions runners.** This is the most likely
   remaining cause. The runner is on the public internet; the Mac Mini may be behind
   NAT without port 22 forwarded through the router. Check external IP:
   ```bash
   curl ifconfig.me
   ```
   Compare to what is stored in the `DEPLOY_HOST` secret. If they differ, update the
   secret. If they match, check that port 22 is forwarded in the router to the Mac Mini.

2. **Non-standard SSH port.** If the Mac Mini's SSH daemon is not on port 22, the
   `ssh-keyscan` and `rsync -e ssh` commands need a `-p` flag. Check:
   ```bash
   sudo lsof -i -P | grep LISTEN | grep ssh
   ```

3. **Private key in secret is stale.** If the `DEPLOY_SSH_KEY` secret was set from a
   previous (older) key pair that predates the current `~/.ssh/github_deploy`, the
   private key won't match the public key in `authorized_keys`. To verify, print the
   public key fingerprint of the key currently on disk and compare it to the fingerprint
   of the private key in the secret:
   ```bash
   ssh-keygen -lf ~/.ssh/github_deploy.pub
   ```
   If the fingerprints don't match, regenerate and update the secret:
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy -N ""
   cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
   cat ~/.ssh/github_deploy
   ```
   Then update `DEPLOY_SSH_KEY` in GitHub secrets with the output of `cat ~/.ssh/github_deploy`.

### How to get verbose SSH output in CI for diagnosis
Temporarily add `-v` to the ssh and rsync commands in the deploy step to get full
connection debug output in CI logs (secrets still redacted, but connection errors
will be visible):
```yaml
ssh -v -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no "$DEPLOY_HOST" ...
rsync -az --delete -e "ssh -v -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no" ...
```
Remove `-v` after diagnosing.

---

## Bug 4: git conflict on E2E log commit (detached HEAD)

**Symptom:**
```
CONFLICT (content): Merge conflict in logs/test-runs.jsonl
HEAD detached from pull/59/merge
```

**Root cause:** When CI runs on a PR, the checkout is in a detached HEAD state
pointing at the merge commit ref (`pull/{number}/merge`), not a real branch.
The `git stash → rebase → stash pop` pattern assumes a branch context and fails
when rebasing from detached HEAD.

**Fix:** Replace the stash/rebase pattern with a cp/fetch/checkout/pull pattern
in **all three** log commit steps across `ci.yml` (Jest job, E2E job) and
`e2e-on-demand.yml`. The pattern to use:

```yaml
run: |
  git config user.name "github-actions[bot]"
  git config user.email "github-actions[bot]@users.noreply.github.com"
  cp logs/test-runs.jsonl /tmp/test-runs-update.jsonl
  git fetch origin main
  git checkout main
  git pull origin main
  cp /tmp/test-runs-update.jsonl logs/test-runs.jsonl
  git add logs/test-runs.jsonl
  git diff --staged --quiet || git commit -m "chore: log E2E test run results [skip ci]"
  git push origin HEAD:main
```

This avoids stash entirely, works in both branch and detached HEAD contexts,
and is simpler than the current approach.

---

## Clarification: `playwright-report/` vs `playwright-reports/`

These are two different things that coexist without conflict:

| Path | What it is | Where it lives |
|------|------------|----------------|
| `playwright-report/` | Portal E2E output dir, written by `npx playwright test` during CI | Repo root, gitignored, ephemeral |
| `playwright-reports/` | Hosted report directory, rsync'd by CI after each run | Mac Mini only at `~/apps/main/playwright-reports/`, never in the repo |

The naming is slightly confusing (singular vs plural) but they serve completely
different purposes. No conflict, no action needed.

---

## Next session: priority order

### Step 1 — Diagnose SSH connectivity (manual, on Mac Mini)
Before writing any code, work through Bug 3 remaining causes above.
Most likely: check external IP matches `DEPLOY_HOST` secret and port 22 is forwarded.

### Step 2 — Fix Bugs 2, 3, and 4 in one PR
Files to change: `ci.yml`, `e2e-on-demand.yml`

Changes:
1. **All three log commit steps** — replace stash/rebase with cp/checkout/pull (Bug 4)
2. **Add dedicated `Set report slug` step** before deploy in both workflows (Bug 2)
3. **Add `-v` SSH flags** if SSH diagnosis from Step 1 is still inconclusive (Bug 3)

### Step 3 — Server restart after fixes merge
No client rebuild needed (`portal/server.js` changes from PR #59 are already on main
and the portal route for playwright-reports is already live).
Just restart the portal process:
```bash
pm2 restart portal
```
(or however the process is managed on the Mac Mini)

### Step 4 — Set up prune cron (low urgency)
```bash
crontab -e
```
Add line:
```
0 3 * * * bash ~/apps/main/scripts/prune-playwright-reports.sh >> ~/apps/main/logs/prune.log 2>&1
```

---

## Key files to read at next session start
1. `CLAUDE.md` — full working agreement (mandatory, read before everything else)
2. `docs/HANDOFF.md` — this file
3. `.github/workflows/ci.yml` — current broken state
4. `.github/workflows/e2e-on-demand.yml` — current state
5. `portal/server.js` — current state (has playwright-reports route from PR #59)

---

## Accountability note
One CLAUDE.md rule violation this session: stated in a recap that PR #57 and PR #58
were "waiting to merge" without calling `list_pull_requests` first. Both had already
been merged. Caught and corrected by the user. Section 0.7 rule #1 and rule #5.
