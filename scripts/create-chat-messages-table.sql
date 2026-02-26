-- Chat messages archived from Firebase (messages older than 24h) for cheaper reads.
-- Real-time messages stay in Firestore for 24h, then migration script moves them here.

CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `chat_doc_id` varchar(64) NOT NULL COMMENT 'e.g. artistId_userId = 5_abc123',
  `artist_id` int NOT NULL,
  `user_id` varchar(128) NOT NULL COMMENT 'Firebase UID of the fan',
  `firebase_message_id` varchar(128) DEFAULT NULL COMMENT 'Original Firestore doc ID for dedup',
  `text` text NOT NULL,
  `sender_type` varchar(16) NOT NULL COMMENT 'user or artist',
  `sender_id` varchar(128) NOT NULL COMMENT 'Firebase UID or artist_artistId',
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_chat_firebase_msg` (`chat_doc_id`, `firebase_message_id`),
  KEY `idx_chat_created` (`chat_doc_id`, `created_at`),
  KEY `idx_artist_created` (`artist_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
