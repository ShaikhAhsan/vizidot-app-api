/**
 * Push notification send API and history.
 * POST /api/v1/notifications/send - Send to FCM tokens (auth required). Body: title, message, fcmTokens, data?, imageUrl?
 * GET  /api/v1/notifications/history - List send history (auth required). Query: limit, offset
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authWithRoles');
const { sendPushNotification } = require('../services/notificationService');
const { PushNotificationLog } = require('../models');

/**
 * POST /api/v1/notifications/send
 * Body: { title, message, fcmTokens: string[], data?: object, imageUrl?: string }
 */
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { title, message, fcmTokens, data, imageUrl } = req.body || {};
    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'title and message are required' });
    }
    const tokens = Array.isArray(fcmTokens) ? fcmTokens : [];
    const result = await sendPushNotification({
      title,
      message,
      fcmTokens: tokens,
      data: data && typeof data === 'object' ? data : undefined,
      imageUrl: imageUrl && typeof imageUrl === 'string' ? imageUrl : undefined
    });
    return res.json({
      success: true,
      data: {
        successCount: result.successCount,
        failureCount: result.failureCount,
        total: result.total,
        logId: result.logId
      }
    });
  } catch (err) {
    console.error('POST /notifications/send error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to send notifications'
    });
  }
});

/**
 * GET /api/v1/notifications/history
 * Query: limit (default 50), offset (default 0)
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    const { rows, count } = await PushNotificationLog.findAndCountAll({
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
    return res.json({
      success: true,
      data: {
        items: rows,
        total: count,
        limit,
        offset
      }
    });
  } catch (err) {
    console.error('GET /notifications/history error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load history' });
  }
});

module.exports = router;
