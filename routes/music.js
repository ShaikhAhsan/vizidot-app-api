const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { Artist, ArtistFollower, Album, AudioTrack, VideoTrack, ArtistShop, UserFavourite, PlayHistory, MusicCategory, UserMusicCategory } = require('../models');
const { authenticateToken, optionalAuth } = require('../middleware/authWithRoles');

function formatDuration(seconds) {
  if (seconds == null || isNaN(seconds)) return null;
  const m = Math.floor(Number(seconds) / 60);
  const s = Math.floor(Number(seconds) % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Confirm music router is mounted: GET /api/v1/music
const VALID_ENTITY_TYPES = ['album', 'track', 'video'];

router.get('/', (req, res) => {
  res.json({
    api: 'app',
    module: 'music',
    endpoints: [
      'GET /home',
      'GET /elocker',
      'GET /categories',
      'POST /categories/selected',
      'GET /artists',
      'POST /artists/selected',
      'GET /search',
      'GET /audio-tracks',
      'GET /artists/profile/:id',
      'GET /albums/:id',
      'POST /artists/:id/follow',
      'DELETE /artists/:id/follow',
      'POST /favourites',
      'DELETE /favourites/:type/:id',
      'GET /favourites',
      'GET /favourites/check',
      'POST /play-history',
      'GET /play-history/top'
    ]
  });
});

/**
 * GET /api/v1/music/categories
 * List all active music categories (genres). Public. Returns id, name, slug, image_url, sort_order.
 * If music_categories table does not exist, returns empty list (run scripts/createMusicCategoriesTable.js and seedMusicCategories.js).
 */
router.get('/categories', async (req, res) => {
  try {
    const rows = await MusicCategory.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC'], ['name', 'ASC']],
      attributes: ['id', 'name', 'slug', 'image_url', 'sort_order']
    });
    const categories = rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      imageUrl: r.image_url || null,
      sortOrder: r.sort_order
    }));
    return res.json({ success: true, data: { categories } });
  } catch (err) {
    const noTable = err.name === 'SequelizeDatabaseError' &&
      (err.original?.code === 'ER_NO_SUCH_TABLE' || /doesn't exist/i.test(err.message || ''));
    if (noTable) {
      console.warn('music_categories table missing. Run: node scripts/createMusicCategoriesTable.js && node scripts/seedMusicCategories.js');
      return res.json({ success: true, data: { categories: [] } });
    }
    console.error('List categories error:', err);
    return res.status(500).json({ success: false, error: 'Could not list categories' });
  }
});

/**
 * POST /api/v1/music/categories/selected
 * Save logged-in user's selected category ids. Body: { categoryIds: number[] }. Auth required.
 * Replaces existing selections for the user.
 */
router.post('/categories/selected', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.userId ?? null;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const categoryIds = req.body?.categoryIds;
    if (!Array.isArray(categoryIds)) {
      return res.status(400).json({ success: false, error: 'categoryIds must be an array' });
    }
    const ids = [...new Set(categoryIds)].filter((id) => Number.isInteger(id) && id > 0);
    await UserMusicCategory.destroy({ where: { user_id: userId } });
    if (ids.length > 0) {
      await UserMusicCategory.bulkCreate(
        ids.map((music_category_id) => ({ user_id: userId, music_category_id }))
      );
    }
    return res.json({ success: true, data: { categoryIds: ids } });
  } catch (err) {
    const noTable = err.name === 'SequelizeDatabaseError' &&
      (err.original?.code === 'ER_NO_SUCH_TABLE' || /doesn't exist/i.test(err.message || ''));
    if (noTable) {
      return res.status(503).json({ success: false, error: 'User categories not available' });
    }
    console.error('Save user categories error:', err);
    return res.status(500).json({ success: false, error: 'Could not save categories' });
  }
});

/**
 * Helper: get top played entity ids from play_history by type. Returns [] if table missing or no data.
 */
async function getTopPlayedIds(entityType, limit = 10) {
  try {
    const rows = await sequelize.query(
      `SELECT entity_id, COUNT(*) AS play_count
       FROM play_history
       WHERE entity_type = :type
       GROUP BY entity_id
       ORDER BY play_count DESC
       LIMIT :limit`,
      { replacements: { type: entityType, limit }, type: sequelize.QueryTypes.SELECT }
    );
    return (Array.isArray(rows) ? rows : []).map((r) => r.entity_id);
  } catch (err) {
    console.error('getTopPlayedIds error:', err.message);
    return [];
  }
}

/**
 * Home: get top N album IDs (audio) ordered by total plays of their tracks, then album_id DESC.
 */
async function getTopAudioAlbumIds(limit = 10) {
  try {
    const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 10), 50);
    const rows = await sequelize.query(
      `SELECT a.album_id
       FROM albums a
       INNER JOIN audio_tracks t ON t.album_id = a.album_id
       LEFT JOIN (
         SELECT entity_id, COUNT(*) AS cnt
         FROM play_history
         WHERE entity_type = 'audio'
         GROUP BY entity_id
       ) ph ON ph.entity_id = t.audio_id
       GROUP BY a.album_id
       ORDER BY COALESCE(SUM(ph.cnt), 0) DESC, a.album_id DESC
       LIMIT ${safeLimit}`,
      { type: sequelize.QueryTypes.SELECT }
    );
    return (Array.isArray(rows) ? rows : []).map((r) => r.album_id);
  } catch (err) {
    console.error('getTopAudioAlbumIds error:', err.message);
    return [];
  }
}

/**
 * Home: for each album_id, the audio_id that was played most in that album; if 0 plays, any track from album.
 * Returns audio_ids in the same order as albumIds.
 */
