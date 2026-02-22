/**
 * Creates user_favourites table for albums, tracks (audio), and videos.
 * Run: node scripts/createUserFavouritesTable.js
 */
const { sequelize } = require('../config/database');

async function createUserFavouritesTable() {
  try {
    console.log('Creating user_favourites table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS user_favourites (
        id INT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        entity_type ENUM('album', 'track', 'video') NOT NULL COMMENT 'album=album_id, track=audio_id, video=video_id',
        entity_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY unique_user_favourite (user_id, entity_type, entity_id),
        INDEX idx_user_favourites_user (user_id),
        INDEX idx_user_favourites_entity (entity_type, entity_id),
        CONSTRAINT fk_user_favourites_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Successfully created user_favourites table');
  } catch (error) {
    console.error('Error creating user_favourites table:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

createUserFavouritesTable();
