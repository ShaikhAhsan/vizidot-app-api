const admin = require('firebase-admin');
const { User } = require('../models');

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    const serviceAccount = require('../vizidot-4b492-firebase-adminsdk-mmzox-c3a057f143.json');
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
      });
    }
    
    console.log('🔥 Firebase Admin SDK initialized successfully');
    return admin;
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error);
    throw error;
  }
};

// Initialize Firebase (with error handling)
let firebaseAdmin;
try {
  firebaseAdmin = initializeFirebase();
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  // Don't throw - allow the module to load, but methods will fail gracefully
  firebaseAdmin = null;
}

class FirebaseAuthService {
  /**
   * Verify Firebase ID token and get user data
   */
  static async verifyToken(idToken) {
    try {
      if (!firebaseAdmin) {
        throw new Error('Firebase Admin SDK not initialized');
      }
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      console.error('Error verifying Firebase token:', error.message);
      console.error('Error code:', error.code);
      // Provide more specific error messages
      if (error.code === 'auth/id-token-expired') {
        throw new Error('Token has expired. Please log in again.');
      } else if (error.code === 'auth/argument-error') {
        throw new Error('Invalid token format');
      } else if (error.code === 'auth/id-token-revoked') {
        throw new Error('Token has been revoked');
      }
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Create user in Firebase and MySQL
   */
  static async createUser(userData) {
    try {
      const { email, password, firstName, lastName, phone, countryCode, role } = userData;
      
      // Create user in Firebase
      const firebaseUser = await firebaseAdmin.auth().createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`,
        phoneNumber: countryCode ? `${countryCode}${phone}` : undefined
      });

      // Create user in MySQL
      const mysqlUser = await User.create({
        firebase_uid: firebaseUser.uid,
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        country_code: countryCode || '+92',
        primary_role: role || 'customer',
        is_verified: firebaseUser.emailVerified,
        is_active: true
      });

      return {
        firebaseUser,
        mysqlUser: mysqlUser.toJSON()
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Get or create user from Firebase token.
   * - Find by firebase_uid first; if found, return.
   * - Else fetch Firebase user, then create new MySQL row (or re-link existing row by email if duplicate).
   */
  static async getUserFromToken(idToken) {
    try {
      const decodedToken = await this.verifyToken(idToken);
      const firebaseUid = decodedToken.uid;
      console.log('Token verified successfully, UID:', firebaseUid);

      // Find user in MySQL by Firebase UID only (do not find by email here)
      let user = await User.findOne({
        where: { firebase_uid: firebaseUid }
      });

      if (user) {
        console.log('User found in DB:', user.email);
        return user;
      }

      // New Firebase user: get profile from Firebase, then create or re-link in MySQL
      console.log('User not found in DB, creating new user...');
      const firebaseUser = await firebaseAdmin.auth().getUser(firebaseUid);
      const email = firebaseUser.email || `${firebaseUid}@firebase.local`;
      const displayParts = (firebaseUser.displayName || 'User').trim().split(/\s+/);
      const firstName = displayParts[0] || 'User';
      const lastName = displayParts.slice(1).join(' ') || '';
      const phone = firebaseUser.phoneNumber ? firebaseUser.phoneNumber.replace(/^\+\d{1,3}/, '') : null;
      const countryCode = firebaseUser.phoneNumber
        ? `+${(firebaseUser.phoneNumber.match(/^\+\d{1,3}/) || [])[0]?.slice(1) || '92'}`
        : '+92';

      try {
        user = await User.create({
          firebase_uid: firebaseUid,
          email,
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          country_code: countryCode,
          primary_role: 'customer',
          is_verified: !!firebaseUser.emailVerified,
          is_active: true
        });
        console.log('User created successfully:', user.email);
        return user;
      } catch (createErr) {
        // Duplicate email (or firebase_uid): re-link existing row to this Firebase UID if same email
        if (createErr.name === 'SequelizeUniqueConstraintError') {
          const existing = await User.findOne({ where: { email } });
          if (existing) {
            await User.update(
              { firebase_uid: firebaseUid, is_active: true, is_delete: false, deleted_at: null },
              { where: { id: existing.id } }
            );
            user = await User.findByPk(existing.id);
            console.log('Re-linked existing user to new Firebase UID:', user.email);
            return user;
          }
        }
        throw createErr;
      }
    } catch (error) {
      console.error('Error getting user from token:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Update user in Firebase and MySQL
   */
  static async updateUser(firebaseUid, updateData) {
    try {
      const { email, firstName, lastName, phone, countryCode, role } = updateData;
      
      // Update Firebase user
      const firebaseUpdateData = {};
      if (email) firebaseUpdateData.email = email;
      if (firstName || lastName) {
        firebaseUpdateData.displayName = `${firstName || ''} ${lastName || ''}`.trim();
      }
      if (phone && countryCode) {
        firebaseUpdateData.phoneNumber = `${countryCode}${phone}`;
      }

      if (Object.keys(firebaseUpdateData).length > 0) {
        await firebaseAdmin.auth().updateUser(firebaseUid, firebaseUpdateData);
      }

      // Update MySQL user
      const mysqlUpdateData = {};
      if (email) mysqlUpdateData.email = email;
      if (firstName) mysqlUpdateData.first_name = firstName;
      if (lastName) mysqlUpdateData.last_name = lastName;
      if (phone) mysqlUpdateData.phone = phone;
      if (countryCode) mysqlUpdateData.country_code = countryCode;
      if (role) mysqlUpdateData.primary_role = role;

      if (Object.keys(mysqlUpdateData).length > 0) {
        await User.update(mysqlUpdateData, {
          where: { firebase_uid: firebaseUid }
        });
      }

      return await User.findOne({ where: { firebase_uid: firebaseUid } });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * "Delete" account: permanently remove from Firebase Auth; in MySQL mark user inactive (do not delete row).
   * Use for "delete my account" and admin user deletion.
   */
  static async deleteUser(firebaseUid) {
    try {
      if (!firebaseAdmin) {
        throw new Error('Firebase Admin SDK not initialized');
      }
      // Permanently delete Firebase user
      await firebaseAdmin.auth().deleteUser(firebaseUid);
      // Mark MySQL user inactive and soft-deleted (keep row for audit/history)
      const [affected] = await User.update(
        { is_active: false, is_delete: true, deleted_at: new Date() },
        { where: { firebase_uid: firebaseUid } }
      );
      if (affected === 0) {
        console.warn('deleteUser: no MySQL user found for firebase_uid', firebaseUid);
      }
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email) {
    try {
      const link = await firebaseAdmin.auth().generatePasswordResetLink(email);
      // In a real application, you would send this link via email
      return link;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  /**
   * Set custom user claims (roles)
   */
  static async setUserRole(firebaseUid, role) {
    try {
      const claims = {
        role: role,
        admin: role === 'super_admin' || role === 'admin',
        business_admin: role === 'business_admin'
      };

      await firebaseAdmin.auth().setCustomUserClaims(firebaseUid, claims);
      
      // Update MySQL user role
      await User.update({ primary_role: role }, {
        where: { firebase_uid: firebaseUid }
      });

      return true;
    } catch (error) {
      console.error('Error setting user role:', error);
      throw error;
    }
  }

  /**
   * Get user role from Firebase claims
   */
  static async getUserRole(firebaseUid) {
    try {
      const user = await firebaseAdmin.auth().getUser(firebaseUid);
      return user.customClaims?.role || 'customer';
    } catch (error) {
      console.error('Error getting user role:', error);
      throw error;
    }
  }
}

module.exports = FirebaseAuthService;
