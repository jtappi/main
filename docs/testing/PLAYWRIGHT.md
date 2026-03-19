# Playwright E2E — Patterns, Pitfalls, and Hard-Won Lessons

This document is the authoritative guide for writing Playwright E2E tests in this repo.
Read it before writing any new spec. Every section reflects something that actually broke
in CI and had to be debugged the hard way.

---

## Table of Contents

1. [How CI Runs E2E Tests](#1-how-ci-runs-e2e-tests)
2. [Test Structure Rules](#2-test-structure-rules)
3. [Selectors — Always Use data-testid](#3-selectors--always-use-data-testid)
4. [Interacting With Dynamically-Rendered Content](#4-interacting-with-dynamically-rendered-content)
5. [The Event Delegation Rule](#5-the-event-delegation-rule)
6. [Async Actions and DOM Updates](#6-async-actions-and-dom-updates)
7. [Session and Auth in Tests](#7-session-and-auth-in-tests)
8. [Modal Testing Patterns](#8-modal-testing-patterns)
9. [State Cleanup — Leave It Clean](#9-state-cleanup--leave-it-clean)
10. [What Belongs in E2E vs Unit/Integration](#10-what-belongs-in-e2e-vs-unitintegration)
11. [Debugging Failures](#11-debugging-failures)
12. [Checklist Before Committing a New Spec](#12-checklist-before-committing-a-new-spec)

---

## 1. How CI Runs E2E Tests

**The E2E job runs against a live Node server started in the CI runner.** It is not a mock.

```bash
SESSION_SECRET=ci-e2e-secret NODE_ENV=production node portal/server.js &
```

Key facts that affect test writing:

- The server runs with `NODE_ENV=production`. Session cookie `secure` flag is driven by
  `process.env.NODE_ENV === 'production' && !process.env.CI`. GitHub Actions sets `CI=true`
  automatically, so `secure` resolves to `false` — cookies work over plain HTTP on localhost.
- The server serves `portal/public/` as static files. The files on disk ARE the PR branch
  files — there is no separate build step for portal static assets.
- Tests run with `2 workers` in parallel. Two specs can run simultaneously against the same
  server instance. Design tests to be independent — never assume ordering or shared state.
- The Playwright config (`playwright.config.js`) has no `storageState`. Every test that
  needs auth must call `loginAs()` itself.
- Global setup (`tests/e2e/global-setup.js`) seeds `e2e-admin-001` and `e2e-guest-001`
  into `core/data/users.json` before any test runs. Global teardown removes them after.

**Read `ci.yml` from GitHub before modifying anything about how the server is started or
how tests are run.** Never assume — always verify.

---

## 2. Test Structure Rules

### Every test that needs auth must log in itself

```js
async function loginAs(page, username, password) {
  await page.goto(`${BASE}/login`);
  await page.getByTestId('login-identifier').fill(username);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit-btn').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
}
```

Do not rely on `storageState` from a previous test. Each test owns its own session.

### Always wait for meaningful content before interacting

After navigating to a page that renders data from an API, wait for actual content —
not just the page URL or a container element.

```js
// WRONG — the table might be empty or still loading
await page.goto(`${BASE}/admin`);
await page.getByTestId('admin-edit-btn-e2e-guest-001').click();

// RIGHT — wait for a table row to confirm the API response arrived
await page.goto(`${BASE}/admin`);
await expect(
  page.getByTestId('admin-users-tbody').locator('tr').first()
).toBeVisible({ timeout: 5000 });
await page.getByTestId('admin-edit-btn-e2e-guest-001').click();
```

### Use `await expect(page).toHaveURL(...)` to confirm navigation completed

Do not assume a `goto` or redirect has finished. Use `toHaveURL` with a pattern.

---

## 3. Selectors — Always Use data-testid

**Only `getByTestId()` selectors are permitted in E2E tests.** Never use:
- CSS selectors (`.btn`, `#modal`)
- XPath
- Text-based selectors (`getByText`, `getByRole` with text content)
- Element type selectors (`locator('button')`)

The only exception is `locator('tr').first()` or similar structural helpers used to confirm
a table has rows — never to identify a specific element.

```js
// WRONG
await page.click('.btn-primary');
await page.locator('#edit-user-modal').click();
await page.getByText('Edit').click();

// RIGHT
await page.getByTestId('admin-edit-btn-e2e-guest-001').click();
```

Every new element that needs a test gets a `data-testid` added in the same commit.
All testids are registered in `tests/TESTIDS.md`.

---

## 4. Interacting With Dynamically-Rendered Content

### The innerHTML problem

When a JS function sets `element.innerHTML = ...` to render a list of rows or cards,
the resulting DOM elements are created differently from elements present in the original
HTML. Specifically:

**`onclick="functionName(...)"` attributes on `innerHTML`-injected elements do NOT
reliably fire the target function when triggered by Playwright's `page.click()`.**

This was the root cause of multiple CI failures in this repo. The symptoms are:
- `page.getByTestId('...')` resolves correctly to the element
- `.click()` completes without error
- But the expected side effect (modal opening, state changing) never happens
- The element stays in its initial state for the full timeout period

**The fix is always the same: use event delegation.** See Section 5.

### Why this happens

Inline `onclick` handlers on `innerHTML`-created elements call named functions through the
browser's global scope chain (element → document → window). In a real browser with a real
user click, this works. In Playwright's synthetic click dispatch, the scope resolution can
fail silently — no error is thrown, but the function is never called.

This is not a Playwright bug. It is a consequence of how inline event handlers interact
with async IIFE scope and dynamic DOM injection. The correct pattern for any UI that
renders rows dynamically is always event delegation.

---

## 5. The Event Delegation Rule

**Never use `onclick="..."` attributes on dynamically-rendered elements.** Instead, attach
a single event listener to the static parent container and handle clicks via `data-action`
attributes.

### Pattern

**In the HTML template (static element):**
```html
<tbody id="users-tbody" data-testid="admin-users-tbody"></tbody>
```

**In the JS that renders rows (dynamic innerHTML):**
```js
// WRONG — onclick attributes on dynamic elements
tbody.innerHTML = users.map(u => `
  <tr>
    <td>
      <button onclick="openEditModal('${u.id}')"
        data-testid="admin-edit-btn-${u.id}">Edit</button>
    </td>
  </tr>
`).join('');

// RIGHT — data-action attributes, no onclick
tbody.innerHTML = users.map(u => `
  <tr>
    <td>
      <button data-action="edit" data-id="${u.id}"
        data-testid="admin-edit-btn-${u.id}">Edit</button>
    </td>
  </tr>
`).join('');
```

**Delegation listener (attached once to the static parent):**
```js
document.getElementById('users-tbody').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const id     = btn.dataset.id;

  if (action === 'edit')   openEditModal(id);
  if (action === 'toggle') await handleToggle(id, btn.dataset.active === 'true');
  if (action === 'delete') await handleDelete(id, btn.dataset.name);
});
```

### Rules for data attributes

- `data-action` — the verb: `edit`, `toggle`, `delete`, `save`, etc.
- `data-id` — the record identifier
- `data-active`, `data-name`, etc. — any additional values the handler needs
- All string values embedded via template literals in `innerHTML` must use `${}` directly —
  never eval or dynamic function calls in the template string itself

### Why this works

The delegation listener is attached to an element that exists in the **original HTML**, not
in injected innerHTML. Playwright's `click()` fires a real DOM `click` event that bubbles
normally. The listener on the static parent catches it. No global scope chain required.

---

## 6. Async Actions and DOM Updates

### Always await loadUsers / loadData after mutations

After any PUT, POST, or DELETE that changes server state and should update the table,
always `await` the reload function. Never fire-and-forget:

```js
// WRONG — loadUsers() is async but not awaited
if (res.ok) loadUsers();

// RIGHT
await loadUsers();
```

### Do not guard loadUsers() behind if (res.ok)

```js
// WRONG — silent failure hides bugs and leaves UI stale
if (res.ok) await loadUsers();

// RIGHT — always reload; the table may or may not change but the test can verify
await loadUsers();
```

The `if (res.ok)` guard was the cause of the disable-toggle test staying stale: the PUT
was failing for an unknown reason, `loadUsers()` was never called, and Playwright timed
out waiting for the badge text to change.

### Playwright does NOT wait for async onclick handlers

`page.click()` returns as soon as the click event is dispatched. It does NOT wait for any
Promise returned by an async event handler. To verify an async result:

```js
await page.getByTestId('admin-toggle-btn-e2e-guest-001').click();
// DO NOT immediately check the result — wait for the DOM change:
await expect(
  page.getByTestId('admin-status-badge-e2e-guest-001')
).toContainText('Disabled', { timeout: 5000 });
```

`toContainText`, `toBeVisible`, `toBeHidden`, `toHaveValue` all poll until the timeout.
This is the correct pattern — rely on Playwright's built-in waiting, not `page.waitForTimeout`.

### Never use page.waitForTimeout

`await page.waitForTimeout(500)` is a sleep. It is always wrong. Use assertion-based
waiting instead (`await expect(locator).toBeVisible()`).

---

## 7. Session and Auth in Tests

### Cookie behavior in CI

The portal session cookie is configured:
```js
cookie: {
  secure:   process.env.NODE_ENV === 'production' && !process.env.CI,
  httpOnly: true,
  sameSite: 'lax',
}
```

- `NODE_ENV=production` in CI is `true`
- `process.env.CI` in GitHub Actions is `'true'` (the string, not boolean)
- `!'true'` is `false` — so `secure = false` in CI
- This means session cookies work over plain `http://localhost:3000`

If secure cookies are ever accidentally enabled in CI, ALL tests that require auth will
fail with the same symptom: the login POST succeeds but subsequent protected-route fetches
are treated as unauthenticated (no cookie sent over HTTP).

### SameSite: lax and fetch

`SameSite: 'lax'` allows cookies to be sent on same-site fetch requests (including
`fetch('/admin/users')` from the page). Cookies ARE sent when the page's origin matches
the server's origin — which is always the case in these tests since everything runs on
`localhost:3000`.

### Fetch calls from within page JS use the page's cookies

When a button click triggers a `fetch('/admin/users/:id', {method: 'PUT'})` inside the
page's JavaScript, Playwright's page context sends that fetch with the same session cookie
that was established by the `loginAs()` call. This is correct browser behavior — the fetch
is same-origin, same-site, and the cookie is not `HttpOnly`-blocked from JS (only from
external JS access, not from the browser's own fetch).

---

## 8. Modal Testing Patterns

### Opening a modal

```js
// 1. Wait for the triggering element to exist
await expect(
  page.getByTestId('admin-users-tbody').locator('tr').first()
).toBeVisible({ timeout: 5000 });

// 2. Click the trigger
await page.getByTestId('admin-edit-btn-e2e-guest-001').click();

// 3. Assert the modal is visible
await expect(page.getByTestId('admin-edit-user-modal')).toBeVisible();
```

**Do not skip step 1.** If the trigger button is in a dynamically-rendered table and you
click before the table loads, the element doesn't exist yet — Playwright will throw or the
click will silently do nothing.

### Checking pre-filled values

```js
await expect(page.getByTestId('admin-edit-name')).toHaveValue('E2E Guest');
await expect(page.getByTestId('admin-edit-email')).toHaveValue('e2e-guest@test.local');
await expect(page.getByTestId('admin-edit-username')).toHaveValue('e2e-guest');
await expect(page.getByTestId('admin-edit-password')).toHaveValue(''); // always blank
```

### Closing a modal

```js
await page.getByTestId('admin-cancel-edit-btn').click();
await expect(page.getByTestId('admin-edit-user-modal')).toBeHidden();
```

`toBeHidden()` checks that the element is hidden (has `class="... hidden"`) or not visible.
Do not check for `display: none` or a specific class — use `toBeHidden()` and trust it.

---

## 9. State Cleanup — Leave It Clean

Tests that mutate server state MUST restore it by the end of the test. If a test changes
a user's name, it must change it back. If it disables a user, it must re-enable.

```js
test('saving an edit updates the users table', async ({ page }) => {
  // ... setup and edit ...
  await page.getByTestId('admin-edit-name').fill('E2E Guest Edited');
  await page.getByTestId('admin-save-edit-btn').click();
  await expect(page.getByTestId('admin-users-tbody')).toContainText('E2E Guest Edited');

  // Restore — always at the end of the test, before any assertion that could fail
  await page.getByTestId('admin-edit-btn-e2e-guest-001').click();
  await page.getByTestId('admin-edit-name').fill('E2E Guest');
  await page.getByTestId('admin-save-edit-btn').click();
  await expect(page.getByTestId('admin-edit-user-modal')).toBeHidden();
});
```

Why: tests run with 2 workers. A subsequent test may read state that a previous test
left dirty. Global teardown only removes test users entirely — it does not reset field values.

---

## 10. What Belongs in E2E vs Unit/Integration

### Use E2E for

- Auth flows: login, logout, session persistence, RBAC enforcement in the browser
- Critical user journeys: submit a form, verify the result appears in the UI
- Server-enforced state changes: disable a user, verify the UI reflects the new state
- Round-trips: create a resource via the UI, confirm it persists and is visible after reload

### Do NOT use E2E for

- Client-side form validation (disabled button before submit, inline error messages)
  → Unit test the component or integration test the API boundary
- DOM structure checks ("this heading exists", "this div is present")
  → If the smoke check passes, structure is fine
- Keyboard shortcuts, hover states, CSS transitions
  → Not E2E territory
- Any behavior fully covered by an existing integration test
  → Don't duplicate

### The litmus test

> "Would this test catch a bug that a unit or integration test cannot?"
> "Does this require a real browser, a running server, and a live session?"

Both must be yes. If not, write it at a lower level.

---

## 11. Debugging Failures

### Read the log before guessing

Every CI E2E run appends results to `logs/test-runs.jsonl`. The error messages are stored
in the `errors` array inside the `e2e.suites` object. Read those before theorizing.

### Playwright artifacts

On failure, CI uploads:
- `playwright-report-portal` — HTML report with full trace
- Screenshots (named after the failed test)
- Video (`retain-on-failure` mode)

The test report is also deployed to `trackmyweek.com/playwright-reports/PR-{number}/portal/`.

### Common failure patterns and their causes

| Symptom | Most Likely Cause |
|---------|-------------------|
| Modal stays hidden after click | `onclick` on `innerHTML` element — use event delegation |
| Badge/text never changes after button click | `loadUsers()` not awaited, or guarded by `if (res.ok)` that silently swallowed a failure |
| All auth-required tests fail with redirect to login | `secure: true` cookie over HTTP — check `NODE_ENV` and `CI` env vars |
| Tests pass locally but fail in CI | `2 workers` parallel execution causing shared state collision — make tests independent |
| `locator resolved to <element>` but action has no effect | `onclick` on dynamic innerHTML — switch to event delegation |
| `toHaveURL` timeout after clicking submit | Session not established — verify `loginAs()` assertion passed, check cookie config |
| Specific test user not found | Global setup not seeding correctly, or test ran before global setup completed |

### The `9 × locator resolved to <element>` pattern

When Playwright polls an assertion 9 times and always gets the same value, it means:
1. The element IS in the DOM (locator resolves correctly)
2. Its state is NOT changing
3. Something is preventing the triggering action from having an effect

This is almost always the event handler problem (Section 4/5) or the async guard problem (Section 6).

---

## 12. Checklist Before Committing a New Spec

Run through this before every new test or test modification:

- [ ] Every interaction element uses `data-testid` — no CSS, XPath, or text selectors
- [ ] `data-testid` attributes are registered in `tests/TESTIDS.md`
- [ ] After `page.goto('/page-that-loads-data')`, wait for actual data content before interacting
- [ ] Buttons in dynamically-rendered rows use event delegation, NOT `onclick="..."` attributes
- [ ] Any action that modifies server state `await`s the reload function unconditionally
- [ ] Any test that mutates state (renames a user, disables a user) restores it at the end
- [ ] No `page.waitForTimeout` — use assertion-based waiting only
- [ ] Test is independent of all other tests — no assumed ordering, no shared state
- [ ] Test passes the E2E litmus test (Section 10) — would unit/integration catch this instead?
- [ ] `docs/testing/<PROJECT>.md` updated with new test entry in the same commit
