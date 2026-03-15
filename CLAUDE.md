# CLAUDE.md — Working Agreement for AI-Assisted Development

This file is the mandatory starting point for every AI-assisted session on this repo.
Before writing any code, creating any file, or making any commit, read this document in full.

---

## 0. Propose First, Act on Approval

**Never write code, push files, or make commits until the human has explicitly approved.**

For any non-trivial change:
1. Describe what files will be changed and why.
2. Wait for the human to say "proceed" (or equivalent).
3. Only then execute.

Exceptions — no approval needed for:
- Reading files (`get_file_contents`, `view`)
- Asking clarifying questions
- Explaining a bug or describing a plan

This rule exists because moving fast without alignment wastes cycles and erodes trust.

---

## 0.5. Manual Command Rules — Zero Ambiguity

When the human must run a command manually, Claude must:

1. **Always include `git checkout <branch>` at the top** of any command block that requires
   being on a specific branch. Never assume the human is already on the right branch.
2. **Never include comments (`#`) inline with commands** in shell blocks. Comments on their
   own line are fine; inline comments after a command cause `zsh: command not found: #` errors.
3. **Do as much as possible through GitHub tools** — `push_files`, `create_branch`,
   `create_pull_request`, etc. This includes `.github/workflows/*.yml` files — `push_files`
   handles these correctly. Only fall back to manual commands when GitHub tools genuinely
   cannot accomplish the task (e.g. generating a lock file requires running npm locally).
4. **Test every command block mentally** before sending it. If a command depends on state
   (current branch, file existence, env vars), make that state explicit in the block.

This rule exists because ambiguous command blocks have caused branch mixups, zsh errors,
and wasted cycles that could have been avoided entirely.

---

## 0.6. Security Review — Blocking Gate

**This repo is public. Every change must be evaluated against this checklist before committing.
If any item cannot be checked, the change must not proceed.**

### Credentials & Secrets
- [ ] No passwords, API keys, tokens, or hashes hardcoded anywhere in the code
- [ ] No `.env`, `users.json`, or any file containing real credentials is staged or committed
- [ ] `git status` checked to confirm no sensitive files are accidentally tracked
- [ ] Any new file containing secrets is added to `.gitignore` before the file is created

### Auth & Session
- [ ] Session secret always comes from `process.env.SESSION_SECRET` — never hardcoded
- [ ] `cookie.secure` always driven by `NODE_ENV === 'production' && !process.env.CI` — never hardcoded
- [ ] `passwordHash` never returned in any API response — always use `safeUser()`
- [ ] No new API route returns a user object without passing through `safeUser()`

### Input Handling
- [ ] All user-supplied input is validated before use
- [ ] No user input is directly interpolated into file paths, system commands, or `eval`
- [ ] Any new admin or auth endpoint is protected by the appropriate middleware (`requireAuth`, `requireAdmin`)

### Dependencies
- [ ] Any new `npm` dependency has been reviewed for known vulnerabilities (`npm audit`)
- [ ] No new dependency is added without a clear reason — prefer built-in Node modules
- [ ] Dev dependencies are never installed or required in production code paths

### Out of scope for now (revisit as app grows)
- SQL/NoSQL injection: no database yet
- CSRF tokens: revisit when adding state-changing forms
- Full XSS sanitization: no user-generated content rendered to other users yet

---

## 0.7. Verify Repo State Before Acting — No Assumptions

**This is a hard rule that exists because stale assumptions have caused wasted cycles and
misleading instructions.**

### Always verify before stating facts about the repo

Claude must **read files from GitHub** before making any claim about what is or isn't in
the repo. Memory from earlier in a conversation becomes stale the moment the human merges
a PR, pushes a commit, or runs a command. The following are the most dangerous assumptions:

1. **PR status** — Never say "you have N open PRs" or list specific open PRs without calling
   `list_pull_requests` first. PRs may have been merged or closed since the last check.

2. **File contents** — Never say a file "contains X" or "is missing Y" without reading it
   first with `get_file_contents`. File contents change with every merge.

