# trackmyweek.com — Platform Specification

**Version:** 1.2  
**Date:** 2026-03-10  
**Status:** APPROVED — Ready to Build  

---

## 1. Vision

A self-hosted personal development portfolio and app ecosystem that serves as both a practice ground for development skills (especially AI) and a collection of genuinely useful personal life apps. Protected by enterprise-grade security, fully monitored, with CI/CD pipelines and a multi-project architecture designed to grow over time.

---

## 2. Goals

- Single login to access all projects (SSO)
- Practice modern development skills including AI integration
- Build genuinely useful personal apps over time
- Full visibility into errors, performance, and uptime
- CI/CD pipeline for easy deployments
- Ability to invite guests to specific projects with granular access control
- Architecture that supports adding new sub-projects at any time

---

## 3. Technology Stack

| Component | Technology |
|-----------|------------|
| Web Server | Nginx |
| CDN / Proxy | Cloudflare (Full Strict SSL) |
| Process Manager | PM2 |
| Monitoring | Better Stack |
| Version Control | GitHub (private monorepo: jtappi/main) |
| Runtime | Node.js |
| Database | JSON files (migrate to MongoDB later) |
| Future | AWS, MongoDB, New Relic |

---

## 4. Current Scope

This spec covers **Phase 1 and Phase 2** only:

| Project | Description | Status |
|---------|-------------|--------|
| **Portal** | Main entry point — login, dashboard, admin panel | 🔜 Building now |
| **TrackMyWeek** | Activity and week tracking app | 🔜 Migrating into monorepo |

Additional sub-projects will be defined in future spec versions as they are planned.

---

## 5. Port Allocation

| App | Port |
|-----|------|
| Portal | 3000 |
| TrackMyWeek | 3001 |
| Reserved for future projects | 3002–3010 |

---

## 6. URL Structure

All sub-projects are served as subpaths of the main domain:

| App | URL |
|-----|-----|
| Portal / Login | trackmyweek.com/ |
| TrackMyWeek | trackmyweek.com/trackmyweek |
| Future projects | trackmyweek.com/{project-name} |

---

## 7. Repository Structure

```
main/                          # Root monorepo (github.com/jtappi/main)
├── SPEC.md                    # This file
├── README.md                  # Project overview
├── .gitignore
│
├── core/                      # Shared platform code
│   ├── auth/
│   │   ├── auth.js            # Login/logout/session logic
│   │   └── middleware.js      # Auth + access control middleware
│   └── data/                  # Shared data files
│       ├── users.json         # All users
│       └── projects.json      # Project registry
│
├── portal/                    # Main entry point (port 3000)
│   ├── server.js
│   ├── package.json
│   └── public/
│       ├── login.html
│       ├── dashboard.html
│       ├── admin.html
│       └── assets/
│
└── projects/                  # All sub-projects
    └── trackmyweek/           # Port 3001 — Activity tracker
```

---

## 8. User Roles

| Role | Description | Access |
|------|-------------|--------|
| Admin | Platform owner | Full access to everything |
| Guest | Invited users | Only projects explicitly granted by Admin |

---

## 9. User Stories

### Admin
- I can log in with my email or username + password
- I can see a dashboard of all my projects
- I can launch any project from the dashboard
- I can see the health/status of all projects
- I can create and manage guest accounts
- I can grant or revoke a guest's access to any specific project at any time
- I can see when guests last logged in
- I can disable a guest account without deleting it

### Guest
- I can log in with credentials the Admin gave me
- I can only see projects the Admin has granted me access to
- I can use those projects normally
- I cannot see or access any admin features

---

## 10. Data Model

### core/data/users.json
```json
[
  {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "username": "string",
    "passwordHash": "string (SHA256)",
    "role": "admin | guest",
    "active": true,
    "projectAccess": ["projectId", "projectId"],
    "lastLogin": "ISO timestamp",
    "createdAt": "ISO timestamp"
  }
]
```

