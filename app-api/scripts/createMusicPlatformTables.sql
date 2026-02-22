/* ============================================================
   🚀 SYSTEM INITIALIZATION FOR MUSIC PLATFORM
   This script creates all necessary tables with:
   - Soft delete support
   - Full normalization
   - Collaborations
   - Branding + Shops
   - Album & Tracks (audio + video)
   ============================================================ */

SET FOREIGN_KEY_CHECKS = 0;

/* ============================================================
   1️⃣ ARTISTS TABLE
   ============================================================ */

CREATE TABLE IF NOT EXISTS artists (
    artist_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    bio TEXT NULL,
    country VARCHAR(120) NULL,
    dob DATE NULL,
    image_url VARCHAR(500) NULL,
    -- SOFT DELETE
    is_deleted TINYINT(1) DEFAULT 0,
    deleted_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_artist_name (name),
    INDEX idx_artist_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ============================================================
   2️⃣ ARTIST BRANDINGS
   ============================================================ */

CREATE TABLE IF NOT EXISTS artist_brandings (
    branding_id INT AUTO_INCREMENT PRIMARY KEY,
    artist_id INT NOT NULL,
    branding_name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(500),
    tagline VARCHAR(255),
    -- SOFT DELETE
    is_deleted TINYINT(1) DEFAULT 0,
    deleted_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (artist_id) REFERENCES artists(artist_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_branding_artist (artist_id),
    INDEX idx_branding_name (branding_name),
    INDEX idx_branding_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ============================================================
   3️⃣ ARTIST SHOPS
   ============================================================ */

CREATE TABLE IF NOT EXISTS artist_shops (
    shop_id INT AUTO_INCREMENT PRIMARY KEY,
    artist_id INT NOT NULL,
    branding_id INT NULL,
    shop_name VARCHAR(255) NOT NULL,
    shop_url VARCHAR(500) NOT NULL,
    description TEXT,
    -- SOFT DELETE
    is_deleted TINYINT(1) DEFAULT 0,
    deleted_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (artist_id) REFERENCES artists(artist_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (branding_id) REFERENCES artist_brandings(branding_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_shop_artist (artist_id),
    INDEX idx_shop_branding (branding_id),
    INDEX idx_shop_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ============================================================
   4️⃣ ALBUMS (Audio + Video)
   ============================================================ */

CREATE TABLE IF NOT EXISTS albums (
    album_id INT AUTO_INCREMENT PRIMARY KEY,
    artist_id INT NOT NULL,
    branding_id INT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    album_type ENUM('audio','video') NOT NULL,
    release_date DATE NULL,
    cover_image_url VARCHAR(500),
    -- SOFT DELETE
    is_deleted TINYINT(1) DEFAULT 0,
    deleted_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (artist_id) REFERENCES artists(artist_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (branding_id) REFERENCES artist_brandings(branding_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_album_artist (artist_id),
    INDEX idx_album_type (album_type),
    INDEX idx_album_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ============================================================
   5️⃣ AUDIO TRACKS
   ============================================================ */

CREATE TABLE IF NOT EXISTS audio_tracks (
    audio_id INT AUTO_INCREMENT PRIMARY KEY,
    album_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    duration INT NULL COMMENT 'Duration in seconds',
    audio_url VARCHAR(500),
    track_number INT DEFAULT 1,
    -- SOFT DELETE
    is_deleted TINYINT(1) DEFAULT 0,
    deleted_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (album_id) REFERENCES albums(album_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_audio_album (album_id),
    INDEX idx_audio_deleted (is_deleted),
    INDEX idx_audio_track_number (track_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ============================================================
   6️⃣ VIDEO TRACKS
   ============================================================ */

CREATE TABLE IF NOT EXISTS video_tracks (
    video_id INT AUTO_INCREMENT PRIMARY KEY,
    album_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    duration INT NULL COMMENT 'Duration in seconds',
    video_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    resolution VARCHAR(20),
    track_number INT DEFAULT 1,
    -- SOFT DELETE
    is_deleted TINYINT(1) DEFAULT 0,
    deleted_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (album_id) REFERENCES albums(album_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_video_album (album_id),
    INDEX idx_video_deleted (is_deleted),
    INDEX idx_video_track_number (track_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ============================================================
   7️⃣ COLLABORATION — ALBUM LEVEL
   ============================================================ */

CREATE TABLE IF NOT EXISTS album_artists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    album_id INT NOT NULL,
    artist_id INT NOT NULL,
    role VARCHAR(255) COMMENT 'e.g., Featured, Producer, Writer',
    -- SOFT DELETE
    is_deleted TINYINT(1) DEFAULT 0,
    deleted_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (album_id) REFERENCES albums(album_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (artist_id) REFERENCES artists(artist_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY unique_album_artist (album_id, artist_id),
    INDEX idx_album_collab (album_id),
    INDEX idx_artist_collab (artist_id),
    INDEX idx_collab_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ============================================================
   8️⃣ COLLABORATION — TRACK LEVEL
   ============================================================ */

CREATE TABLE IF NOT EXISTS track_artists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    track_type ENUM('audio','video') NOT NULL,
    track_id INT NOT NULL COMMENT 'References audio_id or video_id based on track_type',
    artist_id INT NOT NULL,
    role VARCHAR(255) COMMENT 'e.g., Featured, Producer, Writer',
    -- SOFT DELETE
    is_deleted TINYINT(1) DEFAULT 0,
    deleted_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (artist_id) REFERENCES artists(artist_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_track_type (track_type),
    INDEX idx_track_id (track_id),
    INDEX idx_track_artist (artist_id),
    INDEX idx_track_collab_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