3. **Package versions and lock files** — Never assume a `package-lock.json` exists, is
   current, or contains a specific dependency without reading the directory listing first.

4. **CI sequencing and job state** — Never state that "Job A runs before Job B" or that
   "Step X leaves state Y behind" without reading the current `ci.yml`. CI workflows change.
   When reasoning about what state exists at each step of a CI job, trace through the actual
   YAML step-by-step — do not assume based on intent or a remembered earlier version.

5. **Merge order instructions** — Never give merge order instructions for multiple PRs without
   first calling `list_pull_requests` to confirm which PRs are actually still open. Instructions
   to merge already-merged PRs are confusing and erode trust.

### The rule in one sentence
If Claude has not read it from GitHub in this turn, Claude does not know it — call the tool.

---

## 0.8. CI Workflow Rules — Correctness Over Speed

Changes to `.github/workflows/ci.yml` carry outsized risk because a mistake blocks every
subsequent PR. Claude must follow these rules when writing or modifying CI:

1. **Read `ci.yml` from GitHub before every edit.** Never modify CI from memory. Always
   call `get_file_contents` on the current file first, even if CI was edited earlier in
   the same session.

2. **Trace job sequencing explicitly.** Before writing any step that depends on state
   created by a previous step (files on disk, seeded data, running processes), trace the
   entire job from the checkout step forward to confirm that state actually exists at
   that point. Write this trace in the proposal, not just the conclusion.

3. **`continue-on-error: true` must always be paired with an explicit fail step.**
   Using `continue-on-error: true` without capturing the exit code and checking it at
   the end of the job causes failing tests to report as passing. This is always wrong.
   The correct pattern is:
   - Add `id:` to the step
   - Capture exit code: `echo "exit_code=$?" >> $GITHUB_OUTPUT`
   - Add a final `if: always()` step that reads the saved codes and exits 1 if any failed

4. **Cache keys must be explicit and correct.** Playwright browser caches must be keyed
   on the Playwright version (via `hashFiles('package-lock.json')`). A wrong cache key
   causes either stale browser binaries or unnecessary re-downloads every run.

5. **E2E jobs that start a server must always stop it.** Any step that starts a background
   process must save its PID and have a corresponding cleanup step with `if: always()`.
   A leaked server process can cause port conflicts on subsequent runs.

6. **Test all shell commands for zsh/bash compatibility.** The CI runner uses bash.
   Never use zsh-specific syntax. Never put inline `#` comments after commands.

---

## 0.9. E2E Test Setup Rules — Playwright in CI

Playwright E2E tests in this repo run against a live portal server in CI. These rules
exist because auth and sequencing failures have broken every E2E run that ignored them.

1. **Each test suite owns its own test users.** Never rely on another suite's setup or
   teardown to leave users behind. The portal E2E `global-teardown.js` removes all
   `e2e-*` users when it finishes. Any suite that runs after must seed its own users.

2. **Each suite's global-setup must seed users AND verify login.** The setup must:
   - Write the test user directly to `users.json` via `auth.js` (not via the API)
   - Attempt the actual login POST and throw if it fails
   - Save the `storageState` to a file
   This catches credential or sequencing bugs immediately rather than letting every
   spec fail silently with 401 errors.

3. **Each suite must have a matching global-teardown.** The teardown must remove only
   the users seeded by that suite's setup, identified by a stable unique ID prefix
   (e.g. `e2e-tmw-001`). Never remove users by username pattern — use the stable ID.

4. **`storageState` must be set in the config's `use` block**, not per-spec. If it is
   not set globally, specs that navigate to protected routes will get 401s and render
   error states instead of data.

5. **`@playwright/test` must not be in `trackmyweek/client/package.json` devDependencies.**
   The root `package.json` owns `@playwright/test`. Installing it inside a sub-package
   creates two conflicting instances and causes `test.describe() called here` errors.
   All E2E specs resolve Playwright from the root `node_modules`.

