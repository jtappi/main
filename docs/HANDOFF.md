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
- CI attempts to deploy reports via rsync after E2E runs (broken — see Issue 3)

### What's broken — three active bugs from PR #59

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

**Most likely causes in order:**

1. **Mac Mini not reachable from GitHub Actions runners.** The runner is on the public
   internet; the Mac Mini may be behind NAT. Confirm that port 22 (or whatever SSH port
   you use) is forwarded through your router to the Mac Mini, and that `DEPLOY_HOST`
   contains the correct external IP/hostname. Check your current external IP:
   ```bash
   curl ifconfig.me
   ```
   Compare that to what is stored in the `DEPLOY_HOST` secret.

2. **Public key not in `authorized_keys`.** The user ran `n` on the keygen overwrite
   prompt, which is correct — the existing key pair was preserved. But the
   `cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys` step may not have been
   completed. Verify:
   ```bash
   grep -f ~/.ssh/github_deploy.pub ~/.ssh/authorized_keys && echo "present" || echo "MISSING"
   ```
   If it says MISSING:
   ```bash
   cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
   ```

3. **Private key in secret doesn’t match public key on server.** If `y` was typed at
   any point, the key pair was overwritten. The `DEPLOY_SSH_KEY` secret would then hold
   the *old* private key which no longer matches the *new* public key on disk. To fix:
   regenerate a new key pair, add the new public key to `authorized_keys`, and update
   the `DEPLOY_SSH_KEY` secret with the new private key.
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy -N ""
   cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
   cat ~/.ssh/github_deploy
   ```
   Then update the `DEPLOY_SSH_KEY` secret in GitHub with the output of that last command.

4. **Non-standard SSH port.** If your Mac Mini’s SSH is not on port 22, the `ssh-keyscan`
   and `rsync` commands need a `-p` flag. Check:
   ```bash
   sudo lsof -i -P | grep LISTEN | grep ssh
   ```

**How to add SSH debug output to CI for diagnosis:** Temporarily add `-v` to the ssh
and rsync commands in the deploy step to get verbose output in CI logs:
```bash
ssh -v -i ~/.ssh/deploy_key ...
rsync -az --delete -e "ssh -v -i ~/.ssh/deploy_key ..." ...
```
Remember to remove `-v` after diagnosing.

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
| `playwright-reports/` | Hosted report directory, rsync’d by CI after each run | Mac Mini only at `~/apps/main/playwright-reports/`, never in the repo |

The naming is slightly confusing (singular vs plural) but they serve completely
different purposes. No conflict, no action needed.

---

## Next session: priority order

### Step 1 — Diagnose SSH connectivity (manual, on Mac Mini)
Before writing any code, confirm the SSH issue. Run through the Bug 3 checklist above.
The most common cause is NAT/port forwarding — check external IP and router config.

### Step 2 — Fix all four bugs in one PR
Files to change: `ci.yml`, `e2e-on-demand.yml`

Changes:
1. **All three log commit steps** — replace stash/rebase with cp/checkout/pull (Bug 4)
2. **Add dedicated `Set report slug` step** before deploy in both workflows (Bug 2)
3. **Temporarily add `-v` to SSH commands** in deploy step if SSH still failing after
   Step 1 diagnostics (Bug 3 diagnosis)

### Step 3 — Server restart after fixes merge
No client rebuild needed (`portal/server.js` changes from PR #59 are already on main).
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
