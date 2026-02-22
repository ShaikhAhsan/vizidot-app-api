-- Add is_featured and is_rising_star to artists table for E-locker. Run once.
-- After running: restart the API server so GET /api/v1/music/elocker returns data.
-- Then set is_featured=1 and/or is_rising_star=1 for artists in your DB (e.g. UPDATE artists SET is_featured=1 WHERE artist_id IN (1,2,3);).

ALTER TABLE artists
  ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Show in E-locker Featured section',
  ADD COLUMN is_rising_star TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Show in E-locker Rising Stars section';

-- Optional: add indexes if you query by these flags often
-- CREATE INDEX idx_artists_featured ON artists (is_featured);
-- CREATE INDEX idx_artists_rising_star ON artists (is_rising_star);
