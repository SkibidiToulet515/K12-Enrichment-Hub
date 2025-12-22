const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { JWT_SECRET } = require('../config');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../frontend/uploads/customization');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'));
    }
  }
});

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

// Get user's customization settings
router.get('/settings', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  db.get(`SELECT * FROM user_customization WHERE user_id = ?`, [userId], (err, settings) => {
    if (err) {
      console.error('Get customization error:', err);
      return res.status(500).json({ error: 'Failed to get settings' });
    }
    res.json(settings || { 
      wallpaper_url: null, 
      wallpaper_type: 'default',
      profile_banner_url: null,
      dashboard_layout: '{}'
    });
  });
});

// Upload custom wallpaper
router.post('/wallpaper', upload.single('wallpaper'), (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const wallpaperUrl = `/uploads/customization/${req.file.filename}`;

  db.run(`
    INSERT INTO user_customization (user_id, wallpaper_url, wallpaper_type)
    VALUES (?, ?, 'custom')
    ON CONFLICT (user_id) 
    DO UPDATE SET wallpaper_url = EXCLUDED.wallpaper_url, wallpaper_type = 'custom', updated_at = CURRENT_TIMESTAMP
  `, [userId, wallpaperUrl], function(err) {
    if (err) {
      console.error('Save wallpaper error:', err);
      return res.status(500).json({ error: 'Failed to save wallpaper' });
    }
    res.json({ success: true, wallpaper_url: wallpaperUrl });
  });
});

// Set wallpaper URL (for preset or external URLs)
router.post('/wallpaper/url', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { url, type } = req.body;

  db.run(`
    INSERT INTO user_customization (user_id, wallpaper_url, wallpaper_type)
    VALUES (?, ?, ?)
    ON CONFLICT (user_id) 
    DO UPDATE SET wallpaper_url = EXCLUDED.wallpaper_url, wallpaper_type = EXCLUDED.wallpaper_type, updated_at = CURRENT_TIMESTAMP
  `, [userId, url || null, type || 'default'], function(err) {
    if (err) {
      console.error('Set wallpaper URL error:', err);
      return res.status(500).json({ error: 'Failed to set wallpaper' });
    }
    res.json({ success: true, wallpaper_url: url });
  });
});

// Upload profile banner
router.post('/banner', upload.single('banner'), (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const bannerUrl = `/uploads/customization/${req.file.filename}`;

  db.run(`
    INSERT INTO user_customization (user_id, profile_banner_url)
    VALUES (?, ?)
    ON CONFLICT (user_id) 
    DO UPDATE SET profile_banner_url = EXCLUDED.profile_banner_url, updated_at = CURRENT_TIMESTAMP
  `, [userId, bannerUrl], function(err) {
    if (err) {
      console.error('Save banner error:', err);
      return res.status(500).json({ error: 'Failed to save banner' });
    }
    res.json({ success: true, banner_url: bannerUrl });
  });
});

// Remove wallpaper
router.delete('/wallpaper', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  db.run(`
    UPDATE user_customization 
    SET wallpaper_url = NULL, wallpaper_type = 'default', updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `, [userId], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to remove wallpaper' });
    res.json({ success: true });
  });
});

// Remove profile banner
router.delete('/banner', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  db.run(`
    UPDATE user_customization 
    SET profile_banner_url = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `, [userId], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to remove banner' });
    res.json({ success: true });
  });
});

// Get public profile customization (for viewing others' profiles)
router.get('/profile/:userId', (req, res) => {
  const { userId } = req.params;

  db.get(`SELECT profile_banner_url FROM user_customization WHERE user_id = ?`, [userId], (err, settings) => {
    if (err) return res.json({ profile_banner_url: null });
    res.json(settings || { profile_banner_url: null });
  });
});

module.exports = router;
