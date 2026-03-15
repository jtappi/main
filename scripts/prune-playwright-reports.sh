#!/bin/bash
# prune-playwright-reports.sh
#
# Deletes Playwright report directories older than 30 days.
# Safe to run repeatedly — only removes directories, never the parent.
#
# Run manually:
#   bash ~/apps/main/scripts/prune-playwright-reports.sh
#
# Or add to crontab for automatic nightly cleanup:
#   0 3 * * * bash ~/apps/main/scripts/prune-playwright-reports.sh >> ~/apps/main/logs/prune.log 2>&1

REPORTS_DIR="${HOME}/apps/main/playwright-reports"

if [ ! -d "$REPORTS_DIR" ]; then
  echo "[prune] Reports directory not found: ${REPORTS_DIR}"
  exit 0
fi

PRUNED=0
while IFS= read -r -d '' dir; do
  rm -rf "$dir"
  echo "[prune] Removed: $(basename "$dir")"
  PRUNED=$((PRUNED + 1))
done < <(find "$REPORTS_DIR" -maxdepth 1 -mindepth 1 -type d -mtime +30 -print0)

echo "[prune] Done. Removed ${PRUNED} director$([ $PRUNED -eq 1 ] && echo 'y' || echo 'ies') older than 30 days."