6. **The CI-only Playwright config (`playwright.ci.config.js`) is separate from the
   local dev config (`playwright.config.js`).** The CI config:
   - Points `baseURL` at the portal (`http://localhost:3000/trackmyweek`), not Vite
   - Has no `webServer` block (CI starts the server manually)
   - Includes `globalSetup`, `globalTeardown`, and `storageState`
   - Outputs JSON to `/tmp/` for the dashboard log script
   Never merge these two configs.

7. **Playwright browser binaries must be cached in CI.** Use `actions/cache@v4` keyed
   on `hashFiles('package-lock.json')`. On a cache hit, run `install-deps` only (not
   the full `install --with-deps`). This saves ~50-60s per run.

---

## 1. Read Before You Write — Always

Before writing tests, code, or config for any file that already exists:

1. **Read the file first** using `get_file_contents`.
2. **Understand what it actually does** — do not assume based on naming or convention.
3. **Only then** write code or tests that reflect reality.

**The rule in one sentence:** Assumptions are bugs waiting to happen. Read the source.

---

## 2. Tests Must Reflect Actual Behavior

- Tests describe what the code **does**, not what you think it should do.
- If a test fails because the test's expectation is wrong (not the code), that is a test authoring error.
- Before asserting any return value, status code, or side effect, verify it in the source.
- Mock objects must implement **every method the code under test calls** — no partial mocks.

---

## 2.5. Tests Are Written With the Code — Not After

**This is a hard rule, not a guideline.**

Tests are never deferred to a later phase. Every PR that adds or modifies behavior must
include the corresponding tests in the **same PR**. There is no "we'll add tests in Phase N"
exception.

### What this means in practice

**When adding a new route or controller:**
- Add the supertest integration test for that route in the same commit.
- If a test helper (`testApp.js` or equivalent) needs to exist first, create it before the
  controller, not after.

**When adding a new utility function (e.g. `dateUtils.js`):**
- Add the unit test file alongside it in the same PR.
- Tests must cover: the happy path, all edge cases documented in the JSDoc, and all
  error/null return paths.

**When modifying an existing function's behavior or return shape:**
- Update the tests in the same commit as the code change.
- A code change that breaks an existing test is a red flag — fix the test or the code
  before the PR is opened, never after.

**When refactoring a module's export shape (e.g. changing from `module.exports = app`
to `module.exports = router`):**
- Update every test file that imports the module in the same PR.
- Never open a PR that you know will break existing tests.

### The concrete test checklist for every PR

Before opening any PR, Claude must verify:
- [ ] Every new function has at least one unit test
- [ ] Every new API route has at least one integration test (happy path + one error case)
- [ ] Every modified API shape (request or response) has updated tests
- [ ] `npm test` passes locally (or via the test runner) before the PR is opened
- [ ] No existing test has been deleted or commented out unless the feature it tested was
      explicitly removed

### Why this rule exists

Deferring tests to a later phase means:
1. The code ships to production untested
2. Later test-writing reveals bugs in already-merged code
3. The test author has to reverse-engineer behavior instead of specifying it upfront
4. Bugs introduced by later refactors are not caught until they cause production failures

Writing tests with the code means:
- Bugs are caught before they reach `main`
- The test suite is always a reliable safety net for refactors
- Claude cannot break working code in one place while fixing something else

---

## 2.6. E2E Test Philosophy — What Belongs in Playwright

E2E tests are expensive (they require a browser, a live server, and auth). They must only
cover things that cannot be verified at a lower level. This is a hard constraint, not a
guideline — adding low-value E2E tests wastes CI minutes and creates noise.

### The three-tier testing model

| Layer | Tool | What it covers |
|-------|------|----------------|
| **Unit** | Jest | Individual functions, pure logic, edge cases, error paths |
| **Integration** | Jest + supertest | API routes, server behavior, auth middleware, DB/file I/O |
| **E2E** | Playwright | Auth flows, critical user journeys, smoke checks, data round-trips |

Each layer covers what the layer below it cannot. E2E tests are not a substitute for
unit or integration tests, and unit/integration tests are not a substitute for E2E.

