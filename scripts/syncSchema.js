require('dotenv').config();

const { sequelize } = require('../config/database');
// Import models to ensure associations are registered before sync
require('../models');

async function syncSchema() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connection OK');

    console.log('🔄 Syncing database schema (alter mode)...');
    await sequelize.sync({ alter: true });
    console.log('🎉 Schema sync completed successfully');
  } catch (error) {
    console.error('❌ Schema sync failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('🔌 Connection closed');
  }
}

if (require.main === module) {
  syncSchema();
}

module.exports = syncSchema;


