/**
 * GET /api/v1/live/rtc-token
 * Query: channelName (required), role (publisher | audience, default audience), uid (optional, default 0)
 * Returns Agora RTC token for the channel. Used when AGORA_APP_CERTIFICATE is set (production).
 * If certificate is not set, returns { token: null } and app can use empty token (Agora testing mode).
 */

const express = require('express');
const router = express.Router();
const { RtcTokenBuilder, RtcRole } = require('agora-token');

const AGORA_APP_ID = (process.env.AGORA_APP_ID || '').trim();
const AGORA_APP_CERTIFICATE = (process.env.AGORA_APP_CERTIFICATE || '').trim();
const AGORA_TOKEN_EXPIRY_SECONDS = parseInt(process.env.AGORA_TOKEN_EXPIRY_SECONDS || '3600', 10); // 1 hour

router.get('/rtc-token', (req, res) => {
  const channelName = (req.query.channelName || '').trim();
  const roleName = (req.query.role || 'audience').toLowerCase();
  let uid = parseInt(req.query.uid, 10);
  if (Number.isNaN(uid) || uid < 0) uid = 0;

  if (!channelName) {
    return res.status(400).json({ success: false, error: 'channelName is required' });
  }

  if (!AGORA_APP_ID) {
    return res.status(503).json({
      success: false,
      error: 'Agora is not configured. Set AGORA_APP_ID on the server.',
    });
  }

  if (!AGORA_APP_CERTIFICATE) {
    return res.json({
      success: true,
      data: {
        token: null,
        appId: AGORA_APP_ID,
        channelName,
        uid,
        role: roleName,
        message: 'No certificate set. Use empty token in app (Agora testing mode).',
      },
    });
  }

  const role = roleName === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const currentTs = Math.floor(Date.now() / 1000);
  const expiry = currentTs + AGORA_TOKEN_EXPIRY_SECONDS;

  let token;
  try {
    token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      role,
      expiry,
    );
  } catch (e) {
    console.error('Agora token build error:', e);
    return res.status(500).json({ success: false, error: 'Failed to generate token' });
  }

  return res.json({
    success: true,
    data: {
      token,
      appId: AGORA_APP_ID,
      channelName,
      uid,
      role: roleName,
      expireAt: expiry,
    },
  });
});

module.exports = router;
