/**
 * Set album_id 1 to album_type = 'video' and ensure it has at least one video track.
 * Run from app-api: node scripts/setAlbum1AsVideo.js
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
if (!fs.existsSync(path.join(__dirname, '../.env')) && fs.existsSync(path.join(__dirname, '../env.example'))) {
  require('dotenv').config({ path: path.join(__dirname, '../env.example') });
}

const { sequelize } = require('../config/database');
const { Album, VideoTrack } = require('../models');

const ALBUM_ID = 1;

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    const album = await Album.findByPk(ALBUM_ID);
    if (!album) {
      console.log(`❌ Album with id ${ALBUM_ID} not found.`);
      process.exit(1);
    }

    const before = album.album_type;
    await album.update({ album_type: 'video' });
    console.log(`✅ Album ${ALBUM_ID} ("${album.title}"): album_type ${before} → video`);

    let video = await VideoTrack.findOne({ where: { album_id: ALBUM_ID } });
    if (!video) {
      video = await VideoTrack.create({
        album_id: ALBUM_ID,
        title: 'Video from Album 1',
        duration: 180,
        video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        thumbnail_url: album.cover_image_url || 'https://via.placeholder.com/200x200?text=Video',
        track_number: 1,
        is_deleted: false,
      });
      console.log(`✅ Created video track: ${video.title} (id: ${video.video_id})`);
    } else {
      console.log(`📌 Existing video track for album ${ALBUM_ID}: ${video.title} (id: ${video.video_id})`);
    }

    console.log('\n🎬 Done. Restart App API and call GET /api/v1/music/artists/profile/1 - videoAlbums and videos should appear.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
