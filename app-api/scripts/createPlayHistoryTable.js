/**
 * Creates play_history table for tracking audio/video plays.
 * Run: node scripts/createPlayHistoryTable.js
 */
const { sequelize } = require('../config/database');

async function createPlayHistoryTable() {
  try {
    console.log('Creating play_history table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS play_history (
        id INT NOT NULL AUTO_INCREMENT,
        user_id INT NULL,
        entity_type ENUM('audio', 'video') NOT NULL,
        entity_id INT NOT NULL,
        played_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_play_history_entity (entity_type, entity_id),
        INDEX idx_play_history_user (user_id),
        INDEX idx_play_history_played_at (played_at),
        CONSTRAINT fk_play_history_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Successfully created play_history table');
  } catch (error) {
    console.error('Error creating play_history table:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

createPlayHistoryTable();
