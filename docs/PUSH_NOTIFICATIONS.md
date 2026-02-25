# Push Notifications (FCM)

Send FCM push notifications in batches with history stored in the database.

You can send either **from your API** (Firebase Admin on the server) or **via a Firebase Cloud Function** (recommended if you have credential/time issues on the server). Same API; the service switches automatically when the function URL is set.

## 1. Prerequisites

- **Option A – Send from your API**: `FIREBASE_SERVICE_ACCOUNT_JSON` must be set (same as for Auth). Firebase Admin is initialized in `server.js` via `initializeFirebase()`.
- **Option B – Send via Firebase Function**: Deploy the function in `functions/` (see repo root `functions/README.md`), then set `FIREBASE_SEND_PUSH_FUNCTION_URL` on your API. No Firebase credentials or secret needed on the server.
- **Database**: Create the notification log table once (see below).

## 2. Create the notification log table

Run the SQL script once (e.g. in your MySQL client or migration):

```bash
# From repo root
mysql -h YOUR_HOST -u YOUR_USER -p YOUR_DB < api/vizidot-app-api/scripts/createPushNotificationLog.sql
```

Or run the SQL inside `scripts/createPushNotificationLog.sql` manually.

## 3. Use the function in code

```js
const { sendPushNotification } = require('./services/notificationService');

const result = await sendPushNotification({
  title: 'New message',
  message: 'You have a new message from John',
  fcmTokens: ['token1', 'token2', ...],  // array of FCM device tokens
  data: { type: 'chat', roomId: '123' },  // optional; all values are stringified
  imageUrl: 'https://example.com/image.png'  // optional
});

// result: { successCount, failureCount, total, logId }
```

- **Batching**: Tokens are sent in chunks of 500 (FCM limit), with up to 5 concurrent batches, so 100,000 tokens are handled without failing in one shot.
- **History**: Each send creates a row in `push_notification_log` (if the table exists) with success/failure counts and status.

## 4. API endpoints (optional)

- **POST /api/v1/notifications/send** (auth required)  
  Body: `{ "title": "...", "message": "...", "fcmTokens": ["..."], "data": {}, "imageUrl": "..." }`

- **GET /api/v1/notifications/history** (auth required)  
  Query: `limit`, `offset` — returns recent send history.

## 5. Getting FCM tokens

Use **GET /api/v1/device/tokens?userIds=1,2,3** (auth required) to get tokens by user IDs. Response: `{ tokensByUser: { "1": ["fcm1", "fcm2"], "2": ["fcm3"] } }`. Flatten the arrays if you need a single list for `fcmTokens`.

## 6. Sending via Firebase Cloud Function

If your server has Firebase credential or time-sync issues (e.g. in Docker/Coolify), use the Firebase Function:

1. Deploy the function: from repo root run `firebase deploy --only functions` (see `functions/README.md`).
2. On your API server set:
   - `FIREBASE_SEND_PUSH_FUNCTION_URL` = the deployed function URL
3. Leave `FIREBASE_SERVICE_ACCOUNT_JSON` unset (or keep it for Auth only). The notification service will call the function instead of sending FCM from the server. History is still written to `push_notification_log` by the API.

## 7. Troubleshooting

- **Token works in Firebase Console "Send test message" but fails from API (successCount: 0)**  
  The FCM token is tied to a **Firebase project**. The service account in `FIREBASE_SERVICE_ACCOUNT_JSON` must be for the **same project** as the app that generated the token.  
  - In Firebase Console, open your app’s project (e.g. vizidot-4b492) → Project settings → Service accounts.  
  - Download the key from **that** project and use it as `FIREBASE_SERVICE_ACCOUNT_JSON`.  
  - In the JSON, check `project_id` matches your app’s Firebase project.
