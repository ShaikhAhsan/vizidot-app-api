const { sequelize } = require('../config/database');

async function addIsActiveToAlbums() {
  try {
    console.log('Adding is_active column to albums table...');
    
    // Check if column exists first
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'albums' 
      AND COLUMN_NAME = 'is_active'
    `);
    
    if (results.length > 0) {
      console.log('✓ Column is_active already exists in albums table');
      process.exit(0);
      return;
    }
    
    await sequelize.query(`
      ALTER TABLE albums 
      ADD COLUMN is_active TINYINT(1) DEFAULT 1
    `);
    
    console.log('✓ Successfully added is_active column to albums table');
    process.exit(0);
  } catch (error) {
    console.error('Error adding is_active column to albums:', error);
    process.exit(1);
  }
}

addIsActiveToAlbums();

