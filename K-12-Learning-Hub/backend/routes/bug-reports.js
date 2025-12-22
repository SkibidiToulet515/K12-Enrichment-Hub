const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

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

async function isAdmin(req, res, next) {
  try {
    const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.userId || req.user.id]);
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

router.post('/', authenticateToken, async (req, res) => {
  const { category, title, description, priority, steps, location } = req.body;
  const userId = req.user.userId || req.user.id;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO bug_reports (user_id, category, title, description, priority, steps, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
       RETURNING *`,
      [userId, category || 'other', title, description, priority || 'medium', steps || location || '']
    );
    res.json({ success: true, id: result.rows[0].id, message: 'Bug report submitted successfully' });
  } catch (err) {
    console.error('Bug report insert error:', err);
    res.status(500).json({ error: 'Failed to submit bug report' });
  }
});

router.get('/', authenticateToken, isAdmin, async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  
  try {
    let query = `
      SELECT br.*, u.username as reporter_username
      FROM bug_reports br
      LEFT JOIN users u ON br.user_id = u.id
    `;
    const params = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      query += ` WHERE br.status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY br.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    res.json({ reports: result.rows });
  } catch (err) {
    console.error('Bug reports fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch bug reports' });
  }
});

router.get('/my-reports', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const result = await pool.query(
      `SELECT * FROM bug_reports WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('My bug reports fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch your bug reports' });
  }
});

router.get('/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT status, COUNT(*) as count FROM bug_reports GROUP BY status`
    );
    
    const stats = { pending: 0, investigating: 0, resolved: 0, closed: 0, total: 0 };
    result.rows.forEach(s => {
      stats[s.status] = parseInt(s.count);
      stats.total += parseInt(s.count);
    });
    
    res.json(stats);
  } catch (err) {
    console.error('Bug report stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.patch('/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, priority, admin_notes } = req.body;
  const userId = req.user.userId || req.user.id;

  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (status) {
    updates.push(`status = $${paramIndex++}`);
    params.push(status);
  }
  if (priority) {
    updates.push(`priority = $${paramIndex++}`);
    params.push(priority);
  }
  if (admin_notes !== undefined) {
    updates.push(`admin_notes = $${paramIndex++}`);
    params.push(admin_notes);
  }
  if (status === 'resolved' || status === 'closed') {
    updates.push(`resolved_by = $${paramIndex++}`);
    params.push(userId);
  }

  updates.push('updated_at = NOW()');

  if (updates.length === 1) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  params.push(id);

  try {
    const result = await pool.query(
      `UPDATE bug_reports SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bug report not found' });
    }
    res.json({ success: true, message: 'Bug report updated' });
  } catch (err) {
    console.error('Bug report update error:', err);
    res.status(500).json({ error: 'Failed to update bug report' });
  }
});

router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`DELETE FROM bug_reports WHERE id = $1 RETURNING id`, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bug report not found' });
    }
    res.json({ success: true, message: 'Bug report deleted' });
  } catch (err) {
    console.error('Bug report delete error:', err);
    res.status(500).json({ error: 'Failed to delete bug report' });
  }
});

module.exports = router;
