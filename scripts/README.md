# Scripts (must be deployed with the API)

These scripts must be **committed and pushed** from this repo so they exist on the server.

## If this folder is inside its own git repo (vizidot-app-api)

From the **api/vizidot-app-api** directory:

```bash
cd api/vizidot-app-api   # or just cd into this API repo root
git add scripts/
git status               # confirm all script files are listed
git commit -m "Add Firebase and device check scripts"
git push origin main
```

Then redeploy the API on the server so it pulls the latest code including `scripts/`.

## Scripts

| Script | Purpose |
|--------|--------|
| `check-firebase-credential.js` | Run **on the server** to check server time and Firebase credential (token fetch). |
| `verify-key-file.js` | Run **locally** with path to your JSON key file to verify the key works. |
| `check-device-api.js` | Check that the device API is up: `node scripts/check-device-api.js BASE_URL` |
| `createPushNotificationLog.sql` | Run once on MySQL to create the notification log table. |
