const { sequelize } = require('../config/database');

async function addIsActiveToShops() {
  try {
    console.log('Adding is_active column to artist_shops table...');
    
    // Check if column exists first
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'artist_shops' 
      AND COLUMN_NAME = 'is_active'
    `);
    
    if (results.length > 0) {
      console.log('✓ Column is_active already exists in artist_shops table');
      process.exit(0);
      return;
    }
    
    await sequelize.query(`
      ALTER TABLE artist_shops 
      ADD COLUMN is_active TINYINT(1) DEFAULT 1
    `);
    
    console.log('✓ Successfully added is_active column to artist_shops table');
    process.exit(0);
  } catch (error) {
    console.error('Error adding is_active column to artist_shops:', error);
    process.exit(1);
  }
}

addIsActiveToShops();

