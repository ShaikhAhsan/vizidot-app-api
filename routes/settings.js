const express = require('express');
const router = express.Router();
const { UserSettings, AppSetting, User } = require('../models');
const { authenticateToken, optionalAuth } = require('../middleware/authWithRoles');

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
        attributes: ['id', 'email', 'first_name', 'last_name', 'profile_image', 'is_onboarded'],
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
        profile = {
          id: userRow.id,
          email: userRow.email || '',
          firstName: userRow.first_name || '',
          lastName: userRow.last_name || '',
          profileImageUrl: userRow.profile_image || null,
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

    const userRow = await User.findByPk(userId, { attributes: ['is_onboarded'], raw: true });
    const isOnboarded = !!(userRow?.is_onboarded);

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

module.exports = router;
