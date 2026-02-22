const { sequelize } = require('../config/database');

async function createManyToManyTables() {
  try {
    console.log('🔄 Creating many-to-many junction tables...');

    // Create branding_artists junction table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS branding_artists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        branding_id INT NOT NULL,
        artist_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (branding_id) REFERENCES artist_brandings(branding_id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (artist_id) REFERENCES artists(artist_id) ON DELETE CASCADE ON UPDATE CASCADE,
        UNIQUE KEY unique_branding_artist (branding_id, artist_id),
        INDEX idx_branding_artists_branding (branding_id),
        INDEX idx_branding_artists_artist (artist_id)
      ) ENGINE=InnoDB
    `);

    // Create shop_artists junction table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS shop_artists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        artist_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES artist_shops(shop_id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (artist_id) REFERENCES artists(artist_id) ON DELETE CASCADE ON UPDATE CASCADE,
        UNIQUE KEY unique_shop_artist (shop_id, artist_id),
        INDEX idx_shop_artists_shop (shop_id),
        INDEX idx_shop_artists_artist (artist_id)
      ) ENGINE=InnoDB
    `);

    // Migrate existing data: For each branding, create a junction entry with its current artist_id
    const [existingBrandings] = await sequelize.query(`
      SELECT branding_id, artist_id 
      FROM artist_brandings 
      WHERE artist_id IS NOT NULL
    `);
    
    for (const branding of existingBrandings) {
      await sequelize.query(`
        INSERT IGNORE INTO branding_artists (branding_id, artist_id)
        VALUES (?, ?)
      `, {
        replacements: [branding.branding_id, branding.artist_id]
      });
    }

    // Migrate existing data: For each shop, create a junction entry with its current artist_id
    const [existingShops] = await sequelize.query(`
      SELECT shop_id, artist_id 
      FROM artist_shops 
      WHERE artist_id IS NOT NULL
    `);
    
    for (const shop of existingShops) {
      await sequelize.query(`
        INSERT IGNORE INTO shop_artists (shop_id, artist_id)
        VALUES (?, ?)
      `, {
        replacements: [shop.shop_id, shop.artist_id]
      });
    }

    // Make artist_id nullable in artist_brandings (keep for backward compatibility but not required)
    await sequelize.query(`
      ALTER TABLE artist_brandings 
      MODIFY COLUMN artist_id INT NULL
    `).catch(() => {
      // Column might already be nullable, ignore error
    });

    // Make artist_id nullable in artist_shops (keep for backward compatibility but not required)
    await sequelize.query(`
      ALTER TABLE artist_shops 
      MODIFY COLUMN artist_id INT NULL
    `).catch(() => {
      // Column might already be nullable, ignore error
    });

    console.log('✅ Many-to-many junction tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating many-to-many tables:', error);
    throw error;
  }
}

if (require.main === module) {
  createManyToManyTables()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createManyToManyTables;

