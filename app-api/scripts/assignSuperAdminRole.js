const { User, Role, UserRole } = require('../models');
const RBACService = require('../services/rbacService');

async function assignSuperAdminRole() {
  try {
    console.log('🔄 Assigning super admin role to existing user...');
    
    // Find the existing user (the one we've been testing with)
    const user = await User.findOne({ where: { email: 'a@a.com' } });
    if (!user) {
      throw new Error('User with email a@a.com not found');
    }
    
    console.log(`✅ Found user: ${user.first_name} ${user.last_name} (${user.email})`);
    
    // Get the super_admin role
    const superAdminRole = await Role.findOne({ where: { name: 'super_admin' } });
    if (!superAdminRole) {
      throw new Error('Super admin role not found');
    }
    
    console.log(`✅ Found super admin role: ${superAdminRole.display_name}`);
    
    // Check if user already has the role
    const existingUserRole = await UserRole.findOne({
      where: {
        user_id: user.id,
        role_id: superAdminRole.id,
        business_id: null // System role, not business-specific
      }
    });
    
    if (existingUserRole) {
      if (existingUserRole.is_active) {
        console.log('ℹ️  User already has super admin role');
        return;
      } else {
        // Reactivate the role
        await existingUserRole.update({ is_active: true });
        console.log('✅ Reactivated super admin role for user');
        return;
      }
    }
    
    // Assign the super admin role
    await RBACService.assignRole(user.id, 'super_admin', null, user.id);
    console.log('✅ Assigned super admin role to user');
    
    // Verify the assignment
    const userRoles = await RBACService.getUserRoles(user.id);
    const highestRole = await RBACService.getUserHighestRole(user.id);
    
    console.log('📋 User roles:');
    userRoles.forEach(userRole => {
      console.log(`  - ${userRole.role.display_name} (${userRole.role.name}) - Level ${userRole.role.level}`);
    });
    
    console.log(`🎯 Highest role: ${highestRole.role.display_name} (Level ${highestRole.role.level})`);
    
    console.log('🎉 Super admin role assignment completed successfully!');
    
  } catch (error) {
    console.error('❌ Super admin role assignment failed:', error);
    throw error;
  }
}

// Run script if called directly
if (require.main === module) {
  assignSuperAdminRole()
    .then(() => {
      console.log('✅ Super admin role assignment completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Super admin role assignment failed:', error);
      process.exit(1);
    });
}

module.exports = assignSuperAdminRole;
