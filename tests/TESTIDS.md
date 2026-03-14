# data-testid Inventory

This document is the authoritative list of all `data-testid` attributes in the portal and TrackMyWeek UI.
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

## TrackMyWeek — Log Entry (`/trackmyweek/log`)

| testid | Element | Purpose |
|--------|---------|------|
| `entry-form` | form | Main log entry form container |
| `entry-text-input` | input | Text entry field (inside Autocomplete) |
| `entry-notes-input` | textarea | Optional notes field |
| `entry-submit` | button | Submit the log entry |
| `entry-error` | p | Validation/submission error message |
| `entry-success` | p | Success feedback after logging |
| `category-grid` | div | Grid of category selection buttons |
| `category-btn-{name}` | button | Category selection button (dynamic, keyed by category name) |

---

## TrackMyWeek — View Data (`/trackmyweek/view`)

| testid | Element | Purpose |
|--------|---------|------|
| `day-chart` | div | Day view chart card |
| `day-chart-date` | input | Date picker for day chart |
| `filter-bar` | div | Filter controls container |
| `filter-keyword` | input | Keyword search input |
| `filter-category` | select | Category filter dropdown |
| `filter-daterange` | select | Date range filter dropdown |
| `filter-reset` | button | Reset all filters |
| `entries-table` | table | Entries data table |
| `entry-row-{id}` | tr | Table row for an entry (dynamic, keyed by entry id) |
| `cell-text-{id}` | span | Editable text cell (dynamic) |
| `cell-category-{id}` | span | Editable category cell (dynamic) |
| `cell-notes-{id}` | span | Editable notes cell (dynamic) |
| `cell-timestamp-{id}` | span | Editable timestamp cell (dynamic) |
| `delete-btn-{id}` | button | Delete entry button (dynamic) |
| `confirm-delete-{id}` | button | Confirm delete button (dynamic) |

---

## TrackMyWeek — Categories (`/trackmyweek/categories`)

| testid | Element | Purpose |
|--------|---------|------|
| `category-list` | ul | List of existing categories |
| `cat-row-{id}` | li | Category row (dynamic, keyed by category id) |
| `new-cat-name` | input | New category name input |
| `add-cat-btn` | button | Submit new category |
| `edit-btn-{id}` | button | Open inline edit for a category (dynamic) |
| `edit-name-{id}` | input | Inline edit name input (dynamic) |
| `delete-btn-{id}` | button | Open delete confirm for a category (dynamic) |
| `confirm-delete-{id}` | button | Confirm delete button (dynamic) |

---

## TrackMyWeek — Questions (`/trackmyweek/questions`)

| testid | Element | Purpose |
|--------|---------|------|
| `new-question-input` | textarea | New question text input |
| `add-question-btn` | button | Submit new question |
| `q-card-{id}` | div | Question card (dynamic) |
| `answer-btn-{id}` | button | Open answer panel for a question (dynamic) |
| `edit-q-btn-{id}` | button | Edit question text (dynamic) |
| `delete-btn-{id}` | button | Open delete confirm (dynamic) |
| `confirm-delete-{id}` | button | Confirm delete (dynamic) |

---

## TrackMyWeek — Reports (`/trackmyweek/reports`)

| testid | Element | Purpose |
|--------|---------|------|
| `new-report-btn` | button | Open the report builder panel |
| `report-builder` | div | Report builder slide-in panel |
| `builder-close` | button | Close the report builder |
| `builder-next` | button | Advance to next step |
| `builder-save` | button | Save the report |
| `chart-type-{key}` | button | Chart type selection (dynamic, e.g. chart-type-bar) |
| `measure-{key}` | button | Measure selection (dynamic) |
| `groupby-{key}` | button | Group-by selection (dynamic) |
| `daterange-{key}` | button | Date range selection (dynamic) |
| `report-name-input` | input | Report name input on final step |

---

## TrackMyWeek — Test Dashboard (`/test-dashboard`)

| testid | Element | Purpose |
|--------|---------|------|
| `test-dashboard-header` | header | Top navigation bar |
| `test-dashboard-user-name` | span | Logged-in user name |
| `test-dashboard-admin-link` | a | Link to admin panel |
| `test-dashboard-logout-btn` | button | Logout button |
| `test-dashboard-title` | h2 | Page title |
| `test-dashboard-project-select` | select | Project filter dropdown |
| `test-dashboard-type-select` | select | Run type filter dropdown (Jest / E2E) |
| `test-dashboard-days-select` | select | Date range filter dropdown |
| `test-dashboard-health-row` | div | Health indicator cards container |
| `test-dashboard-health-card` | div | Overall health card |
| `test-dashboard-health-pct` | div | Health percentage value |
| `test-dashboard-total-runs` | div | Total runs count |
| `test-dashboard-last-run` | div | Last run date |
| `test-dashboard-avg-duration` | div | Average duration value |
| `test-dashboard-chart-passfail` | canvas | Pass/fail trend chart |
| `test-dashboard-chart-unit-duration` | canvas | Unit test duration chart |
| `test-dashboard-chart-int-duration` | canvas | Integration test duration chart |
| `test-dashboard-chart-e2e-duration` | canvas | E2E test duration chart |
| `test-dashboard-suite-row` | div | Suite breakdown cards container |
| `test-dashboard-suite-{project}` | div | Suite card per project (dynamic) |
| `test-dashboard-history` | div | Run history section |
| `test-dashboard-history-table` | table | Run history table |
| `test-dashboard-history-tbody` | tbody | Run history table body |

---

## Conventions

- Format: `{page}-{element-description}` for portal; `{element-description}` or `{element}-{id}` for TrackMyWeek components
- `data-testid` is ONLY for testing — never referenced in CSS or JS logic
- When an element is added to the UI, its testid must be added here in the same commit
- When an element is removed, its testid must be removed from this file and its tests updated
- Dynamic testids (keyed by id or name) are noted with `{id}` or `{name}` placeholders
