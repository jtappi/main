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
   cannot accomplish the task.
4. **Test every command block mentally** before sending it. If a command depends on state
   (current branch, file existence, env vars), make that state explicit in the block.

This rule exists because ambiguous command blocks have caused branch mixups, zsh errors,
and wasted cycles that could have been avoided entirely.

---

## 1. Read Before You Write — Always

Before writing tests, code, or config for any file that already exists:

1. **Read the file first** using `get_file_contents`.
2. **Understand what it actually does** — do not assume based on naming or convention.
3. **Only then** write code or tests that reflect reality.

This rule exists because tests were previously written against assumed middleware behavior
without reading `middleware.js` first. The tests were wrong. The middleware was correct.
That failure cost multiple fix cycles and eroded confidence.

**The rule in one sentence:** Assumptions are bugs waiting to happen. Read the source.

---

## 2. Tests Must Reflect Actual Behavior

- Tests describe what the code **does**, not what you think it should do.
- If a test fails because the test's expectation is wrong (not the code), that is a test authoring error.
- Before asserting any return value, status code, or side effect, verify it in the source.
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

---

## 6. Package Layout — Where Things Live

This is a monorepo. Package ownership is split intentionally:

| Package | Owner | Why |
|---------|-------|-----|
| `jest`, `supertest` | `portal/package.json` | Run from `portal/`; resolve modules via `modulePaths` |
| `@playwright/test` | root `package.json` | E2E specs live in `tests/e2e/` at root; Playwright must be installed where specs are |
| `playwright.config.js` | repo root | Co-located with root `package.json` and `tests/` |

**Running tests:**
```
cd portal && npm test
cd ~/apps/main && npm run test:e2e
```

**After pulling changes, install in both locations:**
```
cd ~/apps/main && npm install
cd portal && npm install
```

**Jest config notes:**
- `roots` points to `["../tests/unit", "../tests/integration"]` (relative to `portal/`)
- `modulePaths: ["<rootDir>/node_modules"]` ensures `supertest` etc. resolve from `portal/node_modules`
  even though test files are outside `portal/`

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

- **Always use `push_files` to write file content** — never `create_or_update_file`.
- `create_or_update_file` corrupts content by writing literal `\n` escape sequences instead of
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
| Portal package.json | `portal/package.json` (owns Jest, supertest) |
| CI workflow | `.github/workflows/ci.yml` |
| Test run logs | `logs/test-runs.jsonl` (append-only, never deleted) |
| Log script | `scripts/log-test-run.js` |
| This file | `CLAUDE.md` |

---

## 11. Before Pushing to Main

- [ ] Unit + integration tests pass: `cd portal && npm test`
- [ ] E2E tests pass: `cd ~/apps/main && npm run test:e2e`
- [ ] No new `data-testid` added without a corresponding entry in `tests/TESTIDS.md`
- [ ] No element ID changed without updating `docs/HTML_JS_CONTRACT.md`
- [ ] All user-returning API routes use `safeUser()` — `passwordHash` never exposed
- [ ] Style-only changes are in their own commit, separate from logic changes
- [ ] After any `npm install` in `portal/`, run `git add portal/package-lock.json`

---

## 12. Log File Rules

- `logs/test-runs.jsonl` is **append-only**. Never delete entries, never truncate the file.
- It is committed to the repo and is part of permanent history.
- The logging script (`scripts/log-test-run.js`) runs in CI after every test run, pass or fail.
- Do not gitignore anything inside `logs/`.
