# trackmyweek.com — Platform Specification

**Version:** 1.1  
**Date:** 2026-03-10  
**Status:** APPROVED — Ready to Build  

---

## 1. Vision

A self-hosted personal development portfolio and app ecosystem, running on a Mac Mini home server, that serves as both a practice ground for development skills (especially AI) and a collection of genuinely useful personal life apps. Protected by enterprise-grade security, fully monitored, with CI/CD pipelines and multi-project architecture.

---

## 2. Goals

- Single login to access all projects
- Practice modern development skills including AI integration
- Build genuinely useful personal apps (scheduling, habits, health, etc.)
- Full visibility into errors, performance, and uptime
- CI/CD pipeline for easy deployments
- Ability to invite guests to specific projects with granular control

---

## 3. Infrastructure

| Component | Technology |
|-----------|------------|
| Server | Mac Mini (Intel i5, macOS Monterey) |
| Domain | trackmyweek.com |
| Web Server | Nginx |
| CDN / Proxy | Cloudflare (Full Strict SSL) |
| Process Manager | PM2 |
| Monitoring | Better Stack |
| Version Control | GitHub (private monorepo: jtappi/main) |
| Runtime | Node.js (via NVM) |
| Database | JSON files (migrate to MongoDB later) |
| Future | AWS, MongoDB, New Relic |

---

## 4. Port Allocation

| App | Port | URL |
|-----|------|-----|
| Portal | 3000 | trackmyweek.com/ |
| TrackMyWeek | 3001 | trackmyweek.com/trackmyweek |
| ToDo | 3002 | trackmyweek.com/todo |
| Habits | 3003 | trackmyweek.com/habits |
| Scheduler | 3004 | trackmyweek.com/scheduler |
| MedTracker | 3005 | trackmyweek.com/medtracker |
| HealthDashboard | 3006 | trackmyweek.com/health |

---

## 5. Nginx Routing

All traffic enters through Nginx on port 443 (HTTPS). Nginx routes by subpath:

```nginx
# Portal (root)
location / {
    proxy_pass http://127.0.0.1:3000;
}

# TrackMyWeek
location /trackmyweek {
    proxy_pass http://127.0.0.1:3001;
}

# ToDo
location /todo {
    proxy_pass http://127.0.0.1:3002;
}

# Habits
location /habits {
    proxy_pass http://127.0.0.1:3003;
}

# Scheduler
location /scheduler {
    proxy_pass http://127.0.0.1:3004;
}

# MedTracker
location /medtracker {
    proxy_pass http://127.0.0.1:3005;
}

# Health Dashboard
location /health {
    proxy_pass http://127.0.0.1:3006;
}
```

---

## 6. Repository Structure

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
│       └── projects.json      # All projects registry
│
├── portal/                    # Main entry point (port 3000)
│   ├── server.js              # Express app
│   ├── package.json
│   └── public/
│       ├── login.html         # Login page
│       ├── dashboard.html     # Project dashboard
│       ├── admin.html         # Admin panel
│       └── assets/            # CSS, JS, images
│
└── projects/                  # All sub-projects
    ├── trackmyweek/           # Port 3001 — Activity tracker
    ├── todo/                  # Port 3002 — Task management
    ├── habits/                # Port 3003 — Daily habits
    ├── scheduler/             # Port 3004 — Calendar
    ├── medtracker/            # Port 3005 — Medication tracking
    └── healthdashboard/       # Port 3006 — Healthcare data
```

---

## 7. User Roles

| Role | Description | Access |
|------|-------------|--------|
| Admin | Owner (Jiten) | Full access to everything |
| Guest | Family / Friends | Only projects explicitly granted by Admin |

---

## 8. User Stories

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

## 9. Data Model

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

## 10. API Specification

### Auth Routes (Portal)
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

## 11. Authentication Specification

- Login accepts either **email** or **username** + password
- Passwords hashed with **SHA256** client-side before sending
- Sessions managed with **express-session**
- Session secret stored in `.env`
- Unauthenticated requests redirect to `/login`
- Session expires after **24 hours** of inactivity
- Sessions are shared across sub-projects via the portal session cookie
- Each sub-project checks session validity via core auth middleware

---

## 12. UI Specification

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

## 13. Security Requirements

- HTTPS enforced via Cloudflare Full Strict
- All traffic must pass through Cloudflare (direct IP access blocked at Nginx)
- Helmet.js security headers on all routes
- Rate limiting on auth endpoints (100 requests / 15 min)
- Express `trust proxy` enabled (behind Nginx)
- No plain text passwords stored anywhere
- `.env` never committed to GitHub
- Guest access verified on every sub-project request
- Sessions invalidated on logout
- `.gitignore` covers: `.env`, `node_modules/`, `*.json` data files

---

## 14. Monitoring & Observability

| Tool | Purpose |
|------|---------|
| Better Stack | Uptime monitoring + alerting |
| Better Stack Heartbeat | Mac Mini alive check (every 5 min via PM2) |
| PM2 | Process monitoring + auto-restart |
| Nginx logs | Request logging |
| Future: New Relic | APM + error tracking |
| Future: AWS CloudWatch | Infrastructure metrics |

---

## 15. CI/CD Pipeline (Phase 3)

**Target workflow:**
1. Push code to GitHub `main` branch
2. GitHub Action triggers
3. Runs tests
4. SSHes into Mac Mini
5. Runs `git pull`
6. Runs `npm install` if `package.json` changed
7. Runs `pm2 restart` for affected project only
8. Sends success/failure notification via Better Stack

---

## 16. Project Roadmap

| Phase | What We Build | Status |
|-------|---------------|--------|
| **Phase 1** | Core platform: SSO auth, portal dashboard, admin panel | 🔜 Next |
| **Phase 2** | Migrate TrackMyWeek into monorepo | ⬜ |
| **Phase 3** | CI/CD pipeline | ⬜ |
| **Phase 4** | First new project (ToDo) | ⬜ |
| **Phase 5** | MongoDB migration | ⬜ |
| **Phase 6** | New Relic + AWS integration | ⬜ |
| **Phase 7** | AI features across projects | ⬜ |

---

## 17. Open Questions — RESOLVED

| Question | Decision |
|----------|----------|
| Port allocation | Portal=3000, projects 3001-3006 |
| URL structure | Subpaths (trackmyweek.com/habits) |
| Auth method | Email or username + password |
| Session management | express-session |
| Database | JSON files first, MongoDB later |
| Repo structure | Private monorepo (jtappi/main) |
| Routing | Nginx subpath proxying |
