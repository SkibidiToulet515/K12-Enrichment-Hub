const express = require('express');
const db = require('../db');
const jwt = require('jsonwebtoken');

const router = express.Router();
const SECRET_KEY = 'real_user_auth_secret_2025';

// Socket.io instance (set from server.js)
let io = null;
router.setIo = (socketIo) => { io = socketIo; };

// Helper to log moderation action to losers channel
function logModerationAction(type, username, reason, duration, warningCount) {
  let logContent = `User: ${username}\n`;
  logContent += `Reason: ${reason || 'No reason provided'}`;
  
  if (type === 'ban' && duration) {
    logContent += `\nHow long: ${duration}`;
  } else if (type === 'warn' && warningCount) {
    logContent += `\nStrike: ${warningCount}/3`;
  } else if (type === 'permaban') {
    logContent += `\nHow long: PERMANENT`;
  }
  
  // Find the losers channel by name
  db.get('SELECT id FROM channels WHERE server_id = 1 AND name = ?', ['losers'], (err, channel) => {
    if (err || !channel) {
      console.log('Losers channel not found');
      return;
    }
    
    const channelId = channel.id;
    
    // Insert log message as admin user (ID: 1)
    db.run(
      `INSERT INTO messages (channel_id, user_id, content) VALUES (?, ?, ?)`,
      [channelId, 1, logContent],
      function(err) {
        if (!err && io) {
          db.get(
            `SELECT m.*, u.username, u.profile_picture FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?`,
            [this.lastID],
            (err, message) => {
              if (message) {
                message.channelId = channelId;
                io.to(`channel-${channelId}`).emit('new_message', message);
              }
            }
          );
        }
      }
    );
  });
}

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    
    db.get('SELECT role FROM users WHERE id = ?', [decoded.userId], (err, user) => {
      if (err || !user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized: Admin access required' });
      }
      req.userId = decoded.userId;
      next();
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Check if current user is admin
router.get('/check', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.json({ isAdmin: false });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    db.get('SELECT role FROM users WHERE id = ?', [decoded.userId], (err, user) => {
      res.json({ isAdmin: user && user.role === 'admin' });
    });
  } catch {
    res.json({ isAdmin: false });
  }
});

// Get pending server requests
router.get('/server-requests', isAdmin, (req, res) => {
  db.all(`
    SELECT sr.*, u.username FROM server_requests sr
    JOIN users u ON sr.user_id = u.id
    WHERE sr.status = 'pending'
  `, (err, requests) => {
    res.json(requests || []);
  });
});

// Approve server request
router.post('/approve-server/:requestId', isAdmin, (req, res) => {
  const { requestId } = req.params;

  db.get('SELECT * FROM server_requests WHERE id = ?', [requestId], (err, request) => {
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Create server with needs_setup = 1 so owner can name their channels
    db.run(`
      INSERT INTO servers (name, owner_id, description, needs_setup)
      VALUES (?, ?, ?, 1)
    `, [request.server_name, request.user_id, request.description], function(err) {
      if (err) {
        return res.status(400).json({ error: 'Failed to create server' });
      }

      const serverId = this.lastID;
      
      // Add owner as member
      db.run('INSERT INTO server_members (server_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING', 
        [serverId, request.user_id], () => {});
      
      // Update request status
      db.run('UPDATE server_requests SET status = ? WHERE id = ?', ['approved', requestId], (err) => {
        if (err) {
          return res.status(400).json({ error: 'Failed to update request' });
        }
        
        // Notify the user via socket that their server was approved
        if (io) {
          io.emit('server_approved', { 
            userId: request.user_id, 
            serverId: serverId,
            serverName: request.server_name
          });
        }
        
        res.json({ success: true, serverId });
      });
    });
  });
});

// Deny server request
router.post('/deny-server/:requestId', isAdmin, (req, res) => {
  db.run('UPDATE server_requests SET status = ? WHERE id = ?', ['denied', req.params.requestId], () => {
    res.json({ success: true });
  });
});

// Helper to parse time strings like "30 minutes", "1 hour", "2 days"
function parseTimeString(timeStr) {
  if (!timeStr) return null;
  
  const match = timeStr.toLowerCase().match(/(\d+)\s*(minute|minutes|min|mins|hour|hours|hr|hrs|day|days)/);
  if (!match) return null;
  
  const amount = parseInt(match[1]);
  const unit = match[2];
  
  let milliseconds;
  if (unit.startsWith('minute') || unit.startsWith('min')) {
    milliseconds = amount * 60 * 1000;
  } else if (unit.startsWith('hour') || unit.startsWith('hr')) {
    milliseconds = amount * 60 * 60 * 1000;
  } else if (unit.startsWith('day')) {
    milliseconds = amount * 24 * 60 * 60 * 1000;
  } else {
    return null;
  }
  
  return new Date(Date.now() + milliseconds);
}

