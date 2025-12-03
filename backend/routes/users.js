const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const db = require('../db');

const router = express.Router();
const upload = multer({ dest: 'frontend/uploads/' });
const SECRET_KEY = 'real_user_auth_secret_2025';

// REAL USER SIGNUP (NOT connected to cover login)
router.post('/signup', upload.single('profilePicture'), (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (username === 'admin') {
    return res.status(400).json({ error: 'Username not available' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  let profilePicture = null;

  if (req.file) {
    const ext = path.extname(req.file.originalname);
    const newPath = `uploads/${Date.now()}${ext}`;
    fs.renameSync(req.file.path, path.join(__dirname, '../../frontend', newPath));
    profilePicture = `/${newPath}`;
  }

  db.run(
    `INSERT INTO users (username, password, profile_picture)
    VALUES (?, ?, ?)`,
    [username, hashedPassword, profilePicture],
    function(err) {
      if (err) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const userId = this.lastID;
      const token = jwt.sign({ userId, username }, SECRET_KEY);
      
      // Auto-add to Welcome server (ID: 1) with Rules and Moderation Logs channels
      db.run('INSERT OR IGNORE INTO server_members (server_id, user_id) VALUES (?, ?)', [1, userId], () => {});
      
      res.json({
        success: true,
        userId,
        username,
        profilePicture,
        token
      });
    }
  );
});

// REAL USER LOGIN (NOT connected to cover login)
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Prevent using cover credentials
  if (username === 'admin') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Allow both regular users and admin accounts to login
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, SECRET_KEY);
    res.json({
      success: true,
      userId: user.id,
      username: user.username,
      profilePicture: user.profile_picture,
      token
    });
  });
});

// Search user by username
router.get('/search', (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }
  
  db.get('SELECT id, username, profile_picture FROM users WHERE username = ?', [username], (err, user) => {
    if (user) {
      res.json({
        id: user.id,
        username: user.username,
        profilePicture: user.profile_picture
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
});

// Search all users by partial username match (for quick switcher) - requires auth
router.get('/search-all', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    jwt.verify(token, SECRET_KEY);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  const { q } = req.query;
  if (!q || q.length < 2) {
    return res.json([]);
  }
  
  db.all(`
    SELECT id, username, profile_picture, is_online 
    FROM users 
    WHERE username LIKE ? 
    ORDER BY is_online DESC, username ASC
    LIMIT 10
  `, [`%${q}%`], (err, users) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(users || []);
  });
});

// Get user profile (returns camelCase to match frontend)
router.get('/:userId', (req, res) => {
  db.get('SELECT id, username, profile_picture, created_at FROM users WHERE id = ?', [req.params.userId], (err, user) => {
    if (user) {
      res.json({
        id: user.id,
        username: user.username,
        profilePicture: user.profile_picture,
        createdAt: user.created_at
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
});

// Update profile picture
router.post('/:userId/avatar', upload.single('profilePicture'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const ext = path.extname(req.file.originalname);
  const newPath = `uploads/${Date.now()}${ext}`;
  fs.renameSync(req.file.path, path.join(__dirname, '../../frontend', newPath));
  const profilePicture = `/${newPath}`;

  db.run('UPDATE users SET profile_picture = ? WHERE id = ?', [profilePicture, req.params.userId], () => {
    res.json({ success: true, profilePicture });
  });
});

// Get/Update user status
router.get('/:userId/status', (req, res) => {
  db.get('SELECT status, custom_status, custom_status_expiry, is_online FROM users WHERE id = ?', 
    [req.params.userId], (err, user) => {
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      // Check if custom status has expired
      if (user.custom_status_expiry && new Date(user.custom_status_expiry) < new Date()) {
        db.run('UPDATE users SET custom_status = NULL, custom_status_expiry = NULL WHERE id = ?', 
          [req.params.userId], () => {});
        user.custom_status = null;
        user.custom_status_expiry = null;
      }
      
      res.json({
        status: user.status || 'offline',
        customStatus: user.custom_status,
        customStatusExpiry: user.custom_status_expiry,
        isOnline: user.is_online
      });
    });
});

router.patch('/:userId/status', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  let requesterId;
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    requesterId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (requesterId !== parseInt(req.params.userId)) {
    return res.status(403).json({ error: 'Can only update your own status' });
  }
  
  const { status, customStatus, customStatusExpiry } = req.body;
  const validStatuses = ['online', 'away', 'dnd', 'invisible', 'offline'];
  
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  const updates = [];
  const params = [];
  
  if (status) {
    updates.push('status = ?');
    params.push(status);
  }
  if (customStatus !== undefined) {
    updates.push('custom_status = ?');
    params.push(customStatus ? customStatus.substring(0, 128) : null);
  }
  if (customStatusExpiry !== undefined) {
    updates.push('custom_status_expiry = ?');
    params.push(customStatusExpiry);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No updates provided' });
  }
  
  params.push(req.params.userId);
  
  db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params, (err) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true });
  });
});

// Get user full profile with mutual servers/friends
router.get('/:userId/profile', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  let requesterId;
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    requesterId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const targetId = parseInt(req.params.userId);
  
  // Check if blocked
  db.get('SELECT id FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?', 
    [targetId, requesterId], (err, blocked) => {
      if (blocked) {
        return res.status(403).json({ error: 'You cannot view this profile' });
      }
      
      db.get(`SELECT id, username, profile_picture, status, custom_status, is_online, created_at 
              FROM users WHERE id = ?`, [targetId], (err, user) => {
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        // Get mutual servers
        db.all(`
          SELECT s.id, s.name 
          FROM servers s
          JOIN server_members sm1 ON s.id = sm1.server_id AND sm1.user_id = ?
          JOIN server_members sm2 ON s.id = sm2.server_id AND sm2.user_id = ?
        `, [requesterId, targetId], (err, mutualServers) => {
          
          // Get mutual friends
          db.all(`
            SELECT u.id, u.username, u.profile_picture
            FROM friends f1
            JOIN friends f2 ON f1.friend_id = f2.friend_id
            JOIN users u ON f1.friend_id = u.id
            WHERE f1.user_id = ? AND f2.user_id = ? AND f1.status = 'accepted' AND f2.status = 'accepted'
          `, [requesterId, targetId], (err, mutualFriends) => {
            
            // Check friendship status
            db.get(`SELECT status FROM friends WHERE user_id = ? AND friend_id = ?`, 
              [requesterId, targetId], (err, friendship) => {
                
                // Check if requester blocked target
                db.get('SELECT id FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?',
                  [requesterId, targetId], (err, isBlocked) => {
                    
                    res.json({
                      id: user.id,
                      username: user.username,
                      profilePicture: user.profile_picture,
                      status: user.status || 'offline',
                      customStatus: user.custom_status,
                      isOnline: user.is_online,
                      createdAt: user.created_at,
                      mutualServers: mutualServers || [],
                      mutualFriends: mutualFriends || [],
                      friendshipStatus: friendship?.status || null,
                      isBlocked: !!isBlocked
                    });
                  });
              });
          });
        });
      });
    });
});

module.exports = router;