### What E2E tests MUST cover

**1. Auth flows** — things that require a real browser session and server enforcement:
- Successful login redirects to dashboard
- Invalid credentials show an error from the server
- Authenticated session persists (visiting /login while logged in redirects away)
- Logout destroys the session server-side
- Unauthenticated access to protected routes is blocked (302 or 403)
- Role-based access control (guest cannot reach admin, admin can)

**2. Critical user journeys** — the primary actions a user takes that round-trip through
the server and produce a visible result:
- Submitting a complete form succeeds and shows confirmation (e.g. logging an entry)
- Creating a new resource appears in the list (e.g. adding a category)
- Editing a resource persists the change (e.g. timestamp inline edit)
- Deleting a resource removes it
- The core data flow of each major feature works end-to-end

**3. Smoke checks** — one test per page that confirms the route is not broken:
- Navigate to the page and confirm it loads (not a 404, not a redirect to /login)
- Confirm one meaningful piece of data from the server is visible
  (e.g. category buttons loaded from the API, not just a static heading)

### What E2E tests must NOT cover

The following belong in unit or integration tests, not E2E:

- **Client-side form validation** — a disabled submit button, a client-side error message
  before any network request is made. These are pure React component behavior testable
  without a browser.
- **DOM structure checks** — "this heading is visible", "this div exists". If the page
  loads (smoke check passes), the structure is there.
- **Client-side UI state** — tab switches, modal open/close toggles, hover visibility.
  No server call = no E2E test.
- **Keyboard shortcuts** — Enter key submits a form. This is component behavior.
- **Redundant happy paths** — if one test already proves a page loads and data appears,
  a second test checking a different element on the same page adds no value.

### The litmus test for a new E2E test

Before writing any new Playwright test, ask:
> "Would this test catch a bug that a unit or integration test cannot catch?"
> "Does this test require a real browser, a running server, and a live session to be meaningful?"

If both answers are not "yes", the test belongs at a lower level.

### Planned future E2E test layers (not yet implemented)

The following test types are on the roadmap and will be added as separate suites when
the time comes. Do not attempt to cover these with current Playwright specs:

