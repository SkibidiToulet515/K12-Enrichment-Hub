const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const SECRET_KEY = 'real_user_auth_secret_2025';

// Helper to extract userId from token
function getUserIdFromToken(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    return decoded.userId;
  } catch {
    return null;
  }
}

// Send friend request
router.post('/request', (req, res) => {
  const userId = getUserIdFromToken(req);
  const { username } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - invalid token' });
  }

  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }

  if (username === 'admin') {
    return res.status(400).json({ error: 'Cannot add admin' });
  }

  // Get friend ID by username (case insensitive)
  db.get('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [username], (err, friend) => {
    if (err) {
      console.error('Lookup error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!friend) {
      console.log('User not found:', username);
      return res.status(404).json({ error: 'User not found: ' + username });
    }

    console.log('Found friend:', friend, 'Current user:', userId);

    if (friend.id === userId) {
      return res.status(400).json({ error: 'Cannot add yourself' });
    }

    // Check if request already exists
    db.get(
      'SELECT * FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [userId, friend.id, friend.id, userId],
      (err, existing) => {
        if (existing) {
          console.log('Request already exists');
          return res.status(400).json({ error: 'Request already exists or already friends' });
        }

        // Create friend request (works offline - just stores in DB)
        db.run(
          'INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)',
          [userId, friend.id, 'pending'],
          function(err) {
            if (err) {
              console.error('Friend request DB error:', err, {userId, friendId: friend.id});
              return res.status(500).json({ error: 'Failed to send request: ' + err.message });
            }
            console.log('Friend request created successfully');
            res.json({ success: true, message: 'Friend request sent to ' + username, requestId: this.lastID });
          }
        );
      }
    );
  });
});

// Get pending friend requests (requests sent TO the user)
router.get('/pending', (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  db.all(
    `SELECT f.id, u.id as userId, u.username, u.profile_picture, f.created_at
     FROM friends f
     JOIN users u ON f.user_id = u.id
     WHERE f.friend_id = ? AND f.status = 'pending'
     ORDER BY f.created_at DESC`,
    [userId],
    (err, requests) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch requests' });
      }
      res.json(requests || []);
    }
  );
});

// Accept friend request
router.post('/:friendId/accept', (req, res) => {
  const userId = getUserIdFromToken(req);
  const { friendId } = req.params;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Update request status
  db.run(
    'UPDATE friends SET status = ? WHERE user_id = ? AND friend_id = ? AND status = ?',
    ['accepted', friendId, userId, 'pending'],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to accept request' });
      }

      // Create reverse friendship
      db.run(
        `INSERT OR IGNORE INTO friends (user_id, friend_id, status)
         VALUES (?, ?, ?)`,
        [userId, friendId, 'accepted'],
        (err) => {
          res.json({ success: true, message: 'Friend request accepted' });
        }
      );
    }
  );
});

// Reject friend request
router.post('/:friendId/reject', (req, res) => {
  const userId = getUserIdFromToken(req);
  const { friendId } = req.params;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  db.run(
    'DELETE FROM friends WHERE user_id = ? AND friend_id = ? AND status = ?',
    [friendId, userId, 'pending'],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to reject request' });
      }
      res.json({ success: true, message: 'Request rejected' });
    }
  );
});

// Get all friends (accepted friendships)
router.get('/', (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  db.all(
    `SELECT DISTINCT CASE 
      WHEN f.user_id = ? THEN f.friend_id 
      ELSE f.user_id 
    END as friendId
    FROM friends f
    WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'`,
    [userId, userId, userId],
    (err, friendIds) => {
      if (err || !friendIds) {
        return res.json([]);
      }

      if (friendIds.length === 0) {
        return res.json([]);
      }

      // Get friend details
      const ids = friendIds.map(f => f.friendId).join(',');
      db.all(
        `SELECT id, username, profile_picture, is_online FROM users WHERE id IN (${ids})`,
        [],
        (err, friends) => {
          res.json(friends || []);
        }
      );
    }
  );
});

// Remove friend
router.post('/:friendId/remove', (req, res) => {
  const userId = getUserIdFromToken(req);
  const { friendId } = req.params;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Remove both directions
  db.run(
    `DELETE FROM friends WHERE 
    (user_id = ? AND friend_id = ?) OR 
    (user_id = ? AND friend_id = ?)`,
    [userId, friendId, friendId, userId],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to remove friend' });
      }
      res.json({ success: true, message: 'Friend removed' });
    }
  );
});

module.exports = router;
