#!/usr/bin/env node
/**
 * Run LOCALLY (e.g. on your Mac) with the path to your Firebase service account JSON file.
 * If this succeeds, the key file is valid – the problem is then server time or env on the server.
 *
 * Usage: node scripts/verify-key-file.js /path/to/your-firebase-key.json
 */
const path = require('path');
const fs = require('fs');

const keyPath = process.argv[2];
if (!keyPath) {
  console.error('Usage: node scripts/verify-key-file.js /path/to/your-firebase-key.json');
  process.exit(1);
}

const absPath = path.resolve(keyPath);
if (!fs.existsSync(absPath)) {
  console.error('File not found:', absPath);
  process.exit(1);
}

console.log('Reading key file:', absPath);
console.log('Local time:', new Date().toISOString());
console.log('');

let parsed;
try {
  const jsonStr = fs.readFileSync(absPath, 'utf8');
  parsed = JSON.parse(jsonStr);
} catch (e) {
  console.error('Failed to read or parse JSON:', e.message);
  process.exit(1);
}

const key = parsed.private_key;
if (!key || !key.includes('BEGIN PRIVATE KEY') || !key.includes('END PRIVATE KEY')) {
  console.error('Invalid or truncated private_key in file.');
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
