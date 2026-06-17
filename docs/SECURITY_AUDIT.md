# Security Audit — Findings and Remediation Plan

**Audit date:** 2026-06-16
**Status:** Findings documented, no remediation applied yet — see "Remediation status" below.

This document is the authoritative record of a full security review of the monorepo:
core auth, all four mounted subprojects (TrackMyWeek, BP Tracker, Prison Donkey, Task
Manager), and every `package.json` in the repo. Nothing in this document has been acted
on yet except where explicitly marked. Do not delete findings once fixed — mark them
resolved with the PR number instead, so this stays a historical record.

---

## How to use this document

1. Before starting any security remediation work, read this file in full.
2. When a finding is fixed, change its status line to `**Status:** ✅ Fixed in PR #N`
   instead of deleting the finding.
3. When a new vulnerability is found in a future audit, add it here under the
   appropriate severity heading rather than creating a separate file.
4. Severity tiers (Critical / High / Medium / Low) reflect realistic exploitability
   and impact in this app's actual deployment context — a single-server personal
   platform behind Cloudflare Full Strict, not a generic OWASP severity score.

---

## Critical

### C1 — Unsalted, unstretched password hashing that doubles as a replayable credential

**Status:** 🔴 Not fixed
**Where:** `core/auth/auth.js` (`hashPassword`, `authenticate`), `portal/public/assets/login.js` (`sha256`)

`hashPassword` is `crypto.createHash('sha256').update(password).digest('hex')` — no salt,
no key-stretching. The client computes this exact same SHA256 in the browser
(`portal/public/assets/login.js`) and sends it directly to the server, which stores and
compares it as-is via `user.passwordHash !== passwordHash`.

This means the `passwordHash` field in `users.json` is not a hash in the security
sense — it is a static, directly-replayable bearer credential equivalent to the
password itself. If `users.json` (or any backup/copy of it) is ever exposed, every
account is immediately compromised with no cracking required. It is also vulnerable
to precomputed rainbow tables since there is no per-user salt, and the comparison
`!==` is not constant-time, creating a timing side-channel.

**Recommended fix:**
- Move to a server-side slow hash (bcrypt or scrypt) with a per-user salt, applied to
  the actual password rather than a client-precomputed hash.
- Replace the `!==` comparison with `crypto.timingSafeEqual` (or rely on bcrypt's own
  constant-time `compare`).
- This requires a migration path for existing `users.json` entries (re-hash on next
  successful login, or force a password reset) since the stored format changes.

---

### C2 — Path traversal leading to arbitrary file deletion (BP Tracker)

**Status:** 🔴 Not fixed
**Where:** `bptracker/controllers/readings.controller.js` (`POST /api/readings`),
`bptracker/lib/data.js` (`purgeExpiredImages`)

`POST /bptracker/api/readings` accepts `imageRef` directly from the request body with
zero validation and stores it verbatim. No endpoint in the codebase actually writes an
image file to disk — `imageRef` is pure client-supplied metadata that the server trusts
completely. `purgeExpiredImages()` later does `path.join(DATA_DIR, reading.imageRef)`
and calls `fs.unlinkSync` on the result with no check that the resolved path stays
inside `IMAGES_DIR`.

Any authenticated user — including a low-privilege guest — can submit a reading with
`imageRef: "../../../../core/data/users.json"` (or any other path the Node process can
write to). Once that reading ages past the 90-day retention window, the purge job will
delete whatever that path resolves to.

**Recommended fix:**
- Never trust `imageRef` from the client. Either remove the field from the client-writable
  POST body entirely, or validate it with `path.basename()` plus a resolved-path
  containment check (`path.resolve(...).startsWith(IMAGES_DIR)`) before any file operation.
- Longer term: if/when an actual image-upload endpoint is built, generate the filename
  server-side (e.g. a UUID) rather than accepting any client-supplied path component.

---

## High

### H1 — Authentication bypass embedded in application code via `NODE_ENV`

