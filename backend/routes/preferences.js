const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'real_user_auth_secret_2025';

function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  db.get('SELECT * FROM user_preferences WHERE user_id = ?', [userId], (err, prefs) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    if (!prefs) {
      prefs = {
        theme_mode: 'manual',
        auto_theme_schedule: null,
        tab_cloak_enabled: false,
        tab_cloak_title: null,
        tab_cloak_favicon: null,
        panic_key: '`'
      };
    }
    
    res.json(prefs);
  });
});

router.put('/', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { 
    theme_mode, 
    auto_theme_schedule, 
    tab_cloak_enabled, 
    tab_cloak_title, 
    tab_cloak_favicon,
    panic_key 
  } = req.body;
  
  db.run(`
    INSERT INTO user_preferences (user_id, theme_mode, auto_theme_schedule, tab_cloak_enabled, tab_cloak_title, tab_cloak_favicon, panic_key, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      theme_mode = COALESCE(excluded.theme_mode, theme_mode),
      auto_theme_schedule = COALESCE(excluded.auto_theme_schedule, auto_theme_schedule),
      tab_cloak_enabled = COALESCE(excluded.tab_cloak_enabled, tab_cloak_enabled),
      tab_cloak_title = COALESCE(excluded.tab_cloak_title, tab_cloak_title),
      tab_cloak_favicon = COALESCE(excluded.tab_cloak_favicon, tab_cloak_favicon),
      panic_key = COALESCE(excluded.panic_key, panic_key),
      updated_at = datetime('now')
  `, [
    userId,
    theme_mode || 'manual',
    auto_theme_schedule || null,
    tab_cloak_enabled ? 1 : 0,
    tab_cloak_title || null,
    tab_cloak_favicon || null,
    panic_key || '`'
  ], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to save preferences' });
    res.json({ success: true, message: 'Preferences saved' });
  });
});

router.get('/theme-suggestion', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  db.get('SELECT theme_mode, auto_theme_schedule FROM user_preferences WHERE user_id = ?', 
    [userId], (err, prefs) => {
      if (!prefs || prefs.theme_mode === 'manual') {
        return res.json({ suggestion: null });
      }
      
      const hour = new Date().getHours();
      let theme = 'ocean';
      
      if (prefs.theme_mode === 'system') {
        return res.json({ suggestion: 'system' });
      }
      
      if (prefs.theme_mode === 'time') {
        if (hour >= 6 && hour < 12) {
          theme = 'cloudy';
        } else if (hour >= 12 && hour < 18) {
          theme = 'ocean';
        } else if (hour >= 18 && hour < 21) {
          theme = 'eclipse';
        } else {
          theme = 'gaming';
        }
      }
      
      if (prefs.auto_theme_schedule) {
        try {
          const schedule = JSON.parse(prefs.auto_theme_schedule);
          for (const slot of schedule) {
            if (hour >= slot.start && hour < slot.end) {
              theme = slot.theme;
              break;
            }
          }
        } catch (e) {}
      }
      
      res.json({ suggestion: theme });
    });
});

module.exports = router;
