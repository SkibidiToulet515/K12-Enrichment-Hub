const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'real_user_auth_secret_2025';

function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

router.get('/:friendId', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const friendId = parseInt(req.params.friendId);
  
  db.get('SELECT note, updated_at FROM friend_notes WHERE user_id = ? AND friend_id = ?',
    [userId, friendId], (err, note) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(note || { note: '', updated_at: null });
    });
});

router.put('/:friendId', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const friendId = parseInt(req.params.friendId);
  const { note } = req.body;
  
  if (friendId === userId) {
    return res.status(400).json({ error: 'Cannot add note to yourself' });
  }
  
  db.get('SELECT id FROM users WHERE id = ?', [friendId], (err, user) => {
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    db.run(`
      INSERT INTO friend_notes (user_id, friend_id, note, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, friend_id) DO UPDATE SET
        note = excluded.note,
        updated_at = datetime('now')
    `, [userId, friendId, note || ''], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to save note' });
      res.json({ success: true, message: 'Note saved' });
    });
  });
});

router.delete('/:friendId', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const friendId = parseInt(req.params.friendId);
  
  db.run('DELETE FROM friend_notes WHERE user_id = ? AND friend_id = ?',
    [userId, friendId], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to delete note' });
      res.json({ success: true, message: 'Note deleted' });
    });
});

module.exports = router;
