const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { UserSettings, AppSetting, User, sequelize } = require('../models');
const { authenticateToken, optionalAuth } = require('../middleware/authWithRoles');
const { uploadBufferToPath, isGCSAvailable } = require('../services/googleCloudStorage');
const Jimp = require('jimp');
const convertHeic = require('heic-convert');

const multer = require('multer');
const memoryStorage = multer.memoryStorage();
const upload = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /^image\/(jpeg|jpg|png|gif|webp|heic|heif)$/i;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only images (JPEG, PNG, GIF, WebP, HEIC) are allowed'));
  }
});

/**
 * GET /api/v1/settings
 * Returns settings for the Settings screen.
 * - If authenticated: user settings (notifications, language) + app config (help URL, privacy URL, about, etc.).
 * - If not authenticated: app config only.
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.userId ?? null;
    let userSettings = null;

    let profile = null;
    if (userId) {
      let row = await UserSettings.findOne({ where: { user_id: userId } });
      if (!row) {
        row = await UserSettings.create({
          user_id: userId,
          enable_notifications: true,
          message_notifications: false,
          language: 'en'
        });
      }
      const userRow = await User.findByPk(userId, {
        attributes: ['id', 'email', 'first_name', 'last_name', 'profile_image', 'profile_image_thumb', 'is_onboarded', 'preferences'],
        raw: true
      });
      const isOnboarded = !!(userRow?.is_onboarded);
      userSettings = {
        enableNotifications: !!row.enable_notifications,
        messageNotifications: !!row.message_notifications,
        language: row.language || 'en',
        isOnboarded
      };
      if (userRow) {
        const caption = (userRow.preferences && typeof userRow.preferences === 'object' && userRow.preferences.caption) || '';
        profile = {
          id: userRow.id,
          email: userRow.email || '',
          firstName: userRow.first_name || '',
          lastName: userRow.last_name || '',
          profileImageUrl: userRow.profile_image || null,
          profileImageThumbUrl: userRow.profile_image_thumb || null,
          caption: typeof caption === 'string' ? caption : '',
          isOnboarded
        };
      }
    }

    const appRows = await AppSetting.findAll({ attributes: ['key', 'value'] });
    const appConfig = {};
    for (const r of appRows) {
      appConfig[r.key] = r.value;
    }

    const dataPayload = {
      user: userSettings,
      app: {
          helpCenterUrl: appConfig.help_center_url || null,
          privacyPolicyUrl: appConfig.privacy_policy_url || null,
          termsUrl: appConfig.terms_url || null,
          aboutText: appConfig.about_text || null,
          appName: appConfig.app_name || null,
          aboutTagline: appConfig.about_tagline || null,
          aboutDescription: appConfig.about_description || null,
          aboutVersion: appConfig.about_version || null,
          aboutBuild: appConfig.about_build || null,
          contactEmail: appConfig.contact_email || null,
          websiteUrl: appConfig.website_url || null
        }
    };
    if (profile) dataPayload.profile = profile;

    return res.json({
      success: true,
      data: dataPayload
    });
  } catch (err) {
    const noTable =
      err.name === 'SequelizeDatabaseError' &&
      (err.original?.code === 'ER_NO_SUCH_TABLE' || /doesn't exist/i.test(err.message || ''));
    if (noTable) {
      return res.status(503).json({
        success: false,
        error: 'Settings not available. Run scripts/createSettingsTables.sql and seed app_settings.'
      });
    }
    console.error('GET /settings error:', err);
    return res.status(500).json({ success: false, error: 'Could not load settings' });
  }
});

/**
 * PATCH /api/v1/settings
 * Update current user's settings. Auth required.
 * Body: { enableNotifications?: boolean, messageNotifications?: boolean, language?: string, isOnboarded?: boolean }
 */