async function getBestAudioIdPerAlbums(albumIds) {
  if (!albumIds || albumIds.length === 0) return [];
  try {
    const playCounts = await sequelize.query(
      `SELECT entity_id AS audio_id, COUNT(*) AS plays
       FROM play_history
       WHERE entity_type = 'audio'
       GROUP BY entity_id`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const playsByTrack = new Map((Array.isArray(playCounts) ? playCounts : []).map((r) => [r.audio_id, r.plays]));

    const tracks = await sequelize.query(
      `SELECT audio_id, album_id FROM audio_tracks WHERE album_id IN (:albumIds)`,
      { replacements: { albumIds }, type: sequelize.QueryTypes.SELECT }
    );
    const byAlbum = new Map();
    for (const t of Array.isArray(tracks) ? tracks : []) {
      const list = byAlbum.get(t.album_id) || [];
      list.push({ audio_id: t.audio_id, plays: playsByTrack.get(t.audio_id) || 0 });
      byAlbum.set(t.album_id, list);
    }
    const bestPerAlbum = new Map();
    for (const [albumId, list] of byAlbum) {
      const best = list.sort((a, b) => b.plays - a.plays || a.audio_id - b.audio_id)[0];
      bestPerAlbum.set(albumId, best.audio_id);
    }
    return albumIds.map((aid) => bestPerAlbum.get(aid)).filter(Boolean);
  } catch (err) {
    console.error('getBestAudioIdPerAlbums error:', err.message);
    return [];
  }
}

/**
 * Home: get top N album IDs (video) ordered by total plays of their videos, then album_id DESC.
 */
async function getTopVideoAlbumIds(limit = 10) {
  try {
    const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 10), 50);
    const rows = await sequelize.query(
      `SELECT a.album_id
       FROM albums a
       INNER JOIN video_tracks t ON t.album_id = a.album_id
       LEFT JOIN (
         SELECT entity_id, COUNT(*) AS cnt
         FROM play_history
         WHERE entity_type = 'video'
         GROUP BY entity_id
       ) ph ON ph.entity_id = t.video_id
       GROUP BY a.album_id
       ORDER BY COALESCE(SUM(ph.cnt), 0) DESC, a.album_id DESC
       LIMIT ${safeLimit}`,
      { type: sequelize.QueryTypes.SELECT }
    );
    return (Array.isArray(rows) ? rows : []).map((r) => r.album_id);
  } catch (err) {
    console.error('getTopVideoAlbumIds error:', err.message);
    return [];
  }
}

/**
 * Home: for each album_id, the video_id that was played most in that album; if 0 plays, any video from album.
 */
async function getBestVideoIdPerAlbums(albumIds) {
  if (!albumIds || albumIds.length === 0) return [];
  try {
    const playCounts = await sequelize.query(
      `SELECT entity_id AS video_id, COUNT(*) AS plays
       FROM play_history
       WHERE entity_type = 'video'
       GROUP BY entity_id`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const playsByVideo = new Map((Array.isArray(playCounts) ? playCounts : []).map((r) => [r.video_id, r.plays]));

    const videos = await sequelize.query(
      `SELECT video_id, album_id FROM video_tracks WHERE album_id IN (:albumIds)`,
      { replacements: { albumIds }, type: sequelize.QueryTypes.SELECT }
    );
    const byAlbum = new Map();
    for (const v of Array.isArray(videos) ? videos : []) {
      const list = byAlbum.get(v.album_id) || [];
      list.push({ video_id: v.video_id, plays: playsByVideo.get(v.video_id) || 0 });
      byAlbum.set(v.album_id, list);
    }
    const bestPerAlbum = new Map();
    for (const [albumId, list] of byAlbum) {
      const best = list.sort((a, b) => b.plays - a.plays || a.video_id - b.video_id)[0];
      bestPerAlbum.set(albumId, best.video_id);
    }
    return albumIds.map((aid) => bestPerAlbum.get(aid)).filter(Boolean);
  } catch (err) {
    console.error('getBestVideoIdPerAlbums error:', err.message);
    return [];
  }
}

/**
 * Force this connection to use the configured database (fixes sessions that don't default to it).
 */
async function ensureDatabase() {
  const name = sequelize.config.database;
  if (!name) return;
  const escaped = name.replace(/`/g, '``');
  await sequelize.query(`USE \`${escaped}\``);
}

/**
 * Database prefix for raw SQL (qualified names). Escape backticks in name.
 */
function db() {
  const name = sequelize.config.database;
  return name ? `\`${name.replace(/`/g, '``')}\`.` : '';
}

async function getLatestAudioItemsRaw(limit) {
  try {
    const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 10), 50);
    // QueryTypes.SELECT returns the rows array directly (not [rows, metadata])
    const rows = await sequelize.query(
      `SELECT t.audio_id AS id, t.title, t.thumbnail_url AS albumArt, t.audio_url AS audioUrl, t.duration, t.album_id AS albumId,
              a.cover_image_url AS albumCover,
              ar.artist_id AS artistId, ar.name AS artistName
       FROM audio_tracks t
       LEFT JOIN albums a ON a.album_id = t.album_id
       LEFT JOIN artists ar ON ar.artist_id = a.artist_id
       ORDER BY t.audio_id DESC
       LIMIT ${safeLimit}`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const items = (Array.isArray(rows) ? rows : []).map((r) => ({
      id: r.id,
      title: r.title || '',
      artistName: r.artistName || '',
      albumArt: r.albumArt || r.albumCover || null,
      audioUrl: r.audioUrl || null,
      durationFormatted: formatDuration(r.duration),
      artistId: r.artistId ?? null,
      albumId: r.albumId ?? null
    }));
    console.log('[Home API] getLatestAudioItemsRaw returned', items.length, 'audio items');
    return items;
  } catch (err) {
    console.error('getLatestAudioItemsRaw error:', err.message);
    return [];
  }
}

/**
 * Fallback: get latest video tracks with full details via raw SQL.
 */
async function getLatestVideoItemsRaw(limit) {
  try {
    const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 10), 50);
    // QueryTypes.SELECT returns the rows array directly (not [rows, metadata])
    const rows = await sequelize.query(
      `SELECT t.video_id AS id, t.title, t.thumbnail_url AS albumArt, t.video_url AS videoUrl, t.duration, t.album_id AS albumId,
              a.cover_image_url AS albumCover,
              ar.artist_id AS artistId, ar.name AS artistName
       FROM video_tracks t
       LEFT JOIN albums a ON a.album_id = t.album_id
       LEFT JOIN artists ar ON ar.artist_id = a.artist_id
       ORDER BY t.video_id DESC
       LIMIT ${safeLimit}`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const items = (Array.isArray(rows) ? rows : []).map((r) => ({
      id: r.id,
      title: r.title || '',
      artistName: r.artistName || '',
      albumArt: r.albumArt || r.albumCover || null,
      videoUrl: r.videoUrl || null,
      durationFormatted: formatDuration(r.duration),
      artistId: r.artistId ?? null,
      albumId: r.albumId ?? null
    }));
    console.log('[Home API] getLatestVideoItemsRaw returned', items.length, 'video items');
    return items;
  } catch (err) {
    console.error('getLatestVideoItemsRaw error:', err.message);
    return [];
  }
}

