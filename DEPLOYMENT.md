# Deploying the App API

## Database connection (ECONNREFUSED 127.0.0.1 / 127.0.1.1:3306)

If you see `connect ECONNREFUSED 127.0.0.1:3306` or `127.0.1.1:3306` even though `DB_HOST` is set to your remote host (e.g. `srv1149167.hstgr.cloud`), the hostname is **resolving to loopback** inside the container (common with **Coolify**, Docker, and some hosters).

### Fix for Coolify / Docker (use IP instead of hostname)

1. **Get the real IP** of your MySQL server (either):
   - **From the repo** (run on your laptop or any machine with Node):
     ```bash
     cd app-api && DB_HOST=srv1149167.hstgr.cloud node scripts/resolve-db-host.js
     ```
     The script uses Google DNS and prints the IP (e.g. `109.106.244.241`).
   - Or from your **Hostinger** panel, or run `ping srv1149167.hstgr.cloud` / `nslookup srv1149167.hstgr.cloud` outside Docker.

2. **Set `DB_HOST_IP`** in Coolify to that IP:
   - Coolify → your app → **Environment** → add:
     - Name: `DB_HOST_IP`
     - Value: `109.106.244.241` (or the IP you got from step 1)

3. **Redeploy** so the new variable is applied. The app will then connect to the IP and skip the broken hostname resolution.

### General fix (all platforms)

1. Set in your deployment **Environment**:
   - `DB_HOST` = MySQL hostname (e.g. `srv1149167.hstgr.cloud`) or, if resolution is wrong, use **IP** as `DB_HOST` or set `DB_HOST_IP` to the IP
   - `DB_PORT` = `3306`
   - `DB_NAME`, `DB_USER`, `DB_PASSWORD` = your credentials
   - `NODE_ENV` = `production` (recommended)

2. Call `GET /health` to confirm: `db.hostSet` and `db.hostIsRemote` should be true.

3. Redeploy after changing env vars.

### Example (Coolify + Hostinger)

- `DB_HOST` = `srv1149167.hstgr.cloud`
- **`DB_HOST_IP`** = `109.106.244.241` ← public IP for that host (get yours with `node scripts/resolve-db-host.js` if different)
- `DB_NAME` = `u5gdchot-vizidot`
- `DB_USER` = `api_vizidot_user`
- `DB_PASSWORD` = your password
- `NODE_ENV` = `production`
