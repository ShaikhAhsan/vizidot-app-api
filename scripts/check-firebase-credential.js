#!/usr/bin/env node
/**
 * Run on the server to diagnose Firebase credential / JWT errors.
 * Usage: node scripts/check-firebase-credential.js
 *
 * Checks: server time, env var presence, private_key shape, then tries to initialize Firebase.
 */
require('dotenv').config({ override: false });

const serverTime = new Date();
const serverTimeStr = serverTime.toISOString();
const serverTimestamp = Math.floor(serverTime.getTime() / 1000);
const realTimestamp = Math.floor(Date.now() / 1000);

console.log('--- Server time ---');
console.log('Server time (ISO):', serverTimeStr);
console.log('Server timestamp:', serverTimestamp);
console.log('');
console.log('If this time is wrong by more than 1–2 minutes, Firebase will reject the JWT.');
console.log('Fix: sync time (e.g. sudo timedatectl set-ntp true or ntpdate).');
console.log('');

const raw = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
if (!raw) {
  console.error('FIREBASE_SERVICE_ACCOUNT_JSON is not set.');
  process.exit(1);
}

const isBase64 = !raw.startsWith('{');
const jsonStr = isBase64 ? Buffer.from(raw, 'base64').toString('utf8') : raw;
console.log('--- Credential ---');
console.log('Format:', isBase64 ? 'base64' : 'raw JSON');
console.log('Length (chars):', raw.length);
if (isBase64) {
  console.log('Decoded length:', jsonStr.length);
}

let parsed;
try {
  parsed = JSON.parse(jsonStr);
} catch (e) {
  console.error('JSON parse error:', e.message);
  process.exit(1);
}

let key = parsed.private_key;
console.log('Has private_key:', !!key);
if (key) {
  // Env vars often store newlines as literal \n (backslash + n). Fix for PEM.
  if (key.includes('\\n') && !key.includes('\n')) {
    parsed.private_key = key.replace(/\\n/g, '\n');
    key = parsed.private_key;
    console.log('Fixed private_key: replaced literal \\n with real newlines.');
  }
  const hasBegin = key.includes('BEGIN PRIVATE KEY');
  const hasEnd = key.includes('END PRIVATE KEY');
  console.log('Private key has BEGIN/END:', hasBegin && hasEnd);
  if (!hasBegin || !hasEnd) {
    console.error('Private key looks truncated. Set FIREBASE_SERVICE_ACCOUNT_JSON as base64.');
    console.error('Example: base64 -w 0 your-key.json | pbcopy  (Linux/Mac) then paste as env value.');
    process.exit(1);
  }
}
console.log('Project ID:', parsed.project_id || '(missing)');
console.log('');

console.log('--- Initializing Firebase ---');
const admin = require('firebase-admin');
try {
  if (admin.apps.length > 0) {
    admin.app().delete();
  }
  admin.initializeApp({
    credential: admin.credential.cert(parsed),
    projectId: parsed.project_id
  });
  console.log('Firebase initialized successfully.');
  process.exit(0);
} catch (err) {
  console.error('Firebase init failed:', err.message);
  if (err.message && err.message.includes('invalid_grant')) {
    console.error('');
    console.error('Invalid JWT usually means:');
    console.error('  1. Server time is wrong – sync with NTP (see above).');
    console.error('  2. Key was revoked – generate a new key in Firebase Console → Project settings → Service accounts.');
    console.error('  3. Key is truncated – use base64 for FIREBASE_SERVICE_ACCOUNT_JSON.');
  }
  process.exit(1);
}
