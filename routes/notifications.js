/**
 * Push notification send API and history.
 * POST /api/v1/notifications/send - Send to FCM tokens (auth required). Body: title, message, fcmTokens, data?, imageUrl?
 * GET  /api/v1/notifications/history - List send history (auth required). Query: limit, offset
 *
 * User notification (record + FCM, history, presence):
 * POST   /api/v1/notifications/notify   - Record and send push (skip if on screen). Body: recipientUserId | (chatDocId + isSenderArtist), notificationType, title, body, data?, senderArtistId?, senderUserId?, chatDocId?, liveStreamId?, messageCount?
 * PUT    /api/v1/notifications/presence - Set presence (screen, contextId). Body: screen, contextId?
 * GET    /api/v1/notifications          - List current user's notifications (history). Query: limit, offset
 * GET    /api/v1/notifications/unread-count
 * PATCH  /api/v1/notifications/:id/read
 * DELETE /api/v1/notifications/:id
 * DELETE /api/v1/notifications         - Clear all for current user
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authWithRoles');
const { sendPushNotification } = require('../services/notificationService');
const { notifyUser } = require('../services/userNotificationService');
const { PushNotificationLog, UserNotification, UserPresence } = require('../models');

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
        logId: result.logId,
        errors: result.errors
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

// --- User notifications (record + FCM, history, presence) ---

function getCurrentUserId(req) {
  return req.user?.id ?? req.userId;
}

/**
 * POST /api/v1/notifications/notify
 * Body: recipientUserId (optional if chatDocId + isSenderArtist provided), chatDocId?, isSenderArtist?, notificationType, title, body, data?, senderArtistId?, senderUserId?, liveStreamId?, messageCount?
 */
router.post('/notify', authenticateToken, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const {
      recipient_user_id: recipientUserId,
      chat_doc_id: chatDocId,
      is_sender_artist: isSenderArtist,
      notification_type: notificationType = 'message',
      title,
      body,
      data,
      sender_artist_id: senderArtistId,
      sender_user_id: senderUserId,
      live_stream_id: liveStreamId,
      message_count: messageCount,
      image_url: imageUrl
    } = req.body || {};
    if (!title || !body) {
      return res.status(400).json({ success: false, error: 'title and body are required' });
    }
    const hasRecipient = recipientUserId != null && Number.isInteger(Number(recipientUserId));
    const hasChat = chatDocId && typeof chatDocId === 'string' && typeof isSenderArtist === 'boolean';
    if (!hasRecipient && !hasChat) {
      return res.status(400).json({ success: false, error: 'Provide recipient_user_id or (chat_doc_id + is_sender_artist)' });
    }
    const result = await notifyUser({
      recipientUserId: hasRecipient ? Number(recipientUserId) : undefined,
      chatDocId: hasChat ? chatDocId : undefined,
      isSenderArtist: hasChat ? isSenderArtist : undefined,
      notificationType: String(notificationType),
      title: String(title).slice(0, 255),
      body: String(body).slice(0, 500),
      data: data && typeof data === 'object' ? data : undefined,
      senderArtistId: senderArtistId != null ? Number(senderArtistId) : null,
      senderUserId: senderUserId != null ? Number(senderUserId) : userId,
      liveStreamId: liveStreamId && String(liveStreamId) || null,
      messageCount: messageCount != null ? Math.max(1, parseInt(messageCount, 10)) : 1,
      imageUrl: imageUrl && typeof imageUrl === 'string' ? imageUrl.trim() || undefined : undefined
    });
    return res.json({
      success: true,
      data: {
        notificationId: result.notificationId,
        recorded: result.recorded,
        sent: result.sent,
        reason: result.reason,
        successCount: result.successCount
      }
    });
  } catch (err) {
    console.error('POST /notifications/notify error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to notify' });
  }
});

/**
 * PUT /api/v1/notifications/presence
 * Body: screen (e.g. chat, liveStream), context_id? (e.g. chat_doc_id, live_stream_id)
 */
router.put('/presence', authenticateToken, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const { screen, context_id: contextId } = req.body || {};
    if (!screen || typeof screen !== 'string' || !screen.trim()) {
      return res.status(400).json({ success: false, error: 'screen is required' });
    }
    const [presence, created] = await UserPresence.findOrCreate({
      where: { user_id: userId },
      defaults: {
        user_id: userId,
        screen: String(screen).trim().slice(0, 32),
        context_id: contextId != null ? String(contextId).slice(0, 128) : null
      }
    });
    const newScreen = String(screen).trim().slice(0, 32);
    const newContextId = contextId != null ? String(contextId).slice(0, 128) : null;
    if (!created && (presence.screen !== newScreen || presence.context_id !== newContextId)) {
      presence.screen = newScreen;
      presence.context_id = newContextId;
      await presence.save();
    }
    return res.json({
      success: true,
      data: { screen: presence.screen, context_id: presence.context_id }
    });
  } catch (err) {
    console.error('PUT /notifications/presence error:', err);
    return res.status(500).json({ success: false, error: 'Failed to set presence' });
  }
});

/**
 * GET /api/v1/notifications - List current user's notification history
 * Query: limit (default 50), offset (default 0)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    const { rows, count } = await UserNotification.findAndCountAll({
      where: { recipient_user_id: userId },
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
    const items = rows.map((r) => ({
      id: r.id,
      notification_type: r.notification_type,
      title: r.title,
      body: r.body,
      data: r.data_json,
      read_at: r.read_at,
      created_at: r.created_at,
      sender_artist_id: r.sender_artist_id,
      sender_user_id: r.sender_user_id,
      chat_doc_id: r.chat_doc_id,
      live_stream_id: r.live_stream_id,
      message_count: r.message_count
    }));
    return res.json({
      success: true,
      data: { items, total: count, limit, offset }
    });
  } catch (err) {
    console.error('GET /notifications error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load notifications' });
  }
});

/**
 * GET /api/v1/notifications/unread-count
 */
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const count = await UserNotification.count({
      where: { recipient_user_id: userId, read_at: null }
    });
    return res.json({ success: true, data: { count } });
  } catch (err) {
    console.error('GET /notifications/unread-count error:', err);
    return res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
});

/**
 * PATCH /api/v1/notifications/:id/read - Mark one as read
 */
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    const row = await UserNotification.findOne({
      where: { id, recipient_user_id: userId }
    });
    if (!row) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    row.read_at = new Date();
    await row.save();
    return res.json({ success: true, data: { id: row.id, read_at: row.read_at } });
  } catch (err) {
    console.error('PATCH /notifications/:id/read error:', err);
    return res.status(500).json({ success: false, error: 'Failed to mark read' });
  }
});

/**
 * DELETE /api/v1/notifications/:id - Delete one notification
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    const row = await UserNotification.findOne({
      where: { id, recipient_user_id: userId }
    });
    if (!row) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    await row.destroy();
    return res.json({ success: true, data: { deleted: id } });
  } catch (err) {
    console.error('DELETE /notifications/:id error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete' });
  }
});

/**
 * DELETE /api/v1/notifications - Clear all notifications for current user
 */
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const deleted = await UserNotification.destroy({
      where: { recipient_user_id: userId }
    });
    return res.json({ success: true, data: { deleted } });
  } catch (err) {
    console.error('DELETE /notifications error:', err);
    return res.status(500).json({ success: false, error: 'Failed to clear notifications' });
  }
});

module.exports = router;
