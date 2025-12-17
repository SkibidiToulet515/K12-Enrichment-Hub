const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

const JWT_SECRET = 'real_user_auth_secret_2025';

function getUserFromToken(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function canViewAuditLog(serverId, userId, callback) {
  db.get('SELECT owner_id FROM servers WHERE id = ?', [serverId], (err, server) => {
    if (err || !server) return callback(false);
    if (server.owner_id === userId) return callback(true);
    
    db.all(`
      SELECT sr.permissions FROM server_roles sr
      JOIN server_member_roles smr ON sr.id = smr.role_id
      WHERE smr.server_id = ? AND smr.user_id = ?
    `, [serverId, userId], (err, roles) => {
      if (err) return callback(false);
      for (const role of roles) {
        const perms = JSON.parse(role.permissions || '{}');
        if (perms.administrator || perms.manage_server) {
          return callback(true);
        }
      }
      callback(false);
    });
  });
}

router.get('/server/:serverId', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const serverId = req.params.serverId;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  const actionType = req.query.action_type;
  
  canViewAuditLog(serverId, user.userId, (canView) => {
    if (!canView) return res.status(403).json({ error: 'No permission to view audit log' });
    
    let query = `
      SELECT 
        al.*,
        u.username as actor_username,
        u.profile_picture as actor_picture
      FROM audit_log al
      JOIN users u ON al.actor_id = u.id
      WHERE al.server_id = ?
    `;
    const params = [serverId];
    
    if (actionType) {
      query += ' AND al.action_type = ?';
      params.push(actionType);
    }
    
    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    db.all(query, params, (err, logs) => {
      if (err) return res.status(500).json({ error: 'Failed to load audit log' });
      
      const formatted = logs.map(log => ({
        id: log.id,
        actionType: log.action_type,
        actor: {
          id: log.actor_id,
          username: log.actor_username,
          profilePicture: log.actor_picture
        },
        targetType: log.target_type,
        targetId: log.target_id,
        changes: log.changes ? JSON.parse(log.changes) : null,
        reason: log.reason,
        createdAt: log.created_at
      }));
      
      res.json(formatted);
    });
  });
});

router.get('/server/:serverId/stats', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const serverId = req.params.serverId;
  
  canViewAuditLog(serverId, user.userId, (canView) => {
    if (!canView) return res.status(403).json({ error: 'No permission to view audit log' });
    
    db.all(`
      SELECT action_type, COUNT(*) as count
      FROM audit_log
      WHERE server_id = ?
      GROUP BY action_type
      ORDER BY count DESC
    `, [serverId], (err, stats) => {
      if (err) return res.status(500).json({ error: 'Failed to load stats' });
      
      db.get('SELECT COUNT(*) as total FROM audit_log WHERE server_id = ?', [serverId], (err, total) => {
        res.json({
          total: total?.total || 0,
          byAction: stats
        });
      });
    });
  });
});

router.get('/server/:serverId/user/:userId', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { serverId, userId } = req.params;
  const limit = parseInt(req.query.limit) || 20;
  
  canViewAuditLog(serverId, user.userId, (canView) => {
    if (!canView) return res.status(403).json({ error: 'No permission to view audit log' });
    
    db.all(`
      SELECT 
        al.*,
        u.username as actor_username
      FROM audit_log al
      JOIN users u ON al.actor_id = u.id
      WHERE al.server_id = ? AND (al.actor_id = ? OR (al.target_type = 'user' AND al.target_id = ?))
      ORDER BY al.created_at DESC
      LIMIT ?
    `, [serverId, userId, userId, limit], (err, logs) => {
      if (err) return res.status(500).json({ error: 'Failed to load user audit log' });
      
      const formatted = logs.map(log => ({
        id: log.id,
        actionType: log.action_type,
        actorUsername: log.actor_username,
        targetType: log.target_type,
        targetId: log.target_id,
        changes: log.changes ? JSON.parse(log.changes) : null,
        reason: log.reason,
        createdAt: log.created_at
      }));
      
      res.json(formatted);
    });
  });
});

const ACTION_TYPES = {
  ROLE_CREATE: 'Role created',
  ROLE_UPDATE: 'Role updated',
  ROLE_DELETE: 'Role deleted',
  ROLE_ASSIGN: 'Role assigned to member',
  ROLE_REMOVE: 'Role removed from member',
  CHANNEL_CREATE: 'Channel created',
  CHANNEL_UPDATE: 'Channel updated',
  CHANNEL_DELETE: 'Channel deleted',
  CATEGORY_CREATE: 'Category created',
  CATEGORY_DELETE: 'Category deleted',
  MEMBER_KICK: 'Member kicked',
  MEMBER_BAN: 'Member banned',
  MEMBER_UNBAN: 'Member unbanned',
  MESSAGE_DELETE: 'Message deleted',
  MESSAGE_PIN: 'Message pinned',
  SERVER_UPDATE: 'Server settings updated',
  INVITE_CREATE: 'Invite created',
  INVITE_DELETE: 'Invite deleted'
};

router.get('/action-types', (req, res) => {
  res.json(ACTION_TYPES);
});

// Global update log - tracks ALL updates across the entire system
router.get('/global', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  const updateType = req.query.type;
  
  // Check if user is admin
  db.get('SELECT is_admin FROM users WHERE id = ?', [user.userId], (err, userData) => {
    if (err || !userData?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    let query = `
      SELECT ul.*, u.username as actor_username
      FROM update_log ul
      LEFT JOIN users u ON ul.actor_id = u.id
    `;
    const params = [];
    
    if (updateType) {
      query += ' WHERE ul.update_type = ?';
      params.push(updateType);
    }
    
    query += ' ORDER BY ul.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    db.all(query, params, (err, logs) => {
      if (err) return res.status(500).json({ error: 'Failed to load update log' });
      
      const formatted = logs.map(log => ({
        id: log.id,
        updateType: log.update_type,
        actor: {
          id: log.actor_id,
          username: log.actor_username
        },
        targetType: log.target_type,
        targetId: log.target_id,
        changes: log.changes ? JSON.parse(log.changes) : null,
        description: log.description,
        createdAt: log.created_at
      }));
      
      res.json(formatted);
    });
  });
});

// Get update log stats
router.get('/global/stats', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  db.get('SELECT is_admin FROM users WHERE id = ?', [user.userId], (err, userData) => {
    if (err || !userData?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    db.all(`
      SELECT update_type, COUNT(*) as count
      FROM update_log
      GROUP BY update_type
      ORDER BY count DESC
    `, (err, stats) => {
      if (err) return res.status(500).json({ error: 'Failed to load stats' });
      
      db.get('SELECT COUNT(*) as total FROM update_log', (err, total) => {
        res.json({
          total: total?.total || 0,
          byType: stats || []
        });
      });
    });
  });
});

module.exports = router;
