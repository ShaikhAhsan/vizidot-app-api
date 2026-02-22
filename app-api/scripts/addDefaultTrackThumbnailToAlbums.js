const { sequelize } = require('../config/database');

async function addDefaultTrackThumbnailToAlbums() {
  try {
    console.log('Adding default_track_thumbnail column to albums table...');
    
    // Check if column exists first
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'albums' 
      AND COLUMN_NAME = 'default_track_thumbnail'
    `);
    
    if (results.length > 0) {
      console.log('✓ Column default_track_thumbnail already exists in albums table');
      process.exit(0);
      return;
    }
    
    await sequelize.query(`
      ALTER TABLE albums 
      ADD COLUMN default_track_thumbnail VARCHAR(500) NULL
    `);
    
    console.log('✓ Successfully added default_track_thumbnail column to albums table');
    process.exit(0);
  } catch (error) {
    console.error('Error adding default_track_thumbnail column to albums:', error);
    process.exit(1);
  }
}

addDefaultTrackThumbnailToAlbums();

