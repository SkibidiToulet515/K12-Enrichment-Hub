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

// Get global leaderboard (top players across all games) - MUST be before /:gameName
router.get('/global/top', (req, res) => {
  const { limit = 20 } = req.query;
  
  db.all(`
    SELECT u.id, u.username, u.profile_picture, 
           COUNT(DISTINCT gl.game_name) as games_played,
           SUM(gl.score) as total_score,
           MAX(gl.score) as best_score
    FROM game_leaderboards gl 
    JOIN users u ON gl.user_id = u.id 
    GROUP BY u.id, u.username, u.profile_picture 
    ORDER BY total_score DESC 
    LIMIT ?
  `, [parseInt(limit)], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ leaderboard: rows || [] });
  });
});

// Get leaderboard for a specific game
router.get('/:gameName', (req, res) => {
  const { gameName } = req.params;
  const { limit = 10 } = req.query;
  
  db.all(`
    SELECT gl.*, u.username, u.profile_picture 
    FROM game_leaderboards gl 
    JOIN users u ON gl.user_id = u.id 
    WHERE gl.game_name = ? 
    ORDER BY gl.score DESC 
    LIMIT ?
  `, [gameName, parseInt(limit)], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ leaderboard: rows || [] });
  });
});

// Submit a score
router.post('/submit', authenticate, (req, res) => {
  const { gameName, score, playTime = 0 } = req.body;
  const userId = req.user.id;
  
  if (!gameName || score === undefined) {
    return res.status(400).json({ error: 'Game name and score required' });
  }
  
  // Check if user has existing score for this game
  db.get('SELECT * FROM game_leaderboards WHERE user_id = ? AND game_name = ?', 
    [userId, gameName], (err, existing) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      if (existing) {
        // Only update if new score is higher
        if (score > existing.score) {
          db.run(`
            UPDATE game_leaderboards 
            SET score = ?, play_time = ?, achieved_at = CURRENT_TIMESTAMP 
            WHERE user_id = ? AND game_name = ?
          `, [score, playTime, userId, gameName], function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true, newHighScore: true, previousScore: existing.score });
          });
        } else {
          res.json({ success: true, newHighScore: false, currentBest: existing.score });
        }
      } else {
        // Insert new score
        db.run(`
          INSERT INTO game_leaderboards (user_id, game_name, score, play_time) 
          VALUES (?, ?, ?, ?)
        `, [userId, gameName, score, playTime], function(err) {
          if (err) return res.status(500).json({ error: 'Database error' });
          res.json({ success: true, newHighScore: true, firstScore: true });
        });
      }
    });
});

// Get user's personal best for a game
router.get('/personal/:gameName', authenticate, (req, res) => {
  const { gameName } = req.params;
  const userId = req.user.id;
  
  db.get('SELECT * FROM game_leaderboards WHERE user_id = ? AND game_name = ?', 
    [userId, gameName], (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ personalBest: row || null });
    });
});

// Get user's rank for a specific game
router.get('/rank/:gameName', authenticate, (req, res) => {
  const { gameName } = req.params;
  const userId = req.user.id;
  
  db.get(`
    SELECT COUNT(*) + 1 as rank 
    FROM game_leaderboards 
    WHERE game_name = ? AND score > (
      SELECT COALESCE(score, 0) FROM game_leaderboards 
      WHERE user_id = ? AND game_name = ?
    )
  `, [gameName, userId, gameName], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ rank: row?.rank || null });
  });
});

module.exports = router;
