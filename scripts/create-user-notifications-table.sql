-- User-facing notification history: each push is recorded per recipient for in-app history and unread count.
CREATE TABLE IF NOT EXISTS user_notifications (
  id INT NOT NULL AUTO_INCREMENT,
  recipient_user_id INT NOT NULL,
  notification_type VARCHAR(32) NOT NULL DEFAULT 'message',
  title VARCHAR(255) NOT NULL,
  body VARCHAR(500) NOT NULL,
  data_json JSON NULL,
  read_at DATETIME NULL DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sender_artist_id INT NULL DEFAULT NULL,
  sender_user_id INT NULL DEFAULT NULL,
  chat_doc_id VARCHAR(64) NULL DEFAULT NULL,
  live_stream_id VARCHAR(128) NULL DEFAULT NULL,
  message_count TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_recipient_created (recipient_user_id, created_at DESC),
  KEY idx_recipient_read (recipient_user_id, read_at),
  KEY idx_chat_doc (chat_doc_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_presence (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  screen VARCHAR(32) NOT NULL,
  context_id VARCHAR(128) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_user_presence (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
