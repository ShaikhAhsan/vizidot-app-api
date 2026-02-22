const { sequelize } = require('../config/database');

async function addIsActiveToBrandings() {
  try {
    console.log('🔄 Adding is_active column to artist_brandings table...');
    
    // Check if column already exists
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'artist_brandings' 
      AND COLUMN_NAME = 'is_active'
    `);
    
    if (results.length > 0) {
      console.log('✅ is_active column already exists');
      return;
    }
    
    // Add is_active column
    await sequelize.query(`
      ALTER TABLE artist_brandings 
      ADD COLUMN is_active TINYINT(1) DEFAULT 1 AFTER is_deleted
    `);
    
    // Set all existing brandings as active
    await sequelize.query(`
      UPDATE artist_brandings 
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
  addIsActiveToBrandings()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addIsActiveToBrandings;

