# HTML / JavaScript Element Contract

This document defines the **stable element IDs** that JavaScript depends on.
These IDs must **never be renamed or removed** during styling or HTML refactors.
Only `data-testid` attributes and CSS classes are safe to change cosmetically.

---

## login.html

| Element ID | Used in | Purpose |
|---|---|---|
| `login-btn` | `login.js` | Submit button — click handler + disable/enable during request |
| `error-msg` | `login.js` | Error message container — shown/hidden on auth failure |
| `identifier` | `login.js` | Email/username input — value read on submit |
| `password` | `login.js` | Password input — value read on submit |

## dashboard.html

| Element ID | Used in | Purpose |
|---|---|---|
| `user-name` | `dashboard.js` | Span where logged-in user's name is written |
| `admin-link` | `dashboard.js` | Admin link — `hidden` class removed for admin users |
| `logout-btn` | `dashboard.js` | Logout button — click handler |
| `project-grid` | `dashboard.js` | Container — project card HTML injected here |

## admin.html

| Element ID | Used in | Purpose |
|---|---|---|
| `logout-btn` | `admin.js` | Logout button — click handler |
| `create-user-btn` | `admin.js` | Opens create user modal |
| `create-user-modal` | `admin.js` | Modal overlay — `hidden` class toggled |
| `modal-error` | `admin.js` | Error in modal — shown/hidden + textContent set |
| `new-name` | `admin.js` | New user name input |
| `new-email` | `admin.js` | New user email input |
| `new-username` | `admin.js` | New user username input |
| `new-password` | `admin.js` | New user password input |
| `new-project-access` | `admin.js` | Checkbox group injected here |
| `save-user-btn` | `admin.js` | Saves new user |
| `cancel-user-btn` | `admin.js` | Closes modal |
| `users-tbody` | `admin.js` | Table body — user rows injected here |
| `projects-tbody` | `admin.js` | Table body — project rows injected here |

---

## Rules

1. **Never rename an ID in this table** without updating the corresponding JS and this doc in the same commit.
2. **CSS classes and `data-testid` are free to change** without touching JS or tests.
3. **Tab switching** in admin.js uses `data-tab` attributes and `tab-` prefixed IDs (`tab-users`, `tab-projects`). Do not rename those either.
4. When adding a new JS-wired element, add it to this table and to `tests/TESTIDS.md` in the same PR.
