#!/usr/bin/env node
/**
 * Verify Firebase credential and token fetch.
 * - With a file path: read from file (for local use).
 * - With no args: use FIREBASE_SERVICE_ACCOUNT_JSON from env (same as the API). Use this in the container.
 *
 * Usage:
 *   node scripts/verify-key-file.js /path/to/your-firebase-key.json   # local
 *   node scripts/verify-key-file.js                                  # in container, uses env (same as API)
 */
const path = require('path');
const fs = require('fs');

require('dotenv').config({ override: false });

function loadCredentialFromEnv() {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!raw) return null;
  const jsonStr = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  let parsed = JSON.parse(jsonStr);
  let key = parsed.private_key;
  if (key && key.includes('\\n') && !key.includes('\n')) {
    parsed.private_key = key.replace(/\\n/g, '\n');
    key = parsed.private_key;
  }
  return parsed;
}

function loadCredentialFromFile(keyPath) {
  const absPath = path.resolve(keyPath);
  if (!fs.existsSync(absPath)) throw new Error('File not found: ' + absPath);
  const jsonStr = fs.readFileSync(absPath, 'utf8');
  let parsed = JSON.parse(jsonStr);
  let key = parsed.private_key;
  if (key && key.includes('\\n') && !key.includes('\n')) {
    parsed.private_key = key.replace(/\\n/g, '\n');
  }
  return parsed;
}

const keyPath = process.argv[2];
let parsed;
let source;

if (!keyPath) {
  parsed = loadCredentialFromEnv();
  if (!parsed) {
    console.error('No file path given and FIREBASE_SERVICE_ACCOUNT_JSON is not set.');
    console.error('Usage: node scripts/verify-key-file.js [path/to/key.json]');
    process.exit(1);
  }
  source = 'env (FIREBASE_SERVICE_ACCOUNT_JSON)';
} else {
  try {
    parsed = loadCredentialFromFile(keyPath);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  source = 'file: ' + path.resolve(keyPath);
}

console.log('Credential source:', source);
console.log('Local time:', new Date().toISOString());
console.log('');

const key = parsed.private_key;
if (!key || !key.includes('BEGIN PRIVATE KEY') || !key.includes('END PRIVATE KEY')) {
  console.error('Invalid or truncated private_key.');
  process.exit(1);
}

console.log('Project ID:', parsed.project_id);
console.log('Initializing Firebase and fetching access token...');

const admin = require('firebase-admin');
if (admin.apps.length > 0) admin.app().delete();

admin.initializeApp({
  credential: admin.credential.cert(parsed),
  projectId: parsed.project_id
});

const cred = admin.app().options.credential;
cred.getAccessToken()
  .then((token) => {
    console.log('Success: access token obtained. Key file is valid.');
    console.log('If the server still fails, the issue is (1) server time or (2) env value on the server (truncated/corrupt when pasting).');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to get access token:', err.message);
    process.exit(1);
  });