**Status:** 🔴 Not fixed
**Where:** `trackmyweek/server.js`, `bptracker/server.js`

Both files contain:
```js
if (process.env.NODE_ENV === 'development') {
  requireAuth = (_req, _res, next) => next();
}
```
This is a real auth bypass baked into the production source file, not just test
mocking. It also fails open: the `try { require('../core/auth/middleware') } catch { ... }`
fallback silently disables auth if the module ever fails to load for any reason (typo,
moved file, future refactor) instead of crashing.

Both standalone dev listeners (`app.listen(PORT, callback)`) bind with no host argument,
which defaults to all network interfaces rather than `127.0.0.1` the way the portal
deliberately binds.

**Realistic risk:** if `NODE_ENV=development node bptracker/server.js` is ever run
directly on the Mac Mini for debugging, BP health data, the admin user list, and the
image-extraction endpoint become completely unauthenticated and reachable from any
network that can route to that port — not just localhost. The `trackmyweek` `dev` npm
script (`NODE_ENV=development nodemon server.js`) sets this flag as a matter of routine
local development, which is exactly the condition that triggers the bypass.

**Recommended fix:**
- Use a separate, explicit flag for the dev auth bypass (e.g. `DISABLE_AUTH_DEV_ONLY=true`)
  that is never the same value used for the cookie-secure logic, so the two concerns can't
  be conflated.
- Auth-module load failures should crash the process, not silently disable auth.
- Standalone dev listeners should bind explicitly to `127.0.0.1`.
- The unscoped `app.use(cors())` in the standalone dev path (reflects any origin) should
  be tightened or at minimum documented as dev-only and never reachable in production.

---

### H2 — Secret partially logged to stdout on every server start

**Status:** 🔴 Not fixed
**Where:** `bptracker/controllers/extract.controller.js`

```js
console.log('[bptracker/extract] GEMINI_API_KEY is present (' +
  process.env.GEMINI_API_KEY.slice(0, 10) + '...)');
```
Pm2 logs persist to disk indefinitely and get pasted into chats, tickets, and support
requests routinely. Partial key exposure should never happen — log a boolean presence
check only.

**Recommended fix:** Replace with `console.log('[bptracker/extract] GEMINI_API_KEY is present:', !!process.env.GEMINI_API_KEY)` — no slice, no partial value, ever.

---

### H3 — No rate limiting on the AI extraction endpoint

**Status:** 🔴 Not fixed
**Where:** `bptracker/server.js` (`/api/extract` mount), `bptracker/controllers/extract.controller.js`

`/bptracker/api/extract` calls a metered external API (Gemini) with no request
throttling beyond the general 100-req/15-min limiter scoped only to `/auth/login`.
This is both a cost-exhaustion risk against the Gemini quota and a denial-of-service
vector against the feature for the legitimate user. See also **D1** below — this
finding is compounded by the fact that the SDK calling Gemini is itself deprecated.

**Recommended fix:** Add a dedicated rate limiter (e.g. `express-rate-limit`, already a
dependency in the portal) scoped specifically to `/api/extract`, tuned to a reasonable
number of extraction attempts per user per time window.

---

## Medium

### M1 — Task Manager has no defense-in-depth authentication

**Status:** 🔴 Not fixed
**Where:** `task-manager/server.js`

Unlike `trackmyweek/server.js` and `bptracker/server.js`, which both re-apply
`requireAuth` internally on their own sub-routes even though the portal already wraps
the whole mount, `task-manager/server.js` applies no internal auth check at all on
`/api/tasks`. It relies entirely on the single portal-level mount line
(`app.use('/task-manager', requireAuth, requireProjectAccess('task-manager'), ...)`)
for protection. If that line is ever reordered, refactored, or copied incorrectly in a
future change, task data becomes fully unauthenticated with no secondary check catching
the mistake.

