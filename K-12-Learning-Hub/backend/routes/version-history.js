const express = require('express');
const db = require('../db');
const jwt = require('jsonwebtoken');

const router = express.Router();
const { JWT_SECRET } = require('../config');

function getUserId(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId;
  } catch {
    return null;
  }
}

router.post('/notes/:noteId', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { noteId } = req.params;
  const { title, content } = req.body;

  db.get('SELECT MAX(version_number) as max_version FROM notes_history WHERE user_id = ? AND note_id = ?', 
    [userId, noteId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const nextVersion = (result?.max_version || 0) + 1;
    
    db.run(`
      INSERT INTO notes_history (user_id, note_id, title, content, version_number)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, noteId, title, content, nextVersion], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, version: nextVersion, id: this.lastID });
    });
  });
});

router.get('/notes/:noteId', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { noteId } = req.params;

  db.all(`
    SELECT id, title, content, version_number, created_at 
    FROM notes_history 
    WHERE user_id = ? AND note_id = ?
    ORDER BY version_number DESC
    LIMIT 50
  `, [userId, noteId], (err, versions) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(versions);
  });
});

router.get('/notes/:noteId/version/:version', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { noteId, version } = req.params;

  db.get(`
    SELECT * FROM notes_history 
    WHERE user_id = ? AND note_id = ? AND version_number = ?
  `, [userId, noteId, version], (err, versionData) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!versionData) return res.status(404).json({ error: 'Version not found' });
    res.json(versionData);
  });
});

router.post('/tasks/:taskId', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { taskId } = req.params;
  const { title, description, completed, priority, due_date } = req.body;

  db.get('SELECT MAX(version_number) as max_version FROM tasks_history WHERE user_id = ? AND task_id = ?', 
    [userId, taskId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const nextVersion = (result?.max_version || 0) + 1;
    
    db.run(`
      INSERT INTO tasks_history (task_id, user_id, title, description, completed, priority, due_date, version_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [taskId, userId, title, description, completed, priority, due_date, nextVersion], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, version: nextVersion, id: this.lastID });
    });
  });
});

router.get('/tasks/:taskId', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { taskId } = req.params;

  db.all(`
    SELECT id, title, description, completed, priority, due_date, version_number, created_at 
    FROM tasks_history 
    WHERE user_id = ? AND task_id = ?
    ORDER BY version_number DESC
    LIMIT 50
  `, [userId, taskId], (err, versions) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(versions);
  });
});

router.post('/tasks/:taskId/restore/:version', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { taskId, version } = req.params;

  db.get(`
    SELECT * FROM tasks_history 
    WHERE user_id = ? AND task_id = ? AND version_number = ?
  `, [userId, taskId, version], (err, versionData) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!versionData) return res.status(404).json({ error: 'Version not found' });

    db.run(`
      UPDATE user_tasks SET title = ?, description = ?, priority = ?, due_date = ?
      WHERE id = ? AND user_id = ?
    `, [versionData.title, versionData.description, versionData.priority, versionData.due_date, taskId, userId], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, restored: versionData });
    });
  });
});

module.exports = router;
