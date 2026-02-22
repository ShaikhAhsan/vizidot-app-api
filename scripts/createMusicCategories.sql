-- Create music_categories table and seed data.
-- Run this in MySQL (or use the .js scripts: createMusicCategoriesTable.js then seedMusicCategories.js).

-- 1) Create table
CREATE TABLE IF NOT EXISTS music_categories (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  image_url VARCHAR(500) DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_music_category_slug (slug),
  INDEX idx_music_categories_active (is_active),
  INDEX idx_music_categories_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Insert all categories (run after table exists)
INSERT IGNORE INTO music_categories (name, slug, sort_order, is_active) VALUES
('Country',   'country',   1, 1),
('Hip-Hop',   'hip-hop',   2, 1),
('Hard Rock', 'hard-rock', 3, 1),
('Indie',     'indie',     4, 1),
('Chill out', 'chill-out', 5, 1),
('R&B',       'rnb',       6, 1),
('Pop',       'pop',       7, 1),
('Metallic',  'metallic',  8, 1),
('Rock',      'rock',      9, 1);