/**
 * Fetch user's favourites by type (track|video|album), limit 10, enriched. Returns [] when not logged in or on error.
 */
async function getFavouritesForUser(userId, type, limit = 10) {
  if (!userId) return [];
  try {
    const list = await UserFavourite.findAll({
      where: { user_id: userId, entity_type: type },
      order: [['created_at', 'DESC']],
      attributes: ['id', 'entity_type', 'entity_id', 'created_at'],
      limit: Math.min(limit, 50)
    });
    return enrichFavouritesList(list);
  } catch (err) {
    console.error('getFavouritesForUser error:', err.message);
    return [];
  }
}

/**
 * Fetch user's followed artists (top N). Returns [] when not logged in or on error.
 */
async function getFollowedArtistsForUser(userId, limit = 10) {
  if (!userId) return [];
  try {
    const rows = await ArtistFollower.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      attributes: ['artist_id', 'created_at'],
      limit: Math.min(limit, 50),
      include: [{ model: Artist, as: 'artist', attributes: ['artist_id', 'name', 'image_url'], required: true }]
    });
    return rows
      .filter((r) => r.artist)
      .map((r) => ({
        artistId: r.artist.artist_id,
        name: r.artist.name ?? '',
        imageUrl: r.artist.image_url ?? null
      }));
  } catch (err) {
    console.error('getFollowedArtistsForUser error:', err.message);
    return [];
  }
}

/**
 * GET /api/v1/music/home
 * Home API: one top song per album (most played); same for videos. Fallback to latest when no albums.
 * When user is logged in (optionalAuth), includes favouriteAudios, favouriteVideos, favouriteAlbums (top 10 each).
 */
router.get('/home', optionalAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const userId = req.user?.id ?? req.userId ?? null;
    let topAudios = [];
    let topVideos = [];
    let favouriteAudios = [];
    let favouriteVideos = [];
    let favouriteAlbums = [];
    let favouriteArtists = [];

    const [audioAlbumIds, videoAlbumIds] = await Promise.all([
      getTopAudioAlbumIds(limit),
      getTopVideoAlbumIds(limit)
    ]);

    const [audioIds, videoIds] = await Promise.all([
      getBestAudioIdPerAlbums(audioAlbumIds),
      getBestVideoIdPerAlbums(videoAlbumIds)
    ]);

    if (audioIds.length > 0) {
      topAudios = await enrichAudioItems(audioIds);
    }
    if (videoIds.length > 0) {
      topVideos = await enrichVideoItems(videoIds);
    }

    if (topAudios.length === 0) {
      topAudios = await getLatestAudioItemsRaw(limit);
    }
    if (topVideos.length === 0) {
      topVideos = await getLatestVideoItemsRaw(limit);
    }

    if (userId) {
      [favouriteAudios, favouriteVideos, favouriteAlbums, favouriteArtists] = await Promise.all([
        getFavouritesForUser(userId, 'track', 10),
        getFavouritesForUser(userId, 'video', 10),
        getFavouritesForUser(userId, 'album', 10),
        getFollowedArtistsForUser(userId, 10)
      ]);
    }

    const payload = {
      success: true,
      data: {
        topAudios,
        topVideos,
        favouriteAudios,
        favouriteVideos,
        favouriteAlbums,
        favouriteArtists
      }
    };
    if (topAudios.length === 0 && topVideos.length === 0) {
      try {
        const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 10), 50);
        const queryCountAudio = 'SELECT COUNT(*) AS c FROM audio_tracks';
        const queryCountVideo = 'SELECT COUNT(*) AS c FROM video_tracks';
        const queryAudio = `SELECT t.audio_id AS id, t.title, t.thumbnail_url AS albumArt, t.audio_url AS audioUrl, t.duration, t.album_id AS albumId,
              a.cover_image_url AS albumCover,
              ar.artist_id AS artistId, ar.name AS artistName
       FROM audio_tracks t
       LEFT JOIN albums a ON a.album_id = t.album_id
       LEFT JOIN artists ar ON ar.artist_id = a.artist_id
       ORDER BY t.audio_id DESC
       LIMIT ${safeLimit}`;
        const queryVideo = `SELECT t.video_id AS id, t.title, t.thumbnail_url AS albumArt, t.video_url AS videoUrl, t.duration, t.album_id AS albumId,
              a.cover_image_url AS albumCover,
              ar.artist_id AS artistId, ar.name AS artistName
       FROM video_tracks t
       LEFT JOIN albums a ON a.album_id = t.album_id
       LEFT JOIN artists ar ON ar.artist_id = a.artist_id
       ORDER BY t.video_id DESC
       LIMIT ${safeLimit}`;
        const dbRows = await sequelize.query('SELECT DATABASE() AS db', { type: sequelize.QueryTypes.SELECT });
        const audioRows = await sequelize.query(queryCountAudio, { type: sequelize.QueryTypes.SELECT });
        const videoRows = await sequelize.query(queryCountVideo, { type: sequelize.QueryTypes.SELECT });
        const ac = Number(Array.isArray(audioRows) && audioRows[0] && audioRows[0].c) || 0;
        const vc = Number(Array.isArray(videoRows) && videoRows[0] && videoRows[0].c) || 0;
        const currentDb = Array.isArray(dbRows) && dbRows[0] ? (dbRows[0].db ?? dbRows[0].DB) : null;
        payload.data._debug = {
          audio_tracks_count: ac,
          video_tracks_count: vc,
          query_count_audio: queryCountAudio,
          query_count_video: queryCountVideo,
          query_fallback_audio: queryAudio,
          query_fallback_video: queryVideo,
          app_connected_to: {
            host: sequelize.config.host,
            database: sequelize.config.database,
            user: sequelize.config.username
          },
          current_database: currentDb,
          hint: ac === 0 && vc === 0
            ? 'Tables are empty — add tracks via admin or seed. Confirm your manual client uses the same host + database as app_connected_to.'
            : 'Rows exist but fallback returned nothing — check server logs for SQL errors.'
        };
      } catch (e) {
        payload.data._debug = { error: e.message, hint: 'Check if audio_tracks/video_tracks tables exist.' };
      }
    }
    return res.json(payload);
  } catch (err) {
    console.error('Home API error:', err);
    return res.status(500).json({ success: false, error: 'Could not fetch home data' });
  }
});

