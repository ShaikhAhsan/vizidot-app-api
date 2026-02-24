-- Push notification send history (batch-level). Run once.
CREATE TABLE IF NOT EXISTS push_notification_log (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  image_url VARCHAR(512) NULL,
  custom_data JSON NULL COMMENT 'Custom key-value params sent in data payload',
  token_count INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  failure_count INT NOT NULL DEFAULT 0,
  status ENUM('pending','completed','partial','failed') NOT NULL DEFAULT 'pending',
  error_summary VARCHAR(500) NULL COMMENT 'Brief summary of errors if any',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_push_notification_log_created (created_at),
  INDEX idx_push_notification_log_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
