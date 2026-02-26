/**
 * Migrates chat messages from Firestore to MySQL when they are older than a given cutoff.
 * Used by POST /api/v1/settings/migrate-chat-messages and optionally by the standalone script.
 * Requires Firebase and MySQL to be initialized (e.g. getFirebaseInstance(), sequelize).
 *
 * @param {Object} options
 * @param {number} [options.hoursAgo=24] - Move messages older than this many hours.
 * @returns {Promise<{ moved: number, deleted: number }>}
 */
async function run(options = {}) {
  const admin = require('firebase-admin');
  const { getFirebaseInstance } = require('../config/firebase');
  const { sequelize } = require('../config/database');
  const ChatMessage = require('../models/ChatMessage');

  const hoursAgo = typeof options.hoursAgo === 'number' && options.hoursAgo > 0 ? options.hoursAgo : 24;
  const CHATS_COLLECTION = 'chats';
  const MESSAGES_SUBCOLLECTION = 'messages';

  await sequelize.authenticate();
  const { db } = getFirebaseInstance();
  const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoff);

  const chatsSnap = await db.collection(CHATS_COLLECTION).get();
  let totalMoved = 0;
  let totalDeleted = 0;

  for (const chatDoc of chatsSnap.docs) {
    const chatDocId = chatDoc.id;
    const chatData = chatDoc.data();
    const artistId = chatData.artistId;
    const userId = chatData.userId;
    if (artistId == null || !userId) continue;

    const messagesRef = chatDoc.ref.collection(MESSAGES_SUBCOLLECTION);
    const oldSnap = await messagesRef.where('createdAt', '<', cutoffTimestamp).get();
    if (oldSnap.empty) continue;

    for (const msgDoc of oldSnap.docs) {
      const d = msgDoc.data();
      const text = d.text || '';
      const senderType = d.senderType || 'user';
      const senderId = d.senderId || '';
      const createdAt = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : new Date();

      try {
        await ChatMessage.create({
          chat_doc_id: chatDocId,
          artist_id: artistId,
          user_id: userId,
          firebase_message_id: msgDoc.id,
          text,
          sender_type: senderType,
          sender_id: senderId,
          created_at: createdAt
        });
        totalMoved++;
        await msgDoc.ref.delete();
        totalDeleted++;
      } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
          await msgDoc.ref.delete();
          totalDeleted++;
        } else {
          throw err;
        }
      }
    }
  }

  return { moved: totalMoved, deleted: totalDeleted };
}

module.exports = { run };
