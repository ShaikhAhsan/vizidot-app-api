#!/usr/bin/env node
/**
 * Verify Agora RTC token generation using .env (AGORA_APP_ID, AGORA_APP_CERTIFICATE).
 * Run from api/vizidot-app-api: node scripts/verify-agora-token.js
 * If this succeeds but the app still gets -17, the certificate in .env does not match
 * the Agora project for this App ID — copy Primary Certificate again from Agora Console.
 */
require('dotenv').config();
const { RtcTokenBuilder, RtcRole } = require('agora-token');

const AGORA_APP_ID = (process.env.AGORA_APP_ID || '').trim();
const AGORA_APP_CERTIFICATE = (process.env.AGORA_APP_CERTIFICATE || '').trim();

function isValidHex32(v) {
  return typeof v === 'string' && v.length === 32 && /^[0-9a-fA-F]+$/.test(v);
}

console.log('AGORA_APP_ID set?', AGORA_APP_ID ? `Yes (${AGORA_APP_ID.length} chars)` : 'No');
console.log('AGORA_APP_CERTIFICATE set?', AGORA_APP_CERTIFICATE ? `Yes (${AGORA_APP_CERTIFICATE.length} chars)` : 'No');

if (!AGORA_APP_ID) {
  console.error('→ Set AGORA_APP_ID in .env');
  process.exit(1);
}
if (!AGORA_APP_CERTIFICATE) {
  console.error('→ Set AGORA_APP_CERTIFICATE in .env (Primary Certificate from Agora Console for this project).');
  process.exit(1);
}
if (!isValidHex32(AGORA_APP_ID) || !isValidHex32(AGORA_APP_CERTIFICATE)) {
  console.error('→ Both must be exactly 32 hex characters (no spaces/newlines).');
  process.exit(1);
}

const channelName = 'test-channel';
const uid = 0;
const role = RtcRole.SUBSCRIBER;
const tokenExpire = 3600;
const privilegeExpire = 3600;

let token;
try {
  token = RtcTokenBuilder.buildTokenWithUid(
    AGORA_APP_ID,
    AGORA_APP_CERTIFICATE,
    channelName,
    uid,
    role,
    tokenExpire,
    privilegeExpire,
  );
} catch (e) {
  console.error('Token build failed:', e.message);
  process.exit(1);
}

if (!token || token.length === 0) {
  console.error('Token build returned empty. Certificate does not match this App ID\'s project.');
  console.error('→ In Agora Console open the project for App ID', AGORA_APP_ID.slice(0, 8) + '...', '→ Project Management → Primary Certificate → copy again.');
  process.exit(1);
}

console.log('OK: Token generated for channel=%s uid=%s (length=%d)', channelName, uid, token.length);
console.log('If the app still gets -17, the certificate in .env is for a different project. Copy Primary Certificate again from the project that has this App ID.');
