/**
 * Push notification service: send FCM notifications in batches, log history to DB.
 * Uses Firebase Admin getMessaging(). sendEachForMulticast supports up to 500 tokens per call.
 *
 * Usage:
 *   const { sendPushNotification } = require('../services/notificationService');
 *   await sendPushNotification({
 *     title: 'Hello',
 *     message: 'Body text',
 *     fcmTokens: ['token1', 'token2', ...],
 *     data: { key: 'value', id: '123' },  // optional; all values stringified
 *     imageUrl: 'https://...'              // optional
 *   });
 */

const { getMessaging } = require('../config/firebase');
const { PushNotificationLog } = require('../models');

const FCM_BATCH_SIZE = 500;
const CONCURRENT_BATCHES = 5;

/**
 * Chunk array into groups of size n.
 */
function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) {
    out.push(arr.slice(i, i + n));
  }
  return out;
}

/**
 * Run promises in chunks of `concurrency` at a time.
 */
async function runBatches(batchFns, concurrency = CONCURRENT_BATCHES) {
  const results = [];
  for (let i = 0; i < batchFns.length; i += concurrency) {
    const slice = batchFns.slice(i, i + concurrency);
    const settled = await Promise.allSettled(slice.map((fn) => fn()));
    results.push(...settled);
  }
  return results;
}

/**
 * Ensure all values in data are strings (FCM data payload requirement).
 */
function stringifyData(data) {
  if (!data || typeof data !== 'object') return undefined;
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    out[String(k)] = v === null || v === undefined ? '' : String(v);
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Send push via Firebase Cloud Function (HTTP). Logs to push_notification_log.
 */
async function sendViaFirebaseFunction({ title, message, tokens, data, imageUrl, functionUrl }) {
  const total = tokens.length;
  let logRow = null;
  try {
    logRow = await PushNotificationLog.create({
      title: String(title).slice(0, 255),
      message: String(message),
      image_url: imageUrl && String(imageUrl).trim() || null,
      custom_data: data ? JSON.stringify(stringifyData(data)) : null,
      token_count: total,
      success_count: 0,
      failure_count: 0,
      status: 'pending'
    });
  } catch (dbErr) {
    console.warn('notificationService: could not create log row (table may not exist):', dbErr.message);
  }

  if (total === 0) {
    if (logRow) await logRow.update({ status: 'completed', success_count: 0, failure_count: 0 });
    return { successCount: 0, failureCount: 0, total: 0, logId: logRow ? logRow.id : null };
  }

  let successCount = 0;
  let failureCount = 0;
  let errors = [];

  try {
    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        message,
        fcmTokens: tokens,
        data: data ? stringifyData(data) : undefined,
        imageUrl: imageUrl && String(imageUrl).trim() || undefined
      })
    });
    const text = await res.text();
    const body = (() => { try { return JSON.parse(text); } catch (_) { return {}; } })();
    if (!res.ok) {
      const msg = body.error || body.message || (text && text.slice(0, 200)) || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    successCount = body.successCount ?? 0;
    failureCount = body.failureCount ?? 0;
    errors = body.errors || [];
  } catch (err) {
    failureCount = total;
    errors = [err.message || String(err)];
  }

  const status = failureCount === 0 ? 'completed' : (successCount === 0 ? 'failed' : 'partial');
  const errorSummary = errors.length ? errors.slice(0, 5).join('; ').slice(0, 500) : null;
  if (logRow) {
    try {
      await logRow.update({
        success_count: successCount,
        failure_count: failureCount,
        status,
        error_summary: errorSummary
      });
    } catch (e) {
      console.warn('notificationService: could not update log row:', e.message);
    }
  }

  return {
    successCount,
    failureCount,
    total,
    logId: logRow ? logRow.id : null,
    errors: errors.length ? errors.slice(0, 10) : undefined
  };
}

/**
 * Send push notification to many FCM tokens in batches. Logs to push_notification_log.
 * If FIREBASE_SEND_PUSH_FUNCTION_URL is set, calls the Firebase Cloud Function instead
 * (avoids credential/time issues on your server). No secret required.
 *
 * @param {Object} options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification body
 * @param {string[]} options.fcmTokens - Array of FCM device tokens (deduplicated inside)
 * @param {Object} [options.data] - Custom key-value data (all values stringified). Passed in notification data payload.
 * @param {string} [options.imageUrl] - Optional image URL for the notification
 * @returns {Promise<{ successCount: number, failureCount: number, total: number, logId: number | null, errors?: string[] }>}
 */
