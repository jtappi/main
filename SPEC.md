# trackmyweek.com — Platform Specification

**Version:** 1.0  
**Date:** 2026-03-10  
**Status:** In Progress  

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
- Ability to invite guests to specific projects

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

## 4. Repository Structure

```
main/                          # Root monorepo
├── SPEC.md                    # This file
├── README.md                  # Project overview
├── package.json               # Root dependencies
├── .env                       # Environment variables (not committed)
├── .gitignore
│
├── core/                      # Shared platform code
│   ├── auth/                  # SSO authentication
│   │   ├── auth.js            # Login/logout/session logic
│   │   ├── middleware.js      # Auth middleware
│   │   └── users.json         # User store
│   ├── admin/                 # Admin panel
│   │   └── access-control.js  # Guest access management
│   └── data/                  # Shared data files
│       ├── users.json
│       └── projects.json
│
├── portal/                    # Main dashboard (entry point)
│   ├── server.js              # Express app
│   └── public/                # Frontend
│       ├── index.html         # Dashboard
│       ├── login.html         # Login page
│       ├── admin.html         # Admin panel
│       └── assets/
│
└── projects/                  # All sub-projects
    ├── trackmyweek/           # Activity tracker (existing)
    ├── scheduler/             # Calendar & scheduling
    ├── todo/                  # Task management
    ├── medtracker/            # Medication tracking
    ├── habits/                # Daily habit tracker
    └── healthdashboard/       # Healthcare data
```

---

## 5. User Roles

| Role | Description | Access |
|------|-------------|--------|
| Admin | Owner (Jiten) | Full access to everything |
| Guest | Family / Friends | Only projects explicitly granted by Admin |

---

## 6. User Stories

### Admin
- I can log in with my email or username + password
- I can see a dashboard of all my projects
- I can launch any project from the dashboard
- I can see the health/status of all projects
- I can create and manage guest accounts
- I can grant or revoke a guest's access to any project at any time
- I can see when guests last logged in
- I can disable a guest account without deleting it

### Guest
- I can log in with credentials the Admin gave me
- I can only see projects the Admin has granted me access to
- I can use those projects normally
- I cannot see or access any admin features

---

## 7. Data Model

### users.json
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

### projects.json
```json
[
  {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "route": "/trackmyweek",
    "icon": "string (emoji or icon name)",
    "status": "active | maintenance | disabled",
    "createdAt": "ISO timestamp"
  }
]
```

---

## 8. API Specification

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

### Project Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /projects/:name/* | Proxy to sub-project | Yes + access check |

---

## 9. Authentication Specification

- Login accepts either **email** or **username** + password
- Passwords hashed with **SHA256** before storing
- Sessions managed with **express-session**
- Session secret stored in `.env`
- Unauthenticated requests redirect to `/login`
- Guests redirected to `/dashboard` (limited view) after login
- Admin redirected to `/dashboard` (full view) after login
- Session expires after **24 hours** of inactivity

---

## 10. UI Specification

### Login Page (`/login`)
- Email or username field
- Password field
- Login button
- Error message on failure
- Branding: trackmyweek.com logo

### Dashboard (`/dashboard`)
- Header with user name + logout button
- Grid of project cards, each showing:
  - Project name
  - Description
  - Status indicator (active/maintenance/disabled)
  - Launch button
- Admin sees all projects
- Guest sees only granted projects

### Admin Panel (`/admin`)
- **Users tab:**
  - Table of all users
  - Create guest button
  - Per-user: edit, disable, delete
  - Per-user: toggle project access checkboxes
- **Projects tab:**
  - Table of all projects
  - Add project button
  - Per-project: edit name, description, status

---

## 11. Security Requirements

- HTTPS enforced via Cloudflare Full Strict
- All traffic must pass through Cloudflare (direct IP blocked)
- Helmet.js security headers on all routes
- Rate limiting on auth endpoints
- Express trust proxy enabled (behind Nginx)
- No plain text passwords stored anywhere
- `.env` never committed to GitHub
- Guest access checked on every request
- Sessions invalidated on logout

---

## 12. Monitoring & Observability

| Tool | Purpose |
|------|---------| 
| Better Stack | Uptime monitoring + alerting |
| Better Stack Heartbeat | Mac Mini alive check (every 5 min) |
| PM2 | Process monitoring + auto-restart |
| Nginx logs | Request logging |
| Future: New Relic | APM + error tracking |
| Future: AWS CloudWatch | Infrastructure metrics |

---

## 13. CI/CD Pipeline (To Be Built)

**Target workflow:**
1. Push code to GitHub `main` branch
2. GitHub Action triggers
3. Runs tests
4. SSHes into Mac Mini
5. Runs `git pull`
6. Runs `npm install` if package.json changed
7. Runs `pm2 restart` for affected project
8. Sends success/failure notification

---

## 14. Project Roadmap

| Phase | What We Build |
|-------|---------------|
| **Phase 1** | Core platform: SSO auth, portal dashboard, admin panel |
| **Phase 2** | Migrate TrackMyWeek into monorepo |
| **Phase 3** | CI/CD pipeline |
| **Phase 4** | First new project (ToDo or Habits) |
| **Phase 5** | MongoDB migration |
| **Phase 6** | New Relic + AWS integration |
| **Phase 7** | AI features across projects |

---

## 15. Open Questions

- [ ] What port does each sub-project run on? (Need port allocation plan)
- [ ] How does Nginx route to sub-projects? (Subpath vs subdomain)
- [ ] How does SSO session share across sub-projects?
- [ ] What is the deployment strategy for zero-downtime updates?
