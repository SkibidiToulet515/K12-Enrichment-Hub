const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const logger = require('../logger');

const router = express.Router();
const upload = multer({ dest: 'frontend/uploads/' });
const { JWT_SECRET } = require('../config');
const SECRET_KEY = JWT_SECRET;

// Sign up
router.post('/signup', upload.single('profilePicture'), (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  let profilePicture = null;

  if (req.file) {
    try {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const newPath = `uploads/${Date.now()}${ext}`;
      fs.renameSync(req.file.path, path.join(__dirname, '../../frontend', newPath));
      profilePicture = `/${newPath}`;
    } catch (fileErr) {
      console.error('File upload error:', fileErr);
      // Continue without profile picture if file operation fails
    }
  }

  db.run(
    `INSERT INTO users (username, password, profile_picture) VALUES (?, ?, ?)`,
    [username, hashedPassword, profilePicture],
    function(err) {
      if (err) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const token = jwt.sign({ userId: this.lastID, username }, SECRET_KEY);
      logger.auth('User registered', { username, userId: this.lastID }, this.lastID);
      
      // Set HTTP-only cookie for server-side auth
      res.cookie('authToken', token, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
      });
      
      res.json({ 
        success: true, 
        userId: this.lastID, 
        username, 
        profilePicture,
        token 
      });
    }
  );
});

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, SECRET_KEY);
    logger.auth('User logged in', { username: user.username, userId: user.id, role: user.role }, user.id);
    
    // Set HTTP-only cookie for server-side auth
    res.cookie('authToken', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });
    
    res.json({ 
      success: true, 
      userId: user.id, 
      username: user.username, 
      profilePicture: user.profile_picture,
      role: user.role,
      isAdmin: user.is_admin,
      token 
    });
  });
});

// Update profile picture
router.post('/update-picture', upload.single('profilePicture'), (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  let userId;
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const ext = path.extname(req.file.originalname);
  const newPath = `uploads/${Date.now()}${ext}`;
  fs.renameSync(req.file.path, path.join(__dirname, '../../frontend', newPath));
  const profilePicture = `/${newPath}`;

  db.run('UPDATE users SET profile_picture = ? WHERE id = ?', [profilePicture, userId], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }
    res.json({ success: true, profilePicture });
  });
});

// Upload avatar alias
router.post('/upload-avatar', upload.single('profilePicture'), (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  let userId;
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const ext = path.extname(req.file.originalname);
  const newPath = `uploads/${Date.now()}${ext}`;
  fs.renameSync(req.file.path, path.join(__dirname, '../../frontend', newPath));
  const profilePicture = `/${newPath}`;

  db.run('UPDATE users SET profile_picture = ? WHERE id = ?', [profilePicture, userId], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }
    res.json({ success: true, profilePicture });
  });
});

// Remove avatar
router.post('/remove-avatar', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  let userId;
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  db.run('UPDATE users SET profile_picture = NULL WHERE id = ?', [userId], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to remove avatar' });
    }
    res.json({ success: true });
  });
});

// Get user
router.get('/user/:id', (req, res) => {
  db.get('SELECT id, username, profile_picture, role, is_online FROM users WHERE id = ?', 
    [req.params.id], (err, user) => {
      if (user) {
        res.json(user);
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    });
});

// Get all online users
router.get('/users/online', (req, res) => {
  db.all('SELECT id, username, profile_picture, is_online FROM users WHERE is_online = TRUE', 
    (err, users) => {
      res.json(users || []);
    });
});

// Change username
router.post('/change-username', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { newUsername } = req.body;
  
  if (!newUsername || newUsername.trim().length === 0) {
    return res.status(400).json({ error: 'Username cannot be empty' });
  }

  if (newUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  if (newUsername.length > 20) {
    return res.status(400).json({ error: 'Username must be at most 20 characters' });
  }

  let userId;
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  db.run('UPDATE users SET username = ? WHERE id = ?', [newUsername, userId], function(err) {
    if (err) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Return new token with updated username
    const newToken = jwt.sign({ userId, username: newUsername, role: 'user' }, SECRET_KEY);
    res.json({ 
      success: true, 
      username: newUsername,
      token: newToken
    });
  });
});

// Delete account
router.delete('/delete-account', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  let userId;
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Delete user data from all related tables
  const deletions = [
    'DELETE FROM messages WHERE user_id = ?',
    'DELETE FROM friends WHERE user_id = ? OR friend_id = ?',
    'DELETE FROM user_xp WHERE user_id = ?',
    'DELETE FROM achievements WHERE user_id = ?',
    'DELETE FROM user_activity WHERE user_id = ?',
    'DELETE FROM tasks WHERE user_id = ?',
    'DELETE FROM friend_notes WHERE user_id = ? OR target_user_id = ?',
    'DELETE FROM poll_votes WHERE user_id = ?',
    'DELETE FROM user_preferences WHERE user_id = ?',
    'DELETE FROM user_shortcuts WHERE user_id = ?',
    'DELETE FROM user_purchases WHERE user_id = ?',
    'DELETE FROM user_equipped WHERE user_id = ?',
    'DELETE FROM coin_transactions WHERE user_id = ?',
    'DELETE FROM daily_rewards WHERE user_id = ?',
    'DELETE FROM archived_chats WHERE user_id = ?',
    'DELETE FROM bookmarks WHERE user_id = ?',
    'DELETE FROM users WHERE id = ?'
  ];

  let completed = 0;
  let hasError = false;

  deletions.forEach(sql => {
    const params = sql.includes('friend_id') || sql.includes('target_user_id') 
      ? [userId, userId] 
      : [userId];
    
    db.run(sql, params, (err) => {
      if (err && !hasError) {
        console.error('Delete error:', err.message, sql);
      }
      completed++;
      
      if (completed === deletions.length && !hasError) {
        logger.auth('User deleted account', { userId }, userId);
        res.json({ success: true, message: 'Account deleted successfully' });
      }
    });
  });
});

// Guest session
router.post('/guest', (req, res) => {
  const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const guestUsername = `Guest_${Math.random().toString(36).substr(2, 6)}`;
  
  const token = jwt.sign({ 
    userId: guestId, 
    username: guestUsername,
    isGuest: true 
  }, SECRET_KEY, { expiresIn: '24h' });
  
  res.json({
    success: true,
    token,
    user: {
      id: guestId,
      username: guestUsername,
      isGuest: true
    }
  });
});

module.exports = router;
