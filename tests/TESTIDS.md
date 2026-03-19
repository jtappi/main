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

---

## BP Tracker — Capture (`Capture.jsx`)

| testid | Element | Notes |
|--------|---------|-------|
| `capture-view` | Outer container | Present in idle, manual, and previewing states |
| `capture-greeting` | "Hello, [name]" text | Present in idle and manual states |
| `capture-datetime` | Current date/time text | Idle state only |
| `capture-camera-btn` | Camera circle button | Idle state only |
| `capture-file-input` | Hidden file input | Idle state only |
| `capture-manual-btn` | "Enter manually" underlined button | Idle state only; triggers manual entry form |
| `manual-entry-section` | Wrapper div for inline manual form | Manual state only |
| `recent-readings` | Recent readings container | Idle state only |

---

## BP Tracker — ManualEntry (`ManualEntry.jsx`)

Used in two contexts: inside Preview (extraction failed) and inside Capture (manual entry button).

| testid | Element | Notes |
|--------|---------|-------|
| `manual-entry` | Form container | |
| `manual-systolic` | Systolic number input | |
| `manual-diastolic` | Diastolic number input | |
| `manual-heartrate` | Heart rate number input | |
| `manual-save-error` | Save error message | Hidden until save fails |
| `manual-cancel-btn` | Secondary action button | Label is "Retake" from Preview, "Cancel" from Capture |
| `manual-save-btn` | "Save Reading" primary button | |

---

## BP Tracker — Preview (`Preview.jsx`)

| testid | Element | Notes |
|--------|---------|-------|
| `preview-view` | Outer container | All preview states |
| `preview-retake-btn` | Back arrow button (top) | All preview states |
| `preview-image` | Photo thumbnail | All states when imagePreviewUrl present |
| `preview-extracting` | Spinner + text | Loading state |
| `preview-unreadable` | Error block | Unreadable image state |
| `preview-retake-btn-unreadable` | Retake button | Unreadable state |
| `preview-failed` | Error block | Extraction failed state |
| `preview-confidence-warning` | Low-confidence warning banner | Success state, confidence=low |
| `preview-systolic` | Systolic input | Success state |
| `preview-diastolic` | Diastolic input | Success state |
| `preview-heartrate` | Heart rate input | Success state |
| `preview-notes` | Notes textarea | Success state |
| `preview-save-error` | Save error message | Success state, after failed save |
| `preview-retake-btn-main` | Retake button (action row) | Success state |
| `preview-save-btn` | Save Reading button | Success state |

---

## BP Tracker — Success (`Success.jsx`)

| testid | Element | Notes |
|--------|---------|-------|
| `success-view` | Outer container | |
| `success-reading-summary` | Saved values display | Only present when reading passed via router state |
| `success-done-btn` | Done button | |
| `success-reports-btn` | View Reports button | |