/**
 * GET /api/v1/music/audio-tracks
 * Fetch audio tracks (default 10). Query: limit (1–50). Public.
 */
router.get('/audio-tracks', async (req, res) => {
  try {
    const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 10), 50);
    const tracks = await AudioTrack.findAll({
      limit,
      order: [['audio_id', 'DESC']],
      include: [{ model: Album, as: 'album', attributes: ['album_id', 'title', 'cover_image_url'], include: [{ model: Artist, as: 'artist', attributes: ['artist_id', 'name'] }] }]
    });
    const items = (tracks || []).map((t) => {
      const album = t.album;
      const artistName = album?.artist?.name ?? '';
      return {
        id: t.audio_id,
        title: t.title,
        artistName,
        albumArt: t.thumbnail_url || album?.cover_image_url || null,
        audioUrl: t.audio_url || null,
        durationFormatted: formatDuration(t.duration),
        artistId: album?.artist?.artist_id ?? null,
        albumId: t.album_id
      };
    });
    return res.json({ success: true, data: { tracks: items } });
  } catch (err) {
    console.error('GET /audio-tracks error:', err);
    return res.status(500).json({ success: false, error: 'Could not fetch audio tracks' });
  }
});

async function enrichAudioItems(ids) {
  if (!ids || ids.length === 0) return [];
  const tracks = await AudioTrack.unscoped().findAll({
    where: { audio_id: ids },
    include: [{ model: Album, as: 'album', attributes: ['album_id', 'title', 'cover_image_url'], include: [{ model: Artist, as: 'artist', attributes: ['artist_id', 'name'] }] }]
  });
  const byId = new Map(tracks.map((t) => [t.audio_id, t]));
  return ids.map((id) => byId.get(id)).filter(Boolean).map((t) => {
    const album = t.album;
    const artistName = album?.artist?.name ?? '';
    return {
      id: t.audio_id,
      title: t.title,
      artistName,
      albumArt: t.thumbnail_url || album?.cover_image_url || null,
      audioUrl: t.audio_url || null,
      durationFormatted: formatDuration(t.duration),
      artistId: album?.artist?.artist_id ?? null,
      albumId: t.album_id
    };
  });
}

async function enrichVideoItems(ids) {
  if (!ids || ids.length === 0) return [];
  const videos = await VideoTrack.unscoped().findAll({
    where: { video_id: ids },
    include: [{ model: Album, as: 'album', attributes: ['album_id', 'title', 'cover_image_url'], include: [{ model: Artist, as: 'artist', attributes: ['artist_id', 'name'] }] }]
  });
  const byId = new Map(videos.map((v) => [v.video_id, v]));
  return ids.map((id) => byId.get(id)).filter(Boolean).map((v) => {
    const album = v.album;
    const artistName = album?.artist?.name ?? '';
    return {
      id: v.video_id,
      title: v.title,
      artistName,
      albumArt: v.thumbnail_url || album?.cover_image_url || null,
      videoUrl: v.video_url || null,
      durationFormatted: formatDuration(v.duration),
      artistId: album?.artist?.artist_id ?? null,
      albumId: v.album_id
    };
  });
}

/**
 * GET /api/v1/music/albums/:id
 * Album detail: album info + tracks (audio or video by album_type). Public.
 */
router.get('/albums/:id', async (req, res) => {
  try {
    const albumId = parseInt(req.params.id, 10);
    if (Number.isNaN(albumId) || albumId < 1) {
      return res.status(400).json({ success: false, error: 'Invalid album id' });
    }

    const album = await Album.findByPk(albumId, {
      include: [{ model: Artist, as: 'artist', attributes: ['artist_id', 'name'] }]
    });
    if (!album || !album.is_active) {
      return res.status(404).json({ success: false, error: 'Album not found' });
    }

    const artistName = album.artist?.name || '';
    const albumType = String(album.album_type || '').toLowerCase();
    const isVideo = albumType === 'video';

    let tracks = [];
    if (isVideo) {
      const videoTracks = await VideoTrack.findAll({
        where: { album_id: albumId },
        order: [['track_number', 'ASC'], ['video_id', 'ASC']]
      });
      tracks = videoTracks.map((t) => ({
        id: t.video_id,
        title: t.title,
        durationFormatted: formatDuration(t.duration),
        durationSeconds: t.duration ?? null,
        albumArt: t.thumbnail_url ?? album.cover_image_url ?? null,
        artistName,
        videoUrl: t.video_url ?? null,
        albumId: t.album_id,
        type: 'video'
      }));
    } else {
      const audioTracks = await AudioTrack.findAll({
        where: { album_id: albumId },
        order: [['track_number', 'ASC'], ['audio_id', 'ASC']]
      });
      tracks = audioTracks.map((t) => ({
        id: t.audio_id,
        title: t.title,
        durationFormatted: formatDuration(t.duration),
        durationSeconds: t.duration ?? null,
        albumArt: t.thumbnail_url ?? album.cover_image_url ?? null,
        artistName,
        audioUrl: t.audio_url ?? null,
        albumId: t.album_id,
        type: 'audio'
      }));
    }

    const releaseYear = album.release_date
      ? String(album.release_date).slice(0, 4)
      : null;
    const totalSeconds = tracks.reduce((sum, t) => sum + (t.durationSeconds || 0), 0);
    const totalMins = Math.floor(totalSeconds / 60);
    const totalDurationFormatted =
      totalMins >= 60 ? `${Math.floor(totalMins / 60)}h ${totalMins % 60}min` : `${totalMins} min`;

    return res.json({
      success: true,
      data: {
        album: {
          id: album.album_id,
          title: album.title,
          description: album.description ?? null,
          coverImageUrl: album.cover_image_url ?? null,
          artistId: album.artist_id,
          artistName,
          albumType: isVideo ? 'video' : 'audio',
          releaseDate: album.release_date,
          releaseYear,
          trackCount: tracks.length,
          totalDurationFormatted
        },
        tracks
      }
    });
  } catch (err) {
    console.error('Album detail error:', err);
    return res.status(500).json({ success: false, error: 'Could not load album' });
  }
});

/**
 * GET /api/v1/music/elocker
 * E-locker screen: featured artists and rising star artists. Public.
 * Uses artists.is_featured and artists.is_rising_star. Run scripts/addArtistFeaturedRisingStar.sql to add columns.
 */
