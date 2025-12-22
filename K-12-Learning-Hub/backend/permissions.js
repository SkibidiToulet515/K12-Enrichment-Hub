const db = require('./db');

const PERMISSIONS = {
  VIEW_CHANNEL: 'view_channel',
  SEND_MESSAGES: 'send_messages',
  SEND_FILES: 'send_files',
  ADD_REACTIONS: 'add_reactions',
  MENTION_EVERYONE: 'mention_everyone',
  DELETE_MESSAGES: 'delete_messages',
  PIN_MESSAGES: 'pin_messages',
  MANAGE_CHANNEL: 'manage_channel',
  MANAGE_PERMISSIONS: 'manage_permissions',
  MUTE_MEMBERS: 'mute_members',
  KICK_MEMBERS: 'kick_members',
  BAN_MEMBERS: 'ban_members',
  MANAGE_ROLES: 'manage_roles',
  MANAGE_SERVER: 'manage_server',
  CREATE_INVITES: 'create_invites'
};

const PERMISSION_VALUES = {
  NEUTRAL: null,
  ALLOW: 1,
  DENY: 0
};

const DEFAULT_ROLE_PERMISSIONS = {
  admin: {
    [PERMISSIONS.VIEW_CHANNEL]: true,
    [PERMISSIONS.SEND_MESSAGES]: true,
    [PERMISSIONS.SEND_FILES]: true,
    [PERMISSIONS.ADD_REACTIONS]: true,
    [PERMISSIONS.MENTION_EVERYONE]: true,
    [PERMISSIONS.DELETE_MESSAGES]: true,
    [PERMISSIONS.PIN_MESSAGES]: true,
    [PERMISSIONS.MANAGE_CHANNEL]: true,
    [PERMISSIONS.MANAGE_PERMISSIONS]: true,
    [PERMISSIONS.MUTE_MEMBERS]: true,
    [PERMISSIONS.KICK_MEMBERS]: true,
    [PERMISSIONS.BAN_MEMBERS]: true,
    [PERMISSIONS.MANAGE_ROLES]: true,
    [PERMISSIONS.MANAGE_SERVER]: true,
    [PERMISSIONS.CREATE_INVITES]: true
  },
  moderator: {
    [PERMISSIONS.VIEW_CHANNEL]: true,
    [PERMISSIONS.SEND_MESSAGES]: true,
    [PERMISSIONS.SEND_FILES]: true,
    [PERMISSIONS.ADD_REACTIONS]: true,
    [PERMISSIONS.MENTION_EVERYONE]: true,
    [PERMISSIONS.DELETE_MESSAGES]: true,
    [PERMISSIONS.PIN_MESSAGES]: true,
    [PERMISSIONS.MANAGE_CHANNEL]: false,
    [PERMISSIONS.MANAGE_PERMISSIONS]: false,
    [PERMISSIONS.MUTE_MEMBERS]: true,
    [PERMISSIONS.KICK_MEMBERS]: true,
    [PERMISSIONS.BAN_MEMBERS]: false,
    [PERMISSIONS.MANAGE_ROLES]: false,
    [PERMISSIONS.MANAGE_SERVER]: false,
    [PERMISSIONS.CREATE_INVITES]: true
  },
  member: {
    [PERMISSIONS.VIEW_CHANNEL]: true,
    [PERMISSIONS.SEND_MESSAGES]: true,
    [PERMISSIONS.SEND_FILES]: true,
    [PERMISSIONS.ADD_REACTIONS]: true,
    [PERMISSIONS.MENTION_EVERYONE]: false,
    [PERMISSIONS.DELETE_MESSAGES]: false,
    [PERMISSIONS.PIN_MESSAGES]: false,
    [PERMISSIONS.MANAGE_CHANNEL]: false,
    [PERMISSIONS.MANAGE_PERMISSIONS]: false,
    [PERMISSIONS.MUTE_MEMBERS]: false,
    [PERMISSIONS.KICK_MEMBERS]: false,
    [PERMISSIONS.BAN_MEMBERS]: false,
    [PERMISSIONS.MANAGE_ROLES]: false,
    [PERMISSIONS.MANAGE_SERVER]: false,
    [PERMISSIONS.CREATE_INVITES]: true
  },
  muted: {
    [PERMISSIONS.VIEW_CHANNEL]: true,
    [PERMISSIONS.SEND_MESSAGES]: false,
    [PERMISSIONS.SEND_FILES]: false,
    [PERMISSIONS.ADD_REACTIONS]: false,
    [PERMISSIONS.MENTION_EVERYONE]: false,
    [PERMISSIONS.DELETE_MESSAGES]: false,
    [PERMISSIONS.PIN_MESSAGES]: false,
    [PERMISSIONS.MANAGE_CHANNEL]: false,
    [PERMISSIONS.MANAGE_PERMISSIONS]: false,
    [PERMISSIONS.MUTE_MEMBERS]: false,
    [PERMISSIONS.KICK_MEMBERS]: false,
    [PERMISSIONS.BAN_MEMBERS]: false,
    [PERMISSIONS.MANAGE_ROLES]: false,
    [PERMISSIONS.MANAGE_SERVER]: false,
    [PERMISSIONS.CREATE_INVITES]: false
  }
};

