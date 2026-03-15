# Portal — Test Catalog

**Project:** Portal (trackmyweek.com root app — auth, admin, project management)
**Test runner:** Jest + Supertest (unit/integration), Playwright (E2E)
**Run commands:**
```bash
cd portal && npm test                     # unit + integration
cd ~/apps/main && npm run test:e2e        # E2E (Playwright)
```

---

## Table of Contents
- [Testing Tools](#testing-tools)
- [Critical Tests](#critical-tests)
- [Smoke Tests](#smoke-tests)
- [Regression Tests](#regression-tests)
- [Integration Tests](#integration-tests)
- [Unit Tests](#unit-tests)
- [Coverage Gaps](#coverage-gaps)

---

## Testing Tools

| Tool | Version source | Purpose |
|------|---------------|--------|
| **Jest** | `portal/package.json` | Unit and integration test runner |
| **Supertest** | `portal/package.json` | HTTP integration testing against live Express app |
| **Playwright** | root `package.json` | E2E browser automation |
| **Chromium** | Playwright-managed | Browser for E2E tests |

**Configs:**
- Jest: `portal/package.json` (`jest` key)
- Playwright (local): `playwright.config.js` (repo root)
- Playwright (CI): same config, reporters defined in config, not CLI
- E2E global setup: `tests/e2e/global-setup.js` (seeds e2e users)
- E2E global teardown: `tests/e2e/global-teardown.js` (removes e2e users)

---

## Critical Tests

Critical = app is broken for all users if this fails.

### E2E — `tests/e2e/login.spec.js`

| Status | Test | What it verifies |
|--------|------|------------------|
| ✅ | `admin login redirects to dashboard` | Admin credentials authenticate and session is established |
| ✅ | `guest login redirects to dashboard` | Guest credentials authenticate and session is established |
| ✅ | `authenticated session skips login page` | Active session is preserved across navigation |
| ✅ | `unauthenticated access to /dashboard redirects to login then back` | Unauthenticated user is redirected to login with returnTo, then lands on original page after login |
| ✅ | `unauthenticated access to /admin redirects to login then back for admin user` | Same flow for admin-only page |

### Integration — `tests/integration/portal.test.js`

| Status | Test | What it verifies |
|--------|------|------------------|
| ✅ | `POST /auth/login — returns success for valid admin` | Auth endpoint accepts valid admin credentials |
| ✅ | `POST /auth/login — returns success for valid guest` | Auth endpoint accepts valid guest credentials |
| ✅ | `POST /auth/login — returns 401 for wrong password` | Auth rejects bad credentials |
| ✅ | `POST /auth/login — returns 401 for inactive user` | Inactive accounts cannot log in |
| ✅ | `POST /auth/logout — destroys session` | Logout fully clears the session |
| ✅ | `GET /auth/session — authenticated:true after login` | Session state is correctly returned |
| ✅ | `GET /auth/session — passwordHash never exposed` | Auth response never leaks password hash |

---

## Smoke Tests

Smoke = a specific surface is broken if this fails, but the whole app still works.

### E2E — `tests/e2e/login.spec.js`

| Status | Test | What it verifies |
|--------|------|------------------|
| ✅ | `login page loads` | `/login` route is reachable and renders the login card |

### E2E — `tests/e2e/dashboard.spec.js`

| Status | Test | What it verifies |
|--------|------|------------------|
| ✅ | `dashboard loads with project cards for guest` | Dashboard renders and `/api/projects` returned data |
| ✅ | `unauthenticated /dashboard redirects to /login` | Auth boundary on dashboard route |

### E2E — `tests/e2e/admin.spec.js`

| Status | Test | What it verifies |
|--------|------|------------------|
| ✅ | `admin panel loads with users table populated` | Admin page renders and `/admin/users` returned data |
| ✅ | `unauthenticated /admin returns 403` | Auth boundary on admin route |
| ✅ | `guest cannot access /admin (403)` | Role boundary on admin route |
| 🔴 | `test dashboard loads for admin user` | `/test-dashboard` route is reachable and renders |

### Integration — `tests/integration/portal.test.js`

| Status | Test | What it verifies |
|--------|------|------------------|
| ✅ | `GET /login — returns 200 with HTML` | Login route is reachable |
| ✅ | `GET / — redirects to /login when unauthenticated` | Root redirect works |
| ✅ | `GET /dashboard — returns 200 for authenticated user` | Dashboard route serves HTML |
| ✅ | `GET /admin — returns 200 for admin user` | Admin route serves HTML for admin |
| ✅ | `GET /api/projects — returns projects for authenticated guest` | Projects API returns data |

---

## Regression Tests

Regression = written to prevent a previously-fixed bug from returning.

| Status | Test | Bug prevented | Location |
|--------|------|--------------|----------|
| ✅ | `passwordHash never returned in any API response` | Password hash exposure | `tests/integration/portal.test.js` |
| ✅ | `DELETE /admin/users/:id prevents self-deletion` | Admin self-lock | `tests/integration/portal.test.js` |

---

## Integration Tests

Full list in `tests/integration/portal.test.js`.

### Auth
| Status | Test |
|--------|------|
| ✅ | `POST /auth/login` — valid admin, valid guest, wrong password, inactive user, missing fields |
| ✅ | `GET /auth/session` — unauthenticated, authenticated |
| ✅ | `POST /auth/logout` — session destroyed |

### Protected Routes
| Status | Test |
|--------|------|
| ✅ | `GET /dashboard` — redirects to `/login?returnTo=%2Fdashboard` when unauth, 200 when auth |
| ✅ | `GET /admin` — redirects to `/login?returnTo=%2Fadmin` when unauth, 403 for guest, 200 for admin |
| ✅ | `GET /api/projects` — redirects to `/login?returnTo=...` when unauth, filtered for guest, all for admin |

### Admin User CRUD
| Status | Test |
|--------|------|
| ✅ | `GET /admin/users` — 200 for admin, 403 for guest, no passwordHash in response |
| ✅ | `POST /admin/users` — creates guest, returns 201, no passwordHash |
| ✅ | `POST /admin/users` — 400 for missing fields |
| ✅ | `PUT /admin/users/:id` — updates field, no passwordHash in response |
| ✅ | `DELETE /admin/users/:id` — removes user |
| ✅ | `DELETE /admin/users/:id` — prevents self-deletion |

---

## Unit Tests

### `tests/unit/auth.test.js` — `core/auth/auth.js`

| Status | Function | Tests |
|--------|----------|-------|
| ✅ | `hashPassword` | Returns 64-char hex, matches known SHA-256, different inputs differ |
| ✅ | `loadUsers` | Returns array from fixture, throws on missing file |
| ✅ | `findUser` | Finds by email, finds by username, null for unknown |
| ✅ | `authenticate` | Valid admin, valid guest, wrong password, unknown user, inactive user |
| ✅ | `updateLastLogin` | Sets timestamp, no-op for unknown id |
| ✅ | `getAllUsers` | Returns all users |
| ✅ | `getUserById` | Returns correct user, null for unknown |
| ✅ | `createUser` | Adds user with id, hashes password, does not store plaintext |
| ✅ | `updateUser` | Updates field, hashes password if included, null for unknown |
| ✅ | `deleteUser` | Removes user and returns true, false for unknown |

### `tests/unit/middleware.test.js` — `core/auth/middleware.js`

| Status | Function | Tests |
|--------|----------|-------|
| ✅ | `requireAuth` | Calls next for authenticated; redirects to `/login?returnTo=<url>` when no session; encodes URL correctly |
| ✅ | `requireAdmin` | Calls next for admin, 403 for guest, 403 for unauthenticated |
| ✅ | `requireProjectAccess` | Admin bypasses check, guest with access passes, guest without access gets 403, unauthenticated redirected to `/login?returnTo=<url>` |

---

## Coverage Gaps

These tests do not exist yet. They are the authoritative backlog for Portal test coverage.
Do not remove an entry without adding the test.

| Priority | Type | What to test | Notes |
|----------|------|-------------|-------|
| High | Smoke (E2E) | `/test-dashboard` loads for admin user | All admin users should be able to access the test dashboard |
| Medium | Integration | `GET /test-dashboard` — 200 for admin, 403 for guest | Route-level auth boundary |
| Medium | Integration | Admin project CRUD (`POST`, `PUT`, `DELETE /admin/projects`) | Not yet implemented in server or tested |
