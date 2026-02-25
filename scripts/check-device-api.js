#!/usr/bin/env node
/**
 * Quick check that the device API is available (run after deploying/restarting the API).
 * Usage: node scripts/check-device-api.js [BASE_URL]
 * Example: node scripts/check-device-api.js http://109.106.244.241:9000
 */
const base = process.argv[2] || process.env.API_BASE_URL || 'http://localhost:8000';
const url = `${base.replace(/\/$/, '')}/api/v1/device/health`;

const http = require('http');
const https = require('https');
const lib = url.startsWith('https') ? https : http;

const req = lib.get(url, (res) => {
  let data = '';
  res.on('data', (ch) => { data += ch; });
  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const body = JSON.parse(data || '{}');
        if (body.success && body.service === 'device') {
          console.log('OK Device API is running at', url);
          process.exit(0);
        }
      } catch (_) {}
    }
    console.error('Device API check failed:', res.statusCode, data || res.statusMessage);
    process.exit(1);
  });
});

req.on('error', (err) => {
  console.error('Request failed:', err.message);
  process.exit(1);
});

req.setTimeout(10000, () => {
  req.destroy();
  console.error('Request timed out');
  process.exit(1);
});
