#!/usr/bin/env node
/**
 * Check that all 5 App API endpoints respond correctly.
 * Run with: node scripts/check-endpoints.js
 * (Start the server first: npm run dev)
 */

const BASE = process.env.APP_API_BASE || 'http://localhost:8000';

async function check(name, method, path, expectStatus, expectBody) {
  const url = path.startsWith('http') ? path : BASE + path;
  try {
    const res = await fetch(url, {
      method,
      redirect: 'manual',
      headers: { Accept: 'application/json' }
    });
    const ok = res.status === expectStatus;
    let body = null;
    const ct = res.headers.get('content-type');
    if (ct && ct.includes('json')) {
      try { body = await res.json(); } catch (_) {}
    } else if (expectStatus !== 204) {
      body = await res.text();
    }
    if (expectBody && body && typeof expectBody === 'object') {
      const keysOk = Object.keys(expectBody).every(k => body && body[k] === expectBody[k]);
      if (!keysOk) return { name, ok: false, status: res.status, body, expected: expectBody };
    }
    return { name, ok, status: res.status, body };
  } catch (e) {
    return { name, ok: false, error: e.message };
  }
}

async function main() {
  console.log('Checking App API at', BASE, '\n');

  const tests = [
    { name: '1. GET /', path: '/', expectStatus: 302 },
    { name: '2. GET /health', path: '/health', expectStatus: 200, expectBody: { status: 'OK' } },
    { name: '3. GET /health.php', path: '/health.php', expectStatus: 200, expectBody: { status: 'OK' } },
    { name: '4. GET /favicon.ico', path: '/favicon.ico', expectStatus: 204 },
    { name: '5. GET /api/v1/auth', path: '/api/v1/auth', expectStatus: 200, expectBody: { api: 'app', module: 'auth' } }
  ];

  let failed = 0;
  for (const t of tests) {
    const result = await check(t.name, 'GET', t.path, t.expectStatus, t.expectBody);
    const status = result.ok ? '✓' : '✗';
    if (!result.ok) failed++;
    console.log(status, result.name, result.ok ? `→ ${result.status}` : `→ ${result.status || result.error}`);
    if (result.error) console.log('   Error:', result.error);
    if (result.body && !result.ok && result.body.error) console.log('   Body:', result.body);
  }

  console.log('\n' + (failed === 0 ? 'All 5 endpoints OK.' : `${failed} check(s) failed. Is the server running? (npm run dev)`));
  process.exit(failed > 0 ? 1 : 0);
}

main();
