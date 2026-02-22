# Deploying the App API

## Database connection (ECONNREFUSED 127.0.0.1:3306)

If you see `connect ECONNREFUSED 127.0.0.1:3306` or empty home/favourites data with `_debug.error`, the app is trying to connect to MySQL on **localhost** instead of your remote host.

### Fix

1. **Set environment variables in your deployment platform** (Nixpacks, Railway, Render, etc.):
   - `DB_HOST` = your MySQL server hostname (e.g. `srv1149167.hstgr.cloud`)
   - `DB_PORT` = `3306`
   - `DB_NAME`, `DB_USER`, `DB_PASSWORD` = your database credentials

2. **Do not rely only on a `.env` file in the repo** — deployment env vars (set in the platform dashboard) take precedence so the app uses your remote DB.

3. **Check what the app is using**: call `GET /health`. The response includes:
   - `db.hostSet` — whether `DB_HOST` is set
   - `db.hostIsRemote` — whether it’s not localhost
   - `db.hint` — short message

4. **Production**: set `NODE_ENV=production` so that if the DB is unreachable, the server exits with a clear error instead of starting with broken DB.

### Example (Nixpacks / hostinger-style)

In your platform’s **Environment** or **Config**:

- `DB_HOST` = `srv1149167.hstgr.cloud`
- `DB_NAME` = `u5gdchot-vizidot`
- `DB_USER` = `api_vizidot_user`
- `DB_PASSWORD` = your password
- `NODE_ENV` = `production` (recommended)

Redeploy after changing env vars.
