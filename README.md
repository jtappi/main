# trackmyweek.com

Personal development portfolio and app ecosystem.

See [SPEC.md](./SPEC.md) for the full platform specification.

## Structure

```
core/       # Shared auth and data
portal/     # Main entry point — login, dashboard, admin
projects/   # Sub-projects
```

## Getting Started

```bash
# Install portal dependencies
cd portal && npm install

# Copy and configure environment
cp .env.example .env

# Start portal
node server.js
```
