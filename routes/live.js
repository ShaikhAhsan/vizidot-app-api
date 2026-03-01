/**
 * GET /api/v1/live/rtc-token
 * Query: channelName (required), role (publisher | audience, default audience), uid (optional, default 0)
 * Returns Agora RTC token for the channel.
 *
 * Required for join to succeed when Agora project has token auth enabled:
 * - Set AGORA_APP_CERTIFICATE in .env (from Agora Console > Project > Primary Certificate).
 * - App ID and Certificate must be from the SAME project; both must be 32-character hex strings.
 * - If you get -17 with a token, the certificate does not match the App ID's project — copy Primary Certificate again from that project.
 */

const express = require('express');
const router = express.Router();
const { RtcTokenBuilder, RtcRole } = require('agora-token');

const AGORA_APP_ID = (process.env.AGORA_APP_ID || '').trim();
const AGORA_APP_CERTIFICATE = (process.env.AGORA_APP_CERTIFICATE || '').trim();
const AGORA_TOKEN_EXPIRY_SECONDS = parseInt(process.env.AGORA_TOKEN_EXPIRY_SECONDS || '3600', 10); // 1 hour

function isValidAgoraHex32(value) {
  return typeof value === 'string' && value.length === 32 && /^[0-9a-fA-F]+$/.test(value);
}

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

  if (!isValidAgoraHex32(AGORA_APP_ID) || !isValidAgoraHex32(AGORA_APP_CERTIFICATE)) {
    console.error('[live/rtc-token] AGORA_APP_ID and AGORA_APP_CERTIFICATE must be 32-character hex strings. Check .env');
    return res.status(503).json({
      success: false,
      error: 'Invalid Agora config. AGORA_APP_ID and AGORA_APP_CERTIFICATE must be exactly 32 hex characters (from Agora Console).',
    });
  }

  const role = roleName === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const tokenExpire = AGORA_TOKEN_EXPIRY_SECONDS;
  const privilegeExpire = AGORA_TOKEN_EXPIRY_SECONDS;

  let token;
  try {
    token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      role,
      tokenExpire,
      privilegeExpire,
    );
  } catch (e) {
    console.error('Agora token build error:', e);
    return res.status(500).json({ success: false, error: 'Failed to generate token' });
  }

  if (!token || token.length === 0) {
    console.error('[live/rtc-token] Token build returned empty. Check App ID and Certificate match the same Agora project.');
    return res.status(500).json({ success: false, error: 'Token generation returned empty. Ensure AGORA_APP_CERTIFICATE is the Primary Certificate for the project that has this AGORA_APP_ID.' });
  }

  console.log('[live/rtc-token] token issued channel=' + channelName + ' uid=' + uid + ' role=' + roleName);
  const expireAt = Math.floor(Date.now() / 1000) + AGORA_TOKEN_EXPIRY_SECONDS;
  return res.json({
    success: true,
    data: {
      token,
      appId: AGORA_APP_ID,
      channelName,
      uid,
      role: roleName,
      expireAt,
    },
  });
});

module.exports = router;
