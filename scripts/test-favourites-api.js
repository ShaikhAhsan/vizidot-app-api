/**
 * Quick check that favourites routes are registered and (optionally) work.
 * Usage:
 *   node scripts/test-favourites-api.js
 *   FAVOURITES_TOKEN="Bearer <jwt>" node scripts/test-favourites-api.js
 *
 * If you get 404 on POST /api/v1/music/favourites, restart the app-api server
 * so it loads the routes from routes/music.js.
 */

const base = process.env.API_BASE_URL || 'http://localhost:8000';
const token = process.env.FAVOURITES_TOKEN;

async function main() {
  console.log('Testing favourites API at', base, '\n');

  // 1) GET /api/v1/music — must list POST /favourites
  try {
    const res = await fetch(`${base}/api/v1/music`);
    if (!res.ok) {
      console.error('GET /api/v1/music failed:', res.status);
      process.exit(1);
    }
    const data = await res.json();
    const endpoints = data.endpoints || [];
    const hasPostFavourites = endpoints.some((e) => e === 'POST /favourites');
    if (!hasPostFavourites) {
      console.error('POST /favourites is not in the music endpoints list.');
      console.error('Restart the app-api server (e.g. npm run dev) and run this script again.');
      process.exit(1);
    }
    console.log('✓ GET /api/v1/music lists POST /favourites');
  } catch (e) {
    console.error('Request failed:', e.message);
    console.error('Is the app-api server running on', base, '?');
    process.exit(1);
  }

  if (!token) {
    console.log('\nSkipping POST test (set FAVOURITES_TOKEN to test add favourite).');
    return;
  }

  // 2) POST /api/v1/music/favourites
  try {
    const res = await fetch(`${base}/api/v1/music/favourites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`
      },
      body: JSON.stringify({ entityType: 'album', entityId: 1 })
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 404 && body.error === 'Route not found') {
      console.error('\nPOST /api/v1/music/favourites returned 404 Route not found.');
      console.error('Restart the app-api server so it loads the favourites routes.');
      process.exit(1);
    }
    if (res.status !== 200 && res.status !== 201) {
      console.error('\nPOST /favourites:', res.status, body);
      process.exit(1);
    }
    console.log('✓ POST /api/v1/music/favourites succeeded:', res.status, body.message || '');
  } catch (e) {
    console.error('POST failed:', e.message);
    process.exit(1);
  }
}

main();
