const express = require('express');
const db = require('../db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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

function generateCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

router.get('/server/:serverId', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { serverId } = req.params;
  
  db.get('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
    [serverId, userId], (err, member) => {
      if (!member) return res.status(403).json({ error: 'Not a member of this server' });
      
      db.all(`
        SELECT si.*, u.username as created_by_username
        FROM server_invites si
        JOIN users u ON si.created_by = u.id
        WHERE si.server_id = ? AND (si.expires_at IS NULL OR si.expires_at > CURRENT_TIMESTAMP)
        ORDER BY si.created_at DESC
      `, [serverId], (err, invites) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(invites || []);
      });
    });
});

router.post('/server/:serverId', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { serverId } = req.params;
  const { maxUses, expiresIn } = req.body;
  
  db.get('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
    [serverId, userId], (err, member) => {
      if (!member) return res.status(403).json({ error: 'Not a member of this server' });
      
      const code = generateCode();
      let expiresAt = null;
      
      if (expiresIn) {
        const hours = parseInt(expiresIn);
        if (hours > 0) {
          expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        }
      }
      
      db.run(`INSERT INTO server_invites (server_id, code, created_by, max_uses, expires_at)
              VALUES (?, ?, ?, ?, ?)`,
        [serverId, code, userId, maxUses || 0, expiresAt], function(err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, code, inviteId: this.lastID });
        });
    });
});

router.get('/code/:code', (req, res) => {
  const { code } = req.params;
  
  db.get(`
    SELECT si.*, s.name as server_name, s.icon as server_icon,
           u.username as created_by_username,
           (SELECT COUNT(*) FROM server_members WHERE server_id = si.server_id) as member_count
    FROM server_invites si
    JOIN servers s ON si.server_id = s.id
    JOIN users u ON si.created_by = u.id
    WHERE si.code = ? AND (si.expires_at IS NULL OR si.expires_at > CURRENT_TIMESTAMP)
  `, [code.toUpperCase()], (err, invite) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!invite) return res.status(404).json({ error: 'Invalid or expired invite' });
    if (invite.max_uses > 0 && invite.uses >= invite.max_uses) {
      return res.status(400).json({ error: 'Invite has reached max uses' });
    }
    res.json(invite);
  });
});

router.post('/join/:code', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { code } = req.params;
  
  db.get(`
    SELECT * FROM server_invites 
    WHERE code = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
  `, [code.toUpperCase()], (err, invite) => {
    if (!invite) return res.status(404).json({ error: 'Invalid or expired invite' });
    if (invite.max_uses > 0 && invite.uses >= invite.max_uses) {
      return res.status(400).json({ error: 'Invite has reached max uses' });
    }
    
    db.get('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
      [invite.server_id, userId], (err, existing) => {
        if (existing) {
          return res.json({ success: true, message: 'Already a member', serverId: invite.server_id });
        }
        
        db.run('INSERT INTO server_members (server_id, user_id) VALUES (?, ?)',
          [invite.server_id, userId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            
            db.run('UPDATE server_invites SET uses = uses + 1 WHERE id = ?', [invite.id]);
            
            res.json({ success: true, message: 'Joined server', serverId: invite.server_id });
          });
      });
  });
});

router.delete('/:inviteId', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { inviteId } = req.params;
  
  db.get('SELECT * FROM server_invites WHERE id = ?', [inviteId], (err, invite) => {
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    
    db.get('SELECT owner_id FROM servers WHERE id = ?', [invite.server_id], (err, server) => {
      if (invite.created_by !== userId && server?.owner_id !== userId) {
        return res.status(403).json({ error: 'Not authorized to delete this invite' });
      }
      
      db.run('DELETE FROM server_invites WHERE id = ?', [inviteId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      });
    });
  });
});

router.post('/server/:serverId/direct/:userId', (req, res) => {
  const inviterId = getUserId(req);
  if (!inviterId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { serverId, userId } = req.params;
  
  db.get('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
    [serverId, inviterId], (err, member) => {
      if (!member) return res.status(403).json({ error: 'Not a member of this server' });
      
      db.get('SELECT * FROM users WHERE id = ?', [userId], (err, targetUser) => {
        if (!targetUser) return res.status(404).json({ error: 'User not found' });
        
        db.get('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
          [serverId, userId], (err, existing) => {
            if (existing) {
              return res.json({ success: true, message: 'User is already a member' });
            }
            
            db.run('INSERT INTO server_members (server_id, user_id) VALUES (?, ?)',
              [serverId, userId], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, message: `${targetUser.username} has been added to the server` });
              });
          });
      });
    });
});

router.post('/group/:groupId/add/:userId', (req, res) => {
  const inviterId = getUserId(req);
  if (!inviterId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { groupId, userId } = req.params;
  
  db.get('SELECT * FROM group_chat_members WHERE group_id = ? AND user_id = ?',
    [groupId, inviterId], (err, member) => {
      if (!member) return res.status(403).json({ error: 'Not a member of this group' });
      
      db.get('SELECT * FROM users WHERE id = ?', [userId], (err, targetUser) => {
        if (!targetUser) return res.status(404).json({ error: 'User not found' });
        
        db.get('SELECT * FROM group_chat_members WHERE group_id = ? AND user_id = ?',
          [groupId, userId], (err, existing) => {
            if (existing) {
              return res.json({ success: true, message: 'User is already a member' });
            }
            
            db.run('INSERT INTO group_chat_members (group_id, user_id) VALUES (?, ?)',
              [groupId, userId], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, message: `${targetUser.username} has been added to the group` });
              });
          });
      });
    });
});

router.get('/friends-to-invite/server/:serverId', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { serverId } = req.params;
  
  db.all(`
    SELECT DISTINCT u.id, u.username, u.profile_picture as "profilePicture"
    FROM users u
    JOIN friends f ON (
      (f.user_id = ? AND f.friend_id = u.id) OR 
      (f.friend_id = ? AND f.user_id = u.id)
    )
    WHERE f.status = 'accepted'
    AND u.id NOT IN (
      SELECT user_id FROM server_members WHERE server_id = ?
    )
  `, [userId, userId, serverId], (err, friends) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(friends || []);
  });
});

router.get('/friends-to-invite/group/:groupId', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { groupId } = req.params;
  
  db.all(`
    SELECT DISTINCT u.id, u.username, u.profile_picture as "profilePicture"
    FROM users u
    JOIN friends f ON (
      (f.user_id = ? AND f.friend_id = u.id) OR 
      (f.friend_id = ? AND f.user_id = u.id)
    )
    WHERE f.status = 'accepted'
    AND u.id NOT IN (
      SELECT user_id FROM group_chat_members WHERE group_id = ?
    )
  `, [userId, userId, groupId], (err, friends) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(friends || []);
  });
});

module.exports = router;
