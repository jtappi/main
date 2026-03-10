# data-testid Inventory

This document is the authoritative list of all `data-testid` attributes in the portal UI.
Every testid here maps to at least one test. If you add a new element, add it here too.

---

## Login Page (`/login`)

| testid | Element | Purpose |
|--------|---------|------|
| `login-card` | div | Outer login card container |
| `login-logo` | div | Logo/branding area |
| `login-identifier` | input | Email or username field |
| `login-password` | input | Password field |
| `login-submit-btn` | button | Submit login form |
| `login-error` | div | Error message container |

---

## Dashboard (`/dashboard`)

| testid | Element | Purpose |
|--------|---------|------|
| `dashboard-header` | header | Top navigation bar |
| `dashboard-brand` | div | Brand name/logo |
| `dashboard-user-name` | span | Logged-in user's name |
| `dashboard-admin-link` | a | Link to admin panel (admin only) |
| `dashboard-logout-btn` | button | Logout button |
| `dashboard-project-grid` | div | Container for project cards |
| `dashboard-loading` | div | Loading indicator |

---

## Admin Panel (`/admin`)

| testid | Element | Purpose |
|--------|---------|------|
| `admin-header` | header | Top navigation bar |
| `admin-dashboard-link` | a | Back to dashboard link |
| `admin-logout-btn` | button | Logout button |
| `admin-tabs` | div | Tab bar container |
| `admin-tab-users` | button | Users tab button |
| `admin-tab-projects` | button | Projects tab button |
| `admin-users-panel` | div | Users tab content |
| `admin-projects-panel` | div | Projects tab content |
| `admin-create-user-btn` | button | Open create guest modal |
| `admin-users-table` | table | Users data table |
| `admin-users-tbody` | tbody | Users table body |
| `admin-projects-table` | table | Projects data table |
| `admin-projects-tbody` | tbody | Projects table body |
| `admin-create-user-modal` | div | Create guest modal overlay |
| `admin-modal-error` | div | Modal error message |
| `admin-new-name` | input | New user name field |
| `admin-new-email` | input | New user email field |
| `admin-new-username` | input | New user username field |
| `admin-new-password` | input | New user password field |
| `admin-project-access-checkboxes` | div | Project access checkbox group |
| `admin-save-user-btn` | button | Save new user |
| `admin-cancel-user-btn` | button | Cancel / close modal |

---

## Conventions

- Format: `{page}-{element-description}`
- `data-testid` is ONLY for testing — never referenced in CSS or JS logic
- When an element is added to the UI, its testid must be added here in the same commit
- When an element is removed, its testid must be removed from this file and its tests updated
