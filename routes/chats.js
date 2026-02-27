const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authWithRoles');
const { sequelize } = require('../config/database');
const { UserArtist } = require('../models');

/**
 * GET /api/v1/chats/messages
 * Query: chatDocId (required), before (ISO date string, optional), limit (default 10, max 50)
 * - Omit "before" for initial load: returns the most recent messages (up to limit).
 * - Send "before" with an older message's createdAt for the next page (older messages).
 * Auth required. Caller must be either the fan or the artist (user_artists).
 */
router.get('/messages', authenticateToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid || req.user?.firebase_uid;
    if (!firebaseUid) {
      return res.status(401).json({ success: false, error: 'User not identified' });
    }

    const chatDocId = (req.query.chatDocId || '').trim();
    if (!chatDocId || !/^\d+_[a-zA-Z0-9_-]+$/.test(chatDocId)) {
      return res.status(400).json({ success: false, error: 'Valid chatDocId required (e.g. artistId_userId)' });
    }

    const parts = chatDocId.split('_');
    const artistId = parseInt(parts[0], 10);
    const fanUserId = parts.slice(1).join('_');
    if (isNaN(artistId) || !fanUserId) {
      return res.status(400).json({ success: false, error: 'Invalid chatDocId format' });
    }

    const isFan = firebaseUid === fanUserId;
    let isArtist = false;
    if (!isFan && req.userId) {
      const link = await UserArtist.findOne({ where: { user_id: req.userId, artist_id: artistId } });
      isArtist = !!link;
    }
    if (!isFan && !isArtist) {
      return res.status(403).json({ success: false, error: 'Access denied to this chat' });
    }

    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    let before = req.query.before;
    let beforeDate = null;
    if (before) {
      beforeDate = new Date(before);
      if (isNaN(beforeDate.getTime())) {
        return res.status(400).json({ success: false, error: 'Invalid before date' });
      }
    }

    const rows = await sequelize.query(
      `SELECT id, chat_doc_id, text, sender_type, sender_id, created_at
       FROM chat_messages
       WHERE chat_doc_id = :chatDocId
       ${beforeDate ? 'AND created_at < :beforeDate' : ''}
       ORDER BY created_at DESC
       LIMIT :limit`,
      {
        replacements: { chatDocId, ...(beforeDate && { beforeDate }), limit },
        type: sequelize.QueryTypes.SELECT
      }
    );
    const list = Array.isArray(rows) ? rows : [];
    const messages = list.map((r) => ({
      id: String(r.id),
      chatDocId: r.chat_doc_id,
      text: r.text,
      senderType: r.sender_type,
      senderId: r.sender_id,
      createdAt: r.created_at
    }));

    return res.json({
      success: true,
      data: {
        messages,
        nextBefore: messages.length === limit && messages.length > 0 ? messages[messages.length - 1].createdAt : null
      }
    });
  } catch (err) {
    console.error('GET /chats/messages error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load messages' });
  }
});

module.exports = router;
