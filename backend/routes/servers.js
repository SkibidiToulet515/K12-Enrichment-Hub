const express = require('express');
const db = require('../db');

const router = express.Router();

// Get all public servers
router.get('/', (req, res) => {
  db.all(`
    SELECT s.*, u.username as owner_name, 
           (SELECT COUNT(*) FROM server_members WHERE server_id = s.id) as member_count
    FROM servers s
    JOIN users u ON s.owner_id = u.id
    WHERE s.status = 'active'
  `, (err, servers) => {
    res.json(servers || []);
  });
});

// Get server details
router.get('/:id', (req, res) => {
  db.get(`
    SELECT s.*, u.username as owner_name 
    FROM servers s
    JOIN users u ON s.owner_id = u.id
    WHERE s.id = ?
  `, [req.params.id], (err, server) => {
    if (server) {
      db.all('SELECT * FROM channels WHERE server_id = ?', [req.params.id], (err, channels) => {
        res.json({ ...server, channels });
      });
    } else {
      res.status(404).json({ error: 'Server not found' });
    }
  });
});

// Get server channels
router.get('/:id/channels', (req, res) => {
  db.all('SELECT * FROM channels WHERE server_id = ?', [req.params.id], (err, channels) => {
    res.json(channels || []);
  });
});

// Join server
router.post('/:id/join', (req, res) => {
  const { userId } = req.body;
  
  db.run(`
    INSERT INTO server_members (server_id, user_id) 
    VALUES (?, ?) ON CONFLICT DO NOTHING
  `, [req.params.id, userId], (err) => {
    if (err) {
      return res.status(400).json({ error: 'Failed to join server' });
    }
    res.json({ success: true });
  });
});

// Direct server creation (no admin approval required)
router.post('/create', (req, res) => {
  const { userId, serverName, description } = req.body;
  
  if (!userId || !serverName) {
    return res.status(400).json({ error: 'User ID and server name are required' });
  }
  
  if (serverName.length > 50) {
    return res.status(400).json({ error: 'Server name must be 50 characters or less' });
  }
  
  db.run(`
    INSERT INTO servers (name, owner_id, description, needs_setup, status)
    VALUES (?, ?, ?, false, 'active')
  `, [serverName.trim(), userId, description || ''], function(err) {
    if (err) {
      console.error('Server creation error:', err);
      return res.status(400).json({ error: 'Failed to create server: ' + (err.message || 'Unknown error') });
    }
    
    const serverId = this.lastID;
    
    if (!serverId) {
      return res.status(400).json({ error: 'Failed to get server ID after creation' });
    }
    
    // Add owner as member
    db.run('INSERT INTO server_members (server_id, user_id) VALUES (?, ?) ON CONFLICT(server_id, user_id) DO NOTHING', 
      [serverId, userId], (memberErr) => {
        if (memberErr) console.error('Failed to add owner as member:', memberErr);
      });
    
    // Create default #general channel
    db.run('INSERT INTO channels (server_id, name) VALUES (?, ?)', 
      [serverId, 'general'], (channelErr) => {
        if (channelErr) console.error('Failed to create default channel:', channelErr);
      });
    
    res.json({ success: true, serverId, serverName: serverName.trim() });
  });
});

// Request to create server (legacy - still works but redirects to direct creation)
router.post('/request', (req, res) => {
  const { userId, serverName, description } = req.body;

  db.run(`
    INSERT INTO server_requests (user_id, server_name, description) 
    VALUES (?, ?, ?)
  `, [userId, serverName, description], (err) => {
    if (err) {
      return res.status(400).json({ error: 'Failed to submit request' });
    }
    res.json({ success: true, message: 'Server creation request submitted. Awaiting admin approval.' });
  });
});

// Get user's servers
router.get('/user/:userId', (req, res) => {
  db.all(`
    SELECT DISTINCT s.*, u.username as owner_name
    FROM servers s
    JOIN users u ON s.owner_id = u.id
    LEFT JOIN server_members sm ON s.id = sm.server_id
    WHERE sm.user_id = ? OR s.owner_id = ?
    ORDER BY s.created_at DESC
  `, [req.params.userId, req.params.userId], (err, servers) => {
    res.json(servers || []);
  });
});

