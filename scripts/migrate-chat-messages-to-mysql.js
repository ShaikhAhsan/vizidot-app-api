/**
 * Migrates chat messages from Firestore to MySQL (messages older than 24h by default).
 *
 * Preferred: call the API instead (e.g. from cron):
 *   curl -X POST "https://your-api/api/v1/settings/migrate-chat-messages" \
 *     -H "X-Migration-Key: YOUR_MIGRATE_CHAT_MESSAGES_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"hoursAgo": 24}'
 *
 * Standalone: node scripts/migrate-chat-messages-to-mysql.js
 * Env: FIREBASE_SERVICE_ACCOUNT_JSON, DB_* (same as API). Optional: MIGRATE_HOURS_AGO (default 24).
 */

require('dotenv').config({ override: false });
const { initializeFirebase } = require('../config/firebase');
const { run } = require('../services/migrateChatMessages');

const HOURS_AGO = parseInt(process.env.MIGRATE_HOURS_AGO || '24', 10) || 24;

async function main() {
  await initializeFirebase();
  const result = await run({ hoursAgo: HOURS_AGO });
  console.log(`Done. Moved ${result.moved} messages to MySQL, deleted ${result.deleted} from Firestore.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
