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
- [ ] `cookie.secure` always driven by `NODE_ENV === 'production'` — never hardcoded
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
| `@playwright/test` | root `package.json` | E2E specs live in `tests/e2e/` at root; Playwright must be installed where specs are |
| `playwright.config.js` | repo root | Co-located with root `package.json` and `tests/` |
| `jest`, `supertest` | `trackmyweek/package.json` | TrackMyWeek unit/integration tests run from `trackmyweek/` |

**Both lock files must always exist in the repo:**
- `package-lock.json` — root, generated by running `npm install` at repo root
- `portal/package-lock.json` — portal, generated by running `npm install` in `portal/`

If either is missing, CI will fail with `npm ci` errors. After any `npm install` in either
location, immediately commit the resulting lock file.

**Running tests:**
```
cd portal && npm test
cd trackmyweek && npm test
cd ~/apps/main && npm run test:e2e
```

**After pulling changes, install in both locations:**
```
cd ~/apps/main && npm install
cd portal && npm install
cd trackmyweek && npm install
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
- `cookie.secure` is driven by `process.env.NODE_ENV === 'production'` — never hardcoded.
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
| E2E tests | `tests/e2e/` |
| Test fixtures (read-only) | `tests/fixtures/` |
| data-testid inventory | `tests/TESTIDS.md` |
| HTML/JS element contract | `docs/HTML_JS_CONTRACT.md` |
| Playwright config | `playwright.config.js` (root) |
| Root package.json | `package.json` (root, owns Playwright) |
| Root package-lock.json | `package-lock.json` (must exist in repo) |
| Portal package.json | `portal/package.json` (owns Jest, supertest) |
| Portal package-lock.json | `portal/package-lock.json` (must exist in repo) |
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
- [ ] No new `data-testid` added without a corresponding entry in `tests/TESTIDS.md`
- [ ] No element ID changed without updating `docs/HTML_JS_CONTRACT.md`
- [ ] All user-returning API routes use `safeUser()` — `passwordHash` never exposed
- [ ] Style-only changes are in their own commit, separate from logic changes
- [ ] Every new function has at least one test (per Section 2.5 checklist)
- [ ] No existing test was deleted or disabled without explicit approval

---

## 12. Log File Rules

- `logs/test-runs.jsonl` is **append-only**. Never delete entries, never truncate the file.
- It is committed to the repo and is part of permanent history.
- The logging script (`scripts/log-test-run.js`) runs in CI after every test run, pass or fail.
- Do not gitignore anything inside `logs/`.
- Log commits use `[skip ci]` in the message to prevent infinite CI trigger loops.
- The log push step runs on `push` events only (not `pull_request`) and pushes directly
  to `main` via `git push origin HEAD:main`.
- The portal reads `logs/test-runs.jsonl` from `raw.githubusercontent.com` at request time,
  so no `git pull` on the Mac Mini is ever needed for dashboard data to update.

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
