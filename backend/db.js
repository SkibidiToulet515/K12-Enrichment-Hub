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

// ============== SHOP SYSTEM ==============

// Add coins to users
try {
  sqliteDb.exec('ALTER TABLE users ADD COLUMN coins INTEGER DEFAULT 100');
} catch(e) {}

// Shop categories
db.exec(`CREATE TABLE IF NOT EXISTS shop_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  description TEXT,
  position INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Shop items
db.exec(`CREATE TABLE IF NOT EXISTS shop_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 100,
  rarity TEXT DEFAULT 'common',
  item_type TEXT NOT NULL,
  css_class TEXT,
  css_vars TEXT,
  asset_url TEXT,
  metadata TEXT DEFAULT '{}',
  is_animated BOOLEAN DEFAULT 0,
  is_available BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(category_id) REFERENCES shop_categories(id)
)`);

// User purchases (what they own)
db.exec(`CREATE TABLE IF NOT EXISTS user_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  price_paid INTEGER NOT NULL,
  purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, item_id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(item_id) REFERENCES shop_items(id)
)`);

// User equipped items (what they're currently using)
db.exec(`CREATE TABLE IF NOT EXISTS user_equipped (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  slot TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  server_id INTEGER,
  equipped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, slot, server_id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(item_id) REFERENCES shop_items(id),
  FOREIGN KEY(server_id) REFERENCES servers(id)
)`);

// Coin transactions (history)
db.exec(`CREATE TABLE IF NOT EXISTS coin_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT,
  reference_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);

