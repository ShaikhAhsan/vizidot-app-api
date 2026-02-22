/*
  One-off script to add deleted_at column for Product paranoid deletes
*/
const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

async function ensureColumn(tableName, columnName, definition) {
  const qi = sequelize.getQueryInterface();
  const desc = await qi.describeTable(tableName);
  if (!desc[columnName]) {
    await qi.addColumn(tableName, columnName, definition);
    console.log(`✅ Added column ${columnName} to ${tableName}`);
  } else {
    console.log(`ℹ️ Column ${columnName} already exists on ${tableName}`);
  }
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connected');

    await ensureColumn('products', 'deleted_at', {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Soft delete timestamp'
    });

    // Optional: add index for faster queries
    try {
      await sequelize.getQueryInterface().addIndex('products', ['deleted_at']);
      console.log('✅ Index on products.deleted_at added');
    } catch (e) {
      console.log('ℹ️ Skipping index creation (may already exist):', e.message);
    }

    console.log('🎉 Done.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed:', err);
    process.exit(1);
  }
}

main();


