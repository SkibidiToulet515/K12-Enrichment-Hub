const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../chat.db');
const sqliteDb = new Database(dbPath);

// Disable foreign key constraints to avoid issues with friend requests
// Friends table just stores user IDs without strict foreign key validation
sqliteDb.pragma('foreign_keys = OFF');

// Wrapper to make better-sqlite3 work with callback API
const db = {
  run: function(sql, params, callback) {
    try {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      const stmt = sqliteDb.prepare(sql);
      const result = stmt.run(...(Array.isArray(params) ? params : [params]));
      callback.call({ lastID: result.lastInsertRowid, changes: result.changes }, null);
    } catch (err) {
      if (callback) callback(err);
    }
  },

  get: function(sql, params, callback) {
    try {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      const stmt = sqliteDb.prepare(sql);
      const result = stmt.get(...(Array.isArray(params) ? params : [params]));
      callback(null, result || null);
    } catch (err) {
      callback(err);
    }
  },

  all: function(sql, params, callback) {
    try {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      const stmt = sqliteDb.prepare(sql);
      const results = stmt.all(...(Array.isArray(params) ? params : [params]));
      callback(null, results || []);
    } catch (err) {
      callback(err);
    }
  },

  exec: function(sql, callback) {
    try {
      sqliteDb.exec(sql);
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }
};

// Initialize database tables
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  profile_picture TEXT,
  role TEXT DEFAULT 'member',
  status TEXT DEFAULT 'offline',
  custom_status TEXT,
  custom_status_expiry DATETIME,
  is_online BOOLEAN DEFAULT 0,
  is_banned BOOLEAN DEFAULT 0,
  ban_reason TEXT,
  warning_count INTEGER DEFAULT 0,
  last_warning TEXT,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Add new columns if they don't exist (for existing databases)
try {
  sqliteDb.exec('ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT 0');
} catch(e) {}
try {
  sqliteDb.exec('ALTER TABLE users ADD COLUMN ban_reason TEXT');
} catch(e) {}
try {
  sqliteDb.exec('ALTER TABLE users ADD COLUMN warning_count INTEGER DEFAULT 0');
} catch(e) {}
try {
  sqliteDb.exec('ALTER TABLE users ADD COLUMN last_warning TEXT');
} catch(e) {}

// Add is_global column to messages table for global chat
try {
  sqliteDb.exec('ALTER TABLE messages ADD COLUMN is_global BOOLEAN DEFAULT 0');
} catch(e) {}

// Add ban_until column for timed bans (chat only)
try {
  sqliteDb.exec('ALTER TABLE users ADD COLUMN ban_until DATETIME');
} catch(e) {}

// Add needs_setup column to servers for first-time channel setup
try {
  sqliteDb.exec('ALTER TABLE servers ADD COLUMN needs_setup BOOLEAN DEFAULT 0');
} catch(e) {}

db.exec(`CREATE TABLE IF NOT EXISTS servers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  owner_id INTEGER NOT NULL,
  icon TEXT,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(owner_id) REFERENCES users(id)
)`);

db.exec(`CREATE TABLE IF NOT EXISTS server_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(server_id, user_id),
  FOREIGN KEY(server_id) REFERENCES servers(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);

db.exec(`CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(server_id) REFERENCES servers(id)
)`);

db.exec(`CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER,
  group_chat_id INTEGER,
  dm_partner_id INTEGER,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(channel_id) REFERENCES channels(id),
  FOREIGN KEY(group_chat_id) REFERENCES group_chats(id),
  FOREIGN KEY(dm_partner_id) REFERENCES users(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);

db.exec(`CREATE TABLE IF NOT EXISTS friends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  friend_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, friend_id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(friend_id) REFERENCES users(id)
)`);

db.exec(`CREATE TABLE IF NOT EXISTS group_chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  owner_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(owner_id) REFERENCES users(id)
)`);

// Add owner_id column to existing group_chats if it doesn't exist
try {
  sqliteDb.exec('ALTER TABLE group_chats ADD COLUMN owner_id INTEGER');
} catch(e) {}

db.exec(`CREATE TABLE IF NOT EXISTS group_chat_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_chat_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  UNIQUE(group_chat_id, user_id),
  FOREIGN KEY(group_chat_id) REFERENCES group_chats(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);

db.exec(`CREATE TABLE IF NOT EXISTS server_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  server_name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);

db.exec(`CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  permissions TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_type TEXT NOT NULL,
  reported_user_id INTEGER,
  message_id INTEGER,
  server_id INTEGER,
  reporter_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  resolved_by INTEGER,
  action_taken TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  FOREIGN KEY(reported_user_id) REFERENCES users(id),
  FOREIGN KEY(message_id) REFERENCES messages(id),
  FOREIGN KEY(server_id) REFERENCES servers(id),
  FOREIGN KEY(reporter_id) REFERENCES users(id),
  FOREIGN KEY(resolved_by) REFERENCES users(id)
)`);

db.exec(`CREATE TABLE IF NOT EXISTS message_filters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filter_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT 1,
  filter_data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE IF NOT EXISTS blocked_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE IF NOT EXISTS game_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  icon TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  category_id INTEGER,
  url TEXT,
  thumbnail TEXT,
  play_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(category_id) REFERENCES game_categories(id)
)`);

db.exec(`CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, game_id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(game_id) REFERENCES games(id)
)`);

db.exec(`CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  icon TEXT,
  description TEXT,
  requirement_type TEXT,
  requirement_value INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE IF NOT EXISTS user_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  badge_id INTEGER NOT NULL,
  earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, badge_id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(badge_id) REFERENCES badges(id)
)`);

db.exec(`CREATE TABLE IF NOT EXISTS message_reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  emoji TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id, user_id, emoji),
  FOREIGN KEY(message_id) REFERENCES messages(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);

// Pinned messages
db.exec(`CREATE TABLE IF NOT EXISTS pinned_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL UNIQUE,
  channel_id INTEGER,
  group_chat_id INTEGER,
  pinned_by INTEGER NOT NULL,
  pinned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(message_id) REFERENCES messages(id),
  FOREIGN KEY(channel_id) REFERENCES channels(id),
  FOREIGN KEY(group_chat_id) REFERENCES group_chats(id),
  FOREIGN KEY(pinned_by) REFERENCES users(id)
)`);

// Server roles with colors and permissions
db.exec(`CREATE TABLE IF NOT EXISTS server_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#99AAB5',
  permissions TEXT DEFAULT '{}',
  position INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(server_id) REFERENCES servers(id)
)`);

// User role assignments per server
db.exec(`CREATE TABLE IF NOT EXISTS server_member_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  UNIQUE(server_id, user_id, role_id),
  FOREIGN KEY(server_id) REFERENCES servers(id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(role_id) REFERENCES server_roles(id)
)`);

// Server invite links
db.exec(`CREATE TABLE IF NOT EXISTS server_invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_by INTEGER NOT NULL,
  uses INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT 0,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(server_id) REFERENCES servers(id),
  FOREIGN KEY(created_by) REFERENCES users(id)
)`);

// Message read status for unread tracking
db.exec(`CREATE TABLE IF NOT EXISTS message_read_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  channel_id INTEGER,
  group_chat_id INTEGER,
  dm_partner_id INTEGER,
  is_global BOOLEAN DEFAULT 0,
  last_read_message_id INTEGER DEFAULT 0,
  last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, channel_id, group_chat_id, dm_partner_id, is_global),
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);