router.get('/elocker', async (req, res) => {
  try {
    const [featuredRows, risingRows] = await Promise.all([
      Artist.findAll({
        where: { is_active: true, is_featured: true },
        order: [['name', 'ASC'], ['artist_id', 'ASC']],
        attributes: ['artist_id', 'name', 'image_url']
      }),
      Artist.findAll({
        where: { is_active: true, is_rising_star: true },
        order: [['name', 'ASC'], ['artist_id', 'ASC']],
        attributes: ['artist_id', 'name', 'image_url']
      })
    ]);
    const featuredArtists = featuredRows.map((r) => ({
      id: r.artist_id,
      name: r.name ?? '',
      imageUrl: r.image_url ?? null
    }));
    const risingStarArtists = risingRows.map((r) => ({
      id: r.artist_id,
      name: r.name ?? '',
      imageUrl: r.image_url ?? null
    }));
    return res.json({
      success: true,
      data: { featuredArtists, risingStarArtists }
    });
  } catch (err) {
    const noCol = err.name === 'SequelizeDatabaseError' && /Unknown column 'is_featured'|Unknown column 'is_rising_star'/.test(err.message || '');
    if (noCol) {
      console.warn('E-locker: run scripts/addArtistFeaturedRisingStar.sql to add is_featured, is_rising_star to artists table.');
      return res.json({ success: true, data: { featuredArtists: [], risingStarArtists: [] } });
    }
    console.error('E-locker error:', err);
    return res.status(500).json({ success: false, error: 'Could not fetch elocker data' });
  }
});

/**
 * GET /api/v1/music/artists
 * List active artists with pagination. Public. Query: limit (default 20, max 100), offset (default 0).
 * Returns id, name, imageUrl for onboarding/selection UI.
 */
router.get('/artists', async (req, res) => {
  try {
    const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 20), 100);
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const { rows, count } = await Artist.findAndCountAll({
      where: { is_active: true },
      order: [['name', 'ASC'], ['artist_id', 'ASC']],
      attributes: ['artist_id', 'name', 'image_url'],
      limit,
      offset
    });
    const artists = rows.map((r) => ({
      id: r.artist_id,
      name: r.name ?? '',
      imageUrl: r.image_url ?? null
    }));
    return res.json({
      success: true,
      data: { artists, total: count, limit, offset }
    });
  } catch (err) {
    console.error('List artists error:', err);
    return res.status(500).json({ success: false, error: 'Could not list artists' });
  }
});

/**
 * POST /api/v1/music/artists/selected
 * Save logged-in user's selected artist ids (follow those artists). Body: { artistIds: number[] }. Auth required.
 * Creates follow records for each id; existing follows are left as-is.
 */
router.post('/artists/selected', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.userId ?? null;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const artistIds = req.body?.artistIds;
    if (!Array.isArray(artistIds)) {
      return res.status(400).json({ success: false, error: 'artistIds must be an array' });
    }
    const ids = [...new Set(artistIds)].filter((id) => Number.isInteger(id) && id > 0);
    let followed = 0;
    for (const artistId of ids) {
      const artist = await Artist.findByPk(artistId, { attributes: ['artist_id', 'is_active'] });
      if (!artist || !artist.is_active) continue;
      const [_, created] = await ArtistFollower.findOrCreate({
        where: { user_id: userId, artist_id: artistId },
        defaults: { user_id: userId, artist_id: artistId }
      });
      if (created) followed += 1;
    }
    return res.json({ success: true, data: { artistIds: ids, followed } });
  } catch (err) {
    console.error('Save selected artists error:', err);
    return res.status(500).json({ success: false, error: 'Could not save artist selection' });
  }
});

const SEARCH_TYPES = ['all', 'artists', 'albums', 'music', 'videos'];

/**
 * GET /api/v1/music/search
 * Single search API across artists, albums, music (audio), videos.
 * Query: q (optional), type (all|artists|albums|music|videos, default all), limit (default 20, max 50).
 * When q is empty, returns browse/featured (first N items per type). When q is set, filters by name/title.
 */
