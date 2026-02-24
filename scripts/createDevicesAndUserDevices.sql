-- Multi-device FCM token architecture: devices + user_devices
-- Run once. Safe to run if tables already exist (use IF NOT EXISTS).

-- Devices: one row per physical device (identified by app-generated device_id)
CREATE TABLE IF NOT EXISTS devices (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(64) NOT NULL COMMENT 'UUID from app, stored in Keychain/EncryptedSharedPrefs',
  platform ENUM('ios','android','web') NOT NULL,
  device_name VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_devices_device_id (device_id),
  INDEX idx_devices_platform (platform)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User-Device mapping: which user is active on which device, with FCM token
-- One device can have multiple users in history but only one is_active = 1 at a time
CREATE TABLE IF NOT EXISTS user_devices (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  device_id INT NOT NULL,
  fcm_token VARCHAR(512) NULL COMMENT 'FCM token for push notifications',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_devices_user_device (user_id, device_id),
  INDEX idx_user_devices_user_active (user_id, is_active),
  INDEX idx_user_devices_device_active (device_id, is_active),
  INDEX idx_user_devices_fcm (fcm_token(255)),
  CONSTRAINT fk_user_devices_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_devices_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
