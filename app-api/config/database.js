const { Sequelize } = require('sequelize');
require('dotenv').config({ override: false });

/**
 * Single database connection for the entire app.
 * All routes, services, and models must use this sequelize instance (via require('./config/database') or require('../config/database')) so every query runs on the same connection and database.
 */
// Database configuration: use only env vars. Copy env.example to .env and set DB_* values.
const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missing = required.filter((k) => !process.env[k] || !String(process.env[k]).trim());
if (missing.length) {
  console.error('❌ Missing required env:', missing.join(', '), '— set these in your deployment environment or .env');
  throw new Error(`Missing env: ${missing.join(', ')}`);
}

let dbHost = (process.env.DB_HOST || '').trim();
if (process.env.DB_HOST_IP) {
  dbHost = (process.env.DB_HOST_IP || '').trim();
  console.log('🌐 Using DB_HOST_IP:', dbHost);
}

// In deployment, DB_HOST must be the remote DB host (e.g. srv1149167.hstgr.cloud), not localhost
const isLocalhost = !dbHost || dbHost === '127.0.0.1' || dbHost === 'localhost' || dbHost === '::1';
if (isLocalhost && process.env.NODE_ENV === 'production') {
  console.error('❌ DB_HOST is localhost/empty in production. Set DB_HOST to your remote MySQL host (e.g. srv1149167.hstgr.cloud) in the deployment environment.');
  throw new Error('DB_HOST must be your remote database host in production, not localhost');
}
if (isLocalhost) {
  console.warn('⚠️ DB_HOST is localhost — fine for local dev; for deployment set DB_HOST to your remote MySQL host in the app environment.');
}

console.log('📊 Database Configuration:');
console.log('  DB_HOST:', dbHost || '(empty)');
console.log('  DB_PORT:', process.env.DB_PORT || '3306');
console.log('  DB_NAME:', process.env.DB_NAME);
console.log('  DB_USER:', process.env.DB_USER);
console.log('  DB_PASSWORD: ***SET***');

const baseSequelizeConfig = {
  host: dbHost,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  },
  timezone: '+05:00', // Pakistan Standard Time
  dialectOptions: {
    // Enable SSL for remote connections (if required)
    ssl: process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: false
    } : false
  },
  dialectModule: require('mysql2')
};

// Only use socketPath if explicitly provided via env
if (process.env.DB_SOCKET) {
  baseSequelizeConfig.dialectOptions = {
    ...baseSequelizeConfig.dialectOptions,
    socketPath: process.env.DB_SOCKET
  };
}

// Do NOT add socketPath to dialectOptions — mysql2 ignores host/port when socketPath is present
// (even socketPath: undefined can trigger socket behaviour and 127.0.0.1/127.0.1.1 connection)
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  baseSequelizeConfig
);

// Log the actual connection config being used
console.log('🔌 Sequelize Connection Config:', {
  host: sequelize.config.host,
  port: sequelize.config.port,
  database: sequelize.config.database,
  username: sequelize.config.username,
  hasPassword: !!sequelize.config.password
});

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection
};
