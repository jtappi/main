# CLAUDE.md — Working Agreement for AI-Assisted Development

This file is the mandatory starting point for every AI-assisted session on this repo.
Before writing any code, creating any file, or making any commit, read this document in full.

---

## 1. Read Before You Write — Always

Before writing tests, code, or config for any file that already exists:

1. **Read the file first** using `get_file_contents` or equivalent.
2. **Understand what it actually does** — do not assume based on naming or convention.
3. **Only then** write code or tests that reflect reality.

This rule exists because tests were previously written against assumed middleware behavior
without reading `middleware.js` first. The tests were wrong. The middleware was correct.
That failure cost multiple fix cycles and eroded confidence.

**The rule in one sentence:** Assumptions are bugs waiting to happen. Read the source.

---

## 2. Tests Must Reflect Actual Behavior

- Tests describe what the code **does**, not what you think it should do.
- If a test fails because the test's expectation is wrong (not because the code is broken),
  that is a test authoring error — not a code bug.
- Before asserting any return value, status code, or side effect, verify it exists in the source.
- Mock objects must implement **every method the code under test calls** — no partial mocks.

---

## 3. data-testid Is a Contract

- `data-testid` attributes are never renamed or removed unless the element's **purpose** changes.
- They are never referenced in CSS or JS logic — only in tests.
- Any new element that needs a test gets a `data-testid` added in the same commit.
- The authoritative list lives in `tests/TESTIDS.md`. Keep it current.
- Style refactors and structural/functional changes are always **separate commits**.

---

## 4. Element IDs Are a Contract

- JavaScript-wired element IDs (those referenced via `getElementById` or similar) are frozen.
- They are listed in `docs/HTML_JS_CONTRACT.md`.
- Never rename an ID without updating the JS that uses it and the contract doc in the same commit.
- CSS classes and `data-testid` attributes are free to change without touching JS.

---

## 5. Test Setup Rules

- **Unit tests** test one module in isolation with no I/O. Use temp files from `os.tmpdir()` for
  any test that needs to write data; never write to fixture files.
- **Integration tests** use `supertest` against the real Express app. Always `jest.resetModules()`
  and re-require `app` in `beforeEach` so env vars (e.g. `USERS_FILE`) take effect per-test.
- **E2E tests** use only `data-testid` selectors via `page.getByTestId()`. Never use CSS selectors,
  XPath, or text-based selectors in Playwright tests.
- Fixture files in `tests/fixtures/` are **read-only**. Copy them to a temp path before any test
  that mutates data.

---

## 6. Jest + Playwright Configuration

- All tests live under `tests/` at the repo root; the app lives in `portal/`.
- Jest is run from `portal/` with `npm test`. The `roots` config points to `../tests/unit`
  and `../tests/integration`.
- `modulePaths` in `jest` config is set to `<rootDir>/node_modules` so that packages installed
  in `portal/node_modules` resolve correctly for tests outside that directory.
- Playwright config lives at `portal/playwright.config.js` with `testDir: '../tests/e2e'`.
  Run E2E tests with `npm run test:e2e` from `portal/`.
- `supertest` and `@playwright/test` are in `portal/devDependencies`. Always run `npm install`
  from `portal/` after pulling changes.

---

## 7. Commit Discipline

- One concern per commit. Do not mix style changes with logic changes.
- Commit messages follow: `type: description` where type is one of:
  `feat`, `fix`, `test`, `docs`, `refactor`, `chore`.
- When adding a new UI element: one commit for the element + its `data-testid` + TESTIDS.md update.
- When changing JS logic that touches an element ID: one commit for JS + HTML + HTML_JS_CONTRACT.md.

---

## 8. Security Non-Negotiables

- `passwordHash` is **never** returned in any API response. Verify this in any route that returns user objects.
- `users.json` and `.env` are gitignored and never committed.
- `cookie.secure` is driven by `process.env.NODE_ENV === 'production'` — never hardcoded.
- The `SESSION_SECRET` env var must be set in production. The fallback `'dev-secret-change-me'`
  is intentionally weak to make misconfiguration obvious in logs.

---

## 9. Key File Locations

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
| Test fixtures | `tests/fixtures/` |
| data-testid inventory | `tests/TESTIDS.md` |
| HTML/JS element contract | `docs/HTML_JS_CONTRACT.md` |
| This file | `CLAUDE.md` |

---

## 10. Before Opening a PR or Pushing to Main

- [ ] All unit and integration tests pass: `npm test` from `portal/`
- [ ] No new `data-testid` added without a corresponding entry in `tests/TESTIDS.md`
- [ ] No element ID changed without updating `docs/HTML_JS_CONTRACT.md`
- [ ] `passwordHash` is absent from all API responses
- [ ] Style-only changes are in their own commit, separate from logic changes
