-- Add is_onboarded to users table. Run once (ignore error if column already exists).
-- GET /api/v1/settings returns user.isOnboarded; PATCH can set it.

ALTER TABLE users
  ADD COLUMN is_onboarded TINYINT(1) NOT NULL DEFAULT 0
  COMMENT 'True after user completes categories + artists onboarding';
