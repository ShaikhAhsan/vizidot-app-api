/**
 * User-facing notifications: record in user_notifications, optionally send FCM.
 * Skips FCM when recipient is on the same screen (e.g. viewing that chat) via user_presence.
 */

const { Op } = require('sequelize');
const { UserNotification, UserPresence, UserDevice, User, UserArtist } = require('../models');
const { sendPushNotification } = require('./notificationService');

/**
 * Resolve recipient user id for a chat notification.
 * @param {string} chatDocId - e.g. "1_ci9WG7zdFkWShf8znvMrUj3juUl2"
 * @param {boolean} isSenderArtist - true if the sender is the artist
 * @returns {Promise<number|null>} recipient user id
 */
async function getRecipientUserIdForChat(chatDocId, isSenderArtist) {
  if (!chatDocId || typeof chatDocId !== 'string') return null;
  const parts = chatDocId.split('_');
  const artistId = parseInt(parts[0], 10);
  const fanFirebaseUid = parts.slice(1).join('_');
  if (isSenderArtist) {
    const fan = await User.findOne({ where: { firebase_uid: fanFirebaseUid }, attributes: ['id'] });
    return fan ? fan.id : null;
  }
  const ua = await UserArtist.findOne({ where: { artist_id: artistId }, attributes: ['user_id'] });
  return ua ? ua.user_id : null;
}

/**
 * Check if we should skip FCM (recipient is viewing this context).
 */
async function shouldSkipPush(recipientUserId, screen, contextId) {
  if (!screen || !contextId) return false;
  const presence = await UserPresence.findOne({
    where: { user_id: recipientUserId }
  });
  if (!presence) return false;
  return presence.screen === screen && presence.context_id === contextId;
}

/**
 * Get FCM tokens for a user (active devices only).
 */
async function getFcmTokensForUser(userId) {
  const rows = await UserDevice.findAll({
    where: { user_id: userId, is_active: true },
    attributes: ['fcm_token']
  });
  const tokens = rows.map((r) => r.fcm_token).filter(Boolean);
  return tokens;
}

/**
 * Notify a user: optionally record in user_notifications, and send FCM unless they're on the relevant screen.
 * For notificationType 'message', only push is sent (no record in history).
 * @param {Object} options
 * @param {number} options.recipientUserId - recipient user id (or use chatDocId + isSenderArtist to resolve)
 * @param {string} options.notificationType - 'message' | 'liveStream' | etc.
 * @param {string} options.title - e.g. "Katty Parry"
 * @param {string} options.body - e.g. "sent a message", "sent 2 messages"
 * @param {Object} [options.data] - payload for deep link (notificationType, userType, artistId, userId, chatDocId, liveStreamId, name)
 * @param {number} [options.senderArtistId]
 * @param {number} [options.senderUserId]
 * @param {string} [options.chatDocId]
 * @param {string} [options.liveStreamId]
 * @param {number} [options.messageCount]
 * @param {boolean} [options.skipPushIfOnScreen] - if true, check presence and skip FCM when on same screen
 * @param {boolean} [options.recordInHistory] - if false, only send FCM (no row in user_notifications). Default true; false for type 'message'.
 * @param {string} [options.imageUrl] - optional image URL for the push notification (e.g. sender avatar)
 */
async function notifyUser(options) {
  const {
    recipientUserId: providedRecipientUserId,
    chatDocId,
    isSenderArtist,
    notificationType = 'message',
    title,
    body,
    data = {},
    senderArtistId = null,
    senderUserId = null,
    liveStreamId = null,
    messageCount = 1,
    skipPushIfOnScreen = true,
    recordInHistory = notificationType !== 'message',
    imageUrl = null
  } = options;

  let recipientUserId = providedRecipientUserId;
  if (recipientUserId == null && chatDocId != null && typeof isSenderArtist === 'boolean') {
    recipientUserId = await getRecipientUserIdForChat(chatDocId, isSenderArtist);
  }
  if (!recipientUserId) {
    return { recorded: false, sent: false, reason: 'recipient_not_found' };
  }

  const dataPayload = {
    notificationType: String(notificationType),
    ...(data && typeof data === 'object' ? data : {})
  };

  const titleStr = String(title).slice(0, 255);
  const bodyStr = String(body).slice(0, 500);

  let row = null;
  if (recordInHistory) {
    row = await UserNotification.create({
      recipient_user_id: recipientUserId,
      notification_type: notificationType,
      title: titleStr,
      body: bodyStr,
      data_json: dataPayload,
      sender_artist_id: senderArtistId || null,
      sender_user_id: senderUserId || null,
      chat_doc_id: chatDocId || null,
      live_stream_id: liveStreamId || null,
      message_count: Math.max(1, parseInt(messageCount, 10) || 1)
    });
  }

  if (skipPushIfOnScreen && chatDocId) {
    const skip = await shouldSkipPush(recipientUserId, 'chat', chatDocId);
    if (skip) {
      return { recorded: !!row, notificationId: row?.id ?? null, sent: false, reason: 'user_on_screen' };
    }
  }
  if (skipPushIfOnScreen && notificationType === 'liveStream' && liveStreamId) {
    const skip = await shouldSkipPush(recipientUserId, 'liveStream', liveStreamId);
    if (skip) {
      return { recorded: !!row, notificationId: row?.id ?? null, sent: false, reason: 'user_on_screen' };
    }
  }

  const tokens = await getFcmTokensForUser(recipientUserId);
  let sent = false;
  let successCount = 0;
  if (tokens.length > 0) {
    const result = await sendPushNotification({
      title: titleStr,
      message: bodyStr,
      fcmTokens: tokens,
      data: { ...dataPayload, ...(row ? { notificationId: String(row.id) } : {}) },
      imageUrl: imageUrl && String(imageUrl).trim() ? String(imageUrl).trim() : undefined
    });
    sent = result.successCount > 0;
    successCount = result.successCount || 0;
  }

  return {
    recorded: !!row,
    notificationId: row?.id ?? null,
    sent,
    successCount
  };
}

module.exports = {
  notifyUser,
  getRecipientUserIdForChat,
  shouldSkipPush,
  getFcmTokensForUser
};
