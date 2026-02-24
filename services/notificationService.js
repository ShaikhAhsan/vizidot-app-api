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
 * Send push notification to many FCM tokens in batches. Logs to push_notification_log.
 *
 * @param {Object} options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification body
 * @param {string[]} options.fcmTokens - Array of FCM device tokens (deduplicated inside)
 * @param {Object} [options.data] - Custom key-value data (all values stringified). Passed in notification data payload.
 * @param {string} [options.imageUrl] - Optional image URL for the notification
 * @returns {Promise<{ successCount: number, failureCount: number, total: number, logId: number | null }>}
 */
async function sendPushNotification({ title, message, fcmTokens = [], data, imageUrl }) {
  const tokens = [...new Set((fcmTokens || []).filter((t) => t && String(t).trim()))];
  const total = tokens.length;

  if (!title || !message) {
    throw new Error('title and message are required');
  }

  let messaging;
  try {
    messaging = getMessaging();
  } catch (e) {
    throw new Error('Firebase not initialized. Set FIREBASE_SERVICE_ACCOUNT_JSON and call initializeFirebase() first.');
  }

  const dataPayload = stringifyData(data);
  const notification = {
    title: String(title).slice(0, 255),
    body: String(message)
  };
  if (imageUrl && String(imageUrl).trim()) {
    notification.imageUrl = String(imageUrl).trim();
  }

  const androidConfig = {
    priority: 'high',
    notification: {
      sound: 'default',
      clickAction: 'FLUTTER_NOTIFICATION_CLICK'
    }
  };
  const apnsConfig = {
    payload: {
      aps: {
        sound: 'default',
        'mutable-content': 1
      }
    },
    fcmOptions: {
      imageUrl: imageUrl && String(imageUrl).trim() ? String(imageUrl).trim() : undefined
    }
  };
  if (imageUrl && String(imageUrl).trim()) {
    apnsConfig.payload.aps['mutable-content'] = 1;
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
        notification,
        data: dataPayload || {},
        android: androidConfig,
        apns: apnsConfig
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
    logId: logRow ? logRow.id : null
  };
}

module.exports = {
  sendPushNotification
};