// Get server messages (from first channel)
router.get('/:id/messages', (req, res) => {
  const offset = parseInt(req.query.offset) || 0;
  const limit = parseInt(req.query.limit) || 50;
  
  // Get first channel of the server
  db.get('SELECT id FROM channels WHERE server_id = ? ORDER BY id ASC LIMIT 1', [req.params.id], (err, channel) => {
    if (!channel) {
      return res.json([]);
    }
    
    db.all(`
      SELECT m.id, m.channel_id, m.user_id as userId, m.content, m.created_at as createdAt,
             u.username, u.profile_picture as profilePicture
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.channel_id = ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [channel.id, limit, offset], (err, messages) => {
      res.json((messages || []).reverse());
    });
  });
});

// Get server members - requires membership
router.get('/:id/members', (req, res) => {
  const serverId = req.params.id;
  const token = req.headers.authorization?.split(' ')[1];
  
  let userId;
  try {
    const decoded = require('jsonwebtoken').verify(token, 'real_user_auth_secret_2025');
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Verify user is a member of this server
  db.get('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?', 
    [serverId, userId], (err, membership) => {
      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this server' });
      }
      
      db.all(`
        SELECT u.id, u.username, u.profile_picture, u.is_online
        FROM server_members sm
        JOIN users u ON sm.user_id = u.id
        WHERE sm.server_id = ?
      `, [serverId], (err, members) => {
        res.json(members || []);
      });
    });
});

// Leave server (any member except owner)
router.post('/:id/leave', (req, res) => {
  const serverId = req.params.id;
  const token = req.headers.authorization?.split(' ')[1];
  
  let userId;
  try {
    const decoded = require('jsonwebtoken').verify(token, 'real_user_auth_secret_2025');
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Get server details first
  db.get('SELECT id, name, owner_id FROM servers WHERE id = ?', [serverId], (err, server) => {
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Can't leave the Welcome server
    if (server.name === 'Welcome') {
      return res.status(400).json({ error: 'Cannot leave the Welcome server' });
    }
    
    // Owner cannot leave (must delete instead)
    if (server.owner_id === userId) {
      return res.status(400).json({ error: 'Owner cannot leave. Delete the server instead.' });
    }
    
    // Verify user is a member
    db.get('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?', 
      [serverId, userId], (err, membership) => {
        if (!membership) {
          return res.status(403).json({ error: 'You are not a member of this server' });
        }
        
        db.run('DELETE FROM server_members WHERE server_id = ? AND user_id = ?', 
          [serverId, userId], (err) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to leave server' });
            }
            res.json({ success: true, message: 'Left server successfully' });
          });
      });
  });
});

// Kick member from server (owner only)
router.post('/:id/kick/:userId', (req, res) => {
  const { id: serverId, userId: targetUserId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  
  let requesterId;
  try {
    const decoded = require('jsonwebtoken').verify(token, 'real_user_auth_secret_2025');
    requesterId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Get server details and verify ownership
  db.get('SELECT id, name, owner_id FROM servers WHERE id = ?', [serverId], (err, server) => {
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Can't kick from Welcome server
    if (server.name === 'Welcome') {
      return res.status(400).json({ error: 'Cannot kick members from the Welcome server' });
    }
    
    if (server.owner_id !== requesterId) {
      return res.status(403).json({ error: 'Only the server owner can kick members' });
    }
    if (parseInt(targetUserId) === requesterId) {
      return res.status(400).json({ error: 'Cannot kick yourself' });
    }
    
    db.run('DELETE FROM server_members WHERE server_id = ? AND user_id = ?', 
      [serverId, targetUserId], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to kick member' });
        }
        res.json({ success: true, message: 'Member kicked from server' });
      });
  });
});

// Rename server (owner only)
router.put('/:id/rename', (req, res) => {
  const serverId = req.params.id;
  const { name } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  
  let userId;
  try {
    const decoded = require('jsonwebtoken').verify(token, 'real_user_auth_secret_2025');
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Server name is required' });
  }
  
  db.get('SELECT id, name, owner_id FROM servers WHERE id = ?', [serverId], (err, server) => {
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    if (server.name === 'Welcome') {
      return res.status(400).json({ error: 'Cannot rename the Welcome server' });
    }
    
    if (server.owner_id !== userId) {
      return res.status(403).json({ error: 'Only the server owner can rename the server' });
    }
    
    db.run('UPDATE servers SET name = ? WHERE id = ?', [name.trim(), serverId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to rename server' });
      }
      res.json({ success: true, message: 'Server renamed successfully' });
    });
  });
});

// Add channel to server (owner only)
router.post('/:id/channels', (req, res) => {
  const serverId = req.params.id;
  const { name } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  
  let userId;
  try {
    const decoded = require('jsonwebtoken').verify(token, 'real_user_auth_secret_2025');
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Channel name is required' });
  }
  
  db.get('SELECT id, name, owner_id FROM servers WHERE id = ?', [serverId], (err, server) => {
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    if (server.name === 'Welcome') {
      return res.status(400).json({ error: 'Cannot add channels to the Welcome server' });
    }
    
    if (server.owner_id !== userId) {
      return res.status(403).json({ error: 'Only the server owner can add channels' });
    }
    
    const channelName = name.trim().toLowerCase().replace(/\s+/g, '-');
    
    db.run('INSERT INTO channels (server_id, name) VALUES (?, ?)', [serverId, channelName], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to add channel' });
      }
      res.json({ success: true, channelId: this.lastID, name: channelName });
    });
  });
});

// Rename channel (owner only)
router.put('/:serverId/channels/:channelId/rename', (req, res) => {
  const { serverId, channelId } = req.params;
  const { name } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  
  let userId;
  try {
    const decoded = require('jsonwebtoken').verify(token, 'real_user_auth_secret_2025');
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Channel name is required' });
  }
  
  db.get('SELECT id, name, owner_id FROM servers WHERE id = ?', [serverId], (err, server) => {
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    if (server.name === 'Welcome') {
      return res.status(400).json({ error: 'Cannot rename channels in the Welcome server' });
    }
    
    if (server.owner_id !== userId) {
      return res.status(403).json({ error: 'Only the server owner can rename channels' });
    }
    
    const channelName = name.trim().toLowerCase().replace(/\s+/g, '-');
    
    db.run('UPDATE channels SET name = ? WHERE id = ? AND server_id = ?', 
      [channelName, channelId, serverId], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to rename channel' });
        }
        res.json({ success: true, name: channelName });
      });
  });
});

// Delete channel (owner only, must keep at least 1)
router.delete('/:serverId/channels/:channelId', (req, res) => {
  const { serverId, channelId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  
  let userId;
  try {
    const decoded = require('jsonwebtoken').verify(token, 'real_user_auth_secret_2025');
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  db.get('SELECT id, name, owner_id FROM servers WHERE id = ?', [serverId], (err, server) => {
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    if (server.name === 'Welcome') {
      return res.status(400).json({ error: 'Cannot delete channels from the Welcome server' });
    }
    
    if (server.owner_id !== userId) {
      return res.status(403).json({ error: 'Only the server owner can delete channels' });
    }
    
    // Check if this is the last channel
    db.get('SELECT COUNT(*) as count FROM channels WHERE server_id = ?', [serverId], (err, result) => {
      if (result.count <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last channel. Server must have at least one channel.' });
      }
      
      // Delete messages in this channel first
      db.run('DELETE FROM messages WHERE channel_id = ?', [channelId], () => {
        db.run('DELETE FROM channels WHERE id = ? AND server_id = ?', [channelId, serverId], (err) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to delete channel' });
          }
          res.json({ success: true, message: 'Channel deleted successfully' });
        });
      });
    });
  });
});

// Check if user needs to setup their newly approved server
router.get('/pending-setup/:userId', (req, res) => {
  const userId = req.params.userId;
  
  // Find servers owned by user that have a default 'general' channel with no custom setup
  db.all(`
    SELECT s.id, s.name, s.description, s.created_at
    FROM servers s
    WHERE s.owner_id = ? 
      AND s.id != 1
      AND s.needs_setup = TRUE
  `, [userId], (err, servers) => {
    res.json(servers || []);
  });
});

// Mark server as setup complete
router.post('/:id/complete-setup', (req, res) => {
  const serverId = req.params.id;
  const token = req.headers.authorization?.split(' ')[1];
  
  let userId;
  try {
    const decoded = require('jsonwebtoken').verify(token, 'real_user_auth_secret_2025');
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  db.get('SELECT owner_id FROM servers WHERE id = ?', [serverId], (err, server) => {
    if (!server || server.owner_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    db.run('UPDATE servers SET needs_setup = FALSE WHERE id = ?', [serverId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to complete setup' });
      }
      res.json({ success: true });
    });
  });
});

// Delete server (owner only)
router.delete('/:id', (req, res) => {
  const serverId = req.params.id;
  const token = req.headers.authorization?.split(' ')[1];
  
  let userId;
  try {
    const decoded = require('jsonwebtoken').verify(token, 'real_user_auth_secret_2025');
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Get server details and verify ownership
  db.get('SELECT id, name, owner_id FROM servers WHERE id = ?', [serverId], (err, server) => {
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Can't delete Welcome server
    if (server.name === 'Welcome') {
      return res.status(400).json({ error: 'Cannot delete the Welcome server' });
    }
    
    if (server.owner_id !== userId) {
      return res.status(403).json({ error: 'Only the server owner can delete the server' });
    }
    
    // Get all channels for this server
    db.all('SELECT id FROM channels WHERE server_id = ?', [serverId], (err, channels) => {
      const channelIds = (channels || []).map(c => c.id);
      
      // Delete all messages from server channels
      if (channelIds.length > 0) {
        const placeholders = channelIds.map(() => '?').join(',');
        db.run(`DELETE FROM messages WHERE channel_id IN (${placeholders})`, channelIds, () => {});
      }
      
      // Delete all channels
      db.run('DELETE FROM channels WHERE server_id = ?', [serverId], () => {
        // Delete all members
        db.run('DELETE FROM server_members WHERE server_id = ?', [serverId], () => {
          // Delete the server
          db.run('DELETE FROM servers WHERE id = ?', [serverId], (err) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to delete server' });
            }
            res.json({ success: true, message: 'Server deleted successfully' });
          });
        });
      });
    });
  });
});

module.exports = router;
