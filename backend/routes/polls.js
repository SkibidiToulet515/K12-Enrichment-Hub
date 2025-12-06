const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'real_user_auth_secret_2025';

function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function checkServerMembership(userId, serverId, callback) {
  if (!serverId) return callback(null, true);
  db.get('SELECT id FROM server_members WHERE server_id = ? AND user_id = ?',
    [serverId, userId], (err, member) => {
      callback(err, !!member);
    });
}

router.post('/', authenticateToken, (req, res) => {
  const { question, options, channel_id, server_id, poll_type, is_anonymous, expires_in_hours } = req.body;
  const creatorId = req.user.userId;
  
  if (!question || !options || options.length < 2) {
    return res.status(400).json({ error: 'Question and at least 2 options required' });
  }
  
  if (options.length > 10) {
    return res.status(400).json({ error: 'Maximum 10 options allowed' });
  }
  
  checkServerMembership(creatorId, server_id, (err, isMember) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!isMember) return res.status(403).json({ error: 'Not a member of this server' });
    
    let expiresAt = null;
    if (expires_in_hours) {
      const hours = parseInt(expires_in_hours);
      if (hours > 0) {
        expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      }
    }
    
    db.run(`
      INSERT INTO polls (channel_id, server_id, creator_id, question, poll_type, is_anonymous, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [channel_id || null, server_id || null, creatorId, question, poll_type || 'single', is_anonymous ? 1 : 0, expiresAt],
    function(err) {
      if (err) return res.status(500).json({ error: 'Failed to create poll' });
      
      const pollId = this.lastID;
      
      const insertOptions = options.map((opt, idx) => {
        return new Promise((resolve, reject) => {
          db.run('INSERT INTO poll_options (poll_id, option_text, position) VALUES (?, ?, ?)',
            [pollId, opt, idx], (err) => {
              if (err) reject(err);
              else resolve();
            });
        });
      });
      
      Promise.all(insertOptions)
        .then(() => {
          res.json({ success: true, pollId, message: 'Poll created' });
        })
        .catch(err => {
          db.run('DELETE FROM polls WHERE id = ?', [pollId]);
          res.status(500).json({ error: 'Failed to create poll options' });
        });
    });
  });
});

router.get('/channel/:channelId', authenticateToken, (req, res) => {
  const channelId = parseInt(req.params.channelId);
  
  db.all(`
    SELECT p.*, u.username as creator_name,
           (SELECT COUNT(*) FROM poll_votes WHERE poll_id = p.id) as total_votes
    FROM polls p
    JOIN users u ON p.creator_id = u.id
    WHERE p.channel_id = ? AND p.is_closed = 0
    ORDER BY p.created_at DESC
  `, [channelId], (err, polls) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(polls || []);
  });
});

router.get('/:pollId', authenticateToken, (req, res) => {
  const pollId = parseInt(req.params.pollId);
  const userId = req.user.userId;
  
  db.get(`
    SELECT p.*, u.username as creator_name
    FROM polls p
    JOIN users u ON p.creator_id = u.id
    WHERE p.id = ?
  `, [pollId], (err, poll) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    
    db.all('SELECT * FROM poll_options WHERE poll_id = ? ORDER BY position', [pollId], (err, options) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      db.all('SELECT option_id, COUNT(*) as votes FROM poll_votes WHERE poll_id = ? GROUP BY option_id',
        [pollId], (err, voteCounts) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          
          db.all('SELECT option_id FROM poll_votes WHERE poll_id = ? AND user_id = ?',
            [pollId, userId], (err, userVotes) => {
              const voteMap = {};
              (voteCounts || []).forEach(v => voteMap[v.option_id] = v.votes);
              
              const optionsWithVotes = (options || []).map(opt => ({
                ...opt,
                votes: voteMap[opt.id] || 0,
                voted: (userVotes || []).some(uv => uv.option_id === opt.id)
              }));
              
              res.json({
                ...poll,
                options: optionsWithVotes,
                total_votes: optionsWithVotes.reduce((sum, o) => sum + o.votes, 0),
                user_voted: (userVotes || []).length > 0
              });
            });
        });
    });
  });
});

router.post('/:pollId/vote', authenticateToken, (req, res) => {
  const pollId = parseInt(req.params.pollId);
  const userId = req.user.userId;
  const { option_id } = req.body;
  
  if (!option_id) {
    return res.status(400).json({ error: 'Option ID required' });
  }
  
  db.get('SELECT * FROM polls WHERE id = ?', [pollId], (err, poll) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll.is_closed) return res.status(400).json({ error: 'Poll is closed' });
    
    if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Poll has expired' });
    }
    
    checkServerMembership(userId, poll.server_id, (err, isMember) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!isMember) return res.status(403).json({ error: 'Not a member of this server' });
      
      if (poll.poll_type === 'single') {
        db.get('SELECT id FROM poll_votes WHERE poll_id = ? AND user_id = ?',
          [pollId, userId], (err, existingVote) => {
            if (existingVote) {
              return res.status(400).json({ error: 'Already voted on this poll' });
            }
            castVote();
          });
      } else {
        db.get('SELECT id FROM poll_votes WHERE poll_id = ? AND user_id = ? AND option_id = ?',
          [pollId, userId, option_id], (err, existingVote) => {
            if (existingVote) {
              return res.status(400).json({ error: 'Already voted for this option' });
            }
            castVote();
          });
      }
    });
    
    function castVote() {
      db.get('SELECT id FROM poll_options WHERE id = ? AND poll_id = ?',
        [option_id, pollId], (err, option) => {
          if (!option) return res.status(400).json({ error: 'Invalid option' });
          
          db.run('INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES (?, ?, ?)',
            [pollId, option_id, userId], function(err) {
              if (err) return res.status(500).json({ error: 'Failed to vote' });
              res.json({ success: true, message: 'Vote recorded' });
            });
        });
    }
  });
});

router.delete('/:pollId/vote', authenticateToken, (req, res) => {
  const pollId = parseInt(req.params.pollId);
  const userId = req.user.userId;
  const { option_id } = req.body;
  
  db.run('DELETE FROM poll_votes WHERE poll_id = ? AND user_id = ? AND option_id = ?',
    [pollId, userId, option_id || 0], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to remove vote' });
      res.json({ success: true, message: 'Vote removed' });
    });
});

router.post('/:pollId/close', authenticateToken, (req, res) => {
  const pollId = parseInt(req.params.pollId);
  const userId = req.user.userId;
  
  db.get('SELECT * FROM polls WHERE id = ?', [pollId], (err, poll) => {
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll.creator_id !== userId) {
      return res.status(403).json({ error: 'Only creator can close poll' });
    }
    
    db.run('UPDATE polls SET is_closed = TRUE WHERE id = ?', [pollId], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to close poll' });
      res.json({ success: true, message: 'Poll closed' });
    });
  });
});

router.delete('/:pollId', authenticateToken, (req, res) => {
  const pollId = parseInt(req.params.pollId);
  const userId = req.user.userId;
  
  db.get('SELECT * FROM polls WHERE id = ?', [pollId], (err, poll) => {
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    
    db.get('SELECT role FROM users WHERE id = ?', [userId], (err, user) => {
      if (poll.creator_id !== userId && user?.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      db.run('DELETE FROM poll_votes WHERE poll_id = ?', [pollId], () => {
        db.run('DELETE FROM poll_options WHERE poll_id = ?', [pollId], () => {
          db.run('DELETE FROM polls WHERE id = ?', [pollId], function(err) {
            if (err) return res.status(500).json({ error: 'Failed to delete poll' });
            res.json({ success: true, message: 'Poll deleted' });
          });
        });
      });
    });
  });
});

module.exports = router;
