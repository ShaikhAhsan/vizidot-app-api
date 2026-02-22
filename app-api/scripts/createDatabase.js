require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function createDatabase(dbName) {
  const host = process.env.DB_HOST;
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD || '';
  if (!host || !user) {
    throw new Error('Set DB_HOST, DB_USER (and optionally DB_PORT, DB_PASSWORD) in .env');
  }
  const connection = await mysql.createConnection({ host, port, user, password, multipleStatements: true });
  try {
    console.log(`🔧 Creating database if not exists: ${dbName}`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`);
    console.log('✅ Database ready');
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  const dbName = process.env.DB_NAME;
  if (!dbName) {
    console.error('❌ Set DB_NAME in .env (copy from env.example)');
    process.exit(1);
  }
  createDatabase(dbName).catch(err => { console.error('❌ Failed to create database:', err); process.exit(1); });
}

module.exports = createDatabase;


