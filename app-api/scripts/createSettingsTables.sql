-- Settings tables for the app Settings screen.
-- Run this in your MySQL database (e.g. mysql -u user -p db_name < scripts/createSettingsTables.sql).

-- Per-user settings (notifications, language). One row per user.
CREATE TABLE IF NOT EXISTS user_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  enable_notifications TINYINT(1) NOT NULL DEFAULT 1,
  message_notifications TINYINT(1) NOT NULL DEFAULT 0,
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_settings_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- App-level config (Help Center URL, Privacy URL, About text, etc.). Key-value store.
CREATE TABLE IF NOT EXISTS app_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  `value` TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_app_settings_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default app config keys (values can be updated via admin or API).
INSERT IGNORE INTO app_settings (`key`, `value`) VALUES
  ('help_center_url', 'https://example.com/help'),
  ('privacy_policy_url', 'https://example.com/privacy'),
  ('terms_url', 'https://example.com/terms'),
  ('about_text', 'Vizidot – Connect with artists and stream exclusive content.'),
  ('app_name', 'Vizidot'),
  ('about_tagline', 'Connect with artists and stream exclusive content.'),
  ('about_description', 'Scan Vizidot codes to unlock music, videos, and artist content. Follow your favourite artists, save albums and tracks, and message artists directly.'),
  ('about_version', ''),
  ('about_build', ''),
  ('contact_email', ''),
  ('website_url', '');
