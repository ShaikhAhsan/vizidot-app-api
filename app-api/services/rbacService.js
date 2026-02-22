const { sequelize } = require('../config/database');
const { User, Role, UserRole, Business } = require('../models');

class RBACService {
  /**
   * Get all roles for a user (including business-specific roles)
   */
  static async getUserRoles(userId, businessId = null) {
    try {
      const whereClause = {
        user_id: userId,
        is_active: true
      };
      
      if (businessId) {
        whereClause.business_id = businessId;
      }
      
      // Try to include Business, but handle if table doesn't exist
      let includes = [
        {
          model: Role,
          as: 'role',
          where: { is_active: true }
        }
      ];
      
      // Only include Business if business_id is not null (to avoid unnecessary joins)
      // and handle gracefully if table doesn't exist
      try {
        includes.push({
          model: Business,
          as: 'business',
          required: false
        });
      } catch (err) {
        // Business table might not exist, continue without it
        console.warn('Business table not available, skipping business association');
      }
      
      const userRoles = await UserRole.findAll({
        where: whereClause,
        include: includes
      });
      
      return userRoles;
    } catch (error) {
      // If error is about missing Business table, try without it
      if (error.message && error.message.includes("doesn't exist") && error.message.includes('business')) {
        console.warn('Business table not found, fetching roles without business association');
        try {
          const whereClause = {
            user_id: userId,
            is_active: true
          };
          
          if (businessId) {
            whereClause.business_id = businessId;
          }
          
          const userRoles = await UserRole.findAll({
            where: whereClause,
            include: [
              {
                model: Role,
                as: 'role',
                where: { is_active: true }
              }
            ]
          });
          
          return userRoles;
        } catch (retryError) {
          console.error('Error getting user roles (retry):', retryError);
          throw retryError;
        }
      }
      console.error('Error getting user roles:', error);
      throw error;
    }
  }
  
  /**
   * Get user's highest level role
   */
  static async getUserHighestRole(userId, businessId = null) {
    try {
      const userRoles = await this.getUserRoles(userId, businessId);
      
      if (userRoles.length === 0) {
        return null;
      }
      
      // Filter out any roles that don't have a role association
      const validRoles = userRoles.filter(ur => ur.role && ur.role.level != null);
      
      if (validRoles.length === 0) {
        return null;
      }
      
      // Sort by level (highest first) and return the role object
      const sortedRoles = validRoles.sort((a, b) => b.role.level - a.role.level);
      return sortedRoles[0].role; // Return just the role object, not the UserRole
    } catch (error) {
      console.error('Error getting user highest role:', error);
      throw error;
    }
  }
  
  /**
   * Check if user has a specific role
   */
  static async hasRole(userId, roleName, businessId = null) {
    try {
      const userRoles = await this.getUserRoles(userId, businessId);
      return userRoles.some(userRole => userRole.role.name === roleName);
    } catch (error) {
      console.error('Error checking user role:', error);
      throw error;
    }
  }
  
  /**
   * Check if user has any of the specified roles
   */
  static async hasAnyRole(userId, roleNames, businessId = null) {
    try {
      const userRoles = await this.getUserRoles(userId, businessId);
      return userRoles.some(userRole => roleNames.includes(userRole.role.name));
    } catch (error) {
      console.error('Error checking user roles:', error);
      throw error;
    }
  }
  
