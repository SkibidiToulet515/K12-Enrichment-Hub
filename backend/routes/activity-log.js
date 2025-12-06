const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'real_user_auth_secret_2025';

const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    db.get('SELECT role FROM users WHERE id = ?', [decoded.userId], (err, user) => {
      if (err || !user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      next();
    });
  } catch {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

router.get('/', authenticateAdmin, (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  const category = req.query.category;
  
  let query = `
    SELECT al.*, u.username
    FROM activity_log al
    LEFT JOIN users u ON al.user_id = u.id
  `;
  const params = [];
  
  if (category) {
    query += ' WHERE al.category = ?';
    params.push(category);
  }
  
  query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  db.all(query, params, (err, logs) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch logs' });
    
    const formatted = (logs || []).map(log => ({
      id: log.id,
      category: log.category,
      action: log.action,
      details: log.details ? JSON.parse(log.details) : null,
      userId: log.user_id,
      username: log.username,
      createdAt: log.created_at
    }));
    
    res.json(formatted);
  });
});

router.get('/categories', authenticateAdmin, (req, res) => {
  db.all(`
    SELECT DISTINCT category, COUNT(*) as count
    FROM activity_log
    GROUP BY category
    ORDER BY count DESC
  `, [], (err, categories) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch categories' });
    res.json(categories || []);
  });
});

router.get('/stats', authenticateAdmin, (req, res) => {
  db.get(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as last_hour,
      COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
      COUNT(CASE WHEN category = 'error' THEN 1 END) as errors
    FROM activity_log
  `, [], (err, stats) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch stats' });
    res.json(stats || { total: 0, last_hour: 0, last_24h: 0, errors: 0 });
  });
});

router.delete('/clear', authenticateAdmin, (req, res) => {
  const olderThan = req.query.days || 30;
  
  db.run(`DELETE FROM activity_log WHERE created_at < NOW() - INTERVAL '? days'`, [olderThan], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to clear logs' });
    res.json({ success: true, deleted: this.changes });
  });
});

module.exports = router;