async function sendPushNotification({ title, message, fcmTokens = [], data, imageUrl }) {
  const tokens = [...new Set((fcmTokens || []).filter((t) => t && String(t).trim()))];
  const total = tokens.length;

  if (!title || !message) {
    throw new Error('title and message are required');
  }

  const functionUrl = (process.env.FIREBASE_SEND_PUSH_FUNCTION_URL || '').trim();
  if (functionUrl) {
    return sendViaFirebaseFunction({
      title,
      message,
      tokens,
      data,
      imageUrl,
      functionUrl
    });
  }

  let messaging;
  try {
    messaging = getMessaging();
  } catch (e) {
    throw new Error('Firebase not initialized. Set FIREBASE_SERVICE_ACCOUNT_JSON and call initializeFirebase() first.');
  }

  const dataPayload = stringifyData(data);
  // Minimal notification payload (matches Firebase Console "Send test message" format)
  const notification = {
    title: String(title).slice(0, 255),
    body: String(message)
  };
  if (imageUrl && String(imageUrl).trim()) {
    notification.imageUrl = String(imageUrl).trim();
  }

  // Build message to match Firebase Console "Send test message": notification + optional data.
  // Use minimal payload; platform-specific options can cause FCM to reject valid tokens.
  const baseMessage = {
    notification,
    ...(dataPayload && Object.keys(dataPayload).length > 0 && { data: dataPayload })
  };
  // Add platform config only when needed; keep minimal.
  baseMessage.android = { priority: 'high' };
  baseMessage.apns = { payload: { aps: { sound: 'default' } } };
  if (imageUrl && String(imageUrl).trim()) {
    baseMessage.apns.fcmOptions = { imageUrl: String(imageUrl).trim() };
    baseMessage.apns.payload.aps['mutable-content'] = 1;
  }

  let logRow = null;
  try {
    logRow = await PushNotificationLog.create({
      title: notification.title,
      message: String(message),
      image_url: imageUrl && String(imageUrl).trim() || null,
      custom_data: dataPayload ? JSON.stringify(dataPayload) : null,
      token_count: total,
      success_count: 0,
      failure_count: 0,
      status: 'pending'
    });
  } catch (dbErr) {
    console.warn('notificationService: could not create log row (table may not exist):', dbErr.message);
  }

  if (total === 0) {
    if (logRow) {
      await logRow.update({ status: 'completed', success_count: 0, failure_count: 0 });
    }
    return { successCount: 0, failureCount: 0, total: 0, logId: logRow ? logRow.id : null };
  }

  const batches = chunk(tokens, FCM_BATCH_SIZE);
  const errors = [];

  const batchFns = batches.map((tokenBatch) => {
    return async () => {
      const multicast = {
        tokens: tokenBatch,
        ...baseMessage
      };
      const response = await messaging.sendEachForMulticast(multicast);
      response.responses.forEach((r, idx) => {
        if (!r.success && r.error) {
          errors.push(`${tokenBatch[idx]?.slice(0, 20)}...: ${r.error.message}`);
        }
      });
      return response;
    };
  });

  const results = await runBatches(batchFns, CONCURRENT_BATCHES);
  let successCount = 0;
  let failureCount = 0;
  results.forEach((r, idx) => {
    if (r.status === 'fulfilled' && r.value) {
      successCount += r.value.successCount || 0;
      failureCount += r.value.failureCount || 0;
    } else {
      const batchSize = batches[idx] ? batches[idx].length : FCM_BATCH_SIZE;
      failureCount += batchSize;
      if (r.reason) errors.push(r.reason.message || String(r.reason));
    }
  });

  const status = failureCount === 0 ? 'completed' : (successCount === 0 ? 'failed' : 'partial');
  const errorSummary = errors.length
    ? errors.slice(0, 5).join('; ').slice(0, 500)
    : null;

  if (logRow) {
    try {
      await logRow.update({
        success_count: successCount,
        failure_count: failureCount,
        status,
        error_summary: errorSummary
      });
    } catch (e) {
      console.warn('notificationService: could not update log row:', e.message);
    }
  }

  return {
    successCount,
    failureCount,
    total,
    logId: logRow ? logRow.id : null,
    errors: errors.length ? errors.slice(0, 10) : undefined
  };
}

module.exports = {
  sendPushNotification
};
