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

const PERMISSION_FLAGS = {
  ADMINISTRATOR: 'administrator',
  MANAGE_SERVER: 'manage_server',
  MANAGE_ROLES: 'manage_roles',
  MANAGE_CHANNELS: 'manage_channels',
  KICK_MEMBERS: 'kick_members',
  BAN_MEMBERS: 'ban_members',
  CREATE_INVITES: 'create_invites',
  MANAGE_MESSAGES: 'manage_messages',
  SEND_MESSAGES: 'send_messages',
  VIEW_CHANNELS: 'view_channels',
  READ_HISTORY: 'read_history',
  MENTION_EVERYONE: 'mention_everyone',
  ADD_REACTIONS: 'add_reactions',
  ATTACH_FILES: 'attach_files'
};

function hasPermission(permissions, permission) {
  if (!permissions) return false;
  const perms = typeof permissions === 'string' ? JSON.parse(permissions) : permissions;
  return perms[PERMISSION_FLAGS.ADMINISTRATOR] === true || perms[permission] === true;
}

function canManageRoles(serverId, userId, callback) {
  db.get('SELECT owner_id FROM servers WHERE id = ?', [serverId], (err, server) => {
    if (err || !server) return callback(false);
    if (server.owner_id === userId) return callback(true);
    
    db.all(`
      SELECT sr.permissions FROM server_roles sr
      JOIN server_member_roles smr ON sr.id = smr.role_id
      WHERE smr.server_id = ? AND smr.user_id = ?
      ORDER BY sr.position DESC
    `, [serverId, userId], (err, roles) => {
      if (err) return callback(false);
      for (const role of roles) {
        if (hasPermission(role.permissions, PERMISSION_FLAGS.MANAGE_ROLES) ||
            hasPermission(role.permissions, PERMISSION_FLAGS.ADMINISTRATOR)) {
          return callback(true);
        }
      }
      callback(false);
    });
  });
}

router.get('/server/:serverId', (req, res) => {
  const serverId = req.params.serverId;
  
  db.all(`
    SELECT * FROM server_roles 
    WHERE server_id = ? 
    ORDER BY position DESC
  `, [serverId], (err, roles) => {
    if (err) return res.status(500).json({ error: 'Failed to load roles' });
    
    const parsedRoles = roles.map(role => ({
      ...role,
      permissions: typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions
    }));
    
    res.json(parsedRoles);
  });
});

router.get('/server/:serverId/members', (req, res) => {
  const serverId = req.params.serverId;
  
  db.all(`
    SELECT 
      u.id, u.username, u.profile_picture, u.is_online,
      GROUP_CONCAT(sr.id) as role_ids,
      GROUP_CONCAT(sr.name) as role_names,
      MAX(sr.color) as top_color
    FROM server_members sm
    JOIN users u ON sm.user_id = u.id
    LEFT JOIN server_member_roles smr ON sm.user_id = smr.user_id AND sm.server_id = smr.server_id
    LEFT JOIN server_roles sr ON smr.role_id = sr.id
    WHERE sm.server_id = ?
    GROUP BY u.id
    ORDER BY u.username
  `, [serverId], (err, members) => {
    if (err) return res.status(500).json({ error: 'Failed to load members' });
    
    const formatted = members.map(m => ({
      id: m.id,
      username: m.username,
      profilePicture: m.profile_picture,
      isOnline: m.is_online,
      roles: m.role_ids ? m.role_ids.split(',').map((id, i) => ({
        id: parseInt(id),
        name: m.role_names.split(',')[i]
      })) : [],
      color: m.top_color || '#99AAB5'
    }));
    
    res.json(formatted);
  });
});

