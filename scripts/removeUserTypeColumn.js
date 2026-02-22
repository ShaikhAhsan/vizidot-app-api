const { sequelize } = require('../config/database');

async function removeUserTypeColumn() {
  try {
    console.log('🔄 Starting migration: Remove user_type column...');
    
    // Remove the user_type column
    await sequelize.query('ALTER TABLE users DROP COLUMN user_type');
    console.log('✅ Removed user_type column from users table');
    
    // Remove the user_type index if it exists
    try {
      await sequelize.query('ALTER TABLE users DROP INDEX users_user_type');
      console.log('✅ Removed user_type index');
    } catch (error) {
      console.log('ℹ️  user_type index not found (already removed or never existed)');
    }
    
    console.log('🎉 Migration completed successfully!');
    console.log('📝 Note: All users now use only the role field for access control');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  removeUserTypeColumn()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = removeUserTypeColumn;
