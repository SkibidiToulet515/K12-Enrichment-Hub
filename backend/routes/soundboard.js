const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { pool } = require('../db');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

const soundsDir = path.join(__dirname, '../../frontend/uploads/sounds');
const cachedSoundsDir = path.join(__dirname, '../../frontend/sounds/cached');
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}
if (!fs.existsSync(cachedSoundsDir)) {
  fs.mkdirSync(cachedSoundsDir, { recursive: true });
}

const MYINSTANTS_API = 'https://myinstants-api.vercel.app';

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

async function fetchFromMyInstants(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${MYINSTANTS_API}${endpoint}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(destPath);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

router.get('/myinstants/trending', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const data = await fetchFromMyInstants(`/trending?page=${page}`);
    res.json(data);
  } catch (e) {
    console.error('Failed to fetch trending:', e);
    res.status(500).json({ error: 'Failed to fetch trending sounds' });
  }
});

router.get('/myinstants/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }
    const page = req.query.page || 1;
    const data = await fetchFromMyInstants(`/search/${encodeURIComponent(query)}?page=${page}`);
    res.json(data);
  } catch (e) {
    console.error('Failed to search:', e);
    res.status(500).json({ error: 'Failed to search sounds' });
  }
});

router.get('/cached', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM soundboard_cached WHERE is_cached = TRUE ORDER BY play_count DESC, cached_at DESC'
    );
    res.json(result.rows);
  } catch (e) {
    console.error('Failed to get cached sounds:', e);
    res.status(500).json({ error: 'Failed to get cached sounds' });
  }
});

router.post('/cache', async (req, res) => {
  try {
    const { name, mp3Url, myinstantsId } = req.body;
    
    if (!name || !mp3Url) {
      return res.status(400).json({ error: 'Name and mp3Url required' });
    }
    
    const existing = await pool.query(
      'SELECT * FROM soundboard_cached WHERE myinstants_id = $1',
      [myinstantsId || mp3Url]
    );
    
    if (existing.rows.length > 0 && existing.rows[0].is_cached) {
      await pool.query(
        'UPDATE soundboard_cached SET play_count = play_count + 1 WHERE id = $1',
        [existing.rows[0].id]
      );
      return res.json({ 
        success: true, 
        cached: true, 
        localPath: existing.rows[0].local_path,
        sound: existing.rows[0]
      });
    }
    
    const safeFilename = `${Date.now()}-${name.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}.mp3`;
    const localPath = `/sounds/cached/${safeFilename}`;
    const fullPath = path.join(cachedSoundsDir, safeFilename);
    
    await downloadFile(mp3Url, fullPath);
    
    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE soundboard_cached 
         SET is_cached = TRUE, local_path = $1, cached_at = CURRENT_TIMESTAMP, play_count = play_count + 1
         WHERE id = $2 RETURNING *`,
        [localPath, existing.rows[0].id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO soundboard_cached (myinstants_id, name, original_url, local_path, is_cached, cached_at, play_count)
         VALUES ($1, $2, $3, $4, TRUE, CURRENT_TIMESTAMP, 1) RETURNING *`,
        [myinstantsId || mp3Url, name, mp3Url, localPath]
      );
    }
    
    res.json({ 
      success: true, 
      cached: true, 
      localPath,
      sound: result.rows[0]
    });
  } catch (e) {
    console.error('Failed to cache sound:', e);
    res.status(500).json({ error: 'Failed to cache sound' });
  }
});

router.get('/proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }
    
    const allowedDomains = [
      'cdn.freesound.org',
      'freesound.org',
      'www.myinstants.com',
      'myinstants.com',
      'www.soundjay.com',
      'soundjay.com'
    ];
    
    const urlObj = new URL(url);
    const isAllowed = allowedDomains.some(d => urlObj.hostname.includes(d));
    
    if (!isAllowed) {
      return res.status(403).json({ error: 'Domain not allowed' });
    }
    
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'audio/*,*/*'
      }
    }, (proxyRes) => {
      if (proxyRes.statusCode === 301 || proxyRes.statusCode === 302) {
        return res.redirect(proxyRes.headers.location);
      }
      
      res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'audio/mpeg');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      
      proxyRes.pipe(res);
    }).on('error', (err) => {
      console.error('Proxy error:', err);
      res.status(500).json({ error: 'Proxy failed' });
    });
  } catch (e) {
    console.error('Proxy error:', e);
    res.status(500).json({ error: 'Proxy failed' });
  }
});

router.post('/batch-cache', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { sounds } = req.body;
    if (!sounds || !Array.isArray(sounds)) {
      return res.status(400).json({ error: 'Sounds array required' });
    }
    
    const results = [];
    for (const sound of sounds.slice(0, 50)) {
      try {
        const existing = await pool.query(
          'SELECT * FROM soundboard_cached WHERE myinstants_id = $1',
          [sound.id || sound.mp3Url]
        );
        
        if (existing.rows.length > 0 && existing.rows[0].is_cached) {
          results.push({ name: sound.title, status: 'already_cached' });
          continue;
        }
        
        const safeFilename = `${Date.now()}-${sound.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}.mp3`;
        const localPath = `/sounds/cached/${safeFilename}`;
        const fullPath = path.join(cachedSoundsDir, safeFilename);
        
        await downloadFile(sound.mp3Url, fullPath);
        
        if (existing.rows.length > 0) {
          await pool.query(
            `UPDATE soundboard_cached 
             SET is_cached = TRUE, local_path = $1, cached_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [localPath, existing.rows[0].id]
          );
        } else {
          await pool.query(
            `INSERT INTO soundboard_cached (myinstants_id, name, original_url, local_path, is_cached, cached_at)
             VALUES ($1, $2, $3, $4, TRUE, CURRENT_TIMESTAMP)`,
            [sound.id || sound.mp3Url, sound.title, sound.mp3Url, localPath]
          );
        }
        
        results.push({ name: sound.title, status: 'cached' });
      } catch (e) {
        results.push({ name: sound.title, status: 'failed', error: e.message });
      }
    }
    
    res.json({ success: true, results });
  } catch (e) {
    console.error('Failed to batch cache:', e);
    res.status(500).json({ error: 'Failed to batch cache sounds' });
  }
});

module.exports = router;