// File attachments
db.exec(`CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  url TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(message_id) REFERENCES messages(id)
)`);

// Add reply columns to messages
try {
  sqliteDb.exec('ALTER TABLE messages ADD COLUMN reply_to_id INTEGER');
} catch(e) {}
try {
  sqliteDb.exec('ALTER TABLE messages ADD COLUMN edited_at DATETIME');
} catch(e) {}
try {
  sqliteDb.exec('ALTER TABLE messages ADD COLUMN is_edited BOOLEAN DEFAULT 0');
} catch(e) {}

// User blocks table for blocking other users
db.exec(`CREATE TABLE IF NOT EXISTS user_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blocker_id INTEGER NOT NULL,
  blocked_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(blocker_id, blocked_id),
  FOREIGN KEY(blocker_id) REFERENCES users(id),
  FOREIGN KEY(blocked_id) REFERENCES users(id)
)`);

// Add status columns if they don't exist
try {
  sqliteDb.exec('ALTER TABLE users ADD COLUMN status TEXT DEFAULT \'offline\'');
} catch(e) {}
try {
  sqliteDb.exec('ALTER TABLE users ADD COLUMN custom_status TEXT');
} catch(e) {}
try {
  sqliteDb.exec('ALTER TABLE users ADD COLUMN custom_status_expiry DATETIME');
} catch(e) {}