router.get('/search', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const type = SEARCH_TYPES.includes(req.query.type) ? req.query.type : 'all';
    const limit = Math.min(Math.max(5, parseInt(req.query.limit, 10) || 20), 50);
    const perType = type === 'all' ? Math.ceil(limit / 4) : limit;
    const results = [];
    const likePattern = q ? { [Op.like]: `%${q.replace(/%/g, '\\%')}%` } : null;

    if (type === 'all' || type === 'artists') {
      const where = { is_active: true };
      if (q) where.name = likePattern;
      const artists = await Artist.findAll({
        where,
        order: [['name', 'ASC']],
        attributes: ['artist_id', 'name', 'image_url'],
        limit: perType
      });
      artists.forEach((a) => {
        results.push({
          type: 'artist',
          id: a.artist_id,
          title: a.name ?? '',
          subtitle: 'Artist',
          imageUrl: a.image_url ?? null
        });
      });
    }

    if (type === 'all' || type === 'albums') {
      const albumWhere = { is_active: true };
      if (q) albumWhere.title = likePattern;
      const albums = await Album.findAll({
        where: albumWhere,
        attributes: ['album_id', 'title', 'cover_image_url', 'artist_id', 'album_type'],
        include: [{ model: Artist, as: 'artist', attributes: ['name'], required: true }],
        order: [['release_date', 'DESC'], ['album_id', 'DESC']],
        limit: perType
      });
      const albumIds = albums.map((a) => a.album_id);
      const countByAlbum = {};
      albumIds.forEach((id) => { countByAlbum[id] = { audio: 0, video: 0 }; });
      if (albumIds.length > 0) {
        const audioRows = await sequelize.query(
          'SELECT album_id, COUNT(*) AS c FROM audio_tracks WHERE album_id IN (?) GROUP BY album_id',
          { replacements: [albumIds], type: sequelize.QueryTypes.SELECT }
        ).then((r) => (Array.isArray(r) ? r : []));
        const videoRows = await sequelize.query(
          'SELECT album_id, COUNT(*) AS c FROM video_tracks WHERE album_id IN (?) GROUP BY album_id',
          { replacements: [albumIds], type: sequelize.QueryTypes.SELECT }
        ).then((r) => (Array.isArray(r) ? r : []));
        (audioRows || []).forEach((row) => { if (countByAlbum[row.album_id]) countByAlbum[row.album_id].audio = Number(row.c) || 0; });
        (videoRows || []).forEach((row) => { if (countByAlbum[row.album_id]) countByAlbum[row.album_id].video = Number(row.c) || 0; });
      }
      albums.forEach((a) => {
        const artistName = a.artist?.name ?? '';
        const counts = countByAlbum[a.album_id] || { audio: 0, video: 0 };
        const isVideo = (a.album_type || '').toLowerCase() === 'video';
        const trackCount = isVideo ? counts.video : counts.audio;
        const trackLabel = trackCount === 1 ? (isVideo ? '1 video' : '1 song') : (isVideo ? `${trackCount} videos` : `${trackCount} songs`);
        results.push({
          type: 'album',
          id: a.album_id,
          title: a.title ?? '',
          subtitle: artistName ? `Album · ${artistName}` : 'Album',
          imageUrl: a.cover_image_url ?? null,
          artistId: a.artist_id ?? null,
          trackCount,
          trackLabel,
          isVideo: isVideo
        });
      });
    }

    if (type === 'all' || type === 'music') {
      const trackWhere = { is_deleted: false };
      if (q) trackWhere.title = likePattern;
      const audios = await AudioTrack.unscoped().findAll({
        where: trackWhere,
        attributes: ['audio_id', 'title', 'duration', 'thumbnail_url', 'audio_url'],
        include: [
          { model: Album, as: 'album', attributes: ['album_id', 'title', 'cover_image_url', 'artist_id'], required: true, where: { is_active: true }, include: [{ model: Artist, as: 'artist', attributes: ['name'], required: false }] }
        ],
        order: [['audio_id', 'DESC']],
        limit: perType
      });
      audios.forEach((t) => {
        const album = t.album;
        const artistName = album?.artist?.name ?? '';
        results.push({
          type: 'music',
          id: t.audio_id,
          title: t.title ?? '',
          subtitle: artistName ? `${artistName} · ${album?.title ?? ''}` : (album?.title ?? 'Track'),
          imageUrl: t.thumbnail_url ?? album?.cover_image_url ?? null,
          albumId: album?.album_id ?? null,
          artistId: album?.artist_id ?? null,
          duration: t.duration ?? null,
          audioUrl: t.audio_url ?? null
        });
      });
    }

    if (type === 'all' || type === 'videos') {
      const videoWhere = { is_deleted: false };
      if (q) videoWhere.title = likePattern;
      const videos = await VideoTrack.unscoped().findAll({
        where: videoWhere,
        attributes: ['video_id', 'title', 'duration', 'thumbnail_url', 'video_url'],
        include: [
          { model: Album, as: 'album', attributes: ['album_id', 'title', 'cover_image_url', 'artist_id'], required: true, where: { is_active: true }, include: [{ model: Artist, as: 'artist', attributes: ['name'], required: false }] }
        ],
        order: [['video_id', 'DESC']],
        limit: perType
      });
      videos.forEach((t) => {
        const album = t.album;
        const artistName = album?.artist?.name ?? '';
        results.push({
          type: 'video',
          id: t.video_id,
          title: t.title ?? '',
          subtitle: artistName ? `${artistName} · ${album?.title ?? ''}` : (album?.title ?? 'Video'),
          imageUrl: t.thumbnail_url ?? album?.cover_image_url ?? null,
          albumId: album?.album_id ?? null,
          artistId: album?.artist_id ?? null,
          duration: t.duration ?? null,
          videoUrl: t.video_url ?? null
        });
      });
    }

    return res.json({ success: true, data: { results } });
  } catch (err) {
    console.error('Search error:', err);
    return res.status(500).json({ success: false, error: 'Could not search' });
  }
});

/**
 * GET /api/v1/music/artists/profile/:id
 * Public artist profile. If Authorization header is sent, response includes isFollowing (1/0) for current user.
 */
router.get('/artists/profile/:id', optionalAuth, async (req, res) => {
  try {
    const artistId = parseInt(req.params.id, 10);
    if (Number.isNaN(artistId) || artistId < 1) {
      return res.status(400).json({ success: false, error: 'Invalid artist id' });
    }

    const artist = await Artist.findByPk(artistId, {
      include: [{ model: ArtistShop, as: 'shop', required: false }]
    });
    if (!artist || !artist.is_active) {
      return res.status(404).json({ success: false, error: 'Artist not found' });
    }

    const userId = req.user?.id || req.userId;
    let isFollowing = 0;
    if (userId) {
      const followRow = await ArtistFollower.findOne({
        where: { user_id: userId, artist_id: artistId }
      });
      isFollowing = followRow ? 1 : 0;
    }

    const followersCount = await ArtistFollower.count({ where: { artist_id: artistId } });
    const followingCount = 0; // optional: count artists this user follows; not in schema for "artist follows X"

    const allAlbums = await Album.findAll({
      where: { artist_id: artistId, is_active: true },
      order: [['release_date', 'DESC'], ['album_id', 'ASC']]
    });
    const albumType = (a) => String(a.album_type || '').toLowerCase();
    const audioAlbums = allAlbums.filter((a) => albumType(a) === 'audio');
    const videoAlbums = allAlbums.filter((a) => albumType(a) === 'video');
    const audioAlbumIds = audioAlbums.map((a) => a.album_id);
    const videoAlbumIds = videoAlbums.map((a) => a.album_id);

    const audioTracks =
      audioAlbumIds.length > 0
        ? await AudioTrack.findAll({
            where: { album_id: { [Op.in]: audioAlbumIds } },
            order: [['album_id', 'ASC'], ['track_number', 'ASC'], ['audio_id', 'ASC']]
          })
        : [];
    const videoTracks =
      videoAlbumIds.length > 0
        ? await VideoTrack.findAll({
            where: { album_id: { [Op.in]: videoAlbumIds } },
            order: [['album_id', 'ASC'], ['track_number', 'ASC'], ['video_id', 'ASC']]
          })
        : [];

    const artistName = artist.name || '';
    const payload = {
      success: true,
      data: {
        profileVersion: 2,
        artist: {
          id: artist.artist_id,
          name: artistName,
          bio: artist.bio ?? null,
          imageUrl: artist.image_url ?? null,
          followersCount,
          followingCount,
          isFollowing,
          shopId: artist.shop_id ?? null,
          shop: artist.shop
            ? {
                id: artist.shop.shop_id,
                shopName: artist.shop.shop_name,
                shopUrl: artist.shop.shop_url
              }
            : null
        },
        albums: audioAlbums.map((a) => ({
          id: a.album_id,
          title: a.title,
          coverImageUrl: a.cover_image_url ?? null,
          artistName
        })),
        tracks: audioTracks.map((t) => ({
          id: t.audio_id,
          title: t.title,
          durationFormatted: formatDuration(t.duration),
          durationSeconds: t.duration ?? null,
          albumArt: t.thumbnail_url ?? (audioAlbums.find((a) => a.album_id === t.album_id)?.cover_image_url) ?? null,
          artistName,
          audioUrl: t.audio_url ?? null,
          albumId: t.album_id
        })),
        videoAlbums: videoAlbums.map((a) => ({
          id: a.album_id,
          title: a.title,
          coverImageUrl: a.cover_image_url ?? null,
          artistName
        })),
        videos: videoTracks.map((t) => ({
          id: t.video_id,
          title: t.title,
          durationFormatted: formatDuration(t.duration),
          durationSeconds: t.duration ?? null,
          albumArt: t.thumbnail_url ?? (videoAlbums.find((a) => a.album_id === t.album_id)?.cover_image_url) ?? null,
          artistName,
          videoUrl: t.video_url ?? null,
          albumId: t.album_id
        }))
      }
    };
    return res.json(payload);
  } catch (err) {
    console.error('Artist profile error:', err);
    return res.status(500).json({ success: false, error: 'Could not load artist profile' });
  }
});

