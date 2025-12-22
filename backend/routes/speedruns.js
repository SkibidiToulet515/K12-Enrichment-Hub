const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

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

// Get speedrun leaderboard for a game
router.get('/:gameName', (req, res) => {
  const { gameName } = req.params;
  const { category = 'any%', limit = 10 } = req.query;
  
  db.all(`
    SELECT sr.*, u.username, u.profile_picture 
    FROM speedrun_records sr 
    JOIN users u ON sr.user_id = u.id 
    WHERE sr.game_name = ? AND sr.category = ?
    ORDER BY sr.time_ms ASC 
    LIMIT ?
  `, [gameName, category, parseInt(limit)], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ speedruns: rows || [] });
  });
});

// Get all categories for a game
router.get('/:gameName/categories', (req, res) => {
  const { gameName } = req.params;
  
  db.all(`
    SELECT DISTINCT category, COUNT(*) as run_count, MIN(time_ms) as best_time
    FROM speedrun_records 
    WHERE game_name = ?
    GROUP BY category
    ORDER BY run_count DESC
  `, [gameName], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ categories: rows || [] });
  });
});

// Submit a speedrun time
router.post('/submit', authenticate, (req, res) => {
  const { gameName, timeMs, category = 'any%' } = req.body;
  const userId = req.user.id;
  
  if (!gameName || !timeMs) {
    return res.status(400).json({ error: 'Game name and time required' });
  }
  
  // Get user's current best for this game/category
  db.get(`
    SELECT * FROM speedrun_records 
    WHERE user_id = ? AND game_name = ? AND category = ?
    ORDER BY time_ms ASC LIMIT 1
  `, [userId, gameName, category], (err, existing) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    const isPersonalBest = !existing || timeMs < existing.time_ms;
    
    // Always insert the run (keep history)
    db.run(`
      INSERT INTO speedrun_records (user_id, game_name, time_ms, category) 
      VALUES (?, ?, ?, ?)
    `, [userId, gameName, timeMs, category], function(err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      // Check if this is a world record
      db.get(`
        SELECT MIN(time_ms) as world_record FROM speedrun_records 
        WHERE game_name = ? AND category = ?
      `, [gameName, category], (err, wr) => {
        const isWorldRecord = !wr || timeMs <= wr.world_record;
        res.json({ 
          success: true, 
          runId: this.lastID,
          isPersonalBest,
          isWorldRecord,
          previousBest: existing?.time_ms || null
        });
      });
    });
  });
});

// Get user's personal best speedrun
router.get('/personal/:gameName', authenticate, (req, res) => {
  const { gameName } = req.params;
  const { category = 'any%' } = req.query;
  const userId = req.user.id;
  
  db.get(`
    SELECT * FROM speedrun_records 
    WHERE user_id = ? AND game_name = ? AND category = ?
    ORDER BY time_ms ASC LIMIT 1
  `, [userId, gameName, category], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ personalBest: row || null });
  });
});

// Get user's speedrun history for a game
router.get('/history/:gameName', authenticate, (req, res) => {
  const { gameName } = req.params;
  const { category, limit = 20 } = req.query;
  const userId = req.user.id;
  
  let query = `
    SELECT * FROM speedrun_records 
    WHERE user_id = ? AND game_name = ?
  `;
  const params = [userId, gameName];
  
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  
  query += ' ORDER BY achieved_at DESC LIMIT ?';
  params.push(parseInt(limit));
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ history: rows || [] });
  });
});

module.exports = router;
