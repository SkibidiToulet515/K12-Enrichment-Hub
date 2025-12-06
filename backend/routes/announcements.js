const express = require('express');
const db = require('../db');
const jwt = require('jsonwebtoken');

const router = express.Router();
const SECRET_KEY = 'real_user_auth_secret_2025';

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

function isAdmin(req, callback) {
  const userId = getUserId(req);
  if (!userId) return callback(false);
  
  db.get('SELECT role FROM users WHERE id = ?', [userId], (err, user) => {
    callback(user?.role === 'admin' || user?.role === 'moderator');
  });
}

router.get('/', (req, res) => {
  db.all(`
    SELECT a.*, u.username as author_name
    FROM announcements a
    LEFT JOIN users u ON a.author_id = u.id
    WHERE a.is_active = true 
    AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
    ORDER BY a.created_at DESC
    LIMIT 10
  `, [], (err, announcements) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(announcements);
  });
});

router.get('/latest', (req, res) => {
  db.get(`
    SELECT a.*, u.username as author_name
    FROM announcements a
    LEFT JOIN users u ON a.author_id = u.id
    WHERE a.is_active = true 
    AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
    ORDER BY a.created_at DESC
    LIMIT 1
  `, [], (err, announcement) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(announcement || null);
  });
});

router.post('/', (req, res) => {
  isAdmin(req, (admin) => {
    if (!admin) return res.status(403).json({ error: 'Admin only' });

    const userId = getUserId(req);
    const { title, content, type, expires_in_hours } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content required' });
    }

    let expiresAt = null;
    if (expires_in_hours) {
      expiresAt = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000).toISOString();
    }

    db.run(`
      INSERT INTO announcements (title, content, author_id, type, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `, [title, content, userId, type || 'info', expiresAt], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    });
  });
});

router.put('/:id', (req, res) => {
  isAdmin(req, (admin) => {
    if (!admin) return res.status(403).json({ error: 'Admin only' });

    const { id } = req.params;
    const { title, content, type, is_active } = req.body;

    db.run(`
      UPDATE announcements SET title = ?, content = ?, type = ?, is_active = ?
      WHERE id = ?
    `, [title, content, type, is_active, id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Announcement not found' });
      res.json({ success: true });
    });
  });
});

router.delete('/:id', (req, res) => {
  isAdmin(req, (admin) => {
    if (!admin) return res.status(403).json({ error: 'Admin only' });

    const { id } = req.params;

    db.run('DELETE FROM announcements WHERE id = ?', [id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Announcement not found' });
      res.json({ success: true });
    });
  });
});

router.get('/all', (req, res) => {
  isAdmin(req, (admin) => {
    if (!admin) return res.status(403).json({ error: 'Admin only' });

    db.all(`
      SELECT a.*, u.username as author_name
      FROM announcements a
      LEFT JOIN users u ON a.author_id = u.id
      ORDER BY a.created_at DESC
    `, [], (err, announcements) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(announcements);
    });
  });
});

router.get('/active', (req, res) => {
  db.all(`
    SELECT a.*, u.username as author_name
    FROM announcements a
    LEFT JOIN users u ON a.author_id = u.id
    WHERE a.is_active = true 
    AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
    ORDER BY a.created_at DESC
  `, [], (err, announcements) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(announcements || []);
  });
});

module.exports = router;
