const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

router.get('/defaults', (req, res) => {
  db.all('SELECT * FROM default_shortcuts ORDER BY category, action', [], (err, shortcuts) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(shortcuts || []);
  });
});

router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  db.all(`
    SELECT ds.action, ds.description, ds.category,
           COALESCE(us.shortcut, ds.shortcut) as shortcut,
           COALESCE(us.is_enabled, TRUE) as is_enabled
    FROM default_shortcuts ds
    LEFT JOIN user_shortcuts us ON ds.action = us.action AND us.user_id = ?
    ORDER BY ds.category, ds.action
  `, [userId], (err, shortcuts) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(shortcuts || []);
  });
});

router.put('/:action', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { action } = req.params;
  const { shortcut, is_enabled } = req.body;
  
  if (!shortcut) {
    return res.status(400).json({ error: 'Shortcut key is required' });
  }
  
  const normalizedShortcut = shortcut.toLowerCase();
  
  db.get('SELECT id FROM default_shortcuts WHERE action = ?', [action], (err, defaultShortcut) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!defaultShortcut) return res.status(404).json({ error: 'Invalid action' });
    
    db.get('SELECT id FROM user_shortcuts WHERE user_id = ? AND shortcut = ? AND action != ?', 
      [userId, normalizedShortcut, action], (err, userConflict) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (userConflict) return res.status(400).json({ error: 'Shortcut already in use by another action' });
      
      db.all(`
        SELECT ds.action, COALESCE(us.shortcut, ds.shortcut) as shortcut
        FROM default_shortcuts ds
        LEFT JOIN user_shortcuts us ON ds.action = us.action AND us.user_id = ?
        WHERE ds.action != ?
      `, [userId, action], (err, allShortcuts) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        const conflictingAction = allShortcuts.find(s => s.shortcut === normalizedShortcut);
        if (conflictingAction) {
          return res.status(400).json({ 
            error: `Shortcut "${shortcut}" is already used by "${conflictingAction.action.replace(/_/g, ' ')}"` 
          });
        }
        
        db.run(`
          INSERT INTO user_shortcuts (user_id, action, shortcut, is_enabled)
          VALUES (?, ?, ?, ?)
          ON CONFLICT (user_id, action) DO UPDATE SET
            shortcut = excluded.shortcut,
            is_enabled = excluded.is_enabled
        `, [userId, action, normalizedShortcut, is_enabled !== false], function(err) {
          if (err) return res.status(500).json({ error: 'Failed to update shortcut' });
          
          res.json({ success: true, message: 'Shortcut updated' });
        });
      });
    });
  });
});

router.post('/reset', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  db.run('DELETE FROM user_shortcuts WHERE user_id = ?', [userId], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to reset shortcuts' });
    
    res.json({ success: true, message: 'Shortcuts reset to defaults' });
  });
});

router.put('/:action/toggle', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { action } = req.params;
  
  db.get(`
    SELECT ds.shortcut as default_shortcut, us.shortcut, us.is_enabled
    FROM default_shortcuts ds
    LEFT JOIN user_shortcuts us ON ds.action = us.action AND us.user_id = ?
    WHERE ds.action = ?
  `, [userId, action], (err, data) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!data) return res.status(404).json({ error: 'Invalid action' });
    
    const currentEnabled = data.is_enabled !== undefined ? data.is_enabled : true;
    const newEnabled = !currentEnabled;
    const shortcut = data.shortcut || data.default_shortcut;
    
    db.run(`
      INSERT INTO user_shortcuts (user_id, action, shortcut, is_enabled)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (user_id, action) DO UPDATE SET
        shortcut = excluded.shortcut,
        is_enabled = excluded.is_enabled
    `, [userId, action, shortcut, newEnabled], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to toggle shortcut' });
      
      res.json({ success: true, is_enabled: newEnabled });
    });
  });
});

module.exports = router;
