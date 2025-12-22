const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'nebulacore-secret-key';

const soundsDir = path.join(__dirname, '../../frontend/uploads/sounds');
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, soundsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files allowed.'));
    }
  }
});

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function adminMiddleware(req, res, next) {
  try {
    const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
}

router.get('/custom', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, category, url, created_at FROM soundboard_custom ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (e) {
    console.error('Failed to get custom sounds:', e);
    res.status(500).json({ error: 'Failed to get sounds' });
  }
});

router.post('/upload', authMiddleware, adminMiddleware, upload.single('sound'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { name, category } = req.body;
    if (!name || !category) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Name and category required' });
    }
    
    const url = `/uploads/sounds/${req.file.filename}`;
    
    const result = await pool.query(
      'INSERT INTO soundboard_custom (name, category, url, uploaded_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, category, url, req.user.id]
    );
    
    res.json(result.rows[0]);
  } catch (e) {
    console.error('Failed to upload sound:', e);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to upload sound' });
  }
});

router.delete('/custom/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const sound = await pool.query('SELECT url FROM soundboard_custom WHERE id = $1', [id]);
    if (sound.rows.length === 0) {
      return res.status(404).json({ error: 'Sound not found' });
    }
    
    const filePath = path.join(__dirname, '../../frontend', sound.rows[0].url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    await pool.query('DELETE FROM soundboard_custom WHERE id = $1', [id]);
    
    res.json({ success: true });
  } catch (e) {
    console.error('Failed to delete sound:', e);
    res.status(500).json({ error: 'Failed to delete sound' });
  }
});

router.get('/favorites', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT favorites FROM soundboard_favorites WHERE user_id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.json({ favorites: [] });
    }
    
    res.json({ favorites: result.rows[0].favorites || [] });
  } catch (e) {
    console.error('Failed to get favorites:', e);
    res.status(500).json({ error: 'Failed to get favorites' });
  }
});

router.post('/favorites', authMiddleware, async (req, res) => {
  try {
    const { favorites } = req.body;
    
    await pool.query(`
      INSERT INTO soundboard_favorites (user_id, favorites, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) 
      DO UPDATE SET favorites = $2, updated_at = CURRENT_TIMESTAMP
    `, [req.user.id, JSON.stringify(favorites)]);
    
    res.json({ success: true });
  } catch (e) {
    console.error('Failed to save favorites:', e);
    res.status(500).json({ error: 'Failed to save favorites' });
  }
});

module.exports = router;
