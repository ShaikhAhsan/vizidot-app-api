const { sequelize } = require('../config/database');

async function addIsActiveToArtists() {
  try {
    console.log('🔄 Adding is_active column to artists table...');
    
    // Check if column already exists
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'artists' 
      AND COLUMN_NAME = 'is_active'
    `);
    
    if (results.length > 0) {
      console.log('✅ is_active column already exists');
      return;
    }
    
    // Add is_active column
    await sequelize.query(`
      ALTER TABLE artists 
      ADD COLUMN is_active TINYINT(1) DEFAULT 1 AFTER is_deleted
    `);
    
    // Set all existing artists as active
    await sequelize.query(`
      UPDATE artists 
      SET is_active = 1 
      WHERE is_active IS NULL
    `);
    
    console.log('✅ is_active column added successfully!');
  } catch (error) {
    console.error('❌ Error adding is_active column:', error);
    throw error;
  }
}

if (require.main === module) {
  addIsActiveToArtists()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addIsActiveToArtists;

