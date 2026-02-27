/**
 * Send a chat message via API: write to Firestore, update chat doc, then send push to
 * all recipient devices with latest sender name and image. Ensures no device is skipped.
 */

const admin = require('firebase-admin');
const { getFirebaseInstance } = require('../config/firebase');
const { User, UserArtist, Artist } = require('../models');
const { getRecipientUserIdForChat, notifyUser } = require('./userNotificationService');

const CHATS_COLLECTION = 'chats';
const MESSAGES_SUBCOLLECTION = 'messages';

/**
 * Make image URL absolute if it's a path. baseUrl should not have trailing slash.
 */
function ensureAbsoluteImageUrl(url, baseUrl) {
  if (!url || typeof url !== 'string' || !url.trim()) return null;
  const u = url.trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (!baseUrl) return u;
  return baseUrl + (u.startsWith('/') ? u : `/${u}`);
}

/**
 * Send a chat message: validate sender, write to Firestore, update chat doc, send push to all recipient devices.
 * @param {Object} params
 * @param {number} params.currentUserId - MySQL user id of the sender
 * @param {string} params.firebaseUid - Firebase UID of the sender
 * @param {string} params.chatDocId - e.g. "1_ci9xxx"
 * @param {string} params.text - Message text
 * @param {string} [params.baseUrl] - API base URL for relative image URLs
 * @returns {Promise<{ success: boolean, messageId?: string, createdAt?: Date, error?: string }>}
 */
async function sendChatMessage({ currentUserId, firebaseUid, chatDocId, text, baseUrl }) {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return { success: false, error: 'Message text is required' };
  }

  const match = /^(\d+)_(.+)$/.exec(chatDocId);
  if (!match) {
    return { success: false, error: 'Invalid chatDocId format' };
  }
  const artistId = parseInt(match[1], 10);
  const fanFirebaseUid = match[2];
  if (!fanFirebaseUid) {
    return { success: false, error: 'Invalid chatDocId' };
  }

  const isFan = firebaseUid === fanFirebaseUid;
  let isArtist = false;
  if (!isFan) {
    const link = await UserArtist.findOne({ where: { user_id: currentUserId, artist_id: artistId }, attributes: ['user_id'] });
    isArtist = !!link;
  }
  if (!isFan && !isArtist) {
    return { success: false, error: 'Access denied to this chat' };
  }

  const senderId = isArtist ? `artist_${artistId}` : firebaseUid;
  const senderType = isArtist ? 'artist' : 'user';

  let senderDisplayName = '';
  let senderImageUrl = null;

  if (isArtist) {
    const artist = await Artist.findByPk(artistId, { attributes: ['name', 'image_url'] });
    senderDisplayName = artist ? (artist.name || 'Artist') : 'Artist';
    senderImageUrl = artist && artist.image_url ? ensureAbsoluteImageUrl(artist.image_url, baseUrl) : null;
  } else {
    const user = await User.findByPk(currentUserId, { attributes: ['first_name', 'last_name', 'profile_image'] });
    if (user) {
      senderDisplayName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || 'User';
      senderImageUrl = user.profile_image ? ensureAbsoluteImageUrl(user.profile_image, baseUrl) : null;
    } else {
      senderDisplayName = 'User';
    }
  }

  const recipientUserId = await getRecipientUserIdForChat(chatDocId, isArtist);
  if (!recipientUserId) {
    return { success: false, error: 'Recipient not found' };
  }

  let db;
  try {
    db = getFirebaseInstance().db;
  } catch (e) {
    return { success: false, error: 'Firebase not initialized' };
  }

  const chatRef = db.collection(CHATS_COLLECTION).doc(chatDocId);
  const messagesRef = chatRef.collection(MESSAGES_SUBCOLLECTION);

  const messageData = {
    text: trimmed,
    senderId,
    senderType,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };
  const messageRef = await messagesRef.add(messageData);
  const messageId = messageRef.id;

  const chatUpdate = {
    lastMessage: trimmed,
    lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
    artistId,
    userId: fanFirebaseUid
  };
  if (isArtist) {
    chatUpdate.unreadByUser = admin.firestore.FieldValue.increment(1);
  } else {
    chatUpdate.unreadByArtist = admin.firestore.FieldValue.increment(1);
  }

  const artist = await Artist.findByPk(artistId, { attributes: ['name', 'image_url'] });
  const fanUser = await User.findOne({ where: { firebase_uid: fanFirebaseUid }, attributes: ['id', 'first_name', 'last_name', 'profile_image'] });
  if (artist) {
    chatUpdate.artistName = artist.name || null;
    if (artist.image_url) chatUpdate.artistImageUrl = ensureAbsoluteImageUrl(artist.image_url, baseUrl);
  }
  if (fanUser) {
    chatUpdate.userDisplayName = [fanUser.first_name, fanUser.last_name].filter(Boolean).join(' ').trim() || null;
    if (fanUser.profile_image) chatUpdate.userPhotoURL = ensureAbsoluteImageUrl(fanUser.profile_image, baseUrl);
  }

  await chatRef.set(chatUpdate, { merge: true });

  const data = {
    notificationType: 'message',
    userType: isArtist ? 'Artist' : 'user',
    name: senderDisplayName,
    chatDocId
  };
  if (isArtist) data.artistId = artistId;
  else data.userId = firebaseUid;

  await notifyUser({
    recipientUserId,
    chatDocId,
    isSenderArtist: isArtist,
    notificationType: 'message',
    title: senderDisplayName,
    body: 'sent a message',
    data,
    senderArtistId: isArtist ? artistId : null,
    senderUserId: isArtist ? null : currentUserId,
    messageCount: 1,
    imageUrl: senderImageUrl,
    recordInHistory: false,
    skipPushIfOnScreen: true
  });

  const createdAt = new Date();
  return { success: true, messageId, createdAt };
}

module.exports = {
  sendChatMessage
};
