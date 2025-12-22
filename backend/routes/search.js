const express = require('express');
const db = require('../db');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

const router = express.Router();

function getUserId(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId;
  } catch {
    return null;
  }
}

router.get('/messages', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { q, channelId, serverId, userId: searchUserId, limit = 50 } = req.query;
  
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }
  
  let sql = `
    SELECT m.*, u.username, u.profile_picture,
           c.name as channel_name, s.name as server_name, s.id as server_id
    FROM messages m
    JOIN users u ON m.user_id = u.id
    LEFT JOIN channels c ON m.channel_id = c.id
    LEFT JOIN servers s ON c.server_id = s.id
    WHERE m.content LIKE ?
  `;
  const params = [`%${q}%`];
  
  if (channelId) {
    sql += ' AND m.channel_id = ?';
    params.push(channelId);
  }
  
  if (serverId) {
    sql += ' AND c.server_id = ?';
    params.push(serverId);
  }
  
  if (searchUserId) {
    sql += ' AND m.user_id = ?';
    params.push(searchUserId);
  }
  
  sql += ` ORDER BY m.created_at DESC LIMIT ?`;
  params.push(parseInt(limit));
  
  db.all(sql, params, (err, messages) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(messages || []);
  });
});

router.get('/users', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { q, limit = 20 } = req.query;
  
  if (!q || q.trim().length < 1) {
    return res.status(400).json({ error: 'Query required' });
  }
  
  db.all(`
    SELECT id, username, profile_picture, is_online, status
    FROM users
    WHERE username LIKE ?
    ORDER BY is_online DESC, username ASC
    LIMIT ?
  `, [`%${q}%`, parseInt(limit)], (err, users) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(users || []);
  });
});

router.get('/servers', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { q, limit = 20 } = req.query;
  
  if (!q || q.trim().length < 1) {
    return res.status(400).json({ error: 'Query required' });
  }
  
  db.all(`
    SELECT s.*, 
           (SELECT COUNT(*) FROM server_members WHERE server_id = s.id) as member_count,
           CASE WHEN sm.user_id IS NOT NULL THEN 1 ELSE 0 END as is_member
    FROM servers s
    LEFT JOIN server_members sm ON s.id = sm.server_id AND sm.user_id = ?
    WHERE s.name LIKE ? AND s.status = 'active'
    ORDER BY member_count DESC
    LIMIT ?
  `, [userId, `%${q}%`, parseInt(limit)], (err, servers) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(servers || []);
  });
});

module.exports = router;
