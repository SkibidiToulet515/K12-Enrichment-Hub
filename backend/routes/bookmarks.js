const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

const defaultBookmarks = [
  { name: 'Google', url: 'https://www.google.com', icon: '🔍', bg_color: null },
  { name: 'YouTube', url: 'https://www.youtube.com', icon: '▶', bg_color: '#ff0000' },
  { name: 'SoundCloud', url: 'https://soundcloud.com', icon: '☁', bg_color: '#ff5500' },
  { name: 'Discord', url: 'https://discord.com', icon: '💬', bg_color: '#5865f2' },
  { name: 'GitHub', url: 'https://github.com', icon: '🐙', bg_color: '#333' },
  { name: 'Reddit', url: 'https://reddit.com', icon: '👽', bg_color: '#ff4500' },
  { name: 'Twitch', url: 'https://twitch.tv', icon: '📺', bg_color: '#9146ff' },
  { name: 'Twitter', url: 'https://twitter.com', icon: '🐦', bg_color: '#1da1f2' },
  { name: 'Spotify', url: 'https://spotify.com', icon: '🎵', bg_color: '#1db954' },
  { name: 'Netflix', url: 'https://netflix.com', icon: '🎬', bg_color: '#e50914' }
];

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM user_bookmarks WHERE user_id = $1 ORDER BY position, id',
      [req.user.userId]
    );
    
    if (result.rows.length === 0) {
      for (let i = 0; i < defaultBookmarks.length; i++) {
        const b = defaultBookmarks[i];
        await db.query(
          'INSERT INTO user_bookmarks (user_id, name, url, icon, bg_color, position) VALUES ($1, $2, $3, $4, $5, $6)',
          [req.user.userId, b.name, b.url, b.icon, b.bg_color, i]
        );
      }
      const newResult = await db.query(
        'SELECT * FROM user_bookmarks WHERE user_id = $1 ORDER BY position, id',
        [req.user.userId]
      );
      return res.json(newResult.rows);
    }
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching bookmarks:', err);
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, url, icon, bg_color } = req.body;
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }
    
    const countResult = await db.query(
      'SELECT COUNT(*) as count FROM user_bookmarks WHERE user_id = $1',
      [req.user.userId]
    );
    const position = parseInt(countResult.rows[0].count);
    
    const result = await db.query(
      'INSERT INTO user_bookmarks (user_id, name, url, icon, bg_color, position) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.userId, name, url, icon || '🔗', bg_color || null, position]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating bookmark:', err);
    res.status(500).json({ error: 'Failed to create bookmark' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, icon, bg_color } = req.body;
    
    const result = await db.query(
      'UPDATE user_bookmarks SET name = COALESCE($1, name), url = COALESCE($2, url), icon = COALESCE($3, icon), bg_color = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
      [name, url, icon, bg_color, id, req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating bookmark:', err);
    res.status(500).json({ error: 'Failed to update bookmark' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'DELETE FROM user_bookmarks WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting bookmark:', err);
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
});

router.post('/reorder', authMiddleware, async (req, res) => {
  try {
    const { bookmarks } = req.body;
    
    for (let i = 0; i < bookmarks.length; i++) {
      await db.query(
        'UPDATE user_bookmarks SET position = $1 WHERE id = $2 AND user_id = $3',
        [i, bookmarks[i].id, req.user.userId]
      );
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error reordering bookmarks:', err);
    res.status(500).json({ error: 'Failed to reorder bookmarks' });
  }
});

router.post('/reset', authMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM user_bookmarks WHERE user_id = $1', [req.user.userId]);
    
    for (let i = 0; i < defaultBookmarks.length; i++) {
      const b = defaultBookmarks[i];
      await db.query(
        'INSERT INTO user_bookmarks (user_id, name, url, icon, bg_color, position) VALUES ($1, $2, $3, $4, $5, $6)',
        [req.user.userId, b.name, b.url, b.icon, b.bg_color, i]
      );
    }
    
    const result = await db.query(
      'SELECT * FROM user_bookmarks WHERE user_id = $1 ORDER BY position, id',
      [req.user.userId]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error resetting bookmarks:', err);
    res.status(500).json({ error: 'Failed to reset bookmarks' });
  }
});

module.exports = router;