The `POST /api/tasks` handler also writes the entire request body to disk with only a
null/undefined check — no schema validation. Since the portal's global JSON body limit
is 10MB (see **M2**), an authenticated client can write arbitrarily large, arbitrarily
shaped payloads to `tasks.json`.

**Recommended fix:**
- Add an internal `requireAuth` check on the task-manager router itself, matching the
  pattern already used in `trackmyweek/server.js` and `bptracker/server.js`.
- Add basic schema validation on `POST /api/tasks` (expected shape, reasonable size cap).

---

### M2 — Global 10MB JSON body limit applies to every route in the platform

**Status:** 🔴 Not fixed
**Where:** `portal/server.js` (`app.use(express.json({ limit: '10mb' }))`)

The body-size increase was made specifically to support BP Tracker's base64 image
payloads, but it was applied globally rather than scoped to the one route that needs
it. This means `/auth/login`, `/admin/users`, `/task-manager/api/tasks`, and every other
endpoint across all four projects now accepts payloads up to 10MB, unnecessarily
widening the DoS surface. Notably, `bptracker/server.js` already re-applies its own
10MB limit specifically on `/api/extract` (`router.use('/api/extract', express.json({ limit: '10mb' }), ...)`),
so the global portal-level increase appears to be redundant duplication.

**Recommended fix:** Reduce the global limit to a small default (100–256KB) and confirm
the bptracker route-level 10MB override (which already exists) is sufficient on its own.

---

## Low / Hygiene

### L1 — `task-manager/tasks.json` is tracked in git despite being gitignored

**Status:** 🔴 Not fixed
**Where:** `.gitignore`, `task-manager/tasks.json`

The file was committed before the `.gitignore` rule existed, so the rule has no effect
on it now. Currently it only contains an empty placeholder (`{"tasks": [], "closedLog": []}`),
so nothing is exposed today, but any future local task data written to that path will
show up as an uncommitted change rather than being properly ignored, and is one
accidental `git add -A` away from being committed for real.

**Recommended fix:** `git rm --cached task-manager/tasks.json` in a dedicated commit.

---

### L2 — `.env.example` documents the wrong environment variable for BP Tracker

**Status:** 🔴 Not fixed
**Where:** `.env.example`

It lists `ANTHROPIC_API_KEY` for "Claude Vision," but the actual code in
`extract.controller.js` requires `GEMINI_API_KEY` and calls the Google Generative AI
SDK. Anyone following the README/`.env.example` setup instructions for a fresh
deployment would end up with a silently broken extraction feature. Not a security
vulnerability on its own, but a correctness gap with security-adjacent consequences —
someone might add the wrong variable and assume credentials are simply unavailable
rather than realizing the variable name is wrong.

**Recommended fix:** Update `.env.example` to reference `GEMINI_API_KEY` with the
correct description and signup URL.

---

## Dependency findings

