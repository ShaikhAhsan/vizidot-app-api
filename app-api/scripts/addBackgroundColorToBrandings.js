const { sequelize } = require('../config/database');

async function addBackgroundColorToBrandings() {
  try {
    console.log('🔄 Adding background_color column to artist_brandings table...');
    
    // Check if column already exists
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'artist_brandings' 
      AND COLUMN_NAME = 'background_color'
    `);
    
    if (results.length > 0) {
      console.log('✅ background_color column already exists');
      return;
    }
    
    // Add background_color column
    await sequelize.query(`
      ALTER TABLE artist_brandings 
      ADD COLUMN background_color VARCHAR(7) NULL AFTER tagline
    `);
    
    console.log('✅ background_color column added successfully!');
  } catch (error) {
    console.error('❌ Error adding background_color column:', error);
    throw error;
  }
}

if (require.main === module) {
  addBackgroundColorToBrandings()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addBackgroundColorToBrandings;