// Get all users (with ban/warn info)
router.get('/users', isAdmin, (req, res) => {
  db.all(`SELECT id, username, profile_picture, role, is_online, is_banned, ban_reason, 
          warning_count, last_warning, ban_until, created_at FROM users`, 
    (err, users) => {
      res.json(users || []);
    });
});

// Ban user from chatting (time-based)
router.post('/ban/:userId', isAdmin, (req, res) => {
  const { userId } = req.params;
  const { reason, duration } = req.body;
  
  // Can't ban yourself or other admins
  db.get('SELECT role, username FROM users WHERE id = ?', [userId], (err, user) => {
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot ban an admin' });
    }
    
    // Parse duration (e.g., "30 minutes", "1 hour", "2 days")
    const banUntil = parseTimeString(duration);
    if (!banUntil) {
      return res.status(400).json({ error: 'Invalid duration. Use format like "30 minutes", "1 hour", or "2 days"' });
    }
    
    db.run('UPDATE users SET ban_until = ?, ban_reason = ? WHERE id = ?', 
      [banUntil.toISOString(), reason || 'No reason provided', userId], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to ban user' });
        }
        
        // Log to moderation logs
        logModerationAction('ban', user.username, reason, duration);
        
        // Notify banned user via socket
        if (io) {
          io.emit('user_banned', { 
            userId: parseInt(userId), 
            banUntil: banUntil.toISOString(),
            reason: reason || 'No reason provided',
            duration: duration
          });
        }
        
        res.json({ 
          success: true, 
          message: `User banned from chatting until ${banUntil.toLocaleString()}`,
          banUntil: banUntil.toISOString()
        });
      });
  });
});

// Unban user (clear ban_until)
router.post('/unban/:userId', isAdmin, (req, res) => {
  db.run('UPDATE users SET ban_until = NULL, ban_reason = NULL WHERE id = ?', 
    [req.params.userId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to unban user' });
      }
      res.json({ success: true, message: 'User unbanned successfully' });
    });
});

// Warn user
router.post('/warn/:userId', isAdmin, (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;
  
  db.get('SELECT role, username, warning_count FROM users WHERE id = ?', [userId], (err, user) => {
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot warn an admin' });
    }
    
    const newWarningCount = (user.warning_count || 0) + 1;
    const warningMsg = reason || 'You have been warned by an admin';
    
    db.run('UPDATE users SET warning_count = ?, last_warning = ? WHERE id = ?', 
      [newWarningCount, warningMsg, userId], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to warn user' });
        }
        
        // Log to moderation logs
        logModerationAction('warn', user.username, reason, null, newWarningCount);
        
        // Notify warned user via socket
        if (io) {
          io.emit('user_warned', { 
            userId: parseInt(userId), 
            warningCount: newWarningCount,
            reason: warningMsg
          });
        }
        
        // Auto-permaban after 3 warnings
        if (newWarningCount >= 3) {
          db.run('UPDATE users SET is_banned = 1, ban_reason = ? WHERE id = ?', 
            ['Permanently banned: Too many warnings (3/3)', userId], () => {
              // Log the auto-ban
              logModerationAction('permaban', user.username, 'Automatic permanent ban - 3 warnings reached');
              
              // Notify about permaban
              if (io) {
                io.emit('user_permabanned', { 
                  userId: parseInt(userId), 
                  reason: 'Permanently banned: Too many warnings (3/3)'
                });
              }
            });
        }
        
        res.json({ 
          success: true, 
          warningCount: newWarningCount,
          message: newWarningCount >= 3 ? 'User warned and permanently banned (3/3 warnings)' : 'User warned successfully'
        });
      });
  });
});

// Clear warnings
router.post('/clear-warnings/:userId', isAdmin, (req, res) => {
  db.run('UPDATE users SET warning_count = 0, last_warning = NULL WHERE id = ?', 
    [req.params.userId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to clear warnings' });
      }
      res.json({ success: true, message: 'Warnings cleared' });
    });
});

// Remove user
router.delete('/users/:userId', isAdmin, (req, res) => {
  const { userId } = req.params;
  
  // Can't delete admins
  db.get('SELECT role FROM users WHERE id = ?', [userId], (err, user) => {
    if (user && user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete an admin' });
    }
    
    db.run('DELETE FROM users WHERE id = ?', [userId], () => {
      res.json({ success: true });
    });
  });
});

// Delete message (admin only)
router.delete('/messages/:messageId', isAdmin, (req, res) => {
  db.run('DELETE FROM messages WHERE id = ?', [req.params.messageId], () => {
    res.json({ success: true });
  });
});

module.exports = router;