// Daily rewards tracking
db.exec(`CREATE TABLE IF NOT EXISTS daily_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  reward_date DATE NOT NULL,
  amount INTEGER NOT NULL,
  streak INTEGER DEFAULT 1,
  claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, reward_date),
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);

// Seed shop categories
try {
  sqliteDb.exec(`INSERT OR IGNORE INTO shop_categories (name, slug, icon, description, position) VALUES
    ('Themes', 'themes', '🎨', 'Custom color themes for your chat', 1),
    ('Profile Frames', 'frames', '🖼️', 'Stylish borders for your avatar', 2),
    ('Badges', 'badges', '🏅', 'Flair badges next to your name', 3),
    ('Chat Bubbles', 'bubbles', '💬', 'Customize how your messages look', 4),
    ('Sound Packs', 'sounds', '🔊', 'Custom notification sounds', 5),
    ('Animated Avatars', 'avatars', '✨', 'Pre-made animated profile pictures', 6),
    ('Server Cosmetics', 'server', '🏠', 'Icons and banners for your servers', 7),
    ('Status Effects', 'status', '🔴', 'Custom status indicators', 8),
    ('Bio Upgrades', 'bio', '📝', 'Enhance your profile bio', 9),
    ('Boosts', 'boosts', '🚀', 'Cosmetic boosts and effects', 10)`);
} catch(e) {}

// Seed shop items - Themes
try {
  sqliteDb.exec(`INSERT OR IGNORE INTO shop_items (category_id, name, slug, description, price, rarity, item_type, css_class, css_vars, is_animated) VALUES
    (1, 'Neon Galaxy', 'theme-neon-galaxy', 'A vibrant neon space theme', 500, 'rare', 'theme', 'theme-neon-galaxy', '{"--bg":"#0a0a1a","--bg-light":"#1a1a3a","--primary":"#00ffff","--secondary":"#ff00ff","--text":"#ffffff","--text-light":"#aaaaff"}', 0),
    (1, 'Sakura Pink', 'theme-sakura-pink', 'Soft cherry blossom colors', 400, 'uncommon', 'theme', 'theme-sakura-pink', '{"--bg":"#fff0f5","--bg-light":"#ffe4ec","--primary":"#ff69b4","--secondary":"#ff1493","--text":"#4a0025","--text-light":"#8b4563"}', 0),
    (1, 'Midnight Chrome', 'theme-midnight-chrome', 'Sleek dark chrome aesthetic', 600, 'rare', 'theme', 'theme-midnight-chrome', '{"--bg":"#0f0f0f","--bg-light":"#1f1f1f","--primary":"#c0c0c0","--secondary":"#808080","--text":"#e0e0e0","--text-light":"#a0a0a0"}', 0),
    (1, 'Glitch Hacker', 'theme-glitch-hacker', 'Matrix-style hacker theme', 800, 'epic', 'theme', 'theme-glitch-hacker', '{"--bg":"#000000","--bg-light":"#001100","--primary":"#00ff00","--secondary":"#00aa00","--text":"#00ff00","--text-light":"#00cc00"}', 1),
    (1, 'Sunset Pulse', 'theme-sunset-pulse', 'Warm sunset gradient vibes', 450, 'uncommon', 'theme', 'theme-sunset-pulse', '{"--bg":"#1a0a0a","--bg-light":"#2a1515","--primary":"#ff6b35","--secondary":"#f7931e","--text":"#fff5f0","--text-light":"#ffccbb"}', 0),
    (1, 'Blueprint Tech', 'theme-blueprint-tech', 'Technical blueprint style', 550, 'rare', 'theme', 'theme-blueprint-tech', '{"--bg":"#0a1628","--bg-light":"#152238","--primary":"#4fc3f7","--secondary":"#29b6f6","--text":"#e3f2fd","--text-light":"#90caf9"}', 0)`);
} catch(e) {}

// Seed shop items - Profile Frames
try {
  sqliteDb.exec(`INSERT OR IGNORE INTO shop_items (category_id, name, slug, description, price, rarity, item_type, css_class, is_animated) VALUES
    (2, 'Gold Trim', 'frame-gold-trim', 'Luxurious golden border', 300, 'uncommon', 'frame', 'frame-gold-trim', 0),
    (2, 'Pixel Frame', 'frame-pixel', 'Retro pixel art border', 250, 'common', 'frame', 'frame-pixel', 0),
    (2, 'Rainbow Wave', 'frame-rainbow-wave', 'Animated rainbow gradient', 700, 'epic', 'frame', 'frame-rainbow-wave', 1),
    (2, 'Carbon Fiber', 'frame-carbon-fiber', 'Sleek carbon fiber pattern', 350, 'uncommon', 'frame', 'frame-carbon-fiber', 0),
    (2, 'Fire Aura', 'frame-fire-aura', 'Blazing animated flames', 900, 'legendary', 'frame', 'frame-fire-aura', 1),
    (2, 'Frost Glow', 'frame-frost-glow', 'Icy crystalline glow', 650, 'rare', 'frame', 'frame-frost-glow', 1)`);
} catch(e) {}

// Seed shop items - Badges
try {
  sqliteDb.exec(`INSERT OR IGNORE INTO shop_items (category_id, name, slug, description, price, rarity, item_type, css_class, metadata) VALUES
    (3, 'Verified Star', 'badge-verified', '⭐ Verified badge', 1000, 'legendary', 'badge', 'badge-verified', '{"emoji":"⭐","label":"Verified"}'),
    (3, 'Dragon Rank', 'badge-dragon', '🐉 Dragon rank badge', 800, 'epic', 'badge', 'badge-dragon', '{"emoji":"🐉","label":"Dragon"}'),
    (3, 'VIP Crown', 'badge-vip', '👑 VIP member badge', 1200, 'legendary', 'badge', 'badge-vip', '{"emoji":"👑","label":"VIP"}'),
    (3, 'Speedrunner', 'badge-speedrunner', '⚡ Speedrunner badge', 400, 'rare', 'badge', 'badge-speedrunner', '{"emoji":"⚡","label":"Speed"}'),
    (3, 'OG Member', 'badge-og', '🔥 Original member badge', 600, 'epic', 'badge', 'badge-og', '{"emoji":"🔥","label":"OG"}'),
    (3, 'Prestige', 'badge-prestige', '💎 Prestige badge', 1500, 'legendary', 'badge', 'badge-prestige', '{"emoji":"💎","label":"Prestige"}'),
    (3, 'Brainiac', 'badge-brainiac', '🧠 Brainiac badge', 500, 'rare', 'badge', 'badge-brainiac', '{"emoji":"🧠","label":"Brainiac"}')`);
} catch(e) {}

// Seed shop items - Chat Bubbles
try {
  sqliteDb.exec(`INSERT OR IGNORE INTO shop_items (category_id, name, slug, description, price, rarity, item_type, css_class, is_animated) VALUES
    (4, 'Rounded Neon', 'bubble-neon', 'Glowing neon chat bubbles', 350, 'uncommon', 'bubble', 'bubble-neon', 1),
    (4, 'Pixel Chat', 'bubble-pixel', 'Retro pixel-style bubbles', 300, 'common', 'bubble', 'bubble-pixel', 0),
    (4, 'Gradient Wave', 'bubble-gradient', 'Smooth gradient messages', 400, 'uncommon', 'bubble', 'bubble-gradient', 0),
    (4, 'iMessage Style', 'bubble-imessage', 'Clean iMessage look', 450, 'rare', 'bubble', 'bubble-imessage', 0),
    (4, 'Terminal Hacker', 'bubble-terminal', 'Matrix terminal style', 550, 'rare', 'bubble', 'bubble-terminal', 0)`);
} catch(e) {}

// Seed shop items - Sound Packs
try {
  sqliteDb.exec(`INSERT OR IGNORE INTO shop_items (category_id, name, slug, description, price, rarity, item_type, asset_url, metadata) VALUES
    (5, 'Pop Pack', 'sound-pop', 'Satisfying pop sounds', 200, 'common', 'sound', '/sounds/pop.mp3', '{"sounds":{"message":"pop","mention":"pop-loud"}}'),
    (5, 'Laser Pack', 'sound-laser', 'Sci-fi laser effects', 300, 'uncommon', 'sound', '/sounds/laser.mp3', '{"sounds":{"message":"laser","mention":"laser-loud"}}'),
    (5, 'Arcade Chime', 'sound-arcade', 'Classic arcade sounds', 350, 'uncommon', 'sound', '/sounds/arcade.mp3', '{"sounds":{"message":"arcade","mention":"arcade-win"}}'),
    (5, 'Retro 8-bit', 'sound-8bit', 'Nostalgic 8-bit tones', 400, 'rare', 'sound', '/sounds/8bit.mp3', '{"sounds":{"message":"8bit","mention":"8bit-fanfare"}}'),
    (5, 'Power-up', 'sound-powerup', 'Game power-up sounds', 350, 'uncommon', 'sound', '/sounds/powerup.mp3', '{"sounds":{"message":"powerup","mention":"powerup-mega"}}')`);
} catch(e) {}

// Seed shop items - Animated Avatars
try {
  sqliteDb.exec(`INSERT OR IGNORE INTO shop_items (category_id, name, slug, description, price, rarity, item_type, asset_url, is_animated) VALUES
    (6, 'Glitch Avatar', 'avatar-glitch', 'Glitchy animated avatar', 600, 'rare', 'avatar', '/avatars/glitch.gif', 1),
    (6, 'Fire Swirl', 'avatar-fire', 'Fiery spinning avatar', 750, 'epic', 'avatar', '/avatars/fire.gif', 1),
    (6, 'Anime Sparkle', 'avatar-anime', 'Sparkling anime style', 500, 'rare', 'avatar', '/avatars/anime.gif', 1),
    (6, 'Pixel Spin', 'avatar-pixel', 'Rotating pixel art', 450, 'uncommon', 'avatar', '/avatars/pixel.gif', 1),
    (6, 'Rotating Planet', 'avatar-planet', 'Spinning planet avatar', 550, 'rare', 'avatar', '/avatars/planet.gif', 1)`);
} catch(e) {}

// Seed shop items - Server Cosmetics
try {
  sqliteDb.exec(`INSERT OR IGNORE INTO shop_items (category_id, name, slug, description, price, rarity, item_type, asset_url, metadata) VALUES
    (7, 'Gaming Icon Pack', 'server-icon-gaming', '10 gaming-themed icons', 400, 'uncommon', 'server_icon', '/icons/gaming/', '{"count":10}'),
    (7, 'Nature Icon Pack', 'server-icon-nature', '10 nature-themed icons', 350, 'common', 'server_icon', '/icons/nature/', '{"count":10}'),
    (7, 'Neon Banner', 'server-banner-neon', 'Animated neon banner', 800, 'epic', 'server_banner', '/banners/neon.gif', '{"animated":true}'),
    (7, 'Galaxy Banner', 'server-banner-galaxy', 'Space galaxy banner', 600, 'rare', 'server_banner', '/banners/galaxy.png', '{"animated":false}'),
    (7, 'Gradient Banner', 'server-banner-gradient', 'Smooth gradient banner', 450, 'uncommon', 'server_banner', '/banners/gradient.png', '{"animated":false}')`);
} catch(e) {}

// Seed shop items - Status Effects
try {
  sqliteDb.exec(`INSERT OR IGNORE INTO shop_items (category_id, name, slug, description, price, rarity, item_type, css_class, metadata, is_animated) VALUES
    (8, 'Animated DND', 'status-dnd-animated', '🔴 Pulsing Do Not Disturb', 400, 'rare', 'status', 'status-dnd-pulse', '{"emoji":"🔴","text":"Do Not Disturb"}', 1),
    (8, 'Studying Mode', 'status-studying', '✏️ Studying status', 200, 'common', 'status', 'status-studying', '{"emoji":"✏️","text":"Studying"}', 0),
    (8, 'Gaming Mode', 'status-gaming', '🎮 Gaming status', 200, 'common', 'status', 'status-gaming', '{"emoji":"🎮","text":"Gaming"}', 0),
    (8, 'Funny Offline', 'status-offline-funny', '💀 Funny offline status', 300, 'uncommon', 'status', 'status-dead', '{"emoji":"💀","text":"Dead Inside"}', 0),
    (8, 'Stealth Mode', 'status-stealth', '👤 Stealth mode status', 500, 'rare', 'status', 'status-stealth', '{"emoji":"👤","text":"Stealth Mode"}', 0)`);
} catch(e) {}

// Seed shop items - Bio Upgrades
try {
  sqliteDb.exec(`INSERT OR IGNORE INTO shop_items (category_id, name, slug, description, price, rarity, item_type, metadata) VALUES
    (9, 'Extended Bio', 'bio-extended', 'Increase bio to 500 characters', 300, 'uncommon', 'bio_upgrade', '{"maxLength":500}'),
    (9, 'Custom Fonts', 'bio-fonts', 'Use custom fonts in bio', 450, 'rare', 'bio_upgrade', '{"fonts":["Comic Sans","Courier","Impact"]}'),
    (9, 'Emoji Bio Line', 'bio-emoji', 'Add emoji-only bio line', 250, 'common', 'bio_upgrade', '{"emojiLine":true}'),
    (9, 'Multi-Section Bio', 'bio-sections', 'Multiple bio sections', 400, 'rare', 'bio_upgrade', '{"sections":3}')`);
} catch(e) {}

// Seed shop items - Boosts
try {
  sqliteDb.exec(`INSERT OR IGNORE INTO shop_items (category_id, name, slug, description, price, rarity, item_type, css_class, metadata, is_animated) VALUES
    (10, 'Rainbow Name', 'boost-rainbow-name', 'Animated rainbow username', 1000, 'legendary', 'boost', 'boost-rainbow-name', '{"effect":"rainbow"}', 1),
    (10, 'Name Underline', 'boost-underline', 'Animated underline effect', 600, 'epic', 'boost', 'boost-underline', '{"effect":"underline"}', 1),
    (10, 'Profile Glow', 'boost-glow', 'Glowing profile shadow', 700, 'epic', 'boost', 'boost-glow', '{"effect":"glow"}', 1),
    (10, 'Daily Bonus', 'boost-daily', '+50% daily coin bonus', 800, 'epic', 'boost', 'boost-daily', '{"coinBonus":1.5}', 0),
    (10, 'Message Highlight', 'boost-highlight', 'Highlighted messages every 20', 500, 'rare', 'boost', 'boost-highlight', '{"highlightEvery":20}', 0)`);
} catch(e) {}

// Create indices for shop tables
try {
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_shop_items_category ON shop_items(category_id)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_user_purchases_user ON user_purchases(user_id)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_user_equipped_user ON user_equipped(user_id)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_coin_transactions_user ON coin_transactions(user_id)');
} catch(e) {}

// ============== SITE CHANGELOGS ==============

db.exec(`CREATE TABLE IF NOT EXISTS changelogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  change_type TEXT DEFAULT 'feature',
  author_id INTEGER,
  is_published BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(author_id) REFERENCES users(id)
)`);

// Seed initial changelog entries
try {
  sqliteDb.exec(`INSERT OR IGNORE INTO changelogs (id, version, title, content, change_type, author_id) VALUES
    (1, '1.0.0', 'Welcome to Enrichment Hub!', 'Initial release of our K-12 learning portal featuring chat system, educational games, and social features.', 'feature', 1),
    (2, '1.1.0', 'Cosmetic Shop Added', 'New shop system with themes, profile frames, badges, chat bubbles, and more! Earn coins daily.', 'feature', 1),
    (3, '1.1.1', 'Server Invite System', 'Create custom invite links with expiry options and usage limits. Preview servers before joining.', 'feature', 1)`);
} catch(e) {}

// ============== CUSTOM KEYBOARD SHORTCUTS ==============

db.exec(`CREATE TABLE IF NOT EXISTS user_shortcuts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  shortcut TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, action),
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);

