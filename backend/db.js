const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

let paramIndex = 0;
function convertParams(sql, params) {
  paramIndex = 0;
  const converted = sql.replace(/\?/g, () => `$${++paramIndex}`);
  return converted;
}

const db = {
  run: function(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    let pgSql = convertParams(sql, params);
    const isInsert = pgSql.trim().toUpperCase().startsWith('INSERT');
    if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
      pgSql = pgSql.replace(/;?\s*$/, '') + ' RETURNING id';
    }
    pool.query(pgSql, Array.isArray(params) ? params : [params])
      .then(result => {
        if (callback) callback.call({ lastID: result.rows[0]?.id, changes: result.rowCount }, null);
      })
      .catch(err => {
        if (callback) callback(err);
      });
  },

  get: function(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    const pgSql = convertParams(sql, params);
    pool.query(pgSql, Array.isArray(params) ? params : [params])
      .then(result => {
        callback(null, result.rows[0] || null);
      })
      .catch(err => {
        callback(err);
      });
  },

  all: function(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    const pgSql = convertParams(sql, params);
    pool.query(pgSql, Array.isArray(params) ? params : [params])
      .then(result => {
        callback(null, result.rows || []);
      })
      .catch(err => {
        callback(err);
      });
  },

  exec: function(sql, callback) {
    pool.query(sql)
      .then(() => {
        if (callback) callback(null);
      })
      .catch(err => {
        if (callback) callback(err);
      });
  }
};

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      profile_picture TEXT,
      role TEXT DEFAULT 'member',
      status TEXT DEFAULT 'offline',
      custom_status TEXT,
      custom_status_expiry TIMESTAMP,
      is_online BOOLEAN DEFAULT false,
      is_banned BOOLEAN DEFAULT false,
      ban_reason TEXT,
      ban_until TIMESTAMP,
      warning_count INTEGER DEFAULT 0,
      last_warning TEXT,
      coins INTEGER DEFAULT 1000,
      last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS servers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id INTEGER NOT NULL,
      icon TEXT,
      description TEXT,
      status TEXT DEFAULT 'active',
      needs_setup BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS server_members (
      id SERIAL PRIMARY KEY,
      server_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(server_id, user_id)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS channels (
      id SERIAL PRIMARY KEY,
      server_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category_id INTEGER,
      position INTEGER DEFAULT 0,
      is_archived BOOLEAN DEFAULT false,
      archived_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      channel_id INTEGER,
      group_chat_id INTEGER,
      dm_partner_id INTEGER,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      is_global BOOLEAN DEFAULT false,
      reply_to_id INTEGER,
      edited_at TIMESTAMP,
      is_edited BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS friends (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      friend_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, friend_id)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS group_chats (
      id SERIAL PRIMARY KEY,
      name TEXT,
      owner_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS group_chat_members (
      id SERIAL PRIMARY KEY,
      group_chat_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      UNIQUE(group_chat_id, user_id)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS server_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      server_name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      permissions TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      report_type TEXT NOT NULL,
      reported_user_id INTEGER,
      message_id INTEGER,
      server_id INTEGER,
      reporter_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      resolved_by INTEGER,
      action_taken TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS message_filters (
      id SERIAL PRIMARY KEY,
      filter_type TEXT NOT NULL,
      enabled BOOLEAN DEFAULT true,
      filter_data TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS blocked_words (
      id SERIAL PRIMARY KEY,
      word TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS game_categories (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      icon TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS games (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category_id INTEGER,
      url TEXT,
      thumbnail TEXT,
      play_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS favorites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      game_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, game_id)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS badges (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      icon TEXT,
      description TEXT,
      requirement_type TEXT,
      requirement_value INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS user_badges (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      badge_id INTEGER NOT NULL,
      earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, badge_id)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS message_reactions (
      id SERIAL PRIMARY KEY,
      message_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(message_id, user_id, emoji)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS pinned_messages (
      id SERIAL PRIMARY KEY,
      message_id INTEGER NOT NULL UNIQUE,
      channel_id INTEGER,
      group_chat_id INTEGER,
      pinned_by INTEGER NOT NULL,
      pinned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS server_roles (
      id SERIAL PRIMARY KEY,
      server_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#99AAB5',
      permissions TEXT DEFAULT '{}',
      position INTEGER DEFAULT 0,
      hoist BOOLEAN DEFAULT false,
      mentionable BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS server_member_roles (
      id SERIAL PRIMARY KEY,
      server_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      UNIQUE(server_id, user_id, role_id)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS server_invites (
      id SERIAL PRIMARY KEY,
      server_id INTEGER NOT NULL,
      code TEXT UNIQUE NOT NULL,
      created_by INTEGER NOT NULL,
      uses INTEGER DEFAULT 0,
      max_uses INTEGER DEFAULT 0,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS message_read_status (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      channel_id INTEGER,
      group_chat_id INTEGER,
      dm_partner_id INTEGER,
      is_global BOOLEAN DEFAULT false,
      last_read_message_id INTEGER DEFAULT 0,
      last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS attachments (
      id SERIAL PRIMARY KEY,
      message_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER,
      url TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS user_blocks (
      id SERIAL PRIMARY KEY,
      blocker_id INTEGER NOT NULL,
      blocked_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(blocker_id, blocked_id)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS channel_categories (
      id SERIAL PRIMARY KEY,
      server_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS channel_permissions (
      id SERIAL PRIMARY KEY,
      channel_id INTEGER NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      permission TEXT NOT NULL,
      value INTEGER DEFAULT 1,
      UNIQUE(channel_id, target_type, target_id, permission)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      server_id INTEGER,
      action_type TEXT NOT NULL,
      actor_id INTEGER NOT NULL,
      target_type TEXT,
      target_id INTEGER,
      changes TEXT,
      reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      target_id INTEGER,
      details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS shop_categories (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      icon TEXT,
      description TEXT,
      position INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS shop_items (
      id SERIAL PRIMARY KEY,
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
      is_animated BOOLEAN DEFAULT false,
      is_available BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS user_purchases (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      price_paid INTEGER NOT NULL,
      purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, item_id)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS user_equipped (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      slot TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      server_id INTEGER DEFAULT 0,
      equipped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, slot, server_id)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS coin_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      transaction_type TEXT NOT NULL,
      description TEXT,
      reference_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS daily_rewards (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      reward_date DATE NOT NULL,
      amount INTEGER NOT NULL,
      streak INTEGER DEFAULT 1,
      claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, reward_date)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS changelogs (
      id SERIAL PRIMARY KEY,
      version TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      change_type TEXT DEFAULT 'feature',
      author_id INTEGER,
      is_published BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS user_shortcuts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      shortcut TEXT NOT NULL,
      is_enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, action)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS default_shortcuts (
      id SERIAL PRIMARY KEY,
      action TEXT UNIQUE NOT NULL,
      shortcut TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'general'
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS archived_chats (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      chat_type TEXT NOT NULL,
      chat_id INTEGER NOT NULL,
      archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, chat_type, chat_id)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS friend_notes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      friend_id INTEGER NOT NULL,
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, friend_id)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS polls (
      id SERIAL PRIMARY KEY,
      channel_id INTEGER,
      server_id INTEGER,
      creator_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      poll_type TEXT DEFAULT 'single',
      is_anonymous BOOLEAN DEFAULT false,
      expires_at TIMESTAMP,
      is_closed BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS poll_options (
      id SERIAL PRIMARY KEY,
      poll_id INTEGER NOT NULL,
      option_text TEXT NOT NULL,
      position INTEGER DEFAULT 0
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS poll_votes (
      id SERIAL PRIMARY KEY,
      poll_id INTEGER NOT NULL,
      option_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(poll_id, user_id, option_id)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS activity_log (
      id SERIAL PRIMARY KEY,
      category TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      user_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_activity_log_category ON activity_log(category)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC)`);

    await client.query(`CREATE TABLE IF NOT EXISTS user_preferences (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE,
      theme_mode TEXT DEFAULT 'manual',
      auto_theme_schedule TEXT,
      tab_cloak_enabled BOOLEAN DEFAULT false,
      tab_cloak_title TEXT,
      tab_cloak_favicon TEXT,
      panic_key TEXT DEFAULT E'\`',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`INSERT INTO roles (name, permissions) VALUES 
      ('admin', 'full_control'),
      ('moderator', 'delete_message,mute_user,warn_user'),
      ('member', 'normal_user'),
      ('guest', 'read_only')
      ON CONFLICT (name) DO NOTHING`);

    await client.query(`INSERT INTO message_filters (filter_type, enabled, filter_data) VALUES
      ('profanity', true, '{}'),
      ('spam', true, '{}'),
      ('dangerous_links', true, '{}'),
      ('caps_spam', true, '{}')
      ON CONFLICT DO NOTHING`);

    await client.query(`INSERT INTO game_categories (name, icon) VALUES
      ('Action', '⚔️'),
      ('Racing', '🏎️'),
      ('Puzzle', '🧩'),
      ('Retro', '👾'),
      ('Sports', '⚽'),
      ('Brain Games', '🧠'),
      ('Sandbox', '🏗️'),
      ('School-Safe', '📚'),
      ('Horror', '👻'),
      ('Featured', '⭐')
      ON CONFLICT (name) DO NOTHING`);

    await client.query(`INSERT INTO badges (name, icon, description, requirement_type, requirement_value) VALUES
      ('Founder', '⭐', 'Early user of the platform', 'early_user', 0),
      ('Gamer', '🎮', 'Played 50+ games', 'game_plays', 50),
      ('Chatterbox', '💬', 'Sent 1000+ messages', 'messages_sent', 1000),
      ('Admin', '👑', 'Administrator role', 'role', 0),
      ('Smartie', '🧠', 'Completed 20 Brain Games', 'brain_games', 20),
      ('Helper', '🧑‍🏫', 'Moderator or helpful reports', 'helper', 0)
      ON CONFLICT (name) DO NOTHING`);

    const adminPassword = bcrypt.hashSync('0000P', 10);
    await client.query(`INSERT INTO users (id, username, password, role, coins) VALUES (1, 'admin', $1, 'admin', 1000) ON CONFLICT (username) DO NOTHING`, [adminPassword]);

    const yusoffPassword = bcrypt.hashSync('1124', 10);
    await client.query(`INSERT INTO users (id, username, password, role, coins) VALUES (2, 'Yusoff(ADMIN)', $1, 'admin', 1000) ON CONFLICT (username) DO NOTHING`, [yusoffPassword]);

    await client.query(`SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users))`);

    await client.query(`INSERT INTO servers (id, name, owner_id, description) VALUES (1, 'Welcome', 1, 'Official Welcome server - Admin only messaging') ON CONFLICT DO NOTHING`);
    await client.query(`SELECT setval('servers_id_seq', (SELECT COALESCE(MAX(id), 1) FROM servers))`);

    const channelExists = await client.query(`SELECT id FROM channels WHERE server_id = 1 AND name = 'rules-and-guidelines'`);
    if (channelExists.rows.length === 0) {
      await client.query(`INSERT INTO channels (server_id, name, description) VALUES (1, 'rules-and-guidelines', 'Read the rules here')`);
    }

    const losersExists = await client.query(`SELECT id FROM channels WHERE server_id = 1 AND name = 'losers'`);
    if (losersExists.rows.length === 0) {
      await client.query(`INSERT INTO channels (server_id, name, description) VALUES (1, 'losers', 'The Wall of Shame - Bans and Warnings')`);
    }

    await client.query(`INSERT INTO shop_categories (name, slug, icon, description, position) VALUES
      ('Themes', 'themes', '🎨', 'Custom color themes for your chat', 1),
      ('Profile Frames', 'frames', '🖼️', 'Stylish borders for your avatar', 2),
      ('Badges', 'badges', '🏅', 'Flair badges next to your name', 3),
      ('Chat Bubbles', 'bubbles', '💬', 'Customize how your messages look', 4),
      ('Sound Packs', 'sounds', '🔊', 'Custom notification sounds', 5),
      ('Animated Avatars', 'avatars', '✨', 'Pre-made animated profile pictures', 6),
      ('Server Cosmetics', 'server', '🏠', 'Icons and banners for your servers', 7),
      ('Status Effects', 'status', '🔴', 'Custom status indicators', 8),
      ('Bio Upgrades', 'bio', '📝', 'Enhance your profile bio', 9),
      ('Boosts', 'boosts', '🚀', 'Cosmetic boosts and effects', 10)
      ON CONFLICT (slug) DO NOTHING`);

    await client.query(`INSERT INTO shop_items (category_id, name, slug, description, price, rarity, item_type, css_class, css_vars, is_animated) VALUES
      (1, 'Neon Galaxy', 'theme-neon-galaxy', 'A vibrant neon space theme', 500, 'rare', 'theme', 'theme-neon-galaxy', '{"--bg":"#0a0a1a","--bg-light":"#1a1a3a","--primary":"#00ffff","--secondary":"#ff00ff","--text":"#ffffff","--text-light":"#aaaaff"}', false),
      (1, 'Sakura Pink', 'theme-sakura-pink', 'Soft cherry blossom colors', 400, 'uncommon', 'theme', 'theme-sakura-pink', '{"--bg":"#fff0f5","--bg-light":"#ffe4ec","--primary":"#ff69b4","--secondary":"#ff1493","--text":"#4a0025","--text-light":"#8b4563"}', false),
      (1, 'Midnight Chrome', 'theme-midnight-chrome', 'Sleek dark chrome aesthetic', 600, 'rare', 'theme', 'theme-midnight-chrome', '{"--bg":"#0f0f0f","--bg-light":"#1f1f1f","--primary":"#c0c0c0","--secondary":"#808080","--text":"#e0e0e0","--text-light":"#a0a0a0"}', false),
      (1, 'Glitch Hacker', 'theme-glitch-hacker', 'Matrix-style hacker theme', 800, 'epic', 'theme', 'theme-glitch-hacker', '{"--bg":"#000000","--bg-light":"#001100","--primary":"#00ff00","--secondary":"#00aa00","--text":"#00ff00","--text-light":"#00cc00"}', true),
      (1, 'Sunset Pulse', 'theme-sunset-pulse', 'Warm sunset gradient vibes', 450, 'uncommon', 'theme', 'theme-sunset-pulse', '{"--bg":"#1a0a0a","--bg-light":"#2a1515","--primary":"#ff6b35","--secondary":"#f7931e","--text":"#fff5f0","--text-light":"#ffccbb"}', false),
      (1, 'Blueprint Tech', 'theme-blueprint-tech', 'Technical blueprint style', 550, 'rare', 'theme', 'theme-blueprint-tech', '{"--bg":"#0a1628","--bg-light":"#152238","--primary":"#4fc3f7","--secondary":"#29b6f6","--text":"#e3f2fd","--text-light":"#90caf9"}', false)
      ON CONFLICT (slug) DO NOTHING`);

    await client.query(`INSERT INTO shop_items (category_id, name, slug, description, price, rarity, item_type, css_class, is_animated) VALUES
      (2, 'Gold Trim', 'frame-gold-trim', 'Luxurious golden border', 300, 'uncommon', 'frame', 'frame-gold-trim', false),
      (2, 'Pixel Frame', 'frame-pixel', 'Retro pixel art border', 250, 'common', 'frame', 'frame-pixel', false),
      (2, 'Rainbow Wave', 'frame-rainbow-wave', 'Animated rainbow gradient', 700, 'epic', 'frame', 'frame-rainbow-wave', true),
      (2, 'Carbon Fiber', 'frame-carbon-fiber', 'Sleek carbon fiber pattern', 350, 'uncommon', 'frame', 'frame-carbon-fiber', false),
      (2, 'Fire Aura', 'frame-fire-aura', 'Blazing animated flames', 900, 'legendary', 'frame', 'frame-fire-aura', true),
      (2, 'Frost Glow', 'frame-frost-glow', 'Icy crystalline glow', 650, 'rare', 'frame', 'frame-frost-glow', true)
      ON CONFLICT (slug) DO NOTHING`);

    await client.query(`INSERT INTO shop_items (category_id, name, slug, description, price, rarity, item_type, css_class, metadata) VALUES
      (3, 'Verified Star', 'badge-verified', '⭐ Verified badge', 1000, 'legendary', 'badge', 'badge-verified', '{"emoji":"⭐","label":"Verified"}'),
      (3, 'Dragon Rank', 'badge-dragon', '🐉 Dragon rank badge', 800, 'epic', 'badge', 'badge-dragon', '{"emoji":"🐉","label":"Dragon"}'),
      (3, 'VIP Crown', 'badge-vip', '👑 VIP member badge', 1200, 'legendary', 'badge', 'badge-vip', '{"emoji":"👑","label":"VIP"}'),
      (3, 'Speedrunner', 'badge-speedrunner', '⚡ Speedrunner badge', 400, 'rare', 'badge', 'badge-speedrunner', '{"emoji":"⚡","label":"Speed"}'),
      (3, 'OG Member', 'badge-og', '🔥 Original member badge', 600, 'epic', 'badge', 'badge-og', '{"emoji":"🔥","label":"OG"}'),
      (3, 'Prestige', 'badge-prestige', '💎 Prestige badge', 1500, 'legendary', 'badge', 'badge-prestige', '{"emoji":"💎","label":"Prestige"}'),
      (3, 'Brainiac', 'badge-brainiac', '🧠 Brainiac badge', 500, 'rare', 'badge', 'badge-brainiac', '{"emoji":"🧠","label":"Brainiac"}'),
      (3, 'Daily Champion', 'daily-special-badge', '🏆 8-day streak reward badge', 0, 'legendary', 'badge', 'badge-daily-champion', '{"emoji":"🏆","label":"Champion"}')
      ON CONFLICT (slug) DO NOTHING`);

    await client.query(`INSERT INTO shop_items (category_id, name, slug, description, price, rarity, item_type, css_class, is_animated) VALUES
      (4, 'Rounded Neon', 'bubble-neon', 'Glowing neon chat bubbles', 350, 'uncommon', 'bubble', 'bubble-neon', true),
      (4, 'Pixel Chat', 'bubble-pixel', 'Retro pixel-style bubbles', 300, 'common', 'bubble', 'bubble-pixel', false),
      (4, 'Gradient Wave', 'bubble-gradient', 'Smooth gradient messages', 400, 'uncommon', 'bubble', 'bubble-gradient', false),
      (4, 'iMessage Style', 'bubble-imessage', 'Clean iMessage look', 450, 'rare', 'bubble', 'bubble-imessage', false),
      (4, 'Terminal Hacker', 'bubble-terminal', 'Matrix terminal style', 550, 'rare', 'bubble', 'bubble-terminal', false)
      ON CONFLICT (slug) DO NOTHING`);

    await client.query(`INSERT INTO default_shortcuts (action, shortcut, description, category) VALUES
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
      ('prev_channel', 'alt+up', 'Previous channel', 'chat')
      ON CONFLICT (action) DO NOTHING`);

    await client.query(`INSERT INTO changelogs (version, title, content, change_type, author_id) VALUES
      ('1.0.0', 'Welcome to Enrichment Hub!', 'Initial release of our K-12 learning portal featuring chat system, educational games, and social features.', 'feature', 1),
      ('1.1.0', 'Cosmetic Shop Added', 'New shop system with themes, profile frames, badges, chat bubbles, and more! Earn coins daily.', 'feature', 1),
      ('1.1.1', 'Server Invite System', 'Create custom invite links with expiry options and usage limits. Preview servers before joining.', 'feature', 1)
      ON CONFLICT DO NOTHING`);

    console.log('PostgreSQL database initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
  } finally {
    client.release();
  }
}

initDatabase();

module.exports = db;
