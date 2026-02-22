/* One-off script to add is_delete flag to products */
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
    await ensureColumn('products', 'is_delete', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Soft delete flag'
    });
    try {
      await sequelize.getQueryInterface().addIndex('products', ['is_delete']);
      console.log('✅ Index on products.is_delete added');
    } catch (e) {
      console.log('ℹ️ Skipping index creation:', e.message);
    }
    console.log('🎉 Done.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed:', err);
    process.exit(1);
  }
}

main();


