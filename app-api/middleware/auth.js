const { getFirebaseInstance } = require('../config/firebase');
const { User } = require('../models');

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


    const { auth } = getFirebaseInstance();
    
    // Verify Firebase token
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get user from database
    const user = await User.findOne({
      where: { firebase_uid: decodedToken.uid }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'User account is deactivated'
      });
    }

    req.user = user;
    req.firebaseUser = decodedToken;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.user_type)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

const requireBusinessOwner = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const businessId = req.params.businessId || req.params.id || req.body.business_id;
    
    if (!businessId) {
      return res.status(400).json({
        success: false,
        error: 'Business ID required'
      });
    }

    const { Business } = require('../models');
    const business = await Business.findOne({
      where: {
        id: businessId,
        user_id: req.user.id
      }
    });

    if (!business) {
      return res.status(403).json({
        success: false,
        error: 'Business not found or access denied'
      });
    }

    req.business = business;
    next();
  } catch (error) {
    console.error('Business owner middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const { auth } = getFirebaseInstance();
      const decodedToken = await auth.verifyIdToken(token);
      
      const user = await User.findOne({
        where: { firebase_uid: decodedToken.uid }
      });

      if (user && user.is_active) {
        req.user = user;
        req.firebaseUser = decodedToken;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireBusinessOwner,
  optionalAuth
};

