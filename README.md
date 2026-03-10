# trackmyweek.com

Personal development portfolio and app ecosystem.

See [SPEC.md](./SPEC.md) for the full platform specification.

## Structure

- `core/` — Shared auth and data
- `portal/` — Main entry point (login, dashboard, admin)
- `projects/` — Sub-projects

## Setup

```bash
# 1. Clone
git clone git@github.com:jtappi/main.git
cd main

# 2. Copy and configure data files
cp core/data/users.template.json core/data/users.json
# Edit users.json with your admin account details

# 3. Create .env in root
cp .env.example .env
# Fill in SESSION_SECRET and PORTAL_PORT

# 4. Install portal dependencies
cd portal && npm install

# 5. Start
node server.js
```