function getUserRolesInServer(serverId, userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT sr.* FROM server_roles sr
       JOIN server_member_roles smr ON sr.id = smr.role_id
       WHERE smr.server_id = ? AND smr.user_id = ?
       ORDER BY sr.position DESC`,
      [serverId, userId],
      (err, roles) => {
        if (err) reject(err);
        else resolve(roles || []);
      }
    );
  });
}

function getServerOwner(serverId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT owner_id FROM servers WHERE id = ?', [serverId], (err, server) => {
      if (err) reject(err);
      else resolve(server?.owner_id);
    });
  });
}

function getChannelPermissions(channelId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM channel_permissions WHERE channel_id = ?',
      [channelId],
      (err, perms) => {
        if (err) reject(err);
        else resolve(perms || []);
      }
    );
  });
}

function parseRolePermissions(role) {
  if (!role.permissions) return {};
  try {
    return typeof role.permissions === 'string' 
      ? JSON.parse(role.permissions) 
      : role.permissions;
  } catch {
    return {};
  }
}

async function checkPermission(serverId, channelId, userId, permission) {
  try {
    const ownerId = await getServerOwner(serverId);
    if (ownerId === userId) {
      return true;
    }

    const userRoles = await getUserRolesInServer(serverId, userId);
    const channelPerms = await getChannelPermissions(channelId);

    const userOverride = channelPerms.find(
      p => p.target_type === 'user' && p.target_id === userId && p.permission === permission
    );
    if (userOverride) {
      return userOverride.value === 1;
    }

    let hasDeny = false;
    let hasAllow = false;
    
    for (const role of userRoles) {
      const roleOverride = channelPerms.find(
        p => p.target_type === 'role' && p.target_id === role.id && p.permission === permission
      );
      if (roleOverride) {
        if (roleOverride.value === 0) hasDeny = true;
        if (roleOverride.value === 1) hasAllow = true;
      }
    }
    
    if (hasDeny) return false;
    if (hasAllow) return true;

    let roleHasDeny = false;
    let roleHasAllow = false;
    
    for (const role of userRoles) {
      const rolePerms = parseRolePermissions(role);
      if (rolePerms[permission] !== undefined) {
        if (rolePerms[permission] === false || rolePerms[permission] === 0) roleHasDeny = true;
        if (rolePerms[permission] === true || rolePerms[permission] === 1) roleHasAllow = true;
      }
    }
    
    if (roleHasDeny) return false;
    if (roleHasAllow) return true;

    return DEFAULT_ROLE_PERMISSIONS.member[permission] || false;
  } catch (err) {
    console.error('Permission check error:', err);
    return false;
  }
}

async function getEffectivePermissions(serverId, channelId, userId) {
  const result = {};
  
  try {
    const ownerId = await getServerOwner(serverId);
    if (ownerId === userId) {
      Object.keys(PERMISSIONS).forEach(key => {
        result[PERMISSIONS[key]] = true;
      });
      return result;
    }

    const userRoles = await getUserRolesInServer(serverId, userId);
    const channelPerms = await getChannelPermissions(channelId);

    for (const permKey of Object.keys(PERMISSIONS)) {
      const permission = PERMISSIONS[permKey];
      
      const userOverride = channelPerms.find(
        p => p.target_type === 'user' && p.target_id === userId && p.permission === permission
      );
      if (userOverride) {
        result[permission] = userOverride.value === 1;
        continue;
      }

      let hasDeny = false;
      let hasAllow = false;
      
      for (const role of userRoles) {
        const roleOverride = channelPerms.find(
          p => p.target_type === 'role' && p.target_id === role.id && p.permission === permission
        );
        if (roleOverride) {
          if (roleOverride.value === 0) hasDeny = true;
          if (roleOverride.value === 1) hasAllow = true;
        }
      }
      
      if (hasDeny) {
        result[permission] = false;
        continue;
      }
      if (hasAllow) {
        result[permission] = true;
        continue;
      }

      let roleHasDeny = false;
      let roleHasAllow = false;
      
      for (const role of userRoles) {
        const rolePerms = parseRolePermissions(role);
        if (rolePerms[permission] !== undefined) {
          if (rolePerms[permission] === false || rolePerms[permission] === 0) roleHasDeny = true;
          if (rolePerms[permission] === true || rolePerms[permission] === 1) roleHasAllow = true;
        }
      }
      
      if (roleHasDeny) {
        result[permission] = false;
        continue;
      }
      if (roleHasAllow) {
        result[permission] = true;
        continue;
      }

      result[permission] = DEFAULT_ROLE_PERMISSIONS.member[permission] || false;
    }
  } catch (err) {
    console.error('Get effective permissions error:', err);
    Object.keys(PERMISSIONS).forEach(key => {
      result[PERMISSIONS[key]] = false;
    });
  }

  return result;
}

function setChannelPermission(channelId, targetType, targetId, permission, value) {
  return new Promise((resolve, reject) => {
    if (value === null) {
      db.run(
        'DELETE FROM channel_permissions WHERE channel_id = ? AND target_type = ? AND target_id = ? AND permission = ?',
        [channelId, targetType, targetId, permission],
        function(err) {
          if (err) reject(err);
          else resolve({ deleted: true });
        }
      );
    } else {
      db.run(
        `INSERT INTO channel_permissions (channel_id, target_type, target_id, permission, value)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (channel_id, target_type, target_id, permission) 
         DO UPDATE SET value = ?`,
        [channelId, targetType, targetId, permission, value, value],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    }
  });
}

function getChannelPermissionOverrides(channelId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT cp.*, 
        CASE WHEN cp.target_type = 'role' THEN sr.name ELSE u.username END as target_name
       FROM channel_permissions cp
       LEFT JOIN server_roles sr ON cp.target_type = 'role' AND cp.target_id = sr.id
       LEFT JOIN users u ON cp.target_type = 'user' AND cp.target_id = u.id
       WHERE cp.channel_id = ?`,
      [channelId],
      (err, perms) => {
        if (err) reject(err);
        else resolve(perms || []);
      }
    );
  });
}

async function canViewChannel(serverId, channelId, userId) {
  return await checkPermission(serverId, channelId, userId, PERMISSIONS.VIEW_CHANNEL);
}

async function canSendMessages(serverId, channelId, userId) {
  return await checkPermission(serverId, channelId, userId, PERMISSIONS.SEND_MESSAGES);
}

async function canManageChannel(serverId, channelId, userId) {
  return await checkPermission(serverId, channelId, userId, PERMISSIONS.MANAGE_CHANNEL);
}

async function canManagePermissions(serverId, channelId, userId) {
  return await checkPermission(serverId, channelId, userId, PERMISSIONS.MANAGE_PERMISSIONS);
}

async function canDeleteMessages(serverId, channelId, userId) {
  return await checkPermission(serverId, channelId, userId, PERMISSIONS.DELETE_MESSAGES);
}

module.exports = {
  PERMISSIONS,
  PERMISSION_VALUES,
  DEFAULT_ROLE_PERMISSIONS,
  checkPermission,
  getEffectivePermissions,
  setChannelPermission,
  getChannelPermissionOverrides,
  canViewChannel,
  canSendMessages,
  canManageChannel,
  canManagePermissions,
  canDeleteMessages,
  getUserRolesInServer,
  getServerOwner
};
