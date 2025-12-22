const express = require('express');
const db = require('../db');
const jwt = require('jsonwebtoken');
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

router.get('/messages', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { q, channelId, serverId, userId: searchUserId, limit = 50 } = req.query;
  
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }
  
  let sql = `
    SELECT m.*, u.username, u.profile_picture,
           c.name as channel_name, s.name as server_name, s.id as server_id
    FROM messages m
    JOIN users u ON m.user_id = u.id
    LEFT JOIN channels c ON m.channel_id = c.id
    LEFT JOIN servers s ON c.server_id = s.id
    WHERE m.content LIKE ?
  `;
  const params = [`%${q}%`];
  
  if (channelId) {
    sql += ' AND m.channel_id = ?';
    params.push(channelId);
  }
  
  if (serverId) {
    sql += ' AND c.server_id = ?';
    params.push(serverId);
  }
  
  if (searchUserId) {
    sql += ' AND m.user_id = ?';
    params.push(searchUserId);
  }
  
  sql += ` ORDER BY m.created_at DESC LIMIT ?`;
  params.push(parseInt(limit));
  
  db.all(sql, params, (err, messages) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(messages || []);
  });
});

router.get('/users', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { q, limit = 20 } = req.query;
  
  if (!q || q.trim().length < 1) {
    return res.status(400).json({ error: 'Query required' });
  }
  
  db.all(`
    SELECT id, username, profile_picture, is_online, status
    FROM users
    WHERE username LIKE ?
    ORDER BY is_online DESC, username ASC
    LIMIT ?
  `, [`%${q}%`, parseInt(limit)], (err, users) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(users || []);
  });
});

router.get('/servers', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { q, limit = 20 } = req.query;
  
  if (!q || q.trim().length < 1) {
    return res.status(400).json({ error: 'Query required' });
  }
  
  db.all(`
    SELECT s.*, 
           (SELECT COUNT(*) FROM server_members WHERE server_id = s.id) as member_count,
           CASE WHEN sm.user_id IS NOT NULL THEN 1 ELSE 0 END as is_member
    FROM servers s
    LEFT JOIN server_members sm ON s.id = sm.server_id AND sm.user_id = ?
    WHERE s.name LIKE ? AND s.status = 'active'
    ORDER BY member_count DESC
    LIMIT ?
  `, [userId, `%${q}%`, parseInt(limit)], (err, servers) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(servers || []);
  });
});

router.get('/unified', async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { q, types } = req.query;
  if (!q || q.length < 2) return res.json({ results: [], grouped: {} });

  const searchTerm = `%${q.toLowerCase()}%`;
  const searchTypes = types ? types.split(',') : ['games', 'users', 'forums', 'tasks', 'messages', 'channels', 'servers'];
  const results = { games: [], users: [], forums: [], tasks: [], messages: [], channels: [], servers: [] };

  const searches = [];

  if (searchTypes.includes('games')) {
    searches.push(new Promise((resolve) => {
      db.all(`
        SELECT id, title, description, category, 'game' as type
        FROM games 
        WHERE LOWER(title) LIKE ? OR LOWER(description) LIKE ?
        LIMIT 8
      `, [searchTerm, searchTerm], (err, rows) => {
        if (!err && rows) results.games = rows;
        resolve();
      });
    }));
  }

  if (searchTypes.includes('users')) {
    searches.push(new Promise((resolve) => {
      db.all(`
        SELECT id, username, profile_picture, bio, is_online, 'user' as type
        FROM users 
        WHERE LOWER(username) LIKE ? OR LOWER(bio) LIKE ?
        LIMIT 8
      `, [searchTerm, searchTerm], (err, rows) => {
        if (!err && rows) results.users = rows;
        resolve();
      });
    }));
  }

  if (searchTypes.includes('forums')) {
    searches.push(new Promise((resolve) => {
      db.all(`
        SELECT fp.id, fp.title, fp.content, fc.name as category_name, 'forum' as type
        FROM forum_posts fp
        LEFT JOIN forum_categories fc ON fp.category_id = fc.id
        WHERE LOWER(fp.title) LIKE ? OR LOWER(fp.content) LIKE ?
        ORDER BY fp.created_at DESC
        LIMIT 8
      `, [searchTerm, searchTerm], (err, rows) => {
        if (!err && rows) results.forums = rows;
        resolve();
      });
    }));
  }

  if (searchTypes.includes('tasks')) {
    searches.push(new Promise((resolve) => {
      db.all(`
        SELECT id, title, description, priority, completed, 'task' as type
        FROM user_tasks 
        WHERE user_id = ? AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?)
        ORDER BY created_at DESC
        LIMIT 8
      `, [userId, searchTerm, searchTerm], (err, rows) => {
        if (!err && rows) results.tasks = rows;
        resolve();
      });
    }));
  }

  if (searchTypes.includes('messages')) {
    searches.push(new Promise((resolve) => {
      db.all(`
        SELECT m.id, m.content, m.created_at, c.name as channel_name, u.username as sender, 'message' as type
        FROM messages m
        LEFT JOIN channels c ON m.channel_id = c.id
        LEFT JOIN users u ON m.user_id = u.id
        WHERE LOWER(m.content) LIKE ?
        ORDER BY m.created_at DESC
        LIMIT 8
      `, [searchTerm], (err, rows) => {
        if (!err && rows) results.messages = rows;
        resolve();
      });
    }));
  }

  if (searchTypes.includes('channels')) {
    searches.push(new Promise((resolve) => {
      db.all(`
        SELECT c.id, c.name, c.description, s.name as server_name, 'channel' as type
        FROM channels c
        LEFT JOIN servers s ON c.server_id = s.id
        WHERE LOWER(c.name) LIKE ? OR LOWER(c.description) LIKE ?
        LIMIT 8
      `, [searchTerm, searchTerm], (err, rows) => {
        if (!err && rows) results.channels = rows;
        resolve();
      });
    }));
  }

  if (searchTypes.includes('servers')) {
    searches.push(new Promise((resolve) => {
      db.all(`
        SELECT id, name, description, icon, 'server' as type
        FROM servers 
        WHERE LOWER(name) LIKE ? OR LOWER(description) LIKE ?
        LIMIT 8
      `, [searchTerm, searchTerm], (err, rows) => {
        if (!err && rows) results.servers = rows;
        resolve();
      });
    }));
  }

  await Promise.all(searches);

  const allResults = [
    ...results.games,
    ...results.users,
    ...results.forums,
    ...results.tasks,
    ...results.messages,
    ...results.channels,
    ...results.servers
  ];

  db.run(`
    INSERT INTO search_history (user_id, query, result_type, result_id)
    VALUES (?, ?, 'mixed', ?)
  `, [userId, q, allResults.length.toString()]);

  res.json({ 
    results: allResults,
    grouped: results,
    total: allResults.length
  });
});

router.get('/recent', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  db.all(`
    SELECT DISTINCT query, MAX(searched_at) as last_searched, COUNT(*) as search_count
    FROM search_history 
    WHERE user_id = ?
    GROUP BY query
    ORDER BY search_count DESC, last_searched DESC
    LIMIT 10
  `, [userId], (err, searches) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(searches || []);
  });
});

router.delete('/recent', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  db.run('DELETE FROM search_history WHERE user_id = ?', [userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
