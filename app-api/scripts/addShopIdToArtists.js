const { sequelize } = require('../config/database');

async function addShopIdToArtists() {
  try {
    console.log('🔄 Adding shop_id column to artists table...');
    
    // Check if column already exists
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'artists' 
      AND COLUMN_NAME = 'shop_id'
    `);
    
    if (results.length > 0) {
      console.log('✅ shop_id column already exists');
      return;
    }
    
    // Add shop_id column
    await sequelize.query(`
      ALTER TABLE artists 
      ADD COLUMN shop_id INT NULL AFTER image_url,
      ADD FOREIGN KEY (shop_id) REFERENCES artist_shops(shop_id) ON DELETE SET NULL ON UPDATE CASCADE,
      ADD INDEX idx_artist_shop (shop_id)
    `);
    
    console.log('✅ shop_id column added successfully!');
  } catch (error) {
    console.error('❌ Error adding shop_id column:', error);
    throw error;
  }
}

if (require.main === module) {
  addShopIdToArtists()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addShopIdToArtists;

