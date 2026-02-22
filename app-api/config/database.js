const { Sequelize } = require('sequelize');
require('dotenv').config();

/**
 * Single database connection for the entire app.
 * All routes, services, and models must use this sequelize instance (via require('./config/database') or require('../config/database')) so every query runs on the same connection and database.
 */
// Database configuration: use only env vars. Copy env.example to .env and set DB_* values.
const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missing = required.filter((k) => !process.env[k] || !String(process.env[k]).trim());
if (missing.length) {
  console.error('❌ Missing required env:', missing.join(', '), '— copy env.example to .env and set these.');
  throw new Error(`Missing env: ${missing.join(', ')}`);
}

console.log('📊 Database Configuration:');
console.log('  DB_HOST:', process.env.DB_HOST);
console.log('  DB_PORT:', process.env.DB_PORT || '3306');
console.log('  DB_NAME:', process.env.DB_NAME);
console.log('  DB_USER:', process.env.DB_USER);
console.log('  DB_PASSWORD: ***SET***');

let dbHost = process.env.DB_HOST;
if (process.env.DB_HOST_IP) {
  dbHost = process.env.DB_HOST_IP;
  console.log('🌐 Using DB_HOST_IP:', dbHost);
}

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

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    ...baseSequelizeConfig,
    // Force TCP connection instead of socket
    dialectOptions: {
      ...baseSequelizeConfig.dialectOptions,
      socketPath: undefined, // Explicitly disable socket path
    }
  }
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