/**
 * POST /api/v1/music/artists/:id/follow
 * Follow an artist. Requires auth (Bearer token or dev user).
 */
router.post('/artists/:id/follow', authenticateToken, async (req, res) => {
  try {
    const artistId = parseInt(req.params.id, 10);
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    if (Number.isNaN(artistId) || artistId < 1) {
      return res.status(400).json({ success: false, error: 'Invalid artist id' });
    }

    const artist = await Artist.findByPk(artistId);
    if (!artist || !artist.is_active) {
      return res.status(404).json({ success: false, error: 'Artist not found' });
    }

    const [row, created] = await ArtistFollower.findOrCreate({
      where: { user_id: userId, artist_id: artistId },
      defaults: { user_id: userId, artist_id: artistId }
    });

    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Following artist' : 'Already following',
      data: { following: true }
    });
  } catch (err) {
    console.error('Follow artist error:', err);
    return res.status(500).json({ success: false, error: 'Could not follow artist' });
  }
});

/**
 * DELETE /api/v1/music/artists/:id/follow
 * Unfollow an artist. Requires auth.
 */
router.delete('/artists/:id/follow', authenticateToken, async (req, res) => {
  try {
    const artistId = parseInt(req.params.id, 10);
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    if (Number.isNaN(artistId) || artistId < 1) {
      return res.status(400).json({ success: false, error: 'Invalid artist id' });
    }

    const deleted = await ArtistFollower.destroy({
      where: { user_id: userId, artist_id: artistId }
    });

    return res.status(200).json({
      success: true,
      message: deleted ? 'Unfollowed artist' : 'Was not following',
      data: { following: false }
    });
  } catch (err) {
    console.error('Unfollow artist error:', err);
    return res.status(500).json({ success: false, error: 'Could not unfollow artist' });
  }
});

// ---------- Favourites (albums, tracks, videos) — require auth ----------

/**
 * POST /api/v1/music/favourites
 * Add album, track (audio), or video to user's favourites.
 * Body: { entityType: 'album'|'track'|'video', entityId: number }
 */
router.post('/favourites', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const { entityType, entityId } = req.body || {};
    if (!entityType || !VALID_ENTITY_TYPES.includes(String(entityType).toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Invalid entityType; use album, track, or video' });
    }
    const id = parseInt(entityId, 10);
    if (Number.isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, error: 'Invalid entityId' });
    }
    const type = String(entityType).toLowerCase();
    const [row, created] = await UserFavourite.findOrCreate({
      where: { user_id: userId, entity_type: type, entity_id: id },
      defaults: { user_id: userId, entity_type: type, entity_id: id }
    });
    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Added to favourites' : 'Already in favourites',
      data: { favourited: true }
    });
  } catch (err) {
    console.error('Add favourite error:', err.message, err.sql || '');
    return res.status(500).json({ success: false, error: 'Could not add favourite' });
  }
});

/**
 * DELETE /api/v1/music/favourites/:type/:id
 * Remove album, track, or video from user's favourites.
 */
router.delete('/favourites/:type/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const type = String(req.params.type || '').toLowerCase();
    const id = parseInt(req.params.id, 10);
    if (!VALID_ENTITY_TYPES.includes(type) || Number.isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, error: 'Invalid type or id' });
    }
    const deleted = await UserFavourite.destroy({
      where: { user_id: userId, entity_type: type, entity_id: id }
    });
    return res.status(200).json({
      success: true,
      message: deleted ? 'Removed from favourites' : 'Was not in favourites',
      data: { favourited: false }
    });
  } catch (err) {
    console.error('Remove favourite error:', err);
    return res.status(500).json({ success: false, error: 'Could not remove favourite' });
  }
});

/**
 * GET /api/v1/music/favourites/check?type=album&id=1
 * Check if current user has this album/track/video in favourites.
 * Must be defined before GET /favourites so "check" is not matched as :type.
 */
router.get('/favourites/check', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const type = req.query.type ? String(req.query.type).toLowerCase() : null;
    const id = req.query.id != null ? parseInt(req.query.id, 10) : NaN;
    if (!type || !VALID_ENTITY_TYPES.includes(type) || Number.isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, error: 'Query type and id required (e.g. type=album&id=1)' });
    }
    const row = await UserFavourite.findOne({
      where: { user_id: userId, entity_type: type, entity_id: id }
    });
    return res.json({
      success: true,
      data: { favourited: !!row }
    });
  } catch (err) {
    console.error('Check favourite error:', err);
    return res.status(500).json({ success: false, error: 'Could not check favourite' });
  }
});

/**
 * Enrich a list of favourites with full entity details (album/track/video + artist).
 */