// Insert default data using synchronous operations
try {
  sqliteDb.exec(`INSERT OR IGNORE INTO roles (name, permissions) 
          VALUES 
          ('admin', 'full_control'),
          ('moderator', 'delete_message,mute_user,warn_user'),
          ('member', 'normal_user'),
          ('guest', 'read_only')`);
} catch(e) {}

try {
  sqliteDb.exec(`INSERT OR IGNORE INTO message_filters (filter_type, enabled, filter_data)
          VALUES
          ('profanity', 1, '{}'),
          ('spam', 1, '{}'),
          ('dangerous_links', 1, '{}'),
          ('caps_spam', 1, '{}')`);
} catch(e) {}

try {
  sqliteDb.exec(`INSERT OR IGNORE INTO game_categories (name, icon)
          VALUES
          ('Action', '⚔️'),
          ('Racing', '🏎️'),
          ('Puzzle', '🧩'),
          ('Retro', '👾'),
          ('Sports', '⚽'),
          ('Brain Games', '🧠'),
          ('Sandbox', '🏗️'),
          ('School-Safe', '📚'),
          ('Horror', '👻'),
          ('Featured', '⭐')`);
} catch(e) {}

try {
  sqliteDb.exec(`INSERT OR IGNORE INTO badges (name, icon, description, requirement_type, requirement_value)
          VALUES
          ('Founder', '⭐', 'Early user of the platform', 'early_user', 0),
          ('Gamer', '🎮', 'Played 50+ games', 'game_plays', 50),
          ('Chatterbox', '💬', 'Sent 1000+ messages', 'messages_sent', 1000),
          ('Admin', '👑', 'Administrator role', 'role', 0),
          ('Smartie', '🧠', 'Completed 20 Brain Games', 'brain_games', 20),
          ('Helper', '🧑‍🏫', 'Moderator or helpful reports', 'helper', 0)`);
} catch(e) {}

const adminPassword = bcrypt.hashSync('0000P', 10);
try {
  sqliteDb.prepare(`INSERT OR IGNORE INTO users (id, username, password, role) VALUES (1, 'admin', ?, 'admin')`).run(adminPassword);
} catch(e) {}

const yusoffPassword = bcrypt.hashSync('1124', 10);
try {
  sqliteDb.prepare(`INSERT OR IGNORE INTO users (id, username, password, role) VALUES (2, 'Yusoff(ADMIN)', ?, 'admin')`).run(yusoffPassword);
} catch(e) {}

try {
  sqliteDb.exec(`INSERT OR IGNORE INTO servers (id, name, owner_id, description) 
          VALUES (1, 'Welcome', 1, 'Official Welcome server - Admin only messaging')`);
} catch(e) {}

