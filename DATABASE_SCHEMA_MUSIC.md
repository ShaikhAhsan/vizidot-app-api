# Music Platform – Database Schema Reference

This document reflects the **current database** (from `schema.sql`). Tables and columns below match what the API expects.

---

## Tables in database (14)

| Table              | Purpose |
|--------------------|---------|
| artists            | Artist profile (name, bio, country, dob, image_url, shop_id, is_active, is_deleted) |
| albums             | Albums (artist_id, branding_id, title, album_type, cover_image_url, default_track_thumbnail, is_active, …) |
| audio_tracks       | Audio tracks per album (title, duration, audio_url, thumbnail_url, track_number, …) |
| video_tracks       | Video tracks per album (title, duration, video_url, thumbnail_url, resolution, …) |
| artist_brandings   | Brandings (branding_name, logo_url, tagline, background_color, artist_id, …) |
| artist_shops       | Shops (shop_name, shop_url, artist_id, branding_id, …) |
| album_artists      | Album ↔ artist (collaborators; role) |
| branding_artists   | Branding ↔ artist (many-to-many) |
| shop_artists       | Shop ↔ artist (many-to-many) |
| track_artists      | Track ↔ artist (track_type: audio/video, track_id, artist_id, role) |
| user_artists       | User ↔ artist (assigned admins / “following”) |
| users              | Users (firebase_uid, email, first_name, last_name, primary_role, …) |
| roles              | Roles (name, display_name, type, level, permissions) |
| user_roles         | User ↔ role (with business_id, expires_at) |

---

## Key columns (from schema.sql)

**artists**  
`artist_id`, `name`, `bio`, `country`, `dob`, `image_url`, `shop_id`, `is_active`, `is_deleted`, `deleted_at`, `created_at`, `updated_at`

**albums**  
`album_id`, `artist_id`, `branding_id`, `title`, `description`, `album_type` (audio/video), `release_date`, `cover_image_url`, `default_track_thumbnail`, `is_active`, `is_deleted`, …

**audio_tracks**  
`audio_id`, `album_id`, `title`, `duration` (seconds), `audio_url`, `thumbnail_url`, `track_number`, …

**video_tracks**  
`video_id`, `album_id`, `title`, `duration`, `video_url`, `thumbnail_url`, `resolution`, `track_number`, …

---

## Optional: `artist_followers`

Used for **follow counts** on artist profile and follow/unfollow APIs. Create the table with:

```bash
node scripts/createArtistFollowersTable.js
```

Or run the equivalent SQL (see script for full `CREATE TABLE` with FKs to `users` and `artists`). After the table exists, `GET /api/v1/music/artists/profile/:id` returns real `followersCount`, and authenticated users can `POST/DELETE /api/v1/music/artists/:id/follow`.

---

## Regenerating schema from DB

From project root:

```bash
node scripts/getCreateTables.js schema.sql
```

Uses `.env` or `env.example` for DB connection.