### core/data/projects.json
```json
[
  {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "route": "/trackmyweek",
    "port": 3001,
    "icon": "string (emoji or icon name)",
    "status": "active | maintenance | disabled",
    "createdAt": "ISO timestamp"
  }
]
```

---

## 11. API Specification

### Auth Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /auth/login | Login with email or username + password | No |
| POST | /auth/logout | Destroy session | Yes |
| GET | /auth/session | Check current session status | No |

### Portal Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | / | Redirect to dashboard or login | No |
| GET | /dashboard | Main project dashboard | Yes |
| GET | /admin | Admin panel | Admin only |

### Admin Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /admin/users | List all users | Admin only |
| POST | /admin/users | Create guest user | Admin only |
| PUT | /admin/users/:id | Update user | Admin only |
| DELETE | /admin/users/:id | Delete user | Admin only |
| PUT | /admin/users/:id/access | Update project access | Admin only |
| GET | /admin/projects | List all projects | Admin only |
| POST | /admin/projects | Add new project | Admin only |
| PUT | /admin/projects/:id | Update project | Admin only |

---

## 12. Authentication Specification

- Login accepts either **email** or **username** + password
- Passwords hashed with **SHA256** client-side before sending
- Sessions managed with **express-session**
- Session secret stored in `.env` — never committed to GitHub
- Unauthenticated requests redirect to `/login`
- Session expires after **24 hours** of inactivity
- Sessions are shared across sub-projects via the portal session cookie
- Each sub-project validates session via shared core auth middleware

---

## 13. UI Specification

### Login Page (`/login`)
- Single input: email or username
- Password input
- Login button
- Error message on failure
- trackmyweek.com branding

### Dashboard (`/dashboard`)
- Header: user name + logout button
- Grid of project cards:
  - Project name + icon
  - Short description
  - Status badge (active / maintenance / disabled)
  - Launch button
- Admin sees all projects
- Guest sees only granted projects

### Admin Panel (`/admin`)
- **Users tab:**
  - Table of all users (name, email, role, active, last login)
  - Create guest button
  - Per-user: edit, disable/enable, delete
  - Per-user: project access checkboxes
- **Projects tab:**
  - Table of all projects
  - Add project button
  - Per-project: edit name, description, port, status

---

## 14. Security Requirements

- HTTPS enforced end-to-end
- All traffic proxied through Cloudflare
- Helmet.js security headers on all routes
- Rate limiting on auth endpoints (100 requests / 15 min)
- Express `trust proxy` enabled
- No plain text passwords stored anywhere
- `.env` never committed to GitHub
- Guest access verified on every sub-project request
- Sessions invalidated on logout
- `.gitignore` covers: `.env`, `node_modules/`, data files with personal info

---

## 15. Monitoring & Observability

| Tool | Purpose |
|------|---------|
| Better Stack | Uptime monitoring + alerting |
| Better Stack Heartbeat | Server alive check (every 5 min) |
| PM2 | Process monitoring + auto-restart |
| Nginx logs | Request logging |
| Future: New Relic | APM + error tracking |
| Future: AWS CloudWatch | Infrastructure metrics |

---

## 16. CI/CD Pipeline (Phase 3)

**Target workflow:**
1. Push code to GitHub `main` branch
2. GitHub Action triggers
3. Runs tests
4. Deploys to server
5. Restarts affected project only
6. Sends success/failure notification

---

## 17. Project Roadmap

| Phase | What We Build | Status |
|-------|---------------|--------|
| **Phase 1** | Portal: SSO auth, dashboard, admin panel | 🔜 Next |
| **Phase 2** | Migrate TrackMyWeek into monorepo | ⬜ |
| **Phase 3** | CI/CD pipeline | ⬜ |
| **Phase 4** | First new sub-project | ⬜ |
| **Phase 5** | MongoDB migration | ⬜ |
| **Phase 6** | New Relic + AWS integration | ⬜ |
| **Phase 7** | AI features across projects | ⬜ |
