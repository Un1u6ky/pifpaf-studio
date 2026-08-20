const db = require("./db");

function snapshot(reelId, row) {
  db.prepare(
    `INSERT INTO reel_stats (reel_id, views, plays, likes, comments)
     VALUES (?, ?, ?, ?, ?)`
  ).run(reelId, row.views, row.plays, row.likes, row.comments);
}

function upsertReel(userId, row) {
  const existing = db
    .prepare("SELECT id FROM reels WHERE user_id = ? AND instagram_url = ?")
    .get(userId, row.instagram_url);

  if (existing) {
    db.prepare(
      `UPDATE reels SET
        shortcode = ?, caption = ?, cover_url = ?, posted_at = ?,
        views = ?, plays = ?, likes = ?, comments = ?,
        owner_username = ?, duration = ?, last_synced_at = datetime('now'), raw_json = ?
       WHERE id = ?`
    ).run(
      row.shortcode,
      row.caption,
      row.cover_url,
      row.posted_at,
      row.views,
      row.plays,
      row.likes,
      row.comments,
      row.owner_username,
      row.duration,
      row.raw_json,
      existing.id
    );
    snapshot(existing.id, row);
    return existing.id;
  }

  const info = db
    .prepare(
      `INSERT INTO reels (
        user_id, instagram_url, shortcode, caption, cover_url, posted_at,
        views, plays, likes, comments, owner_username, duration, last_synced_at, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`
    )
    .run(
      userId,
      row.instagram_url,
      row.shortcode,
      row.caption,
      row.cover_url,
      row.posted_at,
      row.views,
      row.plays,
      row.likes,
      row.comments,
      row.owner_username,
      row.duration,
      row.raw_json
    );
  snapshot(info.lastInsertRowid, row);
  return info.lastInsertRowid;
}

function listReels(userId) {
  return db
    .prepare("SELECT * FROM reels WHERE user_id = ? ORDER BY posted_at DESC, id DESC")
    .all(userId);
}

function stats(userId) {
  const totals = db
    .prepare(
      `SELECT
        COUNT(*) AS reels,
        COALESCE(SUM(views), 0) AS views,
        COALESCE(SUM(plays), 0) AS plays,
        COALESCE(SUM(likes), 0) AS likes,
        COALESCE(SUM(comments), 0) AS comments,
        COALESCE(AVG(views), 0) AS avg_views
       FROM reels WHERE user_id = ?`
    )
    .get(userId);

  const history = db
    .prepare(
      `SELECT date(s.captured_at) AS day,
              SUM(s.views) AS views,
              SUM(s.plays) AS plays
       FROM reel_stats s
       JOIN reels r ON r.id = s.reel_id
       WHERE r.user_id = ?
       GROUP BY date(s.captured_at)
       ORDER BY day ASC`
    )
    .all(userId);

  const top = db
    .prepare(
      `SELECT * FROM reels WHERE user_id = ? ORDER BY views DESC, plays DESC LIMIT 3`
    )
    .all(userId);

  return { ...totals, history, top };
}

function getReel(userId, id) {
  return db.prepare("SELECT * FROM reels WHERE id = ? AND user_id = ?").get(id, userId);
}

function reelHistory(reelId) {
  return db
    .prepare(
      "SELECT * FROM reel_stats WHERE reel_id = ? ORDER BY captured_at ASC"
    )
    .all(reelId);
}

function deleteReel(userId, id) {
  return db.prepare("DELETE FROM reels WHERE id = ? AND user_id = ?").run(id, userId);
}

module.exports = { upsertReel, listReels, stats, getReel, reelHistory, deleteReel };