  /**
   * Check if user has permission for a specific action
   */
  static async hasPermission(userId, resource, action, businessId = null) {
    try {
      const userRoles = await this.getUserRoles(userId, businessId);
      
      for (const userRole of userRoles) {
        const permissions = userRole.role.permissions;
        
        // Check if role has wildcard permission for resource
        if (permissions[resource] && permissions[resource].includes('*')) {
          return true;
        }
        
        // Check if role has specific permission for action
        if (permissions[resource] && permissions[resource].includes(action)) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking user permission:', error);
      throw error;
    }
  }
  
  /**
   * Assign role to user
   */
  static async assignRole(userId, roleName, businessId = null, assignedBy = null) {
    try {
      const role = await Role.findOne({ where: { name: roleName } });
      if (!role) {
        throw new Error(`Role '${roleName}' not found`);
      }
      
      // Check if user already has this role for this business
      const existingUserRole = await UserRole.findOne({
        where: {
          user_id: userId,
          role_id: role.id,
          business_id: businessId
        }
      });
      
      if (existingUserRole) {
        if (existingUserRole.is_active) {
          throw new Error('User already has this role');
        } else {
          // Reactivate the role
          await existingUserRole.update({ is_active: true });
          return existingUserRole;
        }
      }
      
      // Create new user role
      const userRole = await UserRole.create({
        user_id: userId,
        role_id: role.id,
        business_id: businessId,
        assigned_by: assignedBy
      });
      
      return userRole;
    } catch (error) {
      console.error('Error assigning role:', error);
      throw error;
    }
  }
  
  /**
   * Remove role from user
   */
  static async removeRole(userId, roleName, businessId = null) {
    try {
      const role = await Role.findOne({ where: { name: roleName } });
      if (!role) {
        throw new Error(`Role '${roleName}' not found`);
      }
      
      const userRole = await UserRole.findOne({
        where: {
          user_id: userId,
          role_id: role.id,
          business_id: businessId
        }
      });
      
      if (!userRole) {
        throw new Error('User does not have this role');
      }
      
      await userRole.update({ is_active: false });
      return true;
    } catch (error) {
      console.error('Error removing role:', error);
      throw error;
    }
  }
  
  /**
   * Get all businesses a user has access to
   */
  static async getUserBusinesses(userId) {
    try {
      // Check if Business table exists, if not return empty array
      try {
        await sequelize.query("SELECT 1 FROM businesses LIMIT 1", { type: sequelize.QueryTypes.SELECT });
      } catch (tableError) {
        if (tableError.message && tableError.message.includes("doesn't exist")) {
          console.warn('Businesses table not found, returning empty array');
          return [];
        }
        throw tableError;
      }
      
      const userRoles = await UserRole.findAll({
        where: {
          user_id: userId,
          is_active: true,
          business_id: { [require('sequelize').Op.ne]: null }
        },
        include: [
          {
            model: Business,
            as: 'business'
          },
          {
            model: Role,
            as: 'role'
          }
        ]
      });
      
      // Group by business and get highest role for each
      const businessMap = new Map();
      
      for (const userRole of userRoles) {
        const businessId = userRole.business_id;
        const business = userRole.business;
        const role = userRole.role;
        
        if (!businessMap.has(businessId)) {
          businessMap.set(businessId, {
            business,
            roles: [],
            highestRole: role
          });
        }
        
        const businessData = businessMap.get(businessId);
        businessData.roles.push(role);
        
        // Update highest role if current role has higher level
        if (role.level > businessData.highestRole.level) {
          businessData.highestRole = role;
        }
      }
      
      return Array.from(businessMap.values());
    } catch (error) {
      console.error('Error getting user businesses:', error);
      throw error;
    }
  }
  
  /**
   * Check if user is super admin
   */
  static async isSuperAdmin(userId) {
    return await this.hasRole(userId, 'super_admin');
  }
  
  /**
   * Check if user has business access
   */
  static async hasBusinessAccess(userId, businessId) {
    return await this.hasAnyRole(userId, [
      'super_admin',
      'business_owner',
      'business_admin',
      'business_manager',
      'business_staff',
      'business_rider',
      'business_cashier'
    ], businessId);
  }
  
  /**
   * Get user's effective permissions for a business
   */
  static async getUserBusinessPermissions(userId, businessId) {
    try {
      const userRoles = await this.getUserRoles(userId, businessId);
      const permissions = {};
      
      for (const userRole of userRoles) {
        const rolePermissions = userRole.role.permissions;
        
        for (const [resource, actions] of Object.entries(rolePermissions)) {
          if (!permissions[resource]) {
            permissions[resource] = new Set();
          }
          
          actions.forEach(action => permissions[resource].add(action));
        }
      }
      
      // Convert Sets back to Arrays
      for (const [resource, actions] of Object.entries(permissions)) {
        permissions[resource] = Array.from(actions);
      }
      
      return permissions;
    } catch (error) {
      console.error('Error getting user business permissions:', error);
      throw error;
    }
  }
}

module.exports = RBACService;
