#!/usr/bin/env node
/**
 * Creates the artist_followers table if it does not exist.
 * Run: node scripts/createArtistFollowersTable.js
 * Uses .env or env.example for DB config.
 */

const path = require('path');
const fs = require('fs');

function loadEnv() {
  const root = path.join(__dirname, '..');
  const envPath = path.join(root, '.env');
  const examplePath = path.join(root, 'env.example');
  const toLoad = fs.existsSync(envPath) ? envPath : examplePath;
  try {
    const content = fs.readFileSync(toLoad, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch (_) {}
}

loadEnv();

const mysql = require('mysql2/promise');

const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missing = required.filter((k) => !process.env[k] || !String(process.env[k]).trim());
if (missing.length) {
  console.error('❌ Set in .env (copy from env.example):', missing.join(', '));
  process.exit(1);
}

const config = {
  host: process.env.DB_HOST_IP || process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS artist_followers (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  artist_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_artist_followers_user_artist (user_id, artist_id),
  KEY idx_artist_followers_artist (artist_id),
  CONSTRAINT fk_artist_followers_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_artist_followers_artist FOREIGN KEY (artist_id) REFERENCES artists (artist_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

async function main() {
  let conn;
  try {
    conn = await mysql.createConnection(config);
    await conn.query(CREATE_SQL);
    console.log('artist_followers table created or already exists.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

main();
