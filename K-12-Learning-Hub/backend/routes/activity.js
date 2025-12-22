const express = require('express');
const db = require('../db');
const jwt = require('jsonwebtoken');

const router = express.Router();
const { JWT_SECRET } = require('../config');
const SECRET_KEY = JWT_SECRET;

function getUserId(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    return decoded.userId;
  } catch {
    return null;
  }
}

router.get('/status', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  db.get('SELECT * FROM activity_status WHERE user_id = ?', [userId], (err, status) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(status || { status_type: 'online', activity_type: null, activity_name: null });
  });
});

router.post('/status', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { status_type, activity_type, activity_name, custom_status, custom_emoji } = req.body;

  db.run(`
    INSERT INTO activity_status (user_id, status_type, activity_type, activity_name, custom_status, custom_emoji)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      status_type = ?,
      activity_type = ?,
      activity_name = ?,
      custom_status = ?,
      custom_emoji = ?,
      updated_at = CURRENT_TIMESTAMP
  `, [userId, status_type, activity_type, activity_name, custom_status, custom_emoji,
      status_type, activity_type, activity_name, custom_status, custom_emoji], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

router.post('/playing', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { game_name } = req.body;

  db.run(`
    INSERT INTO activity_status (user_id, activity_type, activity_name, started_at, updated_at)
    VALUES (?, 'playing', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      activity_type = 'playing',
      activity_name = ?,
      started_at = CASE WHEN activity_status.activity_type != 'playing' OR activity_status.activity_name != ? THEN CURRENT_TIMESTAMP ELSE activity_status.started_at END,
      updated_at = CURRENT_TIMESTAMP
  `, [userId, game_name, game_name, game_name], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

router.post('/watching', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { title } = req.body;

  db.run(`
    INSERT INTO activity_status (user_id, activity_type, activity_name, started_at, updated_at)
    VALUES (?, 'watching', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      activity_type = 'watching',
      activity_name = ?,
      started_at = CASE WHEN activity_status.activity_type != 'watching' OR activity_status.activity_name != ? THEN CURRENT_TIMESTAMP ELSE activity_status.started_at END,
      updated_at = CURRENT_TIMESTAMP
  `, [userId, title, title, title], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

router.post('/browsing', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { site } = req.body;

  db.run(`
    INSERT INTO activity_status (user_id, activity_type, activity_name, started_at, updated_at)
    VALUES (?, 'browsing', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      activity_type = 'browsing',
      activity_name = ?,
      started_at = CASE WHEN activity_status.activity_type != 'browsing' THEN CURRENT_TIMESTAMP ELSE activity_status.started_at END,
      updated_at = CURRENT_TIMESTAMP
  `, [userId, site, site], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

router.post('/listening', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { song_name, artist } = req.body;
  const activityName = artist ? `${song_name} by ${artist}` : song_name;

  db.run(`
    INSERT INTO activity_status (user_id, activity_type, activity_name, activity_data)
    VALUES (?, 'listening', ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      activity_type = 'listening',
      activity_name = ?,
      activity_data = ?,
      started_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  `, [userId, activityName, JSON.stringify({ song: song_name, artist }), activityName, JSON.stringify({ song: song_name, artist })], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

router.post('/studying', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { subject } = req.body;
  const activityName = subject || 'Studying';

  db.run(`
    INSERT INTO activity_status (user_id, activity_type, activity_name)
    VALUES (?, 'studying', ?)
    ON CONFLICT(user_id) DO UPDATE SET
      activity_type = 'studying',
      activity_name = ?,
      started_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  `, [userId, activityName, activityName], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

router.post('/afk', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { reason } = req.body;

  db.run(`
    INSERT INTO activity_status (user_id, activity_type, activity_name)
    VALUES (?, 'afk', ?)
    ON CONFLICT(user_id) DO UPDATE SET
      activity_type = 'afk',
      activity_name = ?,
      started_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  `, [userId, reason || 'Away', reason || 'Away'], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

router.post('/clear', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  db.run(`
    UPDATE activity_status SET activity_type = NULL, activity_name = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `, [userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

router.get('/user/:userId', (req, res) => {
  const { userId } = req.params;

  db.get(`
    SELECT a.*, u.username, u.profile_picture, u.is_online
    FROM activity_status a
    RIGHT JOIN users u ON a.user_id = u.id
    WHERE u.id = ?
  `, [userId], (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(data || { status_type: 'offline' });
  });
});

router.get('/online', (req, res) => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  db.run(`
    UPDATE activity_status 
    SET activity_type = NULL, activity_name = NULL 
    WHERE updated_at < ?
  `, [fiveMinutesAgo], () => {
    db.all(`
      SELECT u.id, u.username, u.profile_picture, u.is_online, a.activity_type, a.activity_name, a.custom_status, a.custom_emoji
      FROM users u
      LEFT JOIN activity_status a ON u.id = a.user_id
      WHERE u.is_online = true
      ORDER BY a.updated_at DESC
    `, [], (err, users) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(users);
    });
  });
});

router.post('/update', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { activity_type, activity_data } = req.body;
  const validTypes = ['playing_game', 'watching', 'browsing', 'chatting', null];
  
  if (!validTypes.includes(activity_type)) {
    return res.status(400).json({ error: 'Invalid activity type' });
  }

  db.run(`
    INSERT INTO activity_status (user_id, activity_type, activity_name)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      activity_type = ?,
      activity_name = ?,
      updated_at = CURRENT_TIMESTAMP
  `, [userId, activity_type, activity_data, activity_type, activity_data], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
