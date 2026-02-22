const { sequelize } = require('../config/database');

async function createUserArtistsTable() {
  try {
    console.log('Creating user_artists table...');
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS user_artists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        artist_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (artist_id) REFERENCES artists(artist_id) ON DELETE CASCADE ON UPDATE CASCADE,
        UNIQUE KEY unique_user_artist (user_id, artist_id),
        INDEX idx_user_artist_user (user_id),
        INDEX idx_user_artist_artist (artist_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✓ Successfully created user_artists table');
    process.exit(0);
  } catch (error) {
    console.error('Error creating user_artists table:', error);
    process.exit(1);
  }
}

createUserArtistsTable();

