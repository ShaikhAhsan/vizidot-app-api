/**
 * Creates user_music_categories table for storing logged-in user's selected categories.
 * Run: node scripts/createUserMusicCategoriesTable.js
 */
const { sequelize } = require('../config/database');

async function createUserMusicCategoriesTable() {
  try {
    console.log('Creating user_music_categories table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS user_music_categories (
        id INT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        music_category_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY unique_user_music_category (user_id, music_category_id),
        INDEX idx_user_music_categories_user (user_id),
        CONSTRAINT fk_user_music_categories_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_user_music_categories_category FOREIGN KEY (music_category_id) REFERENCES music_categories (id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Successfully created user_music_categories table');
  } catch (error) {
    console.error('Error creating user_music_categories table:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

createUserMusicCategoriesTable();