try {
  sqliteDb.exec(`UPDATE servers SET name = 'Welcome', description = 'Official Welcome server - Admin only messaging' WHERE id = 1`);
} catch(e) {}

try {
  const existingChannel1 = sqliteDb.prepare('SELECT id FROM channels WHERE server_id = 1 AND name = ?').get('rules-and-guidelines');
  if (!existingChannel1) {
    sqliteDb.exec(`INSERT INTO channels (server_id, name, description) VALUES (1, 'rules-and-guidelines', 'Read the rules here')`);
  }
  
  // Rename moderation-logs to losers if it exists
  sqliteDb.exec(`UPDATE channels SET name = 'losers', description = 'The Wall of Shame - Bans and Warnings' WHERE server_id = 1 AND name = 'moderation-logs'`);
  
  const existingChannel2 = sqliteDb.prepare('SELECT id FROM channels WHERE server_id = 1 AND name = ?').get('losers');
  if (!existingChannel2) {
    sqliteDb.exec(`INSERT INTO channels (server_id, name, description) VALUES (1, 'losers', 'The Wall of Shame - Bans and Warnings')`);
  }
} catch(e) {}

try {
  sqliteDb.exec(`DELETE FROM server_members WHERE server_id = 2`);
  sqliteDb.exec(`DELETE FROM channels WHERE server_id = 2`);
  sqliteDb.exec(`DELETE FROM servers WHERE id = 2`);
} catch(e) {}

// Set Yusoff(ADMIN) as admin if exists
try {
  sqliteDb.exec(`UPDATE users SET role = 'admin' WHERE username = 'Yusoff(ADMIN)'`);
} catch(e) {}

// ============== PHASE 2: ROLES & PERMISSIONS ==============

// Channel categories for organizing channels
db.exec(`CREATE TABLE IF NOT EXISTS channel_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(server_id) REFERENCES servers(id)
)`);

// Add category_id to channels
try {
  sqliteDb.exec('ALTER TABLE channels ADD COLUMN category_id INTEGER');
} catch(e) {}

// Add position to channels for ordering
try {
  sqliteDb.exec('ALTER TABLE channels ADD COLUMN position INTEGER DEFAULT 0');
} catch(e) {}

// Channel permission overrides (per role or user)
db.exec(`CREATE TABLE IF NOT EXISTS channel_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER NOT NULL,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  permission TEXT NOT NULL,
  value INTEGER DEFAULT 1,
  UNIQUE(channel_id, target_type, target_id, permission),
  FOREIGN KEY(channel_id) REFERENCES channels(id)
)`);

// Audit log for moderation and server actions
db.exec(`CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER,
  action_type TEXT NOT NULL,
  actor_id INTEGER NOT NULL,
  target_type TEXT,
  target_id INTEGER,
  changes TEXT,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(server_id) REFERENCES servers(id),
  FOREIGN KEY(actor_id) REFERENCES users(id)
)`);

// Add hoist and mentionable columns to server_roles
try {
  sqliteDb.exec('ALTER TABLE server_roles ADD COLUMN hoist BOOLEAN DEFAULT 0');
} catch(e) {}
try {
  sqliteDb.exec('ALTER TABLE server_roles ADD COLUMN mentionable BOOLEAN DEFAULT 0');
} catch(e) {}

// Create default @everyone role for each server
try {
  const servers = sqliteDb.prepare('SELECT id FROM servers').all();
  servers.forEach(server => {
    const existingRole = sqliteDb.prepare('SELECT id FROM server_roles WHERE server_id = ? AND name = ?').get(server.id, '@everyone');
    if (!existingRole) {
      sqliteDb.prepare(`INSERT INTO server_roles (server_id, name, color, permissions, position) VALUES (?, '@everyone', '#99AAB5', '{"view_channels":true,"send_messages":true,"read_history":true}', 0)`).run(server.id);
    }
  });
} catch(e) {}

module.exports = db;
