/**
 * Test the Home API (top audios + top videos from play history).
 * Usage: node scripts/test-home-api.js
 * Requires: app-api server running (e.g. npm run dev). Restart server after adding /home route.
 */

const base = process.env.API_BASE_URL || 'http://localhost:8000';

async function main() {
  console.log('Testing Home API at', base, '\n');

  // 1) GET /api/v1/music — must list GET /home
  try {
    const res = await fetch(`${base}/api/v1/music`);
    if (!res.ok) {
      console.error('GET /api/v1/music failed:', res.status);
      process.exit(1);
    }
    const data = await res.json();
    const endpoints = data.endpoints || [];
    const hasHome = endpoints.some((e) => e === 'GET /home');
    if (!hasHome) {
      console.error('GET /home is not in the music endpoints list.');
      console.error('Restart the app-api server (e.g. npm run dev) and run this script again.');
      process.exit(1);
    }
    console.log('✓ GET /api/v1/music lists GET /home');
  } catch (e) {
    console.error('Request failed:', e.message);
    console.error('Is the app-api server running on', base, '?');
    process.exit(1);
  }

  // 2) GET /api/v1/music/home
  try {
    const res = await fetch(`${base}/api/v1/music/home?limit=5`);
    const body = await res.json();
    if (res.status === 404 && body.error === 'Route not found') {
      console.error('\nGET /api/v1/music/home returned 404 Route not found.');
      console.error('Restart the app-api server so it loads the home route.');
      process.exit(1);
    }
    if (res.status !== 200) {
      console.error('\nGET /home:', res.status, body);
      process.exit(1);
    }
    if (!body.success || !body.data) {
      console.error('Unexpected response:', body);
      process.exit(1);
    }
    const { topAudios = [], topVideos = [] } = body.data;
    console.log('✓ GET /api/v1/music/home succeeded');
    console.log('  topAudios:', topAudios.length, 'items');
    console.log('  topVideos:', topVideos.length, 'items');
    if (topAudios.length > 0) {
      console.log('  First audio:', topAudios[0].title, '–', topAudios[0].artistName);
    }
    if (topVideos.length > 0) {
      console.log('  First video:', topVideos[0].title, '–', topVideos[0].artistName);
    }
  } catch (e) {
    console.error('GET /home failed:', e.message);
    process.exit(1);
  }

  console.log('\nDone. Home API is working.');
}

main();
