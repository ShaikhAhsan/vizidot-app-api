const { User, Role, UserRole } = require('../models');
const { sequelize } = require('../config/database');

async function makeSuperAdmin() {
  try {
    console.log('🔄 Making a@a.com a super admin...');
    
    // Find the user
    const user = await User.findOne({ where: { email: 'a@a.com' } });
    if (!user) {
      throw new Error('User with email a@a.com not found');
    }
    
    console.log(`✅ Found user: ${user.first_name} ${user.last_name} (${user.email})`);
    
    // Get the super_admin role
    let superAdminRole = await Role.findOne({ where: { name: 'super_admin' } });
    
    // If role doesn't exist, create it
    if (!superAdminRole) {
      console.log('Creating super_admin role...');
      superAdminRole = await Role.create({
        name: 'super_admin',
        display_name: 'Super Administrator',
        description: 'Full system access with all permissions',
        type: 'system',
        level: 100,
        permissions: { all: true },
        is_active: true
      });
      console.log('✅ Created super_admin role');
    } else {
      console.log(`✅ Found super_admin role: ${superAdminRole.display_name}`);
    }
    
    // Update user's primary_role
    await User.update(
      { primary_role: 'super_admin' },
      { where: { id: user.id } }
    );
    console.log('✅ Updated user primary_role to super_admin');
    
    // Check if user already has the role in user_roles table
    const existingUserRole = await UserRole.findOne({
      where: {
        user_id: user.id,
        role_id: superAdminRole.id,
        business_id: null
      }
    });
    
    if (existingUserRole) {
      if (existingUserRole.is_active) {
        console.log('ℹ️  User already has super admin role in user_roles table');
      } else {
        await existingUserRole.update({ is_active: true });
        console.log('✅ Reactivated super admin role in user_roles table');
      }
    } else {
      // Create user role entry
      await UserRole.create({
        user_id: user.id,
        role_id: superAdminRole.id,
        business_id: null,
        assigned_by: user.id,
        is_active: true
      });
      console.log('✅ Created super admin role entry in user_roles table');
    }
    
    // Verify
    const updatedUser = await User.findByPk(user.id);
    console.log(`\n✅ User updated successfully!`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Primary Role: ${updatedUser.primary_role}`);
    console.log(`   Role: ${updatedUser.role || 'N/A'}`);
    
    console.log('\n🎉 a@a.com is now a super admin!');
    
  } catch (error) {
    console.error('❌ Failed to make user super admin:', error);
    throw error;
  }
}

// Run script if called directly
if (require.main === module) {
  makeSuperAdmin()
    .then(() => {
      console.log('✅ Super admin assignment completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Super admin assignment failed:', error);
      process.exit(1);
    });
}

module.exports = makeSuperAdmin;

