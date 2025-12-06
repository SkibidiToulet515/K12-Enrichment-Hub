const express = require('express');
const db = require('../db');
const permissions = require('../permissions');
const jwt = require('jsonwebtoken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'real_user_auth_secret_2025';

// Get global chat messages with pagination (includes replies, reactions, attachments)
router.get('/global', (req, res) => {
  const offset = parseInt(req.query.offset) || 0;
  const limit = parseInt(req.query.limit) || 50;
  
  db.all(`
    SELECT m.*, u.username, u.profile_picture,
           rm.content as reply_content, ru.username as reply_username,
           a.url as attachment_url, a.original_name as attachment_name, a.file_type as attachment_type
    FROM messages m
    JOIN users u ON m.user_id = u.id
    LEFT JOIN messages rm ON m.reply_to_id = rm.id
    LEFT JOIN users ru ON rm.user_id = ru.id
    LEFT JOIN attachments a ON a.message_id = m.id
    WHERE m.is_global = TRUE
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?
  `, [limit, offset], (err, messages) => {
    if (err) {
      console.error('Global messages error:', err);
      return res.json([]);
    }
    
    const formatted = (messages || []).reverse().map(m => ({
      ...m,
      replyTo: m.reply_to_id ? { id: m.reply_to_id, content: m.reply_content, username: m.reply_username } : null,
      attachment: m.attachment_url ? { url: m.attachment_url, originalName: m.attachment_name, type: m.attachment_type } : null
    }));
    
    res.json(formatted);
  });
});

// Get channel messages with pagination (includes replies, attachments)
router.get('/channel/:channelId', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  let userId;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { channelId } = req.params;
  const offset = parseInt(req.query.offset) || 0;
  const limit = parseInt(req.query.limit) || 50;
  
  try {
    const channel = await new Promise((resolve, reject) => {
      db.get('SELECT server_id FROM channels WHERE id = ?', [channelId], (err, ch) => {
        if (err) reject(err);
        else resolve(ch);
      });
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const canView = await permissions.canViewChannel(channel.server_id, channelId, userId);
    if (!canView) {
      return res.status(403).json({ error: 'You do not have permission to view this channel' });
    }
  
    db.all(`
      SELECT m.*, u.username, u.profile_picture,
             rm.content as reply_content, ru.username as reply_username,
             a.url as attachment_url, a.original_name as attachment_name, a.file_type as attachment_type
      FROM messages m
      JOIN users u ON m.user_id = u.id
      LEFT JOIN messages rm ON m.reply_to_id = rm.id
      LEFT JOIN users ru ON rm.user_id = ru.id
      LEFT JOIN attachments a ON a.message_id = m.id
      WHERE m.channel_id = ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [channelId, limit, offset], (err, messages) => {
      const formatted = (messages || []).reverse().map(m => ({
        ...m,
        replyTo: m.reply_to_id ? { id: m.reply_to_id, content: m.reply_content, username: m.reply_username } : null,
        attachment: m.attachment_url ? { url: m.attachment_url, originalName: m.attachment_name, type: m.attachment_type } : null
      }));
      res.json(formatted);
    });
  } catch (err) {
    console.error('Error checking channel permissions:', err);
    res.status(500).json({ error: 'Failed to check permissions' });
  }
});

// Get group chat messages with pagination (includes replies, attachments)
router.get('/group/:groupChatId', (req, res) => {
  const offset = parseInt(req.query.offset) || 0;
  const limit = parseInt(req.query.limit) || 50;
  
  db.all(`
    SELECT m.*, u.username, u.profile_picture,
           rm.content as reply_content, ru.username as reply_username,
           a.url as attachment_url, a.original_name as attachment_name, a.file_type as attachment_type
    FROM messages m
    JOIN users u ON m.user_id = u.id
    LEFT JOIN messages rm ON m.reply_to_id = rm.id
    LEFT JOIN users ru ON rm.user_id = ru.id
    LEFT JOIN attachments a ON a.message_id = m.id
    WHERE m.group_chat_id = ?
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?
  `, [req.params.groupChatId, limit, offset], (err, messages) => {
    const formatted = (messages || []).reverse().map(m => ({
      ...m,
      replyTo: m.reply_to_id ? { id: m.reply_to_id, content: m.reply_content, username: m.reply_username } : null,
      attachment: m.attachment_url ? { url: m.attachment_url, originalName: m.attachment_name, type: m.attachment_type } : null
    }));
    res.json(formatted);
  });
});

// Create group chat
router.post('/group-chat', (req, res) => {
  const { name, memberIds } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  
  // Get owner from JWT token, not from client
  let ownerId;
  try {
    const decoded = require('jsonwebtoken').verify(token, 'real_user_auth_secret_2025');
    ownerId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Ensure owner is included in members
  const allMemberIds = [ownerId, ...memberIds.filter(id => id !== ownerId)];

  db.run(
    'INSERT INTO group_chats (name, owner_id) VALUES (?, ?)',
    [name, ownerId],
    function(err) {
      if (err) {
        return res.status(400).json({ error: 'Failed to create group chat' });
      }

      const groupChatId = this.lastID;
      let completed = 0;

      allMemberIds.forEach(memberId => {
        db.run('INSERT INTO group_chat_members (group_chat_id, user_id) VALUES (?, ?)', [groupChatId, memberId], (err) => {
          completed++;
          if (completed === allMemberIds.length) {
            res.json({ success: true, groupChatId });
          }
        });
      });
    }
  );
});

// Get group chat details (including owner and members) - requires membership
router.get('/group-chat/:groupChatId/details', (req, res) => {
  const { groupChatId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  
  let userId;
  try {
    const decoded = require('jsonwebtoken').verify(token, 'real_user_auth_secret_2025');
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Verify user is a member of this group
  db.get('SELECT * FROM group_chat_members WHERE group_chat_id = ? AND user_id = ?', 
    [groupChatId, userId], (err, membership) => {
      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this group chat' });
      }
      
      db.get('SELECT * FROM group_chats WHERE id = ?', [groupChatId], (err, groupChat) => {
        if (!groupChat) {
          return res.status(404).json({ error: 'Group chat not found' });
        }
        
        db.all(`
          SELECT u.id, u.username, u.profile_picture 
          FROM group_chat_members gcm
          JOIN users u ON gcm.user_id = u.id
          WHERE gcm.group_chat_id = ?
        `, [groupChatId], (err, members) => {
          res.json({
            ...groupChat,
            members: members || []
          });
        });
      });
    });
});

// Kick member from group chat (owner only)
router.post('/group-chat/:groupChatId/kick/:userId', (req, res) => {
  const { groupChatId, userId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  
  let requesterId;
  try {
    const decoded = require('jsonwebtoken').verify(token, 'real_user_auth_secret_2025');
    requesterId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Check if requester is the owner
  db.get('SELECT owner_id FROM group_chats WHERE id = ?', [groupChatId], (err, groupChat) => {
    if (!groupChat) {
      return res.status(404).json({ error: 'Group chat not found' });
    }
    if (groupChat.owner_id !== requesterId) {
      return res.status(403).json({ error: 'Only the group owner can kick members' });
    }
    if (parseInt(userId) === requesterId) {
      return res.status(400).json({ error: 'Cannot kick yourself. Use leave instead.' });
    }
    
    db.run('DELETE FROM group_chat_members WHERE group_chat_id = ? AND user_id = ?', 
      [groupChatId, userId], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to kick member' });
        }
        res.json({ success: true, message: 'Member kicked from group chat' });
      });
  });
});

// Leave group chat (any member)
router.post('/group-chat/:groupChatId/leave', (req, res) => {
  const { groupChatId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  
  let userId;
  try {
    const decoded = require('jsonwebtoken').verify(token, 'real_user_auth_secret_2025');
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Check if user is the owner - if so, they must delete the group instead
  db.get('SELECT owner_id FROM group_chats WHERE id = ?', [groupChatId], (err, groupChat) => {
    if (!groupChat) {
      return res.status(404).json({ error: 'Group chat not found' });
    }
    if (groupChat.owner_id === userId) {
      return res.status(400).json({ error: 'Owner cannot leave. Delete the group chat instead.' });
    }
    
    db.run('DELETE FROM group_chat_members WHERE group_chat_id = ? AND user_id = ?', 
      [groupChatId, userId], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to leave group chat' });
        }
        res.json({ success: true, message: 'Left group chat successfully' });
      });
  });
});

// Delete group chat (owner only)
router.delete('/group-chat/:groupChatId', (req, res) => {
  const { groupChatId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  
  let userId;
  try {
    const decoded = require('jsonwebtoken').verify(token, 'real_user_auth_secret_2025');
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Check if user is the owner
  db.get('SELECT owner_id FROM group_chats WHERE id = ?', [groupChatId], (err, groupChat) => {
    if (!groupChat) {
      return res.status(404).json({ error: 'Group chat not found' });
    }
    if (groupChat.owner_id !== userId) {
      return res.status(403).json({ error: 'Only the group owner can delete the group chat' });
    }
    
    // Delete all members first
    db.run('DELETE FROM group_chat_members WHERE group_chat_id = ?', [groupChatId], (err) => {
      // Delete all messages in the group
      db.run('DELETE FROM messages WHERE group_chat_id = ?', [groupChatId], (err) => {
        // Delete the group chat
        db.run('DELETE FROM group_chats WHERE id = ?', [groupChatId], (err) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to delete group chat' });
          }
          res.json({ success: true, message: 'Group chat deleted successfully' });
        });
      });
    });
  });
});

// Get user's group chats
router.get('/user/:userId/group-chats', (req, res) => {
  db.all(`
    SELECT gc.*, u.username as owner_name FROM group_chats gc
    JOIN group_chat_members gcm ON gc.id = gcm.group_chat_id
    LEFT JOIN users u ON gc.owner_id = u.id
    WHERE gcm.user_id = ?
  `, [req.params.userId], (err, groupChats) => {
    res.json(groupChats || []);
  });
});

// Get DM messages with pagination
router.get('/dms/:dmPartnerId/messages', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  let userId;
  try {
    const decoded = require('jsonwebtoken').verify(token, 'real_user_auth_secret_2025');
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const dmPartnerId = parseInt(req.params.dmPartnerId);
  const offset = parseInt(req.query.offset) || 0;
  const limit = parseInt(req.query.limit) || 50;

  // Check if either user has blocked the other
  db.get('SELECT id FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
    [userId, dmPartnerId, dmPartnerId, userId], (err, block) => {
      if (block) {
        return res.json([]); // Return empty if blocked
      }

      db.all(`
        SELECT m.*, u.username, u.profile_picture
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.channel_id IS NULL AND m.group_chat_id IS NULL
          AND ((m.user_id = ? AND m.dm_partner_id = ?) OR (m.user_id = ? AND m.dm_partner_id = ?))
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
      `, [userId, dmPartnerId, dmPartnerId, userId, limit, offset], (err, messages) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json((messages || []).reverse());
      });
    });
});

// Get unread counts for user
router.get('/unread/:userId', (req, res) => {
  const { userId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  
  let requesterId;
  try {
    const decoded = require('jsonwebtoken').verify(token, 'real_user_auth_secret_2025');
    requesterId = decoded.userId;
    if (requesterId !== parseInt(userId)) {
      return res.status(403).json({ error: 'Cannot view other users unread counts' });
    }
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const unreadCounts = {};
  
  db.all(`
    SELECT c.id as channel_id, c.server_id,
           COALESCE(mrs.last_read_message_id, 0) as last_read,
           (SELECT COUNT(*) FROM messages WHERE channel_id = c.id AND id > COALESCE(mrs.last_read_message_id, 0)) as unread_count
    FROM channels c
    JOIN server_members sm ON c.server_id = sm.server_id AND sm.user_id = ?
    LEFT JOIN message_read_status mrs ON mrs.channel_id = c.id AND mrs.user_id = ?
  `, [userId, userId], (err, channels) => {
    channels?.forEach(c => {
      if (c.unread_count > 0) {
        unreadCounts[`channel-${c.channel_id}`] = c.unread_count;
      }
    });
    
    db.all(`
      SELECT gc.id as group_chat_id,
             COALESCE(mrs.last_read_message_id, 0) as last_read,
             (SELECT COUNT(*) FROM messages WHERE group_chat_id = gc.id AND id > COALESCE(mrs.last_read_message_id, 0)) as unread_count
      FROM group_chats gc
      JOIN group_chat_members gcm ON gc.id = gcm.group_chat_id AND gcm.user_id = ?
      LEFT JOIN message_read_status mrs ON mrs.group_chat_id = gc.id AND mrs.user_id = ?
    `, [userId, userId], (err, groups) => {
      groups?.forEach(g => {
        if (g.unread_count > 0) {
          unreadCounts[`group-${g.group_chat_id}`] = g.unread_count;
        }
      });
      
      db.get(`
        SELECT COALESCE(mrs.last_read_message_id, 0) as last_read,
               (SELECT COUNT(*) FROM messages WHERE is_global = TRUE AND id > COALESCE(mrs.last_read_message_id, 0)) as unread_count
        FROM message_read_status mrs
        WHERE mrs.user_id = ? AND mrs.is_global = TRUE
      `, [userId], (err, global) => {
        if (global?.unread_count > 0) {
          unreadCounts['global'] = global.unread_count;
        }
        res.json(unreadCounts);
      });
    });
  });
});

// HTTP fallback for sending messages when socket is disconnected
router.post('/send', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  let userId;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const { channelId, groupChatId, dmPartnerId, isGlobal, content, replyToId } = req.body;
  
  if (!content || (!channelId && !groupChatId && !dmPartnerId && !isGlobal)) {
    return res.status(400).json({ error: 'Missing content or target' });
  }
  
  db.run(`
    INSERT INTO messages (channel_id, group_chat_id, dm_partner_id, user_id, content, is_global, reply_to_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [channelId || null, groupChatId || null, dmPartnerId || null, userId, content, isGlobal ? true : false, replyToId || null],
  function(err) {
    if (err) {
      console.error('Send message error:', err);
      return res.status(500).json({ error: 'Failed to send message' });
    }
    
    const messageId = this.lastID;
    
    db.get(`
      SELECT m.*, u.username, u.profile_picture
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `, [messageId], (err, message) => {
      if (err || !message) {
        return res.status(500).json({ error: 'Failed to fetch message' });
      }
      
      message.isGlobal = isGlobal;
      message.channelId = channelId;
      message.groupChatId = groupChatId;
      message.dmPartnerId = dmPartnerId;
      message.createdAt = new Date(message.created_at).toISOString();
      
      res.json({ success: true, message });
    });
  });
});

module.exports = router;
