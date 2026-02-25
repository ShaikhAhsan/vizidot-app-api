-- Add thumbnail URL column for profile images (Firebase Storage).
-- Run once: mysql -h HOST -u USER -p DB < add_profile_image_thumb.sql

ALTER TABLE users
ADD COLUMN profile_image_thumb VARCHAR(500) NULL
COMMENT 'Thumbnail URL for profile image (Firebase Storage)' AFTER profile_image;
