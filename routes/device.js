/**
 * Multi-device FCM: register device on login, de-register on logout, fetch tokens for sending push.
 * POST /api/v1/device/register  - Auth required. Upsert device, deactivate other users on this device, set current user-device active.
 * POST /api/v1/device/logout    - Auth required. Set is_active = false for current user on this device.
 * GET  /api/v1/device/tokens    - Auth required. Query: userIds=1,2,3. Returns { tokensByUser: { "1": ["fcm1","fcm2"], ... } } for sending push to multiple users.
 */

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { authenticateToken } = require('../middleware/authWithRoles');
const { Device, UserDevice } = require('../models');

const MAX_DEVICES_PER_USER = 20;
const PLATFORMS = ['ios', 'android', 'web'];

/**
 * GET /api/v1/device/health
 * No auth. Returns 200 if device routes are mounted (for sanity checks).
 */
router.get('/health', (req, res) => {
  res.json({ success: true, service: 'device', message: 'Device API is running' });
});

/**
 * POST /api/v1/device/register
 * Body: { device_id, platform, fcm_token?, device_name? }
 * Auth required. Creates/updates device, deactivates any other user on this device, sets current user-device active with fcm_token.
 */
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const { device_id: deviceId, platform, fcm_token: fcmToken, device_name: deviceName } = req.body || {};
    if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
      return res.status(400).json({ success: false, error: 'device_id is required' });
    }
    const plat = String(platform || 'ios').toLowerCase();
    if (!PLATFORMS.includes(plat)) {
      return res.status(400).json({ success: false, error: 'platform must be ios, android, or web' });
    }

    let device = await Device.findOne({ where: { device_id: deviceId.trim() } });
    if (!device) {
      device = await Device.create({
        device_id: deviceId.trim(),
        platform: plat,
        device_name: deviceName && String(deviceName).trim().slice(0, 255) || null
      });
    } else {
      if (deviceName != null && String(deviceName).trim()) {
        device.device_name = String(deviceName).trim().slice(0, 255);
        await device.save();
      }
    }

    await UserDevice.update(
      { is_active: false },
      { where: { device_id: device.id } }
    );

    let userDevice = await UserDevice.findOne({
      where: { user_id: userId, device_id: device.id }
    });
    if (userDevice) {
      userDevice.fcm_token = fcmToken && String(fcmToken).trim() || null;
      userDevice.is_active = true;
      userDevice.last_seen_at = new Date();
      await userDevice.save();
    } else {
      const count = await UserDevice.count({ where: { user_id: userId } });
      if (count >= MAX_DEVICES_PER_USER) {
        const oldest = await UserDevice.findOne({
          where: { user_id: userId },
          order: [['last_seen_at', 'ASC']]
        });
        if (oldest) await oldest.destroy();
      }
      userDevice = await UserDevice.create({
        user_id: userId,
        device_id: device.id,
        fcm_token: fcmToken && String(fcmToken).trim() || null,
        is_active: true
      });
    }

    return res.json({
      success: true,
      data: {
        deviceId: device.device_id,
        platform: device.platform,
        registered: true
      }
    });
  } catch (err) {
    console.error('POST /device/register error:', err);
    return res.status(500).json({ success: false, error: 'Could not register device' });
  }
});

/**
 * POST /api/v1/device/logout
 * Body: { device_id } (optional; if omitted, all devices for this user can be deactivated or we require device_id - we require it for clarity)
 * Auth required. Sets is_active = false for this user on this device.
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const { device_id: deviceId } = req.body || {};
    if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
      return res.status(400).json({ success: false, error: 'device_id is required' });
    }

    const device = await Device.findOne({ where: { device_id: deviceId.trim() } });
    if (!device) {
      return res.json({ success: true, data: { deactivated: true } });
    }
    await UserDevice.update(
      { is_active: false },
      { where: { user_id: userId, device_id: device.id } }
    );
    return res.json({ success: true, data: { deactivated: true } });
  } catch (err) {
    console.error('POST /device/logout error:', err);
    return res.status(500).json({ success: false, error: 'Could not deactivate device' });
  }
});

/**
 * GET /api/v1/device/tokens?userIds=1,2,3
 * Auth required. Returns FCM tokens for the given user IDs (only active mappings).
 * Use for server-side push: send to all returned tokens for each user.
 */
router.get('/tokens', authenticateToken, async (req, res) => {
  try {
    const raw = req.query.userIds;
    if (!raw || typeof raw !== 'string') {
      return res.status(400).json({ success: false, error: 'userIds query is required (e.g. userIds=1,2,3)' });
    }
    const userIds = raw.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n) && n > 0);
    if (userIds.length === 0) {
      return res.json({ success: true, data: { tokensByUser: {} } });
    }

    const rows = await UserDevice.findAll({
      where: {
        user_id: { [Op.in]: userIds },
        is_active: true
      },
      attributes: ['user_id', 'fcm_token']
    });

    const tokensByUser = {};
    for (const uid of userIds) {
      tokensByUser[String(uid)] = [];
    }
    for (const r of rows) {
      if (r.fcm_token) {
        const key = String(r.user_id);
        if (!tokensByUser[key]) tokensByUser[key] = [];
        tokensByUser[key].push(r.fcm_token);
      }
    }
    return res.json({ success: true, data: { tokensByUser } });
  } catch (err) {
    console.error('GET /device/tokens error:', err);
    return res.status(500).json({ success: false, error: 'Could not fetch tokens' });
  }
});

module.exports = router;
