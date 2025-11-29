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

// Sign up
router.post('/signup', upload.single('profilePicture'), (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
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
    `INSERT INTO users (username, password, profile_picture) VALUES (?, ?, ?)`,
    [username, hashedPassword, profilePicture],
    function(err) {
      if (err) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const token = jwt.sign({ userId: this.lastID, username }, SECRET_KEY);
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
    res.json({ 
      success: true, 
      userId: user.id, 
      username: user.username, 
      profilePicture: user.profile_picture,
      role: user.role,
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
  db.all('SELECT id, username, profile_picture, is_online FROM users WHERE is_online = 1', 
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

module.exports = router;
