# Deployment Guide

This document covers how to set up, build, and deploy the apps in this monorepo
on the Mac Mini. Read this any time you pull changes and need to know what to run.

---

## Repo layout relevant to deployment

| Location | What it is |
|---|---|
| `portal/` | Express server — serves the portal and mounts TrackMyWeek |
| `trackmyweek/` | TrackMyWeek Express router + backend controllers |
| `trackmyweek/client/` | React + Vite frontend source |
| `trackmyweek/client/dist/` | Built frontend — **gitignored, must be built locally** |
| `trackmyweek/data/*.json` | Runtime data files — **gitignored, seeded from templates** |
| `core/data/users.json` | Portal user accounts — **gitignored, seeded from template** |

---

## First-time setup

Run these steps once on a fresh clone. Never run the bare `cp` commands again
after the first time — they will overwrite live data.

```
git checkout main

npm install

cd portal
npm install
cd ..

cd trackmyweek
npm install
cd ..

cd trackmyweek/client
npm install
cd ../..
```

Seed data files (safe — only copies if the file does not already exist):

```
[ -f core/data/users.json ]             || cp core/data/users.template.json core/data/users.json
[ -f trackmyweek/data/data.json ]       || cp trackmyweek/data/data.template.json trackmyweek/data/data.json
[ -f trackmyweek/data/categories.json ] || cp trackmyweek/data/categories.template.json trackmyweek/data/categories.json
[ -f trackmyweek/data/reports.json ]    || cp trackmyweek/data/reports.template.json trackmyweek/data/reports.json
[ -f trackmyweek/data/questions.json ]  || cp trackmyweek/data/questions.template.json trackmyweek/data/questions.json
```

Build the TrackMyWeek frontend:

```
cd trackmyweek/client
npm run build
cd ../..
```

Start the portal:

```
cd portal
node server.js
```

---

## Day-to-day deploy (after pulling changes)

```
git checkout main
git pull
```

Then work through the sections below based on what changed.

### If `trackmyweek/package.json` or `trackmyweek/package-lock.json` changed

```
cd trackmyweek
npm ci
cd ..
```

### If `trackmyweek/client/package.json` or `trackmyweek/client/package-lock.json` changed

```
cd trackmyweek/client
npm ci
cd ../..
```

### If any file under `trackmyweek/client/src/` changed

A client rebuild is required. The portal serves the compiled `dist/` — it does
not serve source files directly.

```
cd trackmyweek/client
npm run build
cd ../..
```

### If only server-side files changed (controllers, lib, portal)

No rebuild needed. Just restart the portal.

### Restart the portal

After any of the above, restart the portal process however you manage it
(e.g. `pm2 restart portal`, or stop and re-run `node server.js`).

---

## What triggers a client rebuild

| Changed files | Rebuild needed? |
|---|---|
| `trackmyweek/client/src/**` | Yes |
| `trackmyweek/client/index.html` | Yes |
| `trackmyweek/client/vite.config.js` | Yes |
| `trackmyweek/controllers/**` | No |
| `trackmyweek/lib/**` | No |
| `trackmyweek/server.js` | No |
| `portal/**` | No |

When in doubt, rebuild. It takes only a few seconds.

---

## Environment variables

The portal reads from a `.env` file at the repo root. A template is provided:

```
cp .env.example .env
```

Edit `.env` and set at minimum:

- `SESSION_SECRET` — required in production; any long random string
- `NODE_ENV=production` — enables secure cookies

The portal `.env.example` is at `portal/.env.example` for reference.

---

## Data file rules — never overwrite live data

- **Never** run a bare `cp template → live` after first-time setup.
- Always use the existence-check pattern shown in the first-time setup section above.
- If migrating data from an old location, copy the live file manually before starting
  the app for the first time at the new path.

See `CLAUDE.md` section 13 for the full data file policy.
