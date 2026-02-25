const express = require('express');
const router = express.Router();
const path = require('path');
const { UserSettings, AppSetting, User } = require('../models');
const { authenticateToken, optionalAuth } = require('../middleware/authWithRoles');
const { getStorage } = require('../config/firebase');
const Jimp = require('jimp');

const multer = require('multer');
const memoryStorage = multer.memoryStorage();
const upload = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /^image\/(jpeg|jpg|png|gif|webp)$/i;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only images (JPEG, PNG, GIF, WebP) are allowed'));
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

    // Profile fields (firstName, lastName, caption)
    const userRow = await User.findByPk(userId, { attributes: ['preferences'], raw: true });
    const updates = {};
    if (typeof body.firstName === 'string' && body.firstName.trim() !== '') {
      updates.first_name = body.firstName.trim().slice(0, 100);
    }
    if (typeof body.lastName === 'string' && body.lastName.trim() !== '') {
      updates.last_name = body.lastName.trim().slice(0, 100);
    }
    if (body.caption !== undefined && typeof body.caption === 'string') {
      const prefs = (userRow && userRow.preferences) && typeof userRow.preferences === 'object' ? { ...userRow.preferences } : {};
      prefs.caption = body.caption.trim().slice(0, 255);
      updates.preferences = prefs;
    }
    if (Object.keys(updates).length > 0) {
      await User.update(updates, { where: { id: userId } });
    }

    const updatedUser = await User.findByPk(userId, { attributes: ['is_onboarded'], raw: true });
    const isOnboarded = !!(updatedUser?.is_onboarded);

    return res.json({
      success: true,
      data: {
        enableNotifications: !!row.enable_notifications,
        messageNotifications: !!row.message_notifications,
        language: row.language || 'en',
        isOnboarded
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
 * Upload profile image (full + thumbnail) to Firebase Storage under profiles/{firebaseUid}/.
 * Replaces existing photo. Returns URLs with ?t=timestamp so app bypasses cache when photo changes.
 * Auth required. Multipart form field: image
 * Returns { success, data: { profileImageUrl, profileImageThumbUrl } }
 */
router.post('/profile-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user?.id ?? req.userId ?? null;
    const firebaseUid = req.firebaseUid || req.user?.firebase_uid;
    if (!userId || !firebaseUid) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'No image file provided. Use form field "image".' });
    }

    const storage = getStorage();
    const bucket = storage.bucket();
    const ts = Date.now();
    const ext = (path.extname(req.file.originalname) || '').toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) ? ext : '.jpg';
    const basePath = `profiles/${firebaseUid}`;
    const fullPath = `${basePath}/avatar${safeExt}`;
    const thumbPath = `${basePath}/avatar_thumb.jpg`;

    const contentType = req.file.mimetype || 'image/jpeg';

    const fullFile = bucket.file(fullPath);
    await fullFile.save(req.file.buffer, {
      metadata: { contentType },
      predefinedAcl: 'publicRead'
    });

    let thumbBuffer = req.file.buffer;
    try {
      const image = await Jimp.read(req.file.buffer);
      image.cover(200, 200);
      thumbBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
    } catch (jimpErr) {
      console.warn('Jimp thumbnail failed, using full image:', jimpErr.message);
    }

    const thumbFile = bucket.file(thumbPath);
    await thumbFile.save(thumbBuffer, {
      metadata: { contentType: 'image/jpeg' },
      predefinedAcl: 'publicRead'
    });

    const baseUrl = `https://storage.googleapis.com/${bucket.name}`;
    const encodedFull = fullPath.split('/').map(encodeURIComponent).join('/');
    const encodedThumb = thumbPath.split('/').map(encodeURIComponent).join('/');
    const profileImageUrl = `${baseUrl}/${encodedFull}?t=${ts}`;
    const profileImageThumbUrl = `${baseUrl}/${encodedThumb}?t=${ts}`;

    await User.update(
      { profile_image: profileImageUrl, profile_image_thumb: profileImageThumbUrl },
      { where: { id: userId } }
    );

    return res.json({
      success: true,
      data: { profileImageUrl, profileImageThumbUrl }
    });
  } catch (err) {
    if (err.message && err.message.includes('Only images')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    console.error('POST /settings/profile-image error:', err);
    return res.status(500).json({ success: false, error: 'Could not upload profile image' });
  }
});

module.exports = router;
