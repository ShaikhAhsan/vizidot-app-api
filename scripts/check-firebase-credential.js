#!/usr/bin/env node
/**
 * Step-by-step check of FIREBASE_SERVICE_ACCOUNT_JSON.
 * Run: node scripts/check-firebase-credential.js
 * Fixes "Invalid JWT Signature" by validating the key and testing token fetch.
 */
require('dotenv').config();

const rawValue = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
console.log('Step 1: FIREBASE_SERVICE_ACCOUNT_JSON set?', rawValue ? `Yes (${rawValue.length} chars)` : 'No');

if (!rawValue) {
  console.log('→ Set FIREBASE_SERVICE_ACCOUNT_JSON in .env (minified JSON in single quotes, or base64).');
  process.exit(1);
}

const isBase64 = !rawValue.startsWith('{');
const maybeDecoded = isBase64 ? Buffer.from(rawValue, 'base64').toString('utf8') : rawValue;
console.log('Step 2: Format', isBase64 ? 'base64' : 'JSON', '- decoded length:', maybeDecoded.length);

let parsed;
try {
  parsed = JSON.parse(maybeDecoded);
  console.log('Step 3: JSON parse OK, project_id:', parsed.project_id);
} catch (e) {
  console.log('Step 3: JSON parse FAILED:', e.message);
  process.exit(1);
}

let key = parsed.private_key;
if (!key || typeof key !== 'string') {
  console.log('Step 4: private_key missing or not a string');
  process.exit(1);
}
console.log('Step 4: private_key length:', key.length);

const hasBackslashN = key.includes('\\n');
const hasNewline = key.includes('\n');
console.log('Step 5: Key has \\n (backslash-n)?', hasBackslashN, '| has real newline?', hasNewline);

if (hasBackslashN) {
  key = key.replace(/\\n/g, '\n');
}
key = key.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
parsed.private_key = key;

const hasBegin = key.includes('BEGIN PRIVATE KEY');
const hasEnd = key.includes('END PRIVATE KEY');
const newlineCount = (key.match(/\n/g) || []).length;
console.log('Step 6: PEM format? BEGIN:', hasBegin, 'END:', hasEnd, 'newlines:', newlineCount);

if (!hasBegin || !hasEnd) {
  console.log('→ Key is truncated or invalid. Use base64: save JSON to key.json then run:');
  console.log('  node -e "console.log(require(\'fs\').readFileSync(\'key.json\', \'base64\'))"');
  process.exit(1);
}

console.log('Step 7: Initializing Firebase and fetching access token...');
const admin = require('firebase-admin');
if (admin.apps.length > 0) {
  admin.app().delete();
}
admin.initializeApp({
  credential: admin.credential.cert(parsed),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'vizidot-4b492.appspot.com'
});

const cred = admin.app().options.credential;
cred.getAccessToken()
  .then((token) => {
    console.log('Step 8: Access token OK (expires:', token.expiration_time, ')');
    console.log('→ Credential is valid. Restart the API and try profile upload again.');
    process.exit(0);
  })
  .catch((err) => {
    console.log('Step 8: Access token FAILED:', err.message);
    if ((err.message || '').includes('invalid_grant') || (err.message || '').includes('JWT')) {
      console.log('→ Invalid JWT Signature usually means:');
      console.log('  1) Private key was regenerated in Firebase Console – download a NEW key and replace .env');
      console.log('  2) Server time is wrong – run: sudo timedatectl set-ntp true');
      console.log('  3) Key was corrupted in .env – use base64: save JSON to file, then');
      console.log('     node -e "console.log(require(\'fs\').readFileSync(\'path-to-key.json\', \'base64\'))"');
    }
    process.exit(1);
  });
