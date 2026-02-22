const { sequelize } = require('../config/database');

async function makeArtistIdNullableInShops() {
  try {
    console.log('🔄 Making artist_id nullable in artist_shops table...');
    
    // Check current column definition
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'artist_shops' 
      AND COLUMN_NAME = 'artist_id'
    `);
    
    if (results.length === 0) {
      console.log('⚠️  artist_id column not found');
      return;
    }
    
    if (results[0].IS_NULLABLE === 'YES') {
      console.log('✅ artist_id is already nullable');
      return;
    }
    
    // Make artist_id nullable
    await sequelize.query(`
      ALTER TABLE artist_shops 
      MODIFY COLUMN artist_id INT NULL
    `);
    
    console.log('✅ artist_id is now nullable in artist_shops table');
  } catch (error) {
    console.error('❌ Error making artist_id nullable:', error);
    throw error;
  }
}

if (require.main === module) {
  makeArtistIdNullableInShops()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = makeArtistIdNullableInShops;

