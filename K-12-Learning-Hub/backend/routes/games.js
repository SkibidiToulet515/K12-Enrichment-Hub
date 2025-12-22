const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../config');

const router = express.Router();

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

// Rate a game
router.post('/rate', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { gameName, rating, review } = req.body;
  
  if (!gameName || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Valid game name and rating (1-5) required' });
  }

  db.run(`
    INSERT INTO game_ratings (user_id, game_name, rating, review)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (user_id, game_name) 
    DO UPDATE SET rating = EXCLUDED.rating, review = EXCLUDED.review, updated_at = CURRENT_TIMESTAMP
  `, [userId, gameName, rating, review || null], function(err) {
    if (err) {
      console.error('Rate game error:', err);
      return res.status(500).json({ error: 'Failed to save rating' });
    }
    res.json({ success: true, message: 'Rating saved' });
  });
});

// Get ratings for a game
router.get('/ratings/:gameName', (req, res) => {
  const { gameName } = req.params;
  const userId = getUserId(req);

  db.all(`
    SELECT gr.*, u.username, u.profile_picture
    FROM game_ratings gr
    JOIN users u ON gr.user_id = u.id
    WHERE gr.game_name = ?
    ORDER BY gr.created_at DESC
    LIMIT 50
  `, [decodeURIComponent(gameName)], (err, ratings) => {
    if (err) {
      console.error('Get ratings error:', err);
      return res.json({ ratings: [], average: 0, total: 0, userRating: null });
    }

    const average = ratings.length > 0 
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
      : 0;
    
    const userRating = userId 
      ? ratings.find(r => r.user_id === userId) 
      : null;

    res.json({
      ratings,
      average: Math.round(average * 10) / 10,
      total: ratings.length,
      userRating
    });
  });
});

// Get user's rating for a specific game
router.get('/my-rating/:gameName', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.json({ rating: null });

  db.get(`
    SELECT * FROM game_ratings WHERE user_id = ? AND game_name = ?
  `, [userId, decodeURIComponent(req.params.gameName)], (err, rating) => {
    res.json({ rating: rating || null });
  });
});

// Get top rated games
router.get('/top-rated', (req, res) => {
  db.all(`
    SELECT game_name, 
           AVG(rating) as avg_rating, 
           COUNT(*) as total_ratings
    FROM game_ratings
    GROUP BY game_name
    HAVING COUNT(*) >= 3
    ORDER BY avg_rating DESC, total_ratings DESC
    LIMIT 20
  `, [], (err, games) => {
    if (err) {
      console.error('Top rated error:', err);
      return res.json([]);
    }
    res.json(games.map(g => ({
      ...g,
      avg_rating: Math.round(g.avg_rating * 10) / 10
    })));
  });
});

// Delete user's rating
router.delete('/rating/:gameName', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  db.run(`DELETE FROM game_ratings WHERE user_id = ? AND game_name = ?`, 
    [userId, decodeURIComponent(req.params.gameName)], 
    function(err) {
      if (err) return res.status(500).json({ error: 'Failed to delete rating' });
      res.json({ success: true });
    }
  );
});

module.exports = router;
