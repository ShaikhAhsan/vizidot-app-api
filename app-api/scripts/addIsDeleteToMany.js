/* Add is_delete to many tables at once */
const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const TABLES = [
  'businesses',
  'brands',
  'categories',
  'coupons',
  'product_categories',
  'product_tags',
  'reviews',
  'tags',
  'users'
];

async function ensureIsDelete(tableName) {
  const qi = sequelize.getQueryInterface();
  const desc = await qi.describeTable(tableName);
  if (!desc['is_delete']) {
    await qi.addColumn(tableName, 'is_delete', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Soft delete flag'
    });
    console.log(`✅ ${tableName}: added is_delete`);
    try {
      await qi.addIndex(tableName, ['is_delete']);
      console.log(`✅ ${tableName}: index on is_delete`);
    } catch (e) {
      console.log(`ℹ️ ${tableName}: skip index (${e.message})`);
    }
  } else {
    console.log(`ℹ️ ${tableName}: is_delete already exists`);
  }
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connected');
    for (const t of TABLES) {
      await ensureIsDelete(t);
    }
    console.log('🎉 Done');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed:', err);
    process.exit(1);
  }
}

main();


