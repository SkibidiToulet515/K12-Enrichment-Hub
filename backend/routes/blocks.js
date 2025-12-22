const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

function getUserIdFromToken(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId;
  } catch {
    return null;
  }
}

router.get('/', (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  db.all(`
    SELECT ub.id, ub.blocked_id, ub.created_at, u.username, u.profile_picture
    FROM user_blocks ub
    JOIN users u ON ub.blocked_id = u.id
    WHERE ub.blocker_id = ?
    ORDER BY ub.created_at DESC
  `, [userId], (err, blocks) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(blocks || []);
  });
});

router.get('/check/:targetId', (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const targetId = parseInt(req.params.targetId);
  
  db.get('SELECT id FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?', 
    [userId, targetId], (err, block) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ blocked: !!block });
    });
});

router.get('/blocked-by/:targetId', (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const targetId = parseInt(req.params.targetId);
  
  db.get('SELECT id FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?', 
    [targetId, userId], (err, block) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ blockedBy: !!block });
    });
});

router.post('/:targetId', (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const targetId = parseInt(req.params.targetId);
  
  if (targetId === userId) {
    return res.status(400).json({ error: 'Cannot block yourself' });
  }
  
  db.get('SELECT id, username FROM users WHERE id = ?', [targetId], (err, user) => {
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    db.run('INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (?, ?) ON CONFLICT DO NOTHING', 
      [userId, targetId], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        db.run('DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
          [userId, targetId, targetId, userId], () => {
            res.json({ success: true, message: `Blocked ${user.username}` });
          });
      });
  });
});

router.delete('/:targetId', (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const targetId = parseInt(req.params.targetId);
  
  db.run('DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?', 
    [userId, targetId], function(err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ success: true, message: 'User unblocked' });
    });
});

module.exports = router;
