# Scripts (must be deployed with the API)

These scripts must be **committed and pushed** so they exist on the server.

## Push scripts to the server

**api/vizidot-app-api** has its own git repo (separate from the main vizidot-2.0 repo).  
So you must commit and push **from inside this API folder**:

```bash
cd api/vizidot-app-api
git add scripts/
git status               # confirm all script files are listed
git commit -m "Add Firebase and device check scripts"
git push origin main
```

Then redeploy the API on the server so it pulls the latest code including `scripts/`.

If you deploy from the main repo and the API is not a separate repo, ensure your deploy config copies the full `api/vizidot-app-api` directory (including `scripts/`).

## Scripts

| Script | Purpose |
|--------|--------|
| `check-firebase-credential.js` | Run **on the server**: `npm run check-firebase` – checks server time and Firebase credential. |
| `verify-key-file.js` | Run **locally**: `node scripts/verify-key-file.js /path/to/key.json` – verify the key file works. |
| `check-device-api.js` | Check device API is up: `npm run check-device -- http://your-server:9000` |
| `createPushNotificationLog.sql` | Run once on MySQL to create the notification log table. |
