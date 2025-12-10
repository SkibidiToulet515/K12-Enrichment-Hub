const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Get user's custom themes
router.get('/my', authenticate, (req, res) => {
  const userId = req.user.id;
  
  db.all('SELECT * FROM custom_themes WHERE user_id = ? ORDER BY updated_at DESC', 
    [userId], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ themes: rows || [] });
    });
});

// Get public themes (theme gallery)
router.get('/public', (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  
  db.all(`
    SELECT ct.*, u.username as creator_name 
    FROM custom_themes ct 
    JOIN users u ON ct.user_id = u.id 
    WHERE ct.is_public = true 
    ORDER BY ct.uses_count DESC, ct.created_at DESC 
    LIMIT ? OFFSET ?
  `, [parseInt(limit), parseInt(offset)], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ themes: rows || [] });
  });
});

// Get a specific theme
router.get('/:themeId', (req, res) => {
  const { themeId } = req.params;
  
  db.get(`
    SELECT ct.*, u.username as creator_name 
    FROM custom_themes ct 
    JOIN users u ON ct.user_id = u.id 
    WHERE ct.id = ?
  `, [themeId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Theme not found' });
    
    // Only return if public or owner
    if (!row.is_public) {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        try {
          const user = jwt.verify(token, JWT_SECRET);
          if (user.id !== row.user_id) {
            return res.status(403).json({ error: 'Private theme' });
          }
        } catch {
          return res.status(403).json({ error: 'Private theme' });
        }
      } else {
        return res.status(403).json({ error: 'Private theme' });
      }
    }
    
    res.json({ theme: row });
  });
});

// Create a new custom theme
router.post('/', authenticate, (req, res) => {
  const userId = req.user.id;
  const { name, themeData, isPublic = false } = req.body;
  
  if (!name || !themeData) {
    return res.status(400).json({ error: 'Name and theme data required' });
  }
  
  if (name.length > 50) {
    return res.status(400).json({ error: 'Name too long (max 50 characters)' });
  }
  
  // Validate theme data structure
  try {
    const data = typeof themeData === 'string' ? JSON.parse(themeData) : themeData;
    if (!data.colors || !data.name) {
      return res.status(400).json({ error: 'Invalid theme data structure' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid JSON in theme data' });
  }
  
  const themeDataStr = typeof themeData === 'string' ? themeData : JSON.stringify(themeData);
  
  db.run(`
    INSERT INTO custom_themes (user_id, name, theme_data, is_public) 
    VALUES (?, ?, ?, ?)
    ON CONFLICT (user_id, name) DO UPDATE SET 
      theme_data = EXCLUDED.theme_data,
      is_public = EXCLUDED.is_public,
      updated_at = CURRENT_TIMESTAMP
  `, [userId, name, themeDataStr, isPublic], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true, themeId: this.lastID });
  });
});

// Update a theme
router.put('/:themeId', authenticate, (req, res) => {
  const { themeId } = req.params;
  const userId = req.user.id;
  const { name, themeData, isPublic } = req.body;
  
  const updates = [];
  const params = [];
  
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (themeData !== undefined) { 
    updates.push('theme_data = ?'); 
    params.push(typeof themeData === 'string' ? themeData : JSON.stringify(themeData)); 
  }
  if (isPublic !== undefined) { updates.push('is_public = ?'); params.push(isPublic); }
  updates.push('updated_at = CURRENT_TIMESTAMP');
  
  params.push(themeId, userId);
  
  db.run(`UPDATE custom_themes SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, 
    params, function(err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (this.changes === 0) return res.status(404).json({ error: 'Theme not found' });
      res.json({ success: true });
    });
});

// Delete a theme
router.delete('/:themeId', authenticate, (req, res) => {
  const { themeId } = req.params;
  const userId = req.user.id;
  
  db.run('DELETE FROM custom_themes WHERE id = ? AND user_id = ?', 
    [themeId, userId], function(err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (this.changes === 0) return res.status(404).json({ error: 'Theme not found' });
      res.json({ success: true });
    });
});

// Use a public theme (increment uses count)
router.post('/:themeId/use', authenticate, (req, res) => {
  const { themeId } = req.params;
  
  db.run('UPDATE custom_themes SET uses_count = uses_count + 1 WHERE id = ? AND is_public = true', 
    [themeId], function(err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ success: true });
    });
});

module.exports = router;
