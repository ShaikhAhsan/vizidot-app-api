const { sequelize } = require('../config/database');

async function addThumbnailUrlToAudioTracks() {
  try {
    console.log('Adding thumbnail_url column to audio_tracks table...');
    
    // Check if column exists first
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'audio_tracks' 
      AND COLUMN_NAME = 'thumbnail_url'
    `);
    
    if (results.length > 0) {
      console.log('✓ Column thumbnail_url already exists in audio_tracks table');
      process.exit(0);
      return;
    }
    
    await sequelize.query(`
      ALTER TABLE audio_tracks 
      ADD COLUMN thumbnail_url VARCHAR(500) NULL
    `);
    
    console.log('✓ Successfully added thumbnail_url column to audio_tracks table');
    process.exit(0);
  } catch (error) {
    console.error('Error adding thumbnail_url column to audio_tracks:', error);
    process.exit(1);
  }
}

addThumbnailUrlToAudioTracks();

