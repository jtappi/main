#!/bin/bash
# rebuild-all.sh — run from ~/apps/main after merging a PR
# Pulls latest code, reinstalls all dependencies, rebuilds clients, restarts portal.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "\n==> Pulling latest code..."
git pull origin main

echo "\n==> Installing root dependencies..."
npm install

echo "\n==> Installing portal dependencies..."
(cd portal && npm install)

echo "\n==> Installing trackmyweek dependencies..."
(cd trackmyweek && npm install)

echo "\n==> Installing trackmyweek client dependencies..."
(cd trackmyweek/client && npm install)

echo "\n==> Installing bptracker dependencies..."
(cd bptracker && npm install)

echo "\n==> Installing bptracker client dependencies..."
(cd bptracker/client && npm install)

echo "\n==> Installing prisondonkey dependencies..."
(cd prisondonkey && npm install)

echo "\n==> Building trackmyweek client..."
(cd trackmyweek/client && npm run build)

echo "\n==> Building bptracker client..."
(cd bptracker/client && npm run build)

echo "\n==> Restarting portal via pm2..."
pm2 restart portal

echo "\n✅ All done."