// Default shortcuts config (stored per user, but this is the template)
db.exec(`CREATE TABLE IF NOT EXISTS default_shortcuts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT UNIQUE NOT NULL,
  shortcut TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general'
)`);

// Seed default shortcuts
try {
  sqliteDb.exec(`INSERT OR IGNORE INTO default_shortcuts (action, shortcut, description, category) VALUES
    ('open_chat', 'c', 'Open chat panel', 'navigation'),
    ('open_games', 'g', 'Open games library', 'navigation'),
    ('open_profile', 'p', 'Open your profile', 'navigation'),
    ('focus_search', '/', 'Focus search bar', 'navigation'),
    ('return_dashboard', 'Escape', 'Return to dashboard', 'navigation'),
    ('open_shop', 's', 'Open the shop', 'navigation'),
    ('toggle_sidebar', 'b', 'Toggle sidebar', 'ui'),
    ('quick_switcher', 'ctrl+k', 'Open quick switcher', 'advanced'),
    ('command_palette', 'ctrl+shift+p', 'Open command palette', 'advanced'),
    ('new_message', 'n', 'Start new message', 'chat'),
    ('mark_read', 'm', 'Mark all as read', 'chat'),
    ('next_channel', 'alt+down', 'Next channel', 'chat'),
    ('prev_channel', 'alt+up', 'Previous channel', 'chat')`);
} catch(e) {}

