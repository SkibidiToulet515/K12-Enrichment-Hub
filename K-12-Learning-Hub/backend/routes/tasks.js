const express = require('express');
const db = require('../db');
const jwt = require('jsonwebtoken');

const router = express.Router();
const { JWT_SECRET } = require('../config');
const SECRET_KEY = JWT_SECRET;

function getUserId(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    return decoded.userId;
  } catch {
    return null;
  }
}

router.get('/', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { completed, priority } = req.query;
  let query = 'SELECT * FROM user_tasks WHERE user_id = ?';
  const params = [userId];

  if (completed !== undefined) {
    query += ' AND completed = ?';
    params.push(completed === 'true');
  }

  if (priority) {
    query += ' AND priority = ?';
    params.push(priority);
  }

  query += ' ORDER BY due_date ASC NULLS LAST, created_at DESC';

  db.all(query, params, (err, tasks) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(tasks);
  });
});

router.post('/', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { title, description, due_date, priority } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  db.run(`
    INSERT INTO user_tasks (user_id, title, description, due_date, priority)
    VALUES (?, ?, ?, ?, ?)
  `, [userId, title, description, due_date, priority || 'medium'], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id: this.lastID });
  });
});

router.put('/:id', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;
  const { title, description, due_date, priority } = req.body;

  db.run(`
    UPDATE user_tasks SET title = ?, description = ?, due_date = ?, priority = ?
    WHERE id = ? AND user_id = ?
  `, [title, description, due_date, priority, id, userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true });
  });
});

router.post('/:id/complete', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;

  db.run(`
    UPDATE user_tasks SET completed = true, completed_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `, [id, userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Task not found' });
    
    db.run(`
      INSERT INTO user_xp (user_id, total_xp) VALUES (?, 10)
      ON CONFLICT(user_id) DO UPDATE SET total_xp = total_xp + 10
    `, [userId]);
    
    res.json({ success: true, xp_earned: 10 });
  });
});

router.post('/:id/uncomplete', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;

  db.run(`
    UPDATE user_tasks SET completed = false, completed_at = NULL
    WHERE id = ? AND user_id = ?
  `, [id, userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true });
  });
});

router.delete('/:id', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;

  db.run('DELETE FROM user_tasks WHERE id = ? AND user_id = ?', [id, userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true });
  });
});

router.get('/stats', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  db.get(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN completed = false THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN due_date < CURRENT_TIMESTAMP AND completed = false THEN 1 ELSE 0 END) as overdue
    FROM user_tasks WHERE user_id = ?
  `, [userId], (err, stats) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(stats);
  });
});

module.exports = router;
