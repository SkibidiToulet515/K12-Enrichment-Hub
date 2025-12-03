const express = require('express');
const router = express.Router();
const db = require('../db');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = 'real_user_auth_secret_2025';
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  db.all(`
    SELECT ac.*, 
           CASE 
             WHEN ac.chat_type = 'dm' THEN u.username
             WHEN ac.chat_type = 'group' THEN gc.name
             WHEN ac.chat_type = 'channel' THEN ch.name
           END as chat_name,
           CASE 
             WHEN ac.chat_type = 'dm' THEN u.profile_picture
             WHEN ac.chat_type = 'group' THEN NULL
             WHEN ac.chat_type = 'channel' THEN NULL
           END as chat_icon
    FROM archived_chats ac
    LEFT JOIN users u ON ac.chat_type = 'dm' AND ac.chat_id = u.id
    LEFT JOIN group_chats gc ON ac.chat_type = 'group' AND ac.chat_id = gc.id
    LEFT JOIN channels ch ON ac.chat_type = 'channel' AND ac.chat_id = ch.id
    WHERE ac.user_id = ?
    ORDER BY ac.archived_at DESC
  `, [userId], (err, archived) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(archived || []);
  });
});

router.post('/archive', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { chat_type, chat_id } = req.body;
  
  if (!chat_type || !chat_id) {
    return res.status(400).json({ error: 'Chat type and ID are required' });
  }
  
  const validTypes = ['dm', 'group', 'channel'];
  if (!validTypes.includes(chat_type)) {
    return res.status(400).json({ error: 'Invalid chat type' });
  }
  
  const validateChat = (callback) => {
    if (chat_type === 'dm') {
      db.get('SELECT id FROM users WHERE id = ?', [chat_id], callback);
    } else if (chat_type === 'group') {
      db.get('SELECT id FROM group_chat_members WHERE group_chat_id = ? AND user_id = ?', 
        [chat_id, userId], callback);
    } else if (chat_type === 'channel') {
      db.get(`
        SELECT ch.id FROM channels ch
        JOIN server_members sm ON ch.server_id = sm.server_id
        WHERE ch.id = ? AND sm.user_id = ?
      `, [chat_id, userId], callback);
    }
  };
  
  validateChat((err, valid) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!valid) return res.status(404).json({ error: 'Chat not found or access denied' });
    
    db.run(`
      INSERT OR REPLACE INTO archived_chats (user_id, chat_type, chat_id, archived_at)
      VALUES (?, ?, ?, datetime('now'))
    `, [userId, chat_type, chat_id], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to archive chat' });
      
      res.json({ success: true, message: 'Chat archived' });
    });
  });
});

router.post('/unarchive', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { chat_type, chat_id } = req.body;
  
  if (!chat_type || !chat_id) {
    return res.status(400).json({ error: 'Chat type and ID are required' });
  }
  
  db.run(`
    DELETE FROM archived_chats 
    WHERE user_id = ? AND chat_type = ? AND chat_id = ?
  `, [userId, chat_type, chat_id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to unarchive chat' });
    if (this.changes === 0) return res.status(404).json({ error: 'Archived chat not found' });
    
    res.json({ success: true, message: 'Chat unarchived' });
  });
});

router.get('/check/:chat_type/:chat_id', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { chat_type, chat_id } = req.params;
  
  db.get(`
    SELECT id FROM archived_chats 
    WHERE user_id = ? AND chat_type = ? AND chat_id = ?
  `, [userId, chat_type, chat_id], (err, archived) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ is_archived: !!archived });
  });
});

router.post('/channel/:channelId/archive', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { channelId } = req.params;
  
  db.get(`
    SELECT ch.*, s.owner_id FROM channels ch
    JOIN servers s ON ch.server_id = s.id
    WHERE ch.id = ?
  `, [channelId], (err, channel) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    
    if (channel.owner_id !== userId) {
      db.get(`
        SELECT smr.* FROM server_member_roles smr
        JOIN server_roles sr ON smr.role_id = sr.id
        WHERE smr.server_id = ? AND smr.user_id = ? AND sr.permissions LIKE '%manage_channels%'
      `, [channel.server_id, userId], (err, hasPermission) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!hasPermission) return res.status(403).json({ error: 'Permission denied' });
        
        archiveChannel();
      });
    } else {
      archiveChannel();
    }
    
    function archiveChannel() {
      db.run(`
        UPDATE channels SET is_archived = 1, archived_at = datetime('now')
        WHERE id = ?
      `, [channelId], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to archive channel' });
        
        res.json({ success: true, message: 'Channel archived' });
      });
    }
  });
});

router.post('/channel/:channelId/unarchive', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { channelId } = req.params;
  
  db.get(`
    SELECT ch.*, s.owner_id FROM channels ch
    JOIN servers s ON ch.server_id = s.id
    WHERE ch.id = ?
  `, [channelId], (err, channel) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    
    if (channel.owner_id !== userId) {
      return res.status(403).json({ error: 'Only server owner can unarchive channels' });
    }
    
    db.run(`
      UPDATE channels SET is_archived = 0, archived_at = NULL
      WHERE id = ?
    `, [channelId], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to unarchive channel' });
      
      res.json({ success: true, message: 'Channel unarchived' });
    });
  });
});

module.exports = router;
