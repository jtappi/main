# data-testid Inventory

Every `data-testid` attribute used in E2E tests must be listed here.
This is the authoritative reference. Keep it current with every PR.

---

## Portal — Login (`login.html`)

| testid | Element | Notes |
|--------|---------|-------|
| `login-card` | Auth card container | |
| `login-identifier` | Username/email input | |
| `login-password` | Password input | |
| `login-submit-btn` | Submit button | |
| `login-error` | Error message div | Hidden until login fails |

---

## Portal — Dashboard (`dashboard.html`)

| testid | Element | Notes |
|--------|---------|-------|
| `dashboard-header` | Top bar header | |
| `dashboard-user-name` | Logged-in user name span | |
| `dashboard-admin-link` | Admin panel link | Hidden for non-admin |
| `dashboard-logout-btn` | Sign out button | |
| `dashboard-project-grid` | Project cards container | |

---

## Portal — Admin Panel (`admin.html`)

| testid | Element | Notes |
|--------|---------|-------|
| `admin-header` | Admin panel header | |
| `admin-users-tbody` | Users table body | Static parent for event delegation |
| `admin-status-badge-{id}` | Active/Disabled badge per user | Dynamic; `{id}` = user id |
| `admin-edit-btn-{id}` | Edit icon button per user | Dynamic |
| `admin-toggle-btn-{id}` | Disable/Enable icon button per user | Dynamic |
| `admin-delete-btn-{id}` | Delete icon button per user | Dynamic |
| `admin-edit-user-modal` | Edit user modal | Hidden until Edit clicked |
| `admin-edit-modal-error` | Error message inside edit modal | Hidden until error |
| `admin-edit-name` | Name input in edit modal | |
| `admin-edit-email` | Email input in edit modal | |
| `admin-edit-username` | Username input in edit modal | |
| `admin-edit-password` | Password input in edit modal | Always blank on open |
| `admin-edit-project-access` | Project access checkbox group | |
| `admin-save-edit-btn` | Save button in edit modal | |
| `admin-cancel-edit-btn` | Cancel button in edit modal | |

---

## TrackMyWeek / BP Tracker — Portal Top Bar

Shown inside subprojects when the user has more than one project (or is admin).

| testid | Element | Notes |
|--------|---------|-------|
| `portal-top-bar` | Top bar header element | Hidden for single-project users |
| `portal-back-link` | “← Dashboard” anchor | Navigates to `/dashboard` |
| `portal-top-bar-user` | User name pill | |
| `portal-top-bar-signout` | Sign out button | |
