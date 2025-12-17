const db = require('../db');

const UPDATE_TYPES = {
  SERVER_CREATED: 'server_created',
  SERVER_UPDATED: 'server_updated',
  SERVER_DELETED: 'server_deleted',
  CHANNEL_CREATED: 'channel_created',
  CHANNEL_UPDATED: 'channel_updated',
  CHANNEL_DELETED: 'channel_deleted',
  ROLE_CREATED: 'role_created',
  ROLE_UPDATED: 'role_updated',
  ROLE_DELETED: 'role_deleted',
  MEMBER_JOINED: 'member_joined',
  MEMBER_LEFT: 'member_left',
  MEMBER_KICKED: 'member_kicked',
  MEMBER_BANNED: 'member_banned',
  ROLE_ASSIGNED: 'role_assigned',
  ROLE_REMOVED: 'role_removed',
  PERMISSION_UPDATED: 'permission_updated',
  MESSAGE_DELETED: 'message_deleted',
  MESSAGE_PINNED: 'message_pinned',
  MESSAGE_UNPINNED: 'message_unpinned',
  INVITE_CREATED: 'invite_created',
  INVITE_DELETED: 'invite_deleted',
  SETTINGS_UPDATED: 'settings_updated',
  USER_REGISTERED: 'user_registered',
  USER_UPDATED: 'user_updated',
  GAME_PLAYED: 'game_played',
  XP_GAINED: 'xp_gained',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  THEME_CHANGED: 'theme_changed',
  BUG_REPORTED: 'bug_reported',
  FORUM_POST_CREATED: 'forum_post_created',
  SYSTEM_UPDATE: 'system_update'
};

function logUpdate(type, actorId, serverId, targetType, targetId, changes, reason) {
  return new Promise((resolve, reject) => {
    const changesJson = changes ? JSON.stringify(changes) : null;
    
    db.run(`
      INSERT INTO audit_log (action_type, actor_id, server_id, target_type, target_id, changes, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [type, actorId, serverId, targetType, targetId, changesJson, reason], function(err) {
      if (err) {
        console.error('Failed to log update:', err);
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

function logGlobalUpdate(type, actorId, targetType, targetId, changes, description) {
  return new Promise((resolve, reject) => {
    const changesJson = changes ? JSON.stringify(changes) : null;
    
    db.run(`
      INSERT INTO update_log (update_type, actor_id, target_type, target_id, changes, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [type, actorId, targetType, targetId, changesJson, description], function(err) {
      if (err) {
        console.error('Failed to log global update:', err);
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

function getServerLogs(serverId, limit = 100, offset = 0) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT al.*, u.username as actor_username
      FROM audit_log al
      LEFT JOIN users u ON al.actor_id = u.id
      WHERE al.server_id = ?
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `, [serverId, limit, offset], (err, logs) => {
      if (err) reject(err);
      else resolve(logs || []);
    });
  });
}

function getGlobalLogs(limit = 100, offset = 0, updateType = null) {
  return new Promise((resolve, reject) => {
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
      if (err) reject(err);
      else resolve(logs || []);
    });
  });
}

module.exports = {
  UPDATE_TYPES,
  logUpdate,
  logGlobalUpdate,
  getServerLogs,
  getGlobalLogs
};