// ============== ARCHIVE MODE ==============

db.exec(`CREATE TABLE IF NOT EXISTS archived_chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  chat_type TEXT NOT NULL,
  chat_id INTEGER NOT NULL,
  archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, chat_type, chat_id),
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);

// Add archived column to channels (for server-wide archiving by admins)
try {
  sqliteDb.exec('ALTER TABLE channels ADD COLUMN is_archived BOOLEAN DEFAULT 0');
} catch(e) {}

try {
  sqliteDb.exec('ALTER TABLE channels ADD COLUMN archived_at DATETIME');
} catch(e) {}

// Create indices for new tables
try {
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_changelogs_published ON changelogs(is_published)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_user_shortcuts_user ON user_shortcuts(user_id)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_archived_chats_user ON archived_chats(user_id)');
} catch(e) {}

// ============== FRIEND NOTES ==============

db.exec(`CREATE TABLE IF NOT EXISTS friend_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  friend_id INTEGER NOT NULL,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, friend_id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(friend_id) REFERENCES users(id)
)`);

// ============== POLLS ==============

db.exec(`CREATE TABLE IF NOT EXISTS polls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER,
  server_id INTEGER,
  creator_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  poll_type TEXT DEFAULT 'single',
  is_anonymous BOOLEAN DEFAULT 0,
  expires_at DATETIME,
  is_closed BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(channel_id) REFERENCES channels(id),
  FOREIGN KEY(server_id) REFERENCES servers(id),
  FOREIGN KEY(creator_id) REFERENCES users(id)
)`);

db.exec(`CREATE TABLE IF NOT EXISTS poll_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id INTEGER NOT NULL,
  option_text TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  FOREIGN KEY(poll_id) REFERENCES polls(id) ON DELETE CASCADE
)`);

db.exec(`CREATE TABLE IF NOT EXISTS poll_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id INTEGER NOT NULL,
  option_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(poll_id, user_id, option_id),
  FOREIGN KEY(poll_id) REFERENCES polls(id) ON DELETE CASCADE,
  FOREIGN KEY(option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);

// ============== USER PREFERENCES ==============

db.exec(`CREATE TABLE IF NOT EXISTS user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  theme_mode TEXT DEFAULT 'manual',
  auto_theme_schedule TEXT,
  tab_cloak_enabled BOOLEAN DEFAULT 0,
  tab_cloak_title TEXT,
  tab_cloak_favicon TEXT,
  panic_key TEXT DEFAULT '\`',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);

try {
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_friend_notes_user ON friend_notes(user_id)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_polls_channel ON polls(channel_id)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id)');
} catch(e) {}

module.exports = db;
