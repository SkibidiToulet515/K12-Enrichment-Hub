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

const WIDGET_TYPES = [
  { id: 'stats', name: 'My Stats', description: 'Display your XP, level, and achievements' },
  { id: 'recent_games', name: 'Recent Games', description: 'Show recently played games' },
  { id: 'leaderboard', name: 'Leaderboard', description: 'Top players widget' },
  { id: 'friends', name: 'Friends Online', description: 'Show online friends' },
  { id: 'announcements', name: 'Announcements', description: 'Latest announcements' },
  { id: 'tasks', name: 'My Tasks', description: 'Your personal task list' },
  { id: 'clock', name: 'Clock', description: 'Digital or analog clock' },
  { id: 'calendar', name: 'Calendar', description: 'Mini calendar widget' },
  { id: 'notes', name: 'Quick Notes', description: 'Personal notes widget' },
  { id: 'weather', name: 'Weather', description: 'Current weather display' }
];

// Get available widget types
router.get('/types', (req, res) => {
  res.json({ widgetTypes: WIDGET_TYPES });
});

// Get user's widgets
router.get('/', authenticate, (req, res) => {
  const userId = req.user.id;
  
  db.all('SELECT * FROM user_widgets WHERE user_id = ? ORDER BY position_y, position_x', 
    [userId], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ widgets: rows || [] });
    });
});

// Add a widget
router.post('/', authenticate, (req, res) => {
  const userId = req.user.id;
  const { widgetType, config = {}, positionX = 0, positionY = 0, width = 1, height = 1 } = req.body;
  
  if (!widgetType || !WIDGET_TYPES.find(w => w.id === widgetType)) {
    return res.status(400).json({ error: 'Invalid widget type' });
  }
  
  db.run(`
    INSERT INTO user_widgets (user_id, widget_type, widget_config, position_x, position_y, width, height) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [userId, widgetType, JSON.stringify(config), positionX, positionY, width, height], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true, widgetId: this.lastID });
  });
});

// Update a widget
router.put('/:widgetId', authenticate, (req, res) => {
  const { widgetId } = req.params;
  const userId = req.user.id;
  const { config, positionX, positionY, width, height, enabled } = req.body;
  
  const updates = [];
  const params = [];
  
  if (config !== undefined) { updates.push('widget_config = ?'); params.push(JSON.stringify(config)); }
  if (positionX !== undefined) { updates.push('position_x = ?'); params.push(positionX); }
  if (positionY !== undefined) { updates.push('position_y = ?'); params.push(positionY); }
  if (width !== undefined) { updates.push('width = ?'); params.push(width); }
  if (height !== undefined) { updates.push('height = ?'); params.push(height); }
  if (enabled !== undefined) { updates.push('enabled = ?'); params.push(enabled); }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No updates provided' });
  }
  
  params.push(widgetId, userId);
  
  db.run(`UPDATE user_widgets SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, 
    params, function(err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (this.changes === 0) return res.status(404).json({ error: 'Widget not found' });
      res.json({ success: true });
    });
});

// Delete a widget
router.delete('/:widgetId', authenticate, (req, res) => {
  const { widgetId } = req.params;
  const userId = req.user.id;
  
  db.run('DELETE FROM user_widgets WHERE id = ? AND user_id = ?', 
    [widgetId, userId], function(err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (this.changes === 0) return res.status(404).json({ error: 'Widget not found' });
      res.json({ success: true });
    });
});

// Reset widgets to default layout
router.post('/reset', authenticate, (req, res) => {
  const userId = req.user.id;
  
  db.run('DELETE FROM user_widgets WHERE user_id = ?', [userId], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    // Insert default widgets
    const defaultWidgets = [
      { type: 'stats', x: 0, y: 0, w: 1, h: 1 },
      { type: 'recent_games', x: 1, y: 0, w: 2, h: 1 },
      { type: 'friends', x: 0, y: 1, w: 1, h: 1 },
      { type: 'announcements', x: 1, y: 1, w: 2, h: 1 }
    ];
    
    let completed = 0;
    defaultWidgets.forEach(w => {
      db.run(`
        INSERT INTO user_widgets (user_id, widget_type, position_x, position_y, width, height) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [userId, w.type, w.x, w.y, w.w, w.h], () => {
        completed++;
        if (completed === defaultWidgets.length) {
          res.json({ success: true, message: 'Widgets reset to default' });
        }
      });
    });
  });
});

module.exports = router;
