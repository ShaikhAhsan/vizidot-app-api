/**
 * One-off script: insert one video album and one video track for artist_id 1
 * so GET /api/v1/music/artists/profile/1 returns videoAlbums and videos.
 *
 * Run from app-api: node scripts/seedVideoAlbumForArtist1.js
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
if (!fs.existsSync(path.join(__dirname, '../.env')) && fs.existsSync(path.join(__dirname, '../env.example'))) {
  require('dotenv').config({ path: path.join(__dirname, '../env.example') });
}

const { sequelize } = require('../config/database');
const { Artist, Album, VideoTrack } = require('../models');

const ARTIST_ID = 1;

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    const artist = await Artist.findByPk(ARTIST_ID);
    if (!artist) {
      console.log(`❌ Artist with id ${ARTIST_ID} not found. Create an artist first.`);
      process.exit(1);
    }

    let videoAlbum = await Album.findOne({
      where: { artist_id: ARTIST_ID, album_type: 'video', is_active: true },
    });
    if (!videoAlbum) {
      videoAlbum = await Album.create({
        artist_id: ARTIST_ID,
        album_type: 'video',
        title: 'Sample Video Album',
        description: 'Test video album for artist profile',
        cover_image_url: 'https://via.placeholder.com/300x300?text=Video+Album',
        is_active: true,
        is_deleted: false,
      });
      console.log(`✅ Created video album: ${videoAlbum.title} (id: ${videoAlbum.album_id})`);
    } else {
      console.log(`📌 Using existing video album: ${videoAlbum.title} (id: ${videoAlbum.album_id})`);
    }

    let video = await VideoTrack.findOne({
      where: { album_id: videoAlbum.album_id },
    });
    if (!video) {
      video = await VideoTrack.create({
        album_id: videoAlbum.album_id,
        title: 'Sample Video',
        duration: 180,
        video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        thumbnail_url: 'https://via.placeholder.com/200x200?text=Video',
        track_number: 1,
        is_deleted: false,
      });
      console.log(`✅ Created video track: ${video.title} (id: ${video.video_id})`);
    } else {
      console.log(`📌 Using existing video track: ${video.title} (id: ${video.video_id})`);
    }

    console.log('\n🎬 Done. Call GET /api/v1/music/artists/profile/1 to see videoAlbums and videos.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
