# API and Database Gaps

Based on schema.sql. Public APIs: GET .../music/artists/profile/:id, GET .../music/artists/public, GET .../music/albums/profile/:id. All implemented in routes/music.js.

Artist model has country, dob; DB matches.

## Optional: real follower counts

Profile API returns followersCount 0. To support real counts, run:

```sql
CREATE TABLE IF NOT EXISTS artist_followers (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  artist_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_artist (user_id, artist_id),
  KEY idx_artist (artist_id),
  CONSTRAINT af_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT af_artist FOREIGN KEY (artist_id) REFERENCES artists (artist_id) ON DELETE CASCADE
);
```

Then update the artist profile route to COUNT rows where artist_id = :id.

## Summary

All public music APIs (artist profile, list artists, album profile) exist. DB and models align. Only common missing piece is artist_followers for follower counts.
