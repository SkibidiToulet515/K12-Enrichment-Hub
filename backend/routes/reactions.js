const express = require('express');
const db = require('../db');
const jwt = require('jsonwebtoken');

const router = express.Router();

function getUserId(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, 'real_user_auth_secret_2025');
    return decoded.userId;
  } catch {
    return null;
  }
}

router.get('/:messageId', (req, res) => {
  const { messageId } = req.params;
  
  db.all(`
    SELECT mr.*, u.username 
    FROM message_reactions mr
    JOIN users u ON mr.user_id = u.id
    WHERE mr.message_id = ?
    ORDER BY mr.created_at ASC
  `, [messageId], (err, reactions) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const grouped = {};
    (reactions || []).forEach(r => {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { emoji: r.emoji, count: 0, users: [], userIds: [] };
      }
      grouped[r.emoji].count++;
      grouped[r.emoji].users.push(r.username);
      grouped[r.emoji].userIds.push(r.user_id);
    });
    
    res.json(Object.values(grouped));
  });
});

router.post('/:messageId', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { messageId } = req.params;
  const { emoji } = req.body;
  
  if (!emoji) return res.status(400).json({ error: 'Emoji required' });
  
  db.get('SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
    [messageId, userId, emoji], (err, existing) => {
      if (existing) {
        db.run('DELETE FROM message_reactions WHERE id = ?', [existing.id], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, action: 'removed' });
        });
      } else {
        db.run('INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)',
          [messageId, userId, emoji], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, action: 'added', reactionId: this.lastID });
          });
      }
    });
});

router.delete('/:messageId/:emoji', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { messageId, emoji } = req.params;
  
  db.run('DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
    [messageId, userId, decodeURIComponent(emoji)], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, removed: this.changes > 0 });
    });
});

module.exports = router;
