const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

router.post('/', authenticateToken, (req, res) => {
  const { category, title, description, location } = req.body;
  const userId = req.user.id;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  db.run(
    `INSERT INTO bug_reports (user_id, category, title, description, location) VALUES (?, ?, ?, ?, ?)`,
    [userId, category || 'other', title, description, location || ''],
    function(err) {
      if (err) {
        console.error('Bug report insert error:', err);
        return res.status(500).json({ error: 'Failed to submit bug report' });
      }
      res.json({ success: true, id: this.lastID, message: 'Bug report submitted successfully' });
    }
  );
});

router.get('/', authenticateToken, isAdmin, (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  
  let query = `
    SELECT br.*, u.username as reporter_username
    FROM bug_reports br
    LEFT JOIN users u ON br.user_id = u.id
  `;
  const params = [];

  if (status && status !== 'all') {
    query += ` WHERE br.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY br.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, reports) => {
    if (err) {
      console.error('Bug reports fetch error:', err);
      return res.status(500).json({ error: 'Failed to fetch bug reports' });
    }
    res.json({ reports });
  });
});

router.get('/my-reports', authenticateToken, (req, res) => {
  db.all(
    `SELECT * FROM bug_reports WHERE user_id = ? ORDER BY created_at DESC`,
    [req.user.id],
    (err, reports) => {
      if (err) {
        console.error('My bug reports fetch error:', err);
        return res.status(500).json({ error: 'Failed to fetch your bug reports' });
      }
      res.json({ reports });
    }
  );
});

router.get('/stats', authenticateToken, isAdmin, (req, res) => {
  db.all(
    `SELECT status, COUNT(*) as count FROM bug_reports GROUP BY status`,
    [],
    (err, stats) => {
      if (err) {
        console.error('Bug report stats error:', err);
        return res.status(500).json({ error: 'Failed to fetch stats' });
      }
      
      const result = { open: 0, in_progress: 0, resolved: 0, closed: 0, total: 0 };
      stats.forEach(s => {
        result[s.status] = s.count;
        result.total += s.count;
      });
      
      res.json(result);
    }
  );
});

router.patch('/:id', authenticateToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const { status, priority, admin_notes } = req.body;

  const updates = [];
  const params = [];

  if (status) {
    updates.push('status = ?');
    params.push(status);
  }
  if (priority) {
    updates.push('priority = ?');
    params.push(priority);
  }
  if (admin_notes !== undefined) {
    updates.push('admin_notes = ?');
    params.push(admin_notes);
  }
  if (status === 'resolved' || status === 'closed') {
    updates.push('resolved_by = ?');
    params.push(req.user.id);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  if (updates.length === 1) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  db.run(
    `UPDATE bug_reports SET ${updates.join(', ')} WHERE id = ?`,
    params,
    function(err) {
      if (err) {
        console.error('Bug report update error:', err);
        return res.status(500).json({ error: 'Failed to update bug report' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Bug report not found' });
      }
      res.json({ success: true, message: 'Bug report updated' });
    }
  );
});

router.delete('/:id', authenticateToken, isAdmin, (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM bug_reports WHERE id = ?`, [id], function(err) {
    if (err) {
      console.error('Bug report delete error:', err);
      return res.status(500).json({ error: 'Failed to delete bug report' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Bug report not found' });
    }
    res.json({ success: true, message: 'Bug report deleted' });
  });
});

module.exports = router;