async function enrichFavouritesList(list) {
  if (!list || list.length === 0) return [];
  const albums = list.filter((f) => f.entity_type === 'album').map((f) => f.entity_id);
  const tracks = list.filter((f) => f.entity_type === 'track').map((f) => f.entity_id);
  const videos = list.filter((f) => f.entity_type === 'video').map((f) => f.entity_id);

  const [albumRows, trackRows, videoRows] = await Promise.all([
    albums.length > 0 ? Album.findAll({ where: { album_id: albums }, include: [{ model: Artist, as: 'artist', attributes: ['artist_id', 'name'] }] }) : [],
    tracks.length > 0 ? AudioTrack.unscoped().findAll({ where: { audio_id: tracks }, include: [{ model: Album, as: 'album', attributes: ['album_id', 'title', 'cover_image_url'], include: [{ model: Artist, as: 'artist', attributes: ['artist_id', 'name'] }] }] }) : [],
    videos.length > 0 ? VideoTrack.unscoped().findAll({ where: { video_id: videos }, include: [{ model: Album, as: 'album', attributes: ['album_id', 'title', 'cover_image_url'], include: [{ model: Artist, as: 'artist', attributes: ['artist_id', 'name'] }] }] }) : []
  ]);

  const albumById = new Map(albumRows.map((a) => [a.album_id, a]));
  const trackById = new Map(trackRows.map((t) => [t.audio_id, t]));
  const videoById = new Map(videoRows.map((v) => [v.video_id, v]));

  return list.map((f) => {
    const base = { id: f.id, entityType: f.entity_type, entityId: f.entity_id, createdAt: f.created_at };
    if (f.entity_type === 'album') {
      const a = albumById.get(f.entity_id);
      if (!a) return base;
      return {
        ...base,
        title: a.title,
        artistName: a.artist?.name ?? '',
        albumArt: a.cover_image_url ?? null,
        artistId: a.artist_id ?? null
      };
    }
    if (f.entity_type === 'track') {
      const t = trackById.get(f.entity_id);
      if (!t) return base;
      const album = t.album;
      return {
        ...base,
        title: t.title,
        artistName: album?.artist?.name ?? '',
        albumArt: (t.thumbnail_url || album?.cover_image_url) ?? null,
        audioUrl: t.audio_url ?? null,
        durationFormatted: formatDuration(t.duration),
        artistId: album?.artist?.artist_id ?? null,
        albumId: t.album_id
      };
    }
    if (f.entity_type === 'video') {
      const v = videoById.get(f.entity_id);
      if (!v) return base;
      const album = v.album;
      return {
        ...base,
        title: v.title,
        artistName: album?.artist?.name ?? '',
        albumArt: (v.thumbnail_url || album?.cover_image_url) ?? null,
        videoUrl: v.video_url ?? null,
        durationFormatted: formatDuration(v.duration),
        artistId: album?.artist?.artist_id ?? null,
        albumId: v.album_id
      };
    }
    return base;
  });
}

/**
 * GET /api/v1/music/favourites
 * List user's favourites. Query: ?type=album|track|video (optional), ?limit=, ?offset=, ?enrich=1.
 */
router.get('/favourites', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const type = req.query.type ? String(req.query.type).toLowerCase() : null;
    const limit = Math.min(Math.max(0, parseInt(req.query.limit, 10) || 0), 100) || null;
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const enrich = req.query.enrich === '1' || req.query.enrich === 'true';

    const where = { user_id: userId };
    if (type && VALID_ENTITY_TYPES.includes(type)) where.entity_type = type;
    const list = await UserFavourite.findAll({
      where,
      order: [['created_at', 'DESC']],
      attributes: ['id', 'entity_type', 'entity_id', 'created_at'],
      ...(limit != null && { limit }),
      ...(offset > 0 && { offset })
    });

    const favourites = enrich ? await enrichFavouritesList(list) : list.map((f) => ({
      id: f.id,
      entityType: f.entity_type,
      entityId: f.entity_id,
      createdAt: f.created_at
    }));

    const total = await UserFavourite.count({ where });

    return res.json({
      success: true,
      data: {
        favourites,
        total,
        limit: limit ?? total,
        offset
      }
    });
  } catch (err) {
    console.error('List favourites error:', err);
    return res.status(500).json({ success: false, error: 'Could not list favourites' });
  }
});

/**
 * GET /api/v1/music/followed-artists
 * List artists the user follows. Query: ?limit=, ?offset=. Requires auth.
 */
router.get('/followed-artists', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 20), 100);
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const { rows, count } = await ArtistFollower.findAndCountAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      attributes: ['artist_id', 'created_at'],
      limit,
      offset,
      include: [{ model: Artist, as: 'artist', attributes: ['artist_id', 'name', 'image_url'], required: true }]
    });
    const artists = rows
      .filter((r) => r.artist)
      .map((r) => ({
        artistId: r.artist.artist_id,
        name: r.artist.name ?? '',
        imageUrl: r.artist.image_url ?? null
      }));
    return res.json({
      success: true,
      data: {
        artists,
        total: count,
        limit,
        offset
      }
    });
  } catch (err) {
    console.error('List followed artists error:', err);
    return res.status(500).json({ success: false, error: 'Could not list followed artists' });
  }
});

// ---------- Play history (record plays, top by count) ----------

/**
 * POST /api/v1/music/play-history
 * Record a play (audio or video). Auth optional; if logged in, user_id is stored.
 * Body: { entityType: 'audio'|'video', entityId: number }
 */
router.post('/play-history', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.userId ?? null;
    const { entityType, entityId } = req.body || {};
    const type = entityType === 'audio' || entityType === 'video' ? entityType : null;
    const id = parseInt(entityId, 10);
    if (!type || Number.isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, error: 'Invalid entityType (audio|video) or entityId' });
    }
    await PlayHistory.create({
      user_id: userId,
      entity_type: type,
      entity_id: id,
      played_at: new Date()
    });
    return res.status(201).json({ success: true, message: 'Play recorded' });
  } catch (err) {
    console.error('Record play error:', err.message);
    return res.status(500).json({ success: false, error: 'Could not record play' });
  }
});

/**
 * GET /api/v1/music/play-history/top?type=audio|video&limit=10
 * Returns top played tracks/videos by play count. Public. Prefer GET /home for app.
 */
router.get('/play-history/top', async (req, res) => {
  try {
    const type = (req.query.type || 'audio').toLowerCase();
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    if (type !== 'audio' && type !== 'video') {
      return res.status(400).json({ success: false, error: 'type must be audio or video' });
    }
    const ids = await getTopPlayedIds(type, limit);
    const items = type === 'audio' ? await enrichAudioItems(ids) : await enrichVideoItems(ids);
    return res.json({ success: true, data: { items } });
  } catch (err) {
    console.error('Top play history error:', err);
    return res.status(500).json({ success: false, error: 'Could not fetch top' });
  }
});

module.exports = router;
