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

router.get('/channel/:channelId', (req, res) => {
  const { channelId } = req.params;
  
  db.all(`
    SELECT pm.*, m.content, m.created_at as message_date, u.username, u.profile_picture,
           pinner.username as pinned_by_username
    FROM pinned_messages pm
    JOIN messages m ON pm.message_id = m.id
    JOIN users u ON m.user_id = u.id
    JOIN users pinner ON pm.pinned_by = pinner.id
    WHERE pm.channel_id = ?
    ORDER BY pm.pinned_at DESC
  `, [channelId], (err, pins) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(pins || []);
  });
});

router.get('/group/:groupChatId', (req, res) => {
  const { groupChatId } = req.params;
  
  db.all(`
    SELECT pm.*, m.content, m.created_at as message_date, u.username, u.profile_picture,
           pinner.username as pinned_by_username
    FROM pinned_messages pm
    JOIN messages m ON pm.message_id = m.id
    JOIN users u ON m.user_id = u.id
    JOIN users pinner ON pm.pinned_by = pinner.id
    WHERE pm.group_chat_id = ?
    ORDER BY pm.pinned_at DESC
  `, [groupChatId], (err, pins) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(pins || []);
  });
});

router.post('/:messageId', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { messageId } = req.params;
  const { channelId, groupChatId } = req.body;
  
  db.get('SELECT id FROM pinned_messages WHERE message_id = ?', [messageId], (err, existing) => {
    if (existing) {
      return res.status(400).json({ error: 'Message already pinned' });
    }
    
    db.run(`INSERT INTO pinned_messages (message_id, channel_id, group_chat_id, pinned_by) 
            VALUES (?, ?, ?, ?)`,
      [messageId, channelId || null, groupChatId || null, userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, pinId: this.lastID });
      });
  });
});

router.delete('/:messageId', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { messageId } = req.params;
  
  db.run('DELETE FROM pinned_messages WHERE message_id = ?', [messageId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, unpinned: this.changes > 0 });
  });
});

module.exports = router;