router.patch('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.userId ?? null;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const body = req.body || {};
    let row = await UserSettings.findOne({ where: { user_id: userId } });
    if (!row) {
      row = await UserSettings.create({
        user_id: userId,
        enable_notifications: true,
        message_notifications: false,
        language: 'en'
      });
    }

    if (typeof body.enableNotifications === 'boolean') {
      row.enable_notifications = body.enableNotifications;
    }
    if (typeof body.messageNotifications === 'boolean') {
      row.message_notifications = body.messageNotifications;
    }
    if (typeof body.language === 'string' && body.language.trim()) {
      row.language = body.language.trim().slice(0, 10);
    }
    await row.save();

    if (typeof body.isOnboarded === 'boolean' && body.isOnboarded === true) {
      await User.update({ is_onboarded: true }, { where: { id: userId } });
    }

    // Profile fields (firstName, lastName, caption) — update by id
    const userRow = await User.findByPk(userId, { attributes: ['id', 'preferences'], raw: true });
    if (userRow && (body.firstName !== undefined || body.lastName !== undefined || body.caption !== undefined)) {
      const setParts = [];
      const replacements = { userId };
      if (typeof body.firstName === 'string') {
        setParts.push('first_name = :firstName');
        replacements.firstName = body.firstName.trim().slice(0, 100);
      }
      if (typeof body.lastName === 'string') {
        setParts.push('last_name = :lastName');
        replacements.lastName = body.lastName.trim().slice(0, 100);
      }
      if (body.caption !== undefined && typeof body.caption === 'string') {
        const prefs = (userRow.preferences && typeof userRow.preferences === 'object') ? { ...userRow.preferences } : {};
        prefs.caption = body.caption.trim().slice(0, 255);
        setParts.push('preferences = :preferences');
        replacements.preferences = JSON.stringify(prefs);
      }
      if (setParts.length > 0) {
        const sql = `UPDATE users SET ${setParts.join(', ')} WHERE id = :userId`;
        await sequelize.query(sql, { replacements });
      }
    }

    const updatedUser = await User.findByPk(userId, {
      attributes: ['is_onboarded', 'first_name', 'last_name', 'preferences'],
      raw: true
    });
    const isOnboarded = !!(updatedUser?.is_onboarded);
    const profile = updatedUser ? {
      firstName: updatedUser.first_name || '',
      lastName: updatedUser.last_name || '',
      caption: (updatedUser.preferences && updatedUser.preferences.caption) || ''
    } : null;

    return res.json({
      success: true,
      data: {
        enableNotifications: !!row.enable_notifications,
        messageNotifications: !!row.message_notifications,
        language: row.language || 'en',
        isOnboarded,
        ...(profile && { profile })
      }
    });
  } catch (err) {
    const noTable =
      err.name === 'SequelizeDatabaseError' &&
      (err.original?.code === 'ER_NO_SUCH_TABLE' || /doesn't exist/i.test(err.message || ''));
    if (noTable) {
      return res.status(503).json({ success: false, error: 'Settings not available' });
    }
    console.error('PATCH /settings error:', err);
    return res.status(500).json({ success: false, error: 'Could not update settings' });
  }
});

/**
 * POST /api/v1/settings/profile-image
 * Upload profile image (full + thumbnail). Tries Firebase Storage first (same as admin-api),
 * then falls back to local uploads/profiles/{uid}/ so upload always succeeds when possible.
 * Auth required. Multipart form field: image
 * Returns { success, data: { profileImageUrl, profileImageThumbUrl } }
 */
