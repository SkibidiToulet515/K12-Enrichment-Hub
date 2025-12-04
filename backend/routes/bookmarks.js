const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

const SECRET_KEY = 'real_user_auth_secret_2025';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

const defaultBookmarks = [
  { name: 'Google', url: 'https://www.google.com', icon: '🔍', bg_color: null },
  { name: 'YouTube', url: 'https://www.youtube.com', icon: '▶', bg_color: '#ff0000' },
  { name: 'SoundCloud', url: 'https://soundcloud.com', icon: '☁', bg_color: '#ff5500' },
  { name: 'Discord', url: 'https://discord.com', icon: '💬', bg_color: '#5865f2' },
  { name: 'GitHub', url: 'https://github.com', icon: '🐙', bg_color: '#333' },
  { name: 'Reddit', url: 'https://reddit.com', icon: '👽', bg_color: '#ff4500' },
  { name: 'Twitch', url: 'https://twitch.tv', icon: '📺', bg_color: '#9146ff' },
  { name: 'Twitter', url: 'https://twitter.com', icon: '🐦', bg_color: '#1da1f2' },
  { name: 'Spotify', url: 'https://spotify.com', icon: '🎵', bg_color: '#1db954' },
  { name: 'Netflix', url: 'https://netflix.com', icon: '🎬', bg_color: '#e50914' }
];

router.get('/', authMiddleware, (req, res) => {
  db.all('SELECT * FROM user_bookmarks WHERE user_id = ? ORDER BY position, id', [req.user.userId], (err, bookmarks) => {
    if (err) {
      console.error('Error fetching bookmarks:', err);
      return res.status(500).json({ error: 'Failed to fetch bookmarks' });
    }
    
    if (!bookmarks || bookmarks.length === 0) {
      let inserted = 0;
      defaultBookmarks.forEach((b, i) => {
        db.run(
          'INSERT INTO user_bookmarks (user_id, name, url, icon, bg_color, position) VALUES (?, ?, ?, ?, ?, ?)',
          [req.user.userId, b.name, b.url, b.icon, b.bg_color, i],
          (err) => {
            inserted++;
            if (inserted === defaultBookmarks.length) {
              db.all('SELECT * FROM user_bookmarks WHERE user_id = ? ORDER BY position, id', [req.user.userId], (err, newBookmarks) => {
                if (err) return res.status(500).json({ error: 'Failed to fetch bookmarks' });
                res.json(newBookmarks || []);
              });
            }
          }
        );
      });
    } else {
      res.json(bookmarks);
    }
  });
});

router.post('/', authMiddleware, (req, res) => {
  const { name, url, icon, bg_color } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: 'Name and URL are required' });
  }
  
  db.get('SELECT COUNT(*) as count FROM user_bookmarks WHERE user_id = ?', [req.user.userId], (err, result) => {
    if (err) {
      console.error('Error counting bookmarks:', err);
      return res.status(500).json({ error: 'Failed to create bookmark' });
    }
    
    const position = result ? result.count : 0;
    
    db.run(
      'INSERT INTO user_bookmarks (user_id, name, url, icon, bg_color, position) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.userId, name, url, icon || '🔗', bg_color || null, position],
      function(err) {
        if (err) {
          console.error('Error creating bookmark:', err);
          return res.status(500).json({ error: 'Failed to create bookmark' });
        }
        
        db.get('SELECT * FROM user_bookmarks WHERE id = ?', [this.lastID], (err, bookmark) => {
          if (err) return res.status(500).json({ error: 'Failed to fetch created bookmark' });
          res.json(bookmark);
        });
      }
    );
  });
});

router.put('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, url, icon, bg_color } = req.body;
  
  db.get('SELECT * FROM user_bookmarks WHERE id = ? AND user_id = ?', [id, req.user.userId], (err, bookmark) => {
    if (err) {
      console.error('Error finding bookmark:', err);
      return res.status(500).json({ error: 'Failed to update bookmark' });
    }
    
    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }
    
    db.run(
      'UPDATE user_bookmarks SET name = ?, url = ?, icon = ?, bg_color = ? WHERE id = ? AND user_id = ?',
      [name || bookmark.name, url || bookmark.url, icon || bookmark.icon, bg_color, id, req.user.userId],
      function(err) {
        if (err) {
          console.error('Error updating bookmark:', err);
          return res.status(500).json({ error: 'Failed to update bookmark' });
        }
        
        db.get('SELECT * FROM user_bookmarks WHERE id = ?', [id], (err, updated) => {
          if (err) return res.status(500).json({ error: 'Failed to fetch updated bookmark' });
          res.json(updated);
        });
      }
    );
  });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM user_bookmarks WHERE id = ? AND user_id = ?', [id, req.user.userId], (err, bookmark) => {
    if (err) {
      console.error('Error finding bookmark:', err);
      return res.status(500).json({ error: 'Failed to delete bookmark' });
    }
    
    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }
    
    db.run('DELETE FROM user_bookmarks WHERE id = ? AND user_id = ?', [id, req.user.userId], function(err) {
      if (err) {
        console.error('Error deleting bookmark:', err);
        return res.status(500).json({ error: 'Failed to delete bookmark' });
      }
      res.json({ success: true });
    });
  });
});

router.post('/reorder', authMiddleware, (req, res) => {
  const { bookmarks } = req.body;
  
  if (!bookmarks || !Array.isArray(bookmarks)) {
    return res.status(400).json({ error: 'Invalid bookmarks array' });
  }
  
  let updated = 0;
  bookmarks.forEach((bookmark, i) => {
    db.run(
      'UPDATE user_bookmarks SET position = ? WHERE id = ? AND user_id = ?',
      [i, bookmark.id, req.user.userId],
      (err) => {
        updated++;
        if (updated === bookmarks.length) {
          res.json({ success: true });
        }
      }
    );
  });
});

router.post('/reset', authMiddleware, (req, res) => {
  db.run('DELETE FROM user_bookmarks WHERE user_id = ?', [req.user.userId], (err) => {
    if (err) {
      console.error('Error resetting bookmarks:', err);
      return res.status(500).json({ error: 'Failed to reset bookmarks' });
    }
    
    let inserted = 0;
    defaultBookmarks.forEach((b, i) => {
      db.run(
        'INSERT INTO user_bookmarks (user_id, name, url, icon, bg_color, position) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.userId, b.name, b.url, b.icon, b.bg_color, i],
        (err) => {
          inserted++;
          if (inserted === defaultBookmarks.length) {
            db.all('SELECT * FROM user_bookmarks WHERE user_id = ? ORDER BY position, id', [req.user.userId], (err, bookmarks) => {
              if (err) return res.status(500).json({ error: 'Failed to fetch bookmarks' });
              res.json(bookmarks || []);
            });
          }
        }
      );
    });
  });
});

module.exports = router;
