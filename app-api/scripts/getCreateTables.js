#!/usr/bin/env node
/**
 * Reads CREATE TABLE definitions from the connected MySQL database
 * and writes them to a file. Uses .env (or env.example if .env is missing) for DB config.
 *
 * Usage: node scripts/getCreateTables.js [output-file]
 * Example: node scripts/getCreateTables.js schema.sql
 *
 * If no output file is given, prints to stdout.
 * Uses only mysql2 (no Sequelize) so it can run even if other deps fail to install.
 */

const fs = require('fs');
const path = require('path');

// Load .env or env.example (no dotenv dependency)
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
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
};

async function getTableNames(conn) {
  const [rows] = await conn.execute(
    `SELECT TABLE_NAME FROM information_schema.TABLES 
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' 
     ORDER BY TABLE_NAME`,
    [config.database]
  );
  return rows.map((r) => r.TABLE_NAME);
}

function escapeId(name) {
  return '`' + String(name).replace(/`/g, '``') + '`';
}

async function getCreateTable(conn, tableName) {
  const [rows] = await conn.query(`SHOW CREATE TABLE ${escapeId(tableName)}`);
  const key = Object.keys(rows[0] || {}).find((k) => k.toLowerCase().includes('create'));
  return key ? rows[0][key] : null;
}

async function main() {
  const outputPath = process.argv[2] || null;

  let conn;
  try {
    conn = await mysql.createConnection(config);
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }

  try {
    const tables = await getTableNames(conn);

    const lines = [
      `-- CREATE TABLE definitions for database: ${config.database}`,
      `-- Generated at ${new Date().toISOString()}`,
      `-- Total tables: ${tables.length}`,
      '',
      `USE \`${config.database}\`;`,
      ''
    ];

    for (const tableName of tables) {
      const ddl = await getCreateTable(conn, tableName);
      if (ddl) {
        lines.push(`-- ------------------------------`);
        lines.push(`-- Table: ${tableName}`);
        lines.push(`-- ------------------------------`);
        lines.push(ddl + ';');
        lines.push('');
      }
    }

    const out = lines.join('\n');

    if (outputPath) {
      const fullPath = path.isAbsolute(outputPath) ? outputPath : path.join(__dirname, '..', outputPath);
      fs.writeFileSync(fullPath, out, 'utf8');
      console.log(`Wrote ${tables.length} table(s) to ${fullPath}`);
    } else {
      console.log(out);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