These came from a manual read of every `package.json` in the repo, cross-referenced
against CLAUDE.md Section 0.55's deprecated-dependency policy, followed by a real
`npm audit` run by the repo owner (see "npm audit remediation" below for how that's
being handled, and "Portal — npm audit triage" for the first subproject's results).

### D1 — `@google/generative-ai` is a deprecated SDK

**Status:** 🔴 Not fixed
**Where:** `bptracker/package.json` (`@google/generative-ai@^0.21.0`)

Google has officially deprecated this package in favor of the unified `@google/genai`
SDK. This is not a simple version bump — the replacement has a different API surface,
so migrating requires rewriting the calling code in `extract.controller.js`, not just
changing a semver range. This compounds **H3**: an unmaintained SDK making unthrottled
calls to a paid, quota-limited API is a worse combination than either issue alone.

**Recommended fix:** Dedicated migration PR to `@google/genai`, scoped separately from
the quick Critical/High fixes since it requires actual code changes and testing of the
extraction flow, not just a dependency bump.

---

### D2 — Vite 5.1.x across three client scaffolds

**Status:** 🔴 Not fixed (low priority)
**Where:** `trackmyweek/client/package.json`, `bptracker/client/package.json`,
`prisondonkey/client/package.json` — all pin `vite@^5.1.x`

Vite's 5.x line has had dev-server-specific path traversal advisories. Practical
exposure is low here because production never runs Vite's dev server — it serves the
pre-built static `dist/` through Express. The risk window is narrow: only someone
running `npm run dev` locally and exposing that dev server to an untrusted network
would be affected.

**Recommended fix:** Routine bump to the latest patched 5.x (or 6.x) release as part of
the broader `npm audit` remediation pass — not urgent enough to block anything else.

---

### D3 — `prisondonkey/client` is unused scaffold code with no lock file

**Status:** 🔴 Not fixed (low priority)
**Where:** `prisondonkey/client/` (entire directory)

This is a React+Vite scaffold with its own `package.json` but no committed
`package-lock.json`. It's never installed, built, or referenced anywhere in `ci.yml` or
`prisondonkey/server.js` — the actual served content comes from `prisondonkey/public/`,
not `client/dist/`. This violates CLAUDE.md Section 0.55's "every package.json must have
a lock file" rule, but since nothing ever runs `npm install` against it, it is not an
active vulnerability — just an unaudited dependency tree sitting in the repo.

**Recommended fix:** Decide whether Prison Donkey Phase 2 will actually use this
scaffold. If yes, generate the lock file and wire it into CI per Section 0.56. If no,
delete the directory so it stops accumulating drift.

---

## `npm audit` remediation — process, not a one-time fix

The repo owner ran `npm audit` locally and found a number of issues, but has no local
environment to verify that applying fixes doesn't break functionality. The agreed
approach, to avoid landing an untested dependency bump directly on production:

1. **Let CI be the verification, not the local machine.** Every dependency fix goes
   through a branch + PR so the existing unit/integration/E2E pipeline validates the
   change before it can be merged. Never apply `npm audit fix` directly to `main`.

2. **Separate `npm audit fix` from `npm audit fix --force`.** Plain `npm audit fix` only
   moves within the existing semver range already declared in `package.json` (e.g.
   `^4.18.2` → `4.19.0`), which is low-risk by the package's own versioning contract.
   `npm audit fix --force` rewrites `package.json` itself, including major-version jumps,
   which is where real breakage risk lives. Treat these as two different categories of
   work: apply in-range fixes in one low-risk PR per subproject, and treat every
   force/major-version fix as its own deliberate PR with the relevant package's
   changelog read first.

3. **One subproject per PR, not one giant cross-repo PR.** Portal first, then
   trackmyweek, then trackmyweek/client, then bptracker, then bptracker/client, then
   task-manager. If CI goes red, the small PR scope makes it immediately obvious which
   bump caused it, and reverting one subproject's PR is far safer than untangling a
   single PR that touched all seven `package-lock.json` files at once.

4. **Triage by where the vulnerable code actually runs.** A lot of what `npm audit`
   flags lives in devDependencies that only execute during testing or building (inside
   Jest's, Vite's, or Playwright's own dependency tree) and never run in the live
   request-handling path. Those are real findings but lower urgency than anything in
   `express`, `express-session`, or `helmet` — packages that are in the request path on
   every visitor in production. **Also distinguish reachability from severity label** —
   npm's severity score is computed for the package in isolation and does not know how
   *your* code actually calls it. A "high" finding in a function your code never invokes
   (see the portal's `uuid` finding below) carries near-zero real risk despite the label.

5. **CI passing is not 100% proof of no breakage.** Coverage isn't complete everywhere —
   `docs/TODO.md` already flags `trackmyweek/controllers/prebuilt.controller.js` as
   nearly untested. For any major-version bump touching a low-coverage area, do a quick
   manual click-through on the live site after merging, as a final check CI can't fully
   replace on its own.

6. **Lock file generation must happen locally per CLAUDE.md Section 0.55.** Claude cannot
   generate a valid resolved lock file without running `npm install` against the real
   registry. The realistic workflow: Claude reads the actual `npm audit` output, identifies
   exactly which packages need bumping in which subproject and whether it's a safe in-range
   fix or a major-version jump, the repo owner runs the actual `npm install` / `npm audit fix`
   locally and commits the resulting lock file changes, then the PR is opened and CI is
   the verification gate.

7. **Don't read `fixAvailable`'s major-version suggestion as a literal target.** When npm
   reports `"fixAvailable": {"name": "jest", "version": "25.0.0", "isSemVerMajor": true}`,
   that `25.0.0` is the minimum version satisfying npm's dependency-graph resolution for
   the audit fix, not a recommendation to install that exact (older) version. Always check
   the actual current latest major release of the package before bumping.

---

## Portal — `npm audit` triage (2026-06-17)

Source: `npm audit --json` run by the repo owner in `portal/`. 27 raw findings (1 low,
23 moderate, 3 high) collapse into far fewer actual decisions once the dependency chains
are traced — most of the 23 "moderate" findings are different symptoms of the same one
or two root packages.

### Root cause collapse

- **`qs`** is the root cause feeding both the `body-parser` and `express` findings.
- **`js-yaml`** is the root cause feeding `@istanbuljs/load-nyc-config` →
  `babel-plugin-istanbul` → `@jest/transform` → which fans out into `@jest/core`,
  `@jest/reporters`, `jest-runner`, `jest-runtime`, `jest-snapshot`, `jest-config`,
  `jest-cli`, `create-jest`, `babel-jest`, and `jest` itself. One `js-yaml` issue is
  responsible for roughly ten of the twenty-seven raw findings.

### Safe in-range fixes — apply via plain `npm audit fix` (no `--force`)

All of the following show `fixAvailable: true` with no `isSemVerMajor` flag, meaning
they resolve within the existing `package.json` semver ranges:

`@babel/core`, `body-parser`, `@jest/expect`, `@jest/globals`, `@jest/reporters`,
`babel-jest`, `create-jest`, `express`, `form-data`, `jest-circus`, `jest-cli`,
`jest-config`, `jest-resolve-dependencies`, `jest-runner`, `jest-runtime`,
`brace-expansion`, `path-to-regexp`, `picomatch`, `qs`.

This single command should resolve the large majority of the 27 raw findings.

**Production-reachable among these:** `express` (direct dependency) and `qs`
(its query-string parser) sit in the live request path on every request with a query
string. `body-parser` is Express's body-parsing middleware, also in the live path.
`path-to-regexp` is Express 4.x's internal route-matching dependency and technically
executes on every request, but the ReDoS risk model requires attacker-influenceable
route *pattern* strings — this app's routes are all static literals in `server.js`,
never built from user input, so real-world exploitability is low even though the code
runs constantly. All three are covered by the same safe fix, so there's no tension
between urgency and risk here.

**Flagged but not a real risk in this codebase:**
- `form-data` shows **high** severity but is only a transitive dependency of
  `supertest`/`superagent`, used solely when the test suite constructs multipart
  requests during `npm test`. No untrusted external input reaches this path. Still
  worth taking the free fix, just not urgent.
- `uuid` is a **direct** dependency flagged moderate, but the actual vulnerability is
  specifically in the **v3/v5/v6 functions when a `buf` argument is supplied**.
  Confirmed by reading the actual call sites: `core/auth/auth.js` uses Node's built-in
  `crypto.randomUUID()` (not this package at all), and
  `bptracker/controllers/readings.controller.js` imports only `{ v4: uuidv4 }` called
  with no arguments. The vulnerable code path is never executed anywhere in this
  codebase. The real fix requires a major bump to `uuid@14` (not covered by plain
  `npm audit fix`) — deprioritized given zero real exploitability despite the
  "direct dependency, moderate severity" label.

**Dev/build-tool-only:** `picomatch` and `brace-expansion` are pulled in by `nodemon`'s
file-watcher and Jest's glob matching — never execute in the production request path.
Already covered by the safe fix above.

### Requires a deliberate, separate PR

**Jest major-version bump.** The entire `js-yaml` chain (the ~10-finding cluster) only
fully resolves with a Jest major bump. Per remediation-process rule 7 above, the
`"version": "25.0.0"` in npm's `fixAvailable` output is not a real target — current
`package.json` already specifies `^29.7.0`, so that would be a downgrade. The actual
move is to check the true latest Jest major on npm, bump deliberately, and run the full
portal test suite before merging. This is its own PR, not bundled with the safe batch.

### Portal triage summary

| Package | Severity (npm label) | Real-world risk here | Action |
|---|---|---|---|
| express, qs, body-parser | moderate | Real — live request path | Safe fix, apply now |
| path-to-regexp | high | Low (routes are static, not user-built) | Safe fix, apply now |
| form-data | high | Near-zero (test-only, no untrusted input) | Safe fix, apply now |
| picomatch, brace-expansion | high/moderate | None (dev-tool only) | Safe fix, apply now |
| @babel/core and other safe-fix items | low/moderate | Low/none | Safe fix, apply now |
| uuid | moderate | **Zero** — vulnerable code path never called | Deprioritized, needs major bump later |
| jest + entire js-yaml chain | moderate | Build/test-tool only | Deliberate major-version PR, separate |

**Next concrete step:** repo owner to run `npm audit fix` in `portal/`, commit the
resulting `package-lock.json`, open a PR, confirm CI is green. Then run `npm audit --json`
in the remaining six locations (`trackmyweek`, `trackmyweek/client`, `bptracker`,
`bptracker/client`, `task-manager`, and root) for the same triage treatment.

---

## Remediation status — summary table

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| C1 | Unsalted/unstretched password hashing, replayable credential | Critical | 🔴 Not fixed |
| C2 | Path traversal → arbitrary file deletion (BP Tracker) | Critical | 🔴 Not fixed |
| H1 | `NODE_ENV` auth bypass + fail-open + 0.0.0.0 bind | High | 🔴 Not fixed |
| H2 | Partial API key logged on startup | High | 🔴 Not fixed |
| H3 | No rate limiting on `/api/extract` | High | 🔴 Not fixed |
| M1 | Task Manager has no internal auth check | Medium | 🔴 Not fixed |
| M2 | Global 10MB body limit applies platform-wide | Medium | 🔴 Not fixed |
| L1 | `task-manager/tasks.json` tracked despite gitignore | Low | 🔴 Not fixed |
| L2 | `.env.example` documents wrong API key variable | Low | 🔴 Not fixed |
| D1 | `@google/generative-ai` is deprecated | Dependency | 🔴 Not fixed |
| D2 | Vite 5.1.x across 3 client scaffolds | Dependency | 🔴 Not fixed (low priority) |
| D3 | `prisondonkey/client` unused, no lock file | Dependency | 🔴 Not fixed (low priority) |
| P1 | Portal `npm audit` — safe in-range batch (19 packages) | Dependency | 🔴 Not fixed — ready to apply |
| P2 | Portal `npm audit` — Jest major-version bump | Dependency | 🔴 Not fixed — needs deliberate PR |
| P3 | Portal `npm audit` — `uuid@14` bump | Dependency | 🔴 Not fixed — deprioritized, zero real risk |

**Proposed PR grouping when remediation begins:**
- **PR 1 (Critical + High):** C1, C2, H1, H2, H3
- **PR 2 (Medium + Low):** M1, M2, L1, L2
- **PR 3 (dependency migration):** D1 — separate, larger effort
- **PR 4 (portal npm audit — safe batch):** P1, ready now
- **PR 5 (portal npm audit — Jest major bump):** P2, deliberate, own PR
- **`npm audit` PRs:** one per remaining subproject (trackmyweek, trackmyweek/client,
  bptracker, bptracker/client, task-manager, root), per the process above, opened once
  each subproject's actual audit output has been reviewed and triaged the same way