const profileImageUpload = upload.single('image');
router.post('/profile-image', authenticateToken, (req, res, next) => {
  profileImageUpload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, error: 'Image is too large. Use an image under 5 MB.' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ success: false, error: 'Unexpected file field. Use form field "image".' });
      }
      if (err.message && err.message.includes('Only images')) {
        return res.status(400).json({ success: false, error: err.message });
      }
      console.error('Multer error on profile-image:', err);
      return res.status(400).json({ success: false, error: err.message || 'Invalid file upload.' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.userId ?? null;
    const firebaseUid = req.firebaseUid ?? (req.user && (req.user.firebase_uid ?? (typeof req.user.get === 'function' ? req.user.get('firebase_uid') : undefined)));
    if (!userId || !firebaseUid) {
      console.warn('Profile-image: missing userId or firebaseUid', { userId: !!userId, firebaseUid: !!firebaseUid });
      return res.status(401).json({
        success: false,
        error: 'Unauthorized. Try signing out and back in.'
      });
    }
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'No image file provided. Use form field "image".' });
    }

    let buffer = Buffer.isBuffer(req.file.buffer) ? req.file.buffer : Buffer.from(req.file.buffer);
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ success: false, error: 'Image file is empty.' });
    }

    const mime = (req.file.mimetype || '').toLowerCase();
    if (mime === 'image/heic' || mime === 'image/heif') {
      try {
        const converted = await convertHeic({ buffer: req.file.buffer, format: 'JPEG', quality: 0.9 });
        buffer = Buffer.isBuffer(converted) ? converted : Buffer.from(converted);
      } catch (heicErr) {
        console.error('HEIC conversion error:', heicErr);
        return res.status(400).json({ success: false, error: 'Could not convert HEIC image. Try saving as JPEG first.' });
      }
    }

    let thumbBuffer = buffer;
    try {
      const image = await Jimp.read(buffer);
      image.cover(200, 200);
      const thumb = await image.getBufferAsync(Jimp.MIME_JPEG);
      thumbBuffer = Buffer.isBuffer(thumb) ? thumb : Buffer.from(thumb);
    } catch (jimpErr) {
      console.warn('Jimp thumbnail failed, using full image:', jimpErr.message);
    }

    const basePath = `profiles/${firebaseUid}`;
    const fullPath = `${basePath}/avatar.jpg`;
    const thumbPath = `${basePath}/avatar_thumb.jpg`;
    const contentType = (mime === 'image/heic' || mime === 'image/heif') ? 'image/jpeg' : (req.file.mimetype || 'image/jpeg');

    let profileImageUrl = null;
    let profileImageThumbUrl = null;

    if (isGCSAvailable()) {
      try {
        const [fullResult, thumbResult] = await Promise.all([
          uploadBufferToPath(buffer, fullPath, contentType),
          uploadBufferToPath(thumbBuffer, thumbPath, 'image/jpeg'),
        ]);
        profileImageUrl = fullResult.url;
        profileImageThumbUrl = thumbResult.url;
      } catch (firebaseErr) {
        console.error('Firebase Storage upload failed, falling back to local storage:', firebaseErr.message);
      }
    }

    if (!profileImageUrl || !profileImageThumbUrl) {
      try {
        const uploadsDir = path.join(__dirname, '../uploads', basePath);
        await fs.mkdir(uploadsDir, { recursive: true });
        const localFull = path.join(uploadsDir, 'avatar.jpg');
        const localThumb = path.join(uploadsDir, 'avatar_thumb.jpg');
        await fs.writeFile(localFull, buffer);
        await fs.writeFile(localThumb, thumbBuffer);
        const baseUrl = (process.env.BASE_URL || process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 8000}`).replace(/\/$/, '');
        profileImageUrl = `${baseUrl}/uploads/${basePath}/avatar.jpg`;
        profileImageThumbUrl = `${baseUrl}/uploads/${basePath}/avatar_thumb.jpg`;
      } catch (localErr) {
        console.error('Local storage fallback failed:', localErr);
        return res.status(500).json({
          success: false,
          error: `Upload failed. ${localErr.message || 'Could not save image locally.'}`,
        });
      }
    }

    try {
      await User.update(
        { profile_image: profileImageUrl, profile_image_thumb: profileImageThumbUrl },
        { where: { id: userId } }
      );
    } catch (updateErr) {
      console.error('Profile image User.update failed:', updateErr);
      const msg = (updateErr && updateErr.message) ? String(updateErr.message) : String(updateErr);
      return res.status(500).json({ success: false, error: `Database update failed: ${msg}` });
    }

    return res.json({
      success: true,
      data: { profileImageUrl, profileImageThumbUrl }
    });
  } catch (err) {
    if (err.message && err.message.includes('Only images')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'Image is too large. Use an image under 5 MB.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ success: false, error: 'Unexpected file field. Use form field "image".' });
    }
    console.error('POST /settings/profile-image error:', err);
    const message = (err && (err.message || err.toString())) ? String(err.message || err.toString()) : 'Could not upload profile image';
    const payload = { success: false, error: message };
    if (process.env.NODE_ENV === 'development' && err) {
      payload.debug = { message: err.message, code: err.code, stack: err.stack };
    }
    return res.status(500).json(payload);
  }
});

module.exports = router;
