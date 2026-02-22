const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authWithRoles');
const FirebaseAuthService = require('../services/firebaseAuth');

/**
 * App API – Auth routes
 * Add new routes here (e.g. POST /login, POST /register).
 * Admin Panel uses a separate API.
 */

// Stub: replace with real implementation
router.get('/', (req, res) => {
  res.json({ api: 'app', module: 'auth', message: 'Add auth routes here' });
});

/**
 * DELETE /api/v1/auth/account
 * Delete the current user's account: Firebase user (permanent) and MySQL user.
 * Auth required.
 */
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid || req.user?.firebase_uid;
    if (!firebaseUid) {
      return res.status(400).json({
        success: false,
        error: 'User account cannot be identified'
      });
    }
    await FirebaseAuthService.deleteUser(firebaseUid);
    return res.json({
      success: true,
      message: 'Account deleted'
    });
  } catch (err) {
    const isFirebase = err.code && String(err.code).startsWith('auth/');
    console.error('DELETE /auth/account error:', err);
    return res.status(isFirebase ? 400 : 500).json({
      success: false,
      error: err.message || 'Could not delete account'
    });
  }
});

module.exports = router;
