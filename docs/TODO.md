# TODO

Low-urgency items to revisit when time permits.

---

## Security

- [ ] **Replace port 22 forwarding with Tailscale**
  Currently port 22 is open on the router to allow GitHub Actions to rsync Playwright
  reports to the Mac Mini. Tailscale would eliminate the need for a public-facing SSH
  port entirely — CI connects over the private WireGuard tunnel instead.
  Free for personal use, ~10 min setup.
  See: https://tailscale.com/kb/1160/github-actions

---

## Maintenance

- [ ] **Set up Playwright report prune cron on Mac Mini**
  Prevents `~/apps/main/playwright-reports/` from growing unbounded.
  ```bash
  crontab -e
  ```
  Add line:
  ```
  0 3 * * * bash ~/apps/main/scripts/prune-playwright-reports.sh >> ~/apps/main/logs/prune.log 2>&1
  ```
