const { Role } = require('../models');

const roles = [
  // System Roles
  {
    name: 'super_admin',
    display_name: 'Super Administrator',
    description: 'Full system access, can manage all businesses and users',
    type: 'system',
    level: 100,
    permissions: {
      'system': ['*'],
      'business': ['*'],
      'user': ['*'],
      'order': ['*'],
      'product': ['*'],
      'review': ['*'],
      'coupon': ['*']
    }
  },
  {
    name: 'system_admin',
    display_name: 'System Administrator',
    description: 'System administration with limited business access',
    type: 'system',
    level: 90,
    permissions: {
      'system': ['read', 'update'],
      'business': ['read', 'update'],
      'user': ['read', 'update'],
      'order': ['read'],
      'product': ['read'],
      'review': ['read', 'update'],
      'coupon': ['read']
    }
  },
  
  // Business Roles
  {
    name: 'business_owner',
    display_name: 'Business Owner',
    description: 'Full access to their business operations',
    type: 'business',
    level: 80,
    permissions: {
      'business': ['read', 'update', 'delete'],
      'user': ['read', 'create', 'update'],
      'order': ['*'],
      'product': ['*'],
      'review': ['*'],
      'coupon': ['*'],
      'category': ['*'],
      'staff': ['*']
    }
  },
  {
    name: 'business_admin',
    display_name: 'Business Administrator',
    description: 'Business administration and management',
    type: 'business',
    level: 70,
    permissions: {
      'business': ['read', 'update'],
      'user': ['read', 'create', 'update'],
      'order': ['*'],
      'product': ['*'],
      'review': ['read', 'update'],
      'coupon': ['*'],
      'category': ['*'],
      'staff': ['read', 'create', 'update']
    }
  },
  {
    name: 'business_manager',
    display_name: 'Business Manager',
    description: 'Business operations management',
    type: 'business',
    level: 60,
    permissions: {
      'business': ['read'],
      'user': ['read'],
      'order': ['read', 'update'],
      'product': ['read', 'create', 'update'],
      'review': ['read', 'update'],
      'coupon': ['read', 'create'],
      'category': ['read', 'create', 'update'],
      'staff': ['read']
    }
  },
  {
    name: 'business_staff',
    display_name: 'Business Staff',
    description: 'General business staff member',
    type: 'business',
    level: 50,
    permissions: {
      'business': ['read'],
      'user': ['read'],
      'order': ['read', 'update'],
      'product': ['read', 'update'],
      'review': ['read'],
      'coupon': ['read'],
      'category': ['read']
    }
  },
  {
    name: 'business_rider',
    display_name: 'Delivery Rider',
    description: 'Delivery and order fulfillment staff',
    type: 'business',
    level: 40,
    permissions: {
      'business': ['read'],
      'order': ['read', 'update'],
      'user': ['read']
    }
  },
  {
    name: 'business_cashier',
    display_name: 'Cashier',
    description: 'Payment and transaction handling',
    type: 'business',
    level: 45,
    permissions: {
      'business': ['read'],
      'order': ['read', 'update'],
      'user': ['read'],
      'payment': ['*']
    }
  },
  
  // Customer Role
  {
    name: 'customer',
    display_name: 'Customer',
    description: 'Regular customer with basic access',
    type: 'customer',
    level: 10,
    permissions: {
      'order': ['read', 'create'],
      'product': ['read'],
      'review': ['read', 'create'],
      'business': ['read'],
      'coupon': ['read']
    }
  }
];

async function seedRoles() {
  try {
    console.log('🔄 Seeding roles...');
    
    for (const roleData of roles) {
      const [role, created] = await Role.findOrCreate({
        where: { name: roleData.name },
        defaults: roleData
      });
      
      if (created) {
        console.log(`✅ Created role: ${role.display_name}`);
      } else {
        console.log(`ℹ️  Role already exists: ${role.display_name}`);
      }
    }
    
    console.log('🎉 Role seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Role seeding failed:', error);
    throw error;
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedRoles()
    .then(() => {
      console.log('✅ Role seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Role seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedRoles;