router.post('/server/:serverId', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const serverId = req.params.serverId;
  const { name, color, permissions } = req.body;
  
  if (!name) return res.status(400).json({ error: 'Role name is required' });
  
  canManageRoles(serverId, user.userId, (canManage) => {
    if (!canManage) return res.status(403).json({ error: 'No permission to manage roles' });
    
    db.get('SELECT MAX(position) as maxPos FROM server_roles WHERE server_id = ?', [serverId], (err, result) => {
      const position = (result?.maxPos || 0) + 1;
      const permissionsJson = JSON.stringify(permissions || {
        view_channels: true,
        send_messages: true,
        read_history: true
      });
      
      db.run(`
        INSERT INTO server_roles (server_id, name, color, permissions, position)
        VALUES (?, ?, ?, ?, ?)
      `, [serverId, name, color || '#99AAB5', permissionsJson, position], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to create role' });
        
        logAuditAction(serverId, user.userId, 'ROLE_CREATE', 'role', this.lastID, { name, color });
        
        res.json({ 
          success: true, 
          roleId: this.lastID,
          message: `Role "${name}" created` 
        });
      });
    });
  });
});

router.put('/server/:serverId/:roleId', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { serverId, roleId } = req.params;
  const { name, color, permissions, hoist, mentionable } = req.body;
  
  canManageRoles(serverId, user.userId, (canManage) => {
    if (!canManage) return res.status(403).json({ error: 'No permission to manage roles' });
    
    db.get('SELECT * FROM server_roles WHERE id = ? AND server_id = ?', [roleId, serverId], (err, role) => {
      if (!role) return res.status(404).json({ error: 'Role not found' });
      
      if (role.name === '@everyone' && name && name !== '@everyone') {
        return res.status(400).json({ error: 'Cannot rename @everyone role' });
      }
      
      const updates = [];
      const params = [];
      const changes = {};
      
      if (name !== undefined) { updates.push('name = ?'); params.push(name); changes.name = { old: role.name, new: name }; }
      if (color !== undefined) { updates.push('color = ?'); params.push(color); changes.color = { old: role.color, new: color }; }
      if (permissions !== undefined) { 
        updates.push('permissions = ?'); 
        params.push(JSON.stringify(permissions)); 
        changes.permissions = { old: role.permissions, new: permissions }; 
      }
      if (hoist !== undefined) { updates.push('hoist = ?'); params.push(hoist ? 1 : 0); }
      if (mentionable !== undefined) { updates.push('mentionable = ?'); params.push(mentionable ? 1 : 0); }
      
      if (updates.length === 0) return res.json({ success: true, message: 'No changes' });
      
      params.push(roleId);
      
      db.run(`UPDATE server_roles SET ${updates.join(', ')} WHERE id = ?`, params, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update role' });
        
        logAuditAction(serverId, user.userId, 'ROLE_UPDATE', 'role', roleId, changes);
        
        res.json({ success: true, message: 'Role updated' });
      });
    });
  });
});

router.delete('/server/:serverId/:roleId', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { serverId, roleId } = req.params;
  
  canManageRoles(serverId, user.userId, (canManage) => {
    if (!canManage) return res.status(403).json({ error: 'No permission to manage roles' });
    
    db.get('SELECT * FROM server_roles WHERE id = ? AND server_id = ?', [roleId, serverId], (err, role) => {
      if (!role) return res.status(404).json({ error: 'Role not found' });
      if (role.name === '@everyone') return res.status(400).json({ error: 'Cannot delete @everyone role' });
      
      db.run('DELETE FROM server_member_roles WHERE role_id = ?', [roleId], () => {
        db.run('DELETE FROM server_roles WHERE id = ?', [roleId], (err) => {
          if (err) return res.status(500).json({ error: 'Failed to delete role' });
          
          logAuditAction(serverId, user.userId, 'ROLE_DELETE', 'role', roleId, { name: role.name });
          
          res.json({ success: true, message: `Role "${role.name}" deleted` });
        });
      });
    });
  });
});

