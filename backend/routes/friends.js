const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const { JWT_SECRET } = require('../config');
const SECRET_KEY = JWT_SECRET;

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
    `SELECT f.id, u.id as "userId", u.username, u.profile_picture as "profilePicture", f.created_at
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
        `INSERT INTO friends (user_id, friend_id, status)
         VALUES (?, ?, ?) ON CONFLICT DO NOTHING`,
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
    END as "friendId"
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

      const ids = friendIds.map(f => f.friendid || f.friendId).filter(id => id);
      if (ids.length === 0) {
        return res.json([]);
      }
      
      const placeholders = ids.map(() => '?').join(',');
      db.all(
        `SELECT id, username, profile_picture as "profilePicture", is_online FROM users WHERE id IN (${placeholders})`,
        ids,
        (err, friends) => {
          if (err) {
            console.error('Error fetching friends:', err);
            return res.json([]);
          }
          res.json(friends || []);
        }
      );
    }
  );
});

// Remove friend (unfriend)
router.post('/:friendId/remove', (req, res) => {
  const userId = getUserIdFromToken(req);
  const { friendId } = req.params;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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

// Set nickname for a friend (only visible to you)
router.post('/:friendId/nickname', (req, res) => {
  const userId = getUserIdFromToken(req);
  const { friendId } = req.params;
  const { nickname } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!nickname || nickname.trim() === '') {
    // Remove nickname if empty
    db.run(
      'DELETE FROM friend_nicknames WHERE user_id = ? AND friend_id = ?',
      [userId, friendId],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to remove nickname' });
        }
        res.json({ success: true, message: 'Nickname removed' });
      }
    );
  } else {
    // Set or update nickname
    db.run(
      `INSERT INTO friend_nicknames (user_id, friend_id, nickname)
       VALUES (?, ?, ?)
       ON CONFLICT (user_id, friend_id) DO UPDATE SET nickname = ?, updated_at = CURRENT_TIMESTAMP`,
      [userId, friendId, nickname.trim(), nickname.trim()],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to set nickname' });
        }
        res.json({ success: true, message: 'Nickname set', nickname: nickname.trim() });
      }
    );
  }
});

// Get nickname for a friend
router.get('/:friendId/nickname', (req, res) => {
  const userId = getUserIdFromToken(req);
  const { friendId } = req.params;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  db.get(
    'SELECT nickname FROM friend_nicknames WHERE user_id = ? AND friend_id = ?',
    [userId, friendId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to get nickname' });
      }
      res.json({ nickname: row?.nickname || null });
    }
  );
});

// Get all nicknames for current user
router.get('/nicknames/all', (req, res) => {
  const userId = getUserIdFromToken(req);

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  db.all(
    'SELECT friend_id as friendId, nickname FROM friend_nicknames WHERE user_id = ?',
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to get nicknames' });
      }
      res.json(rows || []);
    }
  );
});

// Set invisible to specific friend
router.post('/:friendId/invisible', (req, res) => {
  const userId = getUserIdFromToken(req);
  const { friendId } = req.params;
  const { invisible } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  db.run(
    `UPDATE friends SET invisible = ? WHERE 
    (user_id = ? AND friend_id = ?) OR 
    (user_id = ? AND friend_id = ?)`,
    [invisible ? 1 : 0, userId, friendId, friendId, userId],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to update visibility' });
      }
      res.json({ success: true, message: invisible ? 'Now invisible to this friend' : 'Now visible to this friend' });
    }
  );
});

// Ignore friend (hide from DM list but keep friendship)
router.post('/:friendId/ignore', (req, res) => {
  const userId = getUserIdFromToken(req);
  const { friendId } = req.params;
  const { ignored } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  db.run(
    `UPDATE friends SET ignored = ? WHERE 
    (user_id = ? AND friend_id = ?) OR 
    (user_id = ? AND friend_id = ?)`,
    [ignored ? 1 : 0, userId, friendId, friendId, userId],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to update ignore status' });
      }
      res.json({ success: true, message: ignored ? 'Friend ignored' : 'Friend unignored' });
    }
  );
});

module.exports = router;
