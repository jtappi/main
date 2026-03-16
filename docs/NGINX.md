# Nginx Configuration Notes

Nginx binary: `/usr/local/bin/nginx` (Homebrew)
Config file: `/usr/local/etc/nginx/nginx.conf`

## Reload commands

```bash
sudo nginx -t
sudo nginx -s reload
```

## Key settings

- `client_max_body_size 10m` — required for bptracker image uploads (phone
  camera photos as base64 are 2–5MB; the default 1MB limit silently drops them)
- Cloudflare IP passthrough via `set_real_ip_from` + `real_ip_header CF-Connecting-IP`
- Non-Cloudflare traffic blocked via `$http_cf_connecting_ip` check
- All HTTP redirected to HTTPS
- Both `/` and `/trackmyweek` proxy to `127.0.0.1:3000`