router.post('/server/:serverId/member/:userId', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { serverId, userId } = req.params;
  const { roleId } = req.body;
  
  if (!roleId) return res.status(400).json({ error: 'Role ID is required' });
  
  canManageRoles(serverId, user.userId, (canManage) => {
    if (!canManage) return res.status(403).json({ error: 'No permission to manage roles' });
    
    db.get('SELECT * FROM server_roles WHERE id = ? AND server_id = ?', [roleId, serverId], (err, role) => {
      if (!role) return res.status(404).json({ error: 'Role not found' });
      
      db.run(`
        INSERT OR IGNORE INTO server_member_roles (server_id, user_id, role_id)
        VALUES (?, ?, ?)
      `, [serverId, userId, roleId], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to assign role' });
        
        logAuditAction(serverId, user.userId, 'ROLE_ASSIGN', 'user', userId, { role: role.name });
        
        res.json({ success: true, message: `Role assigned` });
      });
    });
  });
});

router.delete('/server/:serverId/member/:userId/:roleId', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { serverId, userId, roleId } = req.params;
  
  canManageRoles(serverId, user.userId, (canManage) => {
    if (!canManage) return res.status(403).json({ error: 'No permission to manage roles' });
    
    db.get('SELECT name FROM server_roles WHERE id = ?', [roleId], (err, role) => {
      db.run(`
        DELETE FROM server_member_roles 
        WHERE server_id = ? AND user_id = ? AND role_id = ?
      `, [serverId, userId, roleId], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to remove role' });
        
        logAuditAction(serverId, user.userId, 'ROLE_REMOVE', 'user', userId, { role: role?.name });
        
        res.json({ success: true, message: 'Role removed' });
      });
    });
  });
});

router.put('/server/:serverId/reorder', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const serverId = req.params.serverId;
  const { roleOrder } = req.body;
  
  if (!Array.isArray(roleOrder)) return res.status(400).json({ error: 'Invalid role order' });
  
  canManageRoles(serverId, user.userId, (canManage) => {
    if (!canManage) return res.status(403).json({ error: 'No permission to manage roles' });
    
    let completed = 0;
    roleOrder.forEach((roleId, index) => {
      db.run('UPDATE server_roles SET position = ? WHERE id = ? AND server_id = ?', 
        [roleOrder.length - index, roleId, serverId], () => {
          completed++;
          if (completed === roleOrder.length) {
            res.json({ success: true, message: 'Role order updated' });
          }
        });
    });
  });
});

router.get('/server/:serverId/user/:userId/permissions', (req, res) => {
  const { serverId, userId } = req.params;
  
  db.get('SELECT owner_id FROM servers WHERE id = ?', [serverId], (err, server) => {
    if (!server) return res.status(404).json({ error: 'Server not found' });
    
    if (server.owner_id === parseInt(userId)) {
      return res.json({
        isOwner: true,
        permissions: Object.fromEntries(
          Object.values(PERMISSION_FLAGS).map(p => [p, true])
        )
      });
    }
    
    db.all(`
      SELECT sr.permissions FROM server_roles sr
      JOIN server_member_roles smr ON sr.id = smr.role_id
      WHERE smr.server_id = ? AND smr.user_id = ?
      ORDER BY sr.position DESC
    `, [serverId, userId], (err, roles) => {
      const merged = {};
      
      db.get(`
        SELECT permissions FROM server_roles 
        WHERE server_id = ? AND name = '@everyone'
      `, [serverId], (err, everyoneRole) => {
        if (everyoneRole) {
          const everyonePerms = JSON.parse(everyoneRole.permissions || '{}');
          Object.assign(merged, everyonePerms);
        }
        
        roles.forEach(role => {
          const perms = JSON.parse(role.permissions || '{}');
          Object.entries(perms).forEach(([key, value]) => {
            if (value === true) merged[key] = true;
          });
        });
        
        res.json({
          isOwner: false,
          permissions: merged
        });
      });
    });
  });
});

function logAuditAction(serverId, actorId, actionType, targetType, targetId, changes, reason) {
  db.run(`
    INSERT INTO audit_log (server_id, action_type, actor_id, target_type, target_id, changes, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [serverId, actionType, actorId, targetType, targetId, JSON.stringify(changes), reason]);
}

module.exports = router;
module.exports.PERMISSION_FLAGS = PERMISSION_FLAGS;
module.exports.hasPermission = hasPermission;
