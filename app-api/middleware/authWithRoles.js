const FirebaseAuthService = require('../services/firebaseAuth');
const RBACService = require('../services/rbacService');
const { User } = require('../models');

// Non-expiring test token for API testing. Set TEST_ACCESS_TOKEN in .env to override.
const TEST_ACCESS_TOKEN = (process.env.TEST_ACCESS_TOKEN || 'test-token-no-expire').trim();
const isProduction = process.env.NODE_ENV === 'production';

async function attachDemoUser(req, res, next) {
  try {
    let user = await User.findOne({ where: { email: 'admin@demo.com' } });
    if (!user) {
      user = await User.create({
        email: 'admin@demo.com',
        first_name: 'Demo',
        last_name: 'Admin',
        firebase_uid: 'demo-admin-uid',
        primary_role: 'admin',
        is_active: true,
        is_verified: true
      });
    }
    let userRoles = []; let highestRole = null; let userBusinesses = [];
    try {
      userRoles = await RBACService.getUserRoles(user.id);
      highestRole = await RBACService.getUserHighestRole(user.id);
      userBusinesses = await RBACService.getUserBusinesses(user.id);
    } catch (_) { /* RBAC optional */ }
    req.user = user;
    req.userId = user.id;
    req.firebaseUid = user.firebase_uid;
    req.userRoles = userRoles;
    req.highestRole = highestRole;
    req.userBusinesses = userBusinesses || [];
    return next();
  } catch (e) {
    console.error('Demo user attach error:', e);
    return res.status(500).json({ success: false, error: 'Auth setup failed' });
  }
}

/**
 * Middleware to authenticate Firebase token and attach user to request
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    // Non-expiring test token for testing all APIs (ignored in production)
    if (!isProduction && (token === TEST_ACCESS_TOKEN || token === 'demo-token-123')) {
      return attachDemoUser(req, res, next);
    }

    // Verify Firebase token and get user
    const user = await FirebaseAuthService.getUserFromToken(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token or user not found'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Get user roles and permissions
    const userRoles = await RBACService.getUserRoles(user.id);
    const highestRole = await RBACService.getUserHighestRole(user.id);
    const userBusinesses = await RBACService.getUserBusinesses(user.id);
    
    // Attach user and RBAC data to request
    req.user = user;
    req.userId = user.id;
    req.firebaseUid = user.firebase_uid;
    req.userRoles = userRoles;
    req.highestRole = highestRole;
    req.userBusinesses = userBusinesses;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

/**
 * Middleware to require specific roles
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole
      });
    }

    next();
  };
};

/**
 * Middleware to require super admin role
 */
const requireSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const isSuperAdmin = await RBACService.isSuperAdmin(req.userId);
    if (!isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Super admin access required'
      });
    }

    next();
  } catch (error) {
    console.error('Super admin check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Middleware to require system admin or higher, or user with assigned artists
 */
const requireSystemAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const hasSystemAccess = await RBACService.hasAnyRole(req.userId, [
      'super_admin',
      'system_admin'
    ]);
    
    if (hasSystemAccess) {
      return next();
    }
    
    // Check if user has assigned artists (allows access to admin panel)
    const { UserArtist } = require('../models');
    const artistCount = await UserArtist.count({ where: { user_id: req.userId } });
    
    if (artistCount > 0) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      error: 'System admin access required or user must have assigned artists'
    });
  } catch (error) {
    console.error('System admin check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Middleware to require business access
 */
const requireBusinessAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const businessId = req.params.businessId || req.body.business_id || req.query.business_id;
    
    // Super admin can access any business
    const isSuperAdmin = await RBACService.isSuperAdmin(req.userId);
    if (isSuperAdmin) {
      return next();
    }
    
    // Check business access
    const hasAccess = await RBACService.hasBusinessAccess(req.userId, businessId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Business access required'
      });
    }

    next();
  } catch (error) {
    console.error('Business access check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Middleware to require specific permission
 */
const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const businessId = req.params.businessId || req.body.business_id || req.query.business_id;
      const hasPermission = await RBACService.hasPermission(req.userId, resource, action, businessId);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: `Permission required: ${action} on ${resource}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
};

/**
 * Middleware to set business context for super admin
 */
const setBusinessContext = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const isSuperAdmin = await RBACService.isSuperAdmin(req.userId);
    if (isSuperAdmin) {
      // Super admin can switch business context
      const businessId = req.headers['x-business-id'] || req.query.business_id;
      if (businessId) {
        req.businessContext = businessId;
      }
    }

    next();
  } catch (error) {
    console.error('Business context error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Middleware to check if user owns the resource or has admin access
 */
const requireOwnershipOrAdmin = (resourceUserIdField = 'user_id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    const userId = req.user.id;
    
    // Super admin and admin can access everything
    if (['super_admin', 'admin'].includes(userRole)) {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (resourceUserId && parseInt(resourceUserId) === userId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Access denied. You can only access your own resources.'
    });
  };
};

/**
 * Middleware to check business ownership
 */
const requireBusinessOwnership = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userId = req.user.id;
    
    // Check if user is super admin - they can access any business
    const isSuperAdmin = await RBACService.isSuperAdmin(userId);
    if (isSuperAdmin) {
      // Get the business and attach to request
      const businessId = req.params.businessId || req.params.id || req.body.business_id;
      if (businessId) {
        const { Business } = require('../models');
        const business = await Business.findByPk(businessId);
        if (business) {
          req.business = business;
        }
      }
      return next();
    }

    // Get business ID from params or body
    const businessId = req.params.businessId || req.params.id || req.body.business_id;
    
    if (!businessId) {
      return res.status(400).json({
        success: false,
        error: 'Business ID required'
      });
    }

    // Check if user owns the business
    const { Business } = require('../models');
    const business = await Business.findOne({
      where: { 
        id: businessId,
        user_id: userId
      }
    });

    if (!business) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only access your own business.'
      });
    }

    req.business = business;
    next();
  } catch (error) {
    console.error('Business ownership check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided.
 * Attaches user when token is valid (or test token in dev) so routes can return user-specific data (e.g. isFollowing).
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      if (!isProduction && (token === TEST_ACCESS_TOKEN || token === 'demo-token-123')) {
        await attachDemoUser(req, res, next);
        return;
      }
      const user = await FirebaseAuthService.getUserFromToken(token);
      if (user && user.is_active) {
        req.user = user;
        req.userId = user.id;
        req.firebaseUid = user.firebase_uid;
      }
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireSuperAdmin,
  requireSystemAdmin,
  requireBusinessAccess,
  requirePermission,
  setBusinessContext,
  requireOwnershipOrAdmin,
  requireBusinessOwnership,
  optionalAuth
};