- **UI image verification** — screenshot diffing for visual regression (e.g. Percy,
  Playwright's `toHaveScreenshot()`). Catches layout/style regressions that behavioral
  tests miss.
- **Mocked transition tests** — component-level tests with mocked API responses to verify
  loading states, error states, and UI transitions without a live server. Fills the gap
  between unit tests and full E2E for UI interaction flows.

---

## 3. data-testid Is a Contract

- `data-testid` attributes are never renamed or removed unless the element's **purpose** changes.
- They are never referenced in CSS or JS logic — only in tests.
- Any new element that needs a test gets a `data-testid` added in the same commit.
- The authoritative list lives in `tests/TESTIDS.md`. Keep it current.
- Style refactors and structural/functional changes are always **separate commits**.

---

## 4. Element IDs Are a Contract

- JavaScript-wired element IDs (those referenced via `getElementById`) are frozen.
- They are listed in `docs/HTML_JS_CONTRACT.md`.
- Never rename an ID without updating the JS that uses it and the contract doc in the same commit.
- CSS classes and `data-testid` attributes are free to change without touching JS.

---

## 5. Test Setup Rules

- **Unit tests** test one module in isolation. Use `os.tmpdir()` for any test that writes data.
  Never write to fixture files — they are read-only.
- **Integration tests** use `supertest` against the real Express app. Always `jest.resetModules()`
  and re-require `app` in `beforeEach` so env vars (e.g. `USERS_FILE`) take effect per-test.
- **E2E tests** use only `data-testid` selectors via `page.getByTestId()`. Never use CSS selectors,
  XPath, or text-based selectors in Playwright tests.
- **Auth mocking in tests:** When a module under test imports `core/auth/middleware`, always mock
  it at the top of the test file (before any `require`) so auth does not redirect test requests.
  Use `jest.mock('../../../core/auth/middleware', () => ({ requireAuth: (r,s,n) => n(), ... }))`.

---

## 6. Package Layout — Where Things Live

This is a monorepo. Package ownership is split intentionally:

| Package | Owner | Why |
|---------|-------|-----|
| `jest`, `supertest` | `portal/package.json` | Run from `portal/`; resolve modules via `modulePaths` |
| `@playwright/test` | root `package.json` **only** | Single source of truth — never add to sub-packages |
| `playwright.config.js` | repo root | Portal E2E specs; co-located with root `package.json` |
| `playwright.ci.config.js` | `trackmyweek/client/` | CI-only config for TrackMyWeek E2E |
| `jest`, `supertest` | `trackmyweek/package.json` | TrackMyWeek unit/integration tests |
| Vite, React, chart.js | `trackmyweek/client/package.json` | Client build only — no Playwright here |

**Lock files — all four must exist in the repo:**
- `package-lock.json` — root
- `portal/package-lock.json` — portal
- `trackmyweek/package-lock.json` — trackmyweek server
- `trackmyweek/client/package-lock.json` — trackmyweek client

If any is missing, CI will fail with `npm ci` errors. After any `npm install` in any
location, immediately commit the resulting lock file.

**Running tests:**
```
cd portal && npm test
cd trackmyweek && npm test
cd ~/apps/main && npm run test:e2e
```

**After pulling changes, install in all locations:**
```
cd ~/apps/main && npm install
cd portal && npm install
cd trackmyweek && npm install
cd trackmyweek/client && npm install
```

---

## 7. Commit Discipline

- One concern per commit. Do not mix style changes with logic changes.
- Commit messages: `type: description` where type is `feat`, `fix`, `test`, `docs`, `refactor`, `chore`.
- When adding a new UI element: one commit for the element + its `data-testid` + TESTIDS.md update.
- When changing JS logic that touches an element ID: one commit for JS + HTML + HTML_JS_CONTRACT.md.

---

## 8. Security Non-Negotiables

- `passwordHash` is **never** returned in any API response. Every route returning a user object
  must pass through the `safeUser()` helper in `portal/server.js`.
- `users.json` and `.env` are gitignored and never committed.
- `cookie.secure` is driven by `process.env.NODE_ENV === 'production' && !process.env.CI` —
  never hardcoded. The `CI` flag allows plain-HTTP sessions in GitHub Actions without
  weakening security in real production.
- The `SESSION_SECRET` env var must be set in production.

---

## 9. GitHub Tool Rules

- **All human-authored changes go through PRs.** The correct workflow is always:
  `create_branch` → `push_files` → `create_pull_request`. **All three steps must happen
  in the same turn.** Never push a branch without immediately opening the PR — a branch
  without a PR is invisible to the human and will be forgotten.
- **Two exceptions where direct push to `main` is permitted:**
  1. The CI bot pushing `logs/test-runs.jsonl` after each test run (`[skip ci]` commit)
  2. Emergency seeding or one-line doc fixes using `push_files` with `[skip ci]` in the message
- **Always use `push_files` to write file content** — never `create_or_update_file`.
  `create_or_update_file` corrupts content by writing literal `\n` escape sequences instead of
  real newlines, breaking JSON and other structured files.
- `push_files` handles encoding correctly and supports multiple files in one commit.
- `push_files` works for all file types including `.github/workflows/*.yml` — always prefer
  it over asking the human to run manual git commands.
- **Before giving any instructions about PRs, always call `list_pull_requests` first.**
  Never reference PR numbers or merge order from memory — the human may have already
  merged or closed them.

---

## 10. Key File Locations

| What | Where |
|------|-------|
| Portal server | `portal/server.js` |
| Auth module | `core/auth/auth.js` |
| Auth middleware | `core/auth/middleware.js` |
| Users data (gitignored) | `core/data/users.json` |
| Projects data | `core/data/projects.json` |
| Unit tests | `tests/unit/` |
| Integration tests | `tests/integration/` |
| E2E tests (portal) | `tests/e2e/` |
| E2E tests (trackmyweek) | `trackmyweek/client/tests/e2e/` |
| Test fixtures (read-only) | `tests/fixtures/` |
| data-testid inventory | `tests/TESTIDS.md` |
| HTML/JS element contract | `docs/HTML_JS_CONTRACT.md` |
| Deploy guide | `docs/DEPLOY.md` |
| Playwright config (portal, local) | `playwright.config.js` (root) |
| Playwright config (trackmyweek, CI) | `trackmyweek/client/playwright.ci.config.js` |
| Playwright config (trackmyweek, local) | `trackmyweek/client/playwright.config.js` |
| Root package.json | `package.json` (root, owns @playwright/test) |
| Root package-lock.json | `package-lock.json` (must exist in repo) |
| Portal package.json | `portal/package.json` (owns Jest, supertest) |
| Portal package-lock.json | `portal/package-lock.json` (must exist in repo) |
| TrackMyWeek server package.json | `trackmyweek/package.json` |
| TrackMyWeek server package-lock.json | `trackmyweek/package-lock.json` (must exist in repo) |
| TrackMyWeek client package.json | `trackmyweek/client/package.json` (Vite + React only, no Playwright) |
| TrackMyWeek client package-lock.json | `trackmyweek/client/package-lock.json` (must exist in repo) |
| CI workflow | `.github/workflows/ci.yml` |
| Test run logs | `logs/test-runs.jsonl` (append-only, never deleted) |
| Log script | `scripts/log-test-run.js` |
| Test dashboard page | `portal/public/test-dashboard.html` |
| Test dashboard JS | `portal/public/assets/test-dashboard.js` |
| Test dashboard CSS | `portal/public/assets/test-dashboard.css` |
| Test dashboard route | `GET /test-dashboard` (admin only) |
| Test runs API | `GET /api/test-runs` (admin only, reads from GitHub raw in production) |
| TrackMyWeek server | `trackmyweek/server.js` |
| TrackMyWeek unit tests | `trackmyweek/tests/unit/` |
| TrackMyWeek test helper | `trackmyweek/tests/unit/testApp.js` |
| TrackMyWeek data (gitignored) | `trackmyweek/data/data.json` |
| TrackMyWeek questions (gitignored) | `trackmyweek/data/questions.json` |
| TrackMyWeek data template | `trackmyweek/data/data.template.json` |
| This file | `CLAUDE.md` |

---

## 11. Before Merging to Main

- [ ] Security review checklist (Section 0.6) fully passed
- [ ] Unit + integration tests pass: `cd portal && npm test`
- [ ] TrackMyWeek tests pass: `cd trackmyweek && npm test`
- [ ] E2E tests pass: `cd ~/apps/main && npm run test:e2e`
- [ ] `package-lock.json` exists at repo root and is committed
- [ ] `portal/package-lock.json` exists and is committed
- [ ] `trackmyweek/package-lock.json` exists and is committed
- [ ] `trackmyweek/client/package-lock.json` exists and is committed
- [ ] No new `data-testid` added without a corresponding entry in `tests/TESTIDS.md`
- [ ] No element ID changed without updating `docs/HTML_JS_CONTRACT.md`
- [ ] All user-returning API routes use `safeUser()` — `passwordHash` never exposed
- [ ] Style-only changes are in their own commit, separate from logic changes
- [ ] Every new function has at least one test (per Section 2.5 checklist)
- [ ] No existing test was deleted or disabled without explicit approval
- [ ] Any new E2E test passes the litmus test in Section 2.6 before being written

---

## 12. Log File Rules

- `logs/test-runs.jsonl` is **append-only**. Never delete entries, never truncate the file.
- It is committed to the repo and is part of permanent history.
- The logging script (`scripts/log-test-run.js`) runs in CI after every test run, pass or fail.
- The script requires a `--project=<slug>` flag. Every CI log step must pass this flag.
- Do not gitignore anything inside `logs/`.
- Log commits use `[skip ci]` in the message to prevent infinite CI trigger loops.
- The log push step runs on **all** CI events (both `push` and `pull_request`) so that
  PR test results appear in the dashboard alongside post-merge results.
- The portal reads `logs/test-runs.jsonl` from `raw.githubusercontent.com` at request time,
  so no `git pull` on the Mac Mini is ever needed for dashboard data to update.
- Use the **branch** and **trigger** filters on the test dashboard to isolate post-merge
  history from PR runs when needed (filter to `branch=main`, `trigger=push`).

### Known caveats with logging all CI events (as of March 2026)

Logging both `push` and `pull_request` runs involves three trade-offs that are accepted
by design but must be revisited if the workflow changes:

1. **PR runs commit directly to `main` via the CI bot.** This is intentional and safe
   because the bot only ever appends to `logs/test-runs.jsonl` — it never touches source
   files. However, if branch protection rules requiring PRs before merging are ever
   re-enabled, the log push step will fail for `pull_request` events. At that point it
   must be updated to push to the PR branch instead, or use a bot-bypass token.

2. **The dashboard will contain PR branch runs alongside post-merge runs.** Each log entry
   stores `branch` and `trigger` fields. Filter by `trigger=push` and `branch=main` on
   the dashboard to see only post-merge history. PR runs show `trigger=pull_request` and
   their source branch name.

3. **Concurrent PRs can cause a rebase conflict on the log push.** If two PRs run CI
   simultaneously and both try to commit a log entry to `main` at the same moment, one
   push will fail the rebase. This is rare in solo development but would need a retry
   mechanism or queue-based log delivery if the team grows.

### Adding a new project to the test dashboard
1. Add a CI step: `npm test -- --ci --forceExit --json --outputFile=/tmp/<n>-jest-results.json`
2. Add a log step: `node scripts/log-test-run.js /tmp/<n>-jest-results.json --project=<n>`
The dashboard discovers new projects automatically from the data — no dashboard code changes needed.

### Branch protection state (as of March 2026)
Both ruleset restrictions on `main` have been removed to allow the CI bot to push log commits:
- ❌ ~~Require a pull request before merging~~ — removed
- ❌ ~~Require status checks to pass~~ — removed

The PR-first discipline for human changes is now enforced by convention (this document)
rather than by GitHub. If the free plan ever gains bot-bypass support, re-enable both rules
and add `github-actions[bot]` to the bypass list.

---

## 13. App Deployment — Data File Rules

Several apps store runtime data in gitignored JSON files. These files are **never overwritten
during a deploy** unless the file is confirmed to not exist yet.

**Template files** (committed, safe to copy as seed):
- `trackmyweek/data/data.template.json` → seeds `trackmyweek/data/data.json` on first deploy only
- `trackmyweek/data/questions.template.json` → seeds `trackmyweek/data/questions.json` on first deploy only

**Safe first-deploy pattern** (only copies if the live file does not already exist):
```bash
[ -f trackmyweek/data/data.json ]      || cp trackmyweek/data/data.template.json trackmyweek/data/data.json
[ -f trackmyweek/data/questions.json ] || cp trackmyweek/data/questions.template.json trackmyweek/data/questions.json
```

**Never** instruct the human to run a bare `cp template → live` without the existence check.
Doing so silently destroys live user data.

When migrating an app from another repo, always check if live data exists at the old location
and instruct the human to copy it over **before** starting the app for the first time:
```bash
ls <old-repo>/src/data.json
cp <old-repo>/src/data.json trackmyweek/data/data.json
```

---

## 14. Client Build Rules — TrackMyWeek

`trackmyweek/client/dist/` is gitignored and must be built locally after every pull that
changes client source files. The portal serves this directory as static files — without it
the app returns a 404.

**Rebuild required when any of these change:**
- `trackmyweek/client/src/**`
- `trackmyweek/client/index.html`
- `trackmyweek/client/vite.config.js`

**Rebuild NOT required for server-side changes** (controllers, lib, portal).

**Build command:**
```bash
cd ~/apps/main/trackmyweek/client
npm run build
```

See `docs/DEPLOY.md` for the full deploy workflow.
