/**
 * Check if DB has audio_tracks and video_tracks (used by Home API).
 * Run: node scripts/check-home-data.js
 */
const { AudioTrack, VideoTrack } = require('../models');

async function main() {
  try {
    const audioCount = await AudioTrack.unscoped().count();
    const videoCount = await VideoTrack.unscoped().count();
    console.log('audio_tracks count:', audioCount);
    console.log('video_tracks count:', videoCount);
    if (audioCount === 0 && videoCount === 0) {
      console.log('\nNo rows in either table — Home API will return empty until you add tracks (e.g. via admin or seed).');
    }
  } catch (err) {
    console.error('Error:', err.message);
    if (err.message.includes('doesn\'t exist')) {
      console.log('Tables may not exist. Run schema or createTables script.');
    }
  } finally {
    process.exit(0);
  }
}

main();
