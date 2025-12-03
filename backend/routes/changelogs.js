const express = require('express');
const router = express.Router();
const db = require('../db');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = 'real_user_auth_secret_2025';
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

router.get('/', (req, res) => {
  db.all(`
    SELECT c.*, u.username as author_name
    FROM changelogs c
    LEFT JOIN users u ON c.author_id = u.id
    WHERE c.is_published = 1
    ORDER BY c.created_at DESC
  `, [], (err, changelogs) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(changelogs || []);
  });
});

router.get('/all', authenticateToken, requireAdmin, (req, res) => {
  db.all(`
    SELECT c.*, u.username as author_name
    FROM changelogs c
    LEFT JOIN users u ON c.author_id = u.id
    ORDER BY c.created_at DESC
  `, [], (err, changelogs) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(changelogs || []);
  });
});

router.get('/:id', (req, res) => {
  db.get(`
    SELECT c.*, u.username as author_name
    FROM changelogs c
    LEFT JOIN users u ON c.author_id = u.id
    WHERE c.id = ? AND c.is_published = 1
  `, [req.params.id], (err, changelog) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!changelog) return res.status(404).json({ error: 'Changelog not found' });
    res.json(changelog);
  });
});

router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { version, title, content, change_type, is_published } = req.body;
  
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }
  
  const validTypes = ['feature', 'bugfix', 'improvement', 'security', 'removed', 'ui'];
  const type = validTypes.includes(change_type) ? change_type : 'feature';
  
  db.run(`
    INSERT INTO changelogs (version, title, content, change_type, author_id, is_published)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [version || null, title, content, type, req.user.userId, is_published !== false ? 1 : 0], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to create changelog' });
    
    res.json({
      success: true,
      id: this.lastID,
      message: 'Changelog created successfully'
    });
  });
});

router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { version, title, content, change_type, is_published } = req.body;
  
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }
  
  const validTypes = ['feature', 'bugfix', 'improvement', 'security', 'removed', 'ui'];
  const type = validTypes.includes(change_type) ? change_type : 'feature';
  
  db.run(`
    UPDATE changelogs 
    SET version = ?, title = ?, content = ?, change_type = ?, is_published = ?
    WHERE id = ?
  `, [version || null, title, content, type, is_published ? 1 : 0, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update changelog' });
    if (this.changes === 0) return res.status(404).json({ error: 'Changelog not found' });
    
    res.json({ success: true, message: 'Changelog updated' });
  });
});

router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  db.run('DELETE FROM changelogs WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to delete changelog' });
    if (this.changes === 0) return res.status(404).json({ error: 'Changelog not found' });
    
    res.json({ success: true, message: 'Changelog deleted' });
  });
});

module.exports = router;
