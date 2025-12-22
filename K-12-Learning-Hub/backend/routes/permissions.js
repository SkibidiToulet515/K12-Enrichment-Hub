const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const permissions = require('../permissions');
const { JWT_SECRET } = require('../config');

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

router.get('/channel/:channelId', verifyToken, async (req, res) => {
  const { channelId } = req.params;
  
  try {
    const channel = await new Promise((resolve, reject) => {
      db.get('SELECT server_id FROM channels WHERE id = ?', [channelId], (err, ch) => {
        if (err) reject(err);
        else resolve(ch);
      });
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const canManage = await permissions.canManagePermissions(channel.server_id, channelId, req.userId);
    if (!canManage) {
      return res.status(403).json({ error: 'No permission to view channel permissions' });
    }

    const overrides = await permissions.getChannelPermissionOverrides(channelId);
    
    const roles = await new Promise((resolve, reject) => {
      db.all('SELECT id, name, color FROM server_roles WHERE server_id = ? ORDER BY position DESC', 
        [channel.server_id], (err, roles) => {
          if (err) reject(err);
          else resolve(roles || []);
        });
    });

    const members = await new Promise((resolve, reject) => {
      db.all(
        `SELECT u.id, u.username, u.profile_picture 
         FROM users u
         JOIN server_members sm ON u.id = sm.user_id
         WHERE sm.server_id = ?`,
        [channel.server_id],
        (err, members) => {
          if (err) reject(err);
          else resolve(members || []);
        }
      );
    });

    res.json({
      channelId,
      overrides,
      roles,
      members,
      permissionList: Object.values(permissions.PERMISSIONS)
    });
  } catch (err) {
    console.error('Error getting channel permissions:', err);
    res.status(500).json({ error: 'Failed to get channel permissions' });
  }
});

router.post('/channel/:channelId', verifyToken, async (req, res) => {
  const { channelId } = req.params;
  const { targetType, targetId, permission, value } = req.body;

  if (!['role', 'user'].includes(targetType)) {
    return res.status(400).json({ error: 'Invalid target type' });
  }

  if (!Object.values(permissions.PERMISSIONS).includes(permission)) {
    return res.status(400).json({ error: 'Invalid permission' });
  }

  if (value !== null && value !== 0 && value !== 1) {
    return res.status(400).json({ error: 'Invalid value. Use 1 (allow), 0 (deny), or null (neutral)' });
  }

  try {
    const channel = await new Promise((resolve, reject) => {
      db.get('SELECT server_id FROM channels WHERE id = ?', [channelId], (err, ch) => {
        if (err) reject(err);
        else resolve(ch);
      });
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const canManage = await permissions.canManagePermissions(channel.server_id, channelId, req.userId);
    if (!canManage) {
      return res.status(403).json({ error: 'No permission to manage channel permissions' });
    }

    await permissions.setChannelPermission(channelId, targetType, targetId, permission, value);
    
    res.json({ success: true, message: 'Permission updated' });
  } catch (err) {
    console.error('Error setting channel permission:', err);
    res.status(500).json({ error: 'Failed to set channel permission' });
  }
});

router.post('/channel/:channelId/bulk', verifyToken, async (req, res) => {
  const { channelId } = req.params;
  const { targetType, targetId, permissions: permissionsToSet } = req.body;

  if (!['role', 'user'].includes(targetType)) {
    return res.status(400).json({ error: 'Invalid target type' });
  }

  try {
    const channel = await new Promise((resolve, reject) => {
      db.get('SELECT server_id FROM channels WHERE id = ?', [channelId], (err, ch) => {
        if (err) reject(err);
        else resolve(ch);
      });
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const canManage = await permissions.canManagePermissions(channel.server_id, channelId, req.userId);
    if (!canManage) {
      return res.status(403).json({ error: 'No permission to manage channel permissions' });
    }

    for (const [permission, value] of Object.entries(permissionsToSet)) {
      if (Object.values(permissions.PERMISSIONS).includes(permission)) {
        await permissions.setChannelPermission(channelId, targetType, targetId, permission, value);
      }
    }
    
    res.json({ success: true, message: 'Permissions updated' });
  } catch (err) {
    console.error('Error setting bulk channel permissions:', err);
    res.status(500).json({ error: 'Failed to set channel permissions' });
  }
});

router.get('/channel/:channelId/effective', verifyToken, async (req, res) => {
  const { channelId } = req.params;
  const userId = parseInt(req.query.userId) || req.userId;
  
  try {
    const channel = await new Promise((resolve, reject) => {
      db.get('SELECT server_id FROM channels WHERE id = ?', [channelId], (err, ch) => {
        if (err) reject(err);
        else resolve(ch);
      });
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const effectivePerms = await permissions.getEffectivePermissions(channel.server_id, channelId, userId);
    
    res.json({ 
      channelId, 
      userId, 
      permissions: effectivePerms 
    });
  } catch (err) {
    console.error('Error getting effective permissions:', err);
    res.status(500).json({ error: 'Failed to get effective permissions' });
  }
});

router.get('/roles/:serverId', verifyToken, async (req, res) => {
  const { serverId } = req.params;
  
  try {
    const roles = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM server_roles WHERE server_id = ? ORDER BY position DESC',
        [serverId],
        (err, roles) => {
          if (err) reject(err);
          else resolve(roles || []);
        }
      );
    });

    res.json(roles.map(role => ({
      ...role,
      permissions: role.permissions ? JSON.parse(role.permissions) : {}
    })));
  } catch (err) {
    console.error('Error getting roles:', err);
    res.status(500).json({ error: 'Failed to get roles' });
  }
});

router.put('/roles/:roleId', verifyToken, async (req, res) => {
  const { roleId } = req.params;
  const { permissions: newPermissions, name, color, hoist, mentionable } = req.body;
  
  try {
    const role = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM server_roles WHERE id = ?', [roleId], (err, r) => {
        if (err) reject(err);
        else resolve(r);
      });
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const ownerId = await permissions.getServerOwner(role.server_id);
    if (ownerId !== req.userId) {
      const userRoles = await permissions.getUserRolesInServer(role.server_id, req.userId);
      const hasManageRoles = userRoles.some(r => {
        const perms = r.permissions ? JSON.parse(r.permissions) : {};
        return perms[permissions.PERMISSIONS.MANAGE_ROLES];
      });
      
      if (!hasManageRoles) {
        return res.status(403).json({ error: 'No permission to manage roles' });
      }
    }

    const updates = [];
    const params = [];

    if (newPermissions !== undefined) {
      updates.push('permissions = ?');
      params.push(JSON.stringify(newPermissions));
    }
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      params.push(color);
    }
    if (hoist !== undefined) {
      updates.push('hoist = ?');
      params.push(hoist);
    }
    if (mentionable !== undefined) {
      updates.push('mentionable = ?');
      params.push(mentionable);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(roleId);
    
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE server_roles SET ${updates.join(', ')} WHERE id = ?`,
        params,
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true, message: 'Role updated' });
  } catch (err) {
    console.error('Error updating role:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

router.get('/constants', (req, res) => {
  res.json({
    permissions: permissions.PERMISSIONS,
    values: permissions.PERMISSION_VALUES,
    defaultRolePermissions: permissions.DEFAULT_ROLE_PERMISSIONS
  });
});

module.exports = router;
