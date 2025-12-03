const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const db = require('./db');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const serverRoutes = require('./routes/servers');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const featuresRoutes = require('./routes/features');
const friendsRoutes = require('./routes/friends');
const blocksRoutes = require('./routes/blocks');
const reactionsRoutes = require('./routes/reactions');
const pinsRoutes = require('./routes/pins');
const invitesRoutes = require('./routes/invites');
const searchRoutes = require('./routes/search');
const rolesRoutes = require('./routes/roles');
const categoriesRoutes = require('./routes/categories');
const auditRoutes = require('./routes/audit');
const shopRoutes = require('./routes/shop');
const changelogsRoutes = require('./routes/changelogs');
const shortcutsRoutes = require('./routes/shortcuts');
const archiveRoutes = require('./routes/archive');
const notesRoutes = require('./routes/notes');
const pollsRoutes = require('./routes/polls');
const preferencesRoutes = require('./routes/preferences');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../frontend/uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 25000,
  pingTimeout: 60000
});

// Pass io to admin routes for real-time notifications
adminRoutes.setIo(io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve all frontend files (CSS, JS, uploads)
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes - REAL user system (no token needed for signup/login)
app.use('/api/users', usersRoutes);

// Auth middleware for protected API routes
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

// Protected routes
app.use('/api/auth', authMiddleware, authRoutes);
app.use('/api/servers', authMiddleware, serverRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/features', authMiddleware, featuresRoutes);
app.use('/api/friends', authMiddleware, friendsRoutes);
app.use('/api/blocks', authMiddleware, blocksRoutes);
app.use('/api/reactions', authMiddleware, reactionsRoutes);
app.use('/api/pins', authMiddleware, pinsRoutes);
app.use('/api/invites', authMiddleware, invitesRoutes);
app.use('/api/search', authMiddleware, searchRoutes);
app.use('/api/roles', authMiddleware, rolesRoutes);
app.use('/api/categories', authMiddleware, categoriesRoutes);
app.use('/api/audit', authMiddleware, auditRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/changelogs', changelogsRoutes);
app.use('/api/shortcuts', shortcutsRoutes);
app.use('/api/archive', archiveRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/polls', pollsRoutes);
app.use('/api/preferences', preferencesRoutes);

// File upload endpoint
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ 
    success: true, 
    filename: req.file.filename,
    originalName: req.file.originalname,
    url: `/uploads/${req.file.filename}`,
    size: req.file.size,
    type: req.file.mimetype
  });
});

// Serve public index as root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// Cover login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Private directory - redirect to dashboard (cover login should be checked client-side)
app.get('/private', (req, res) => {
  res.redirect('/private/dashboard.html');
});

app.get('/private/', (req, res) => {
  res.redirect('/private/dashboard.html');
});

// Socket.io events for real-time communication
const userSockets = {};
const typingUsers = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins
  socket.on('user_join', (data) => {
    userSockets[data.userId] = socket.id;
    socket.userId = data.userId;
    socket.join('global-chat');
    db.run('UPDATE users SET is_online = 1 WHERE id = ?', [data.userId], (err) => {
      if (!err) {
        io.emit('user_online', { userId: data.userId });
      }
    });
  });

  // Enhanced typing indicator - supports all chat types
  socket.on('user_typing', (data) => {
    const { channelId, groupChatId, dmPartnerId, isGlobal, userId, username } = data;
    const key = channelId ? `channel-${channelId}` : 
                groupChatId ? `group-${groupChatId}` :
                dmPartnerId ? `dm-${Math.min(userId, dmPartnerId)}-${Math.max(userId, dmPartnerId)}` :
                isGlobal ? 'global-chat' : null;
    
    if (!typingUsers[key]) typingUsers[key] = {};
    typingUsers[key][userId] = { username, timestamp: Date.now() };
    
    if (key) socket.to(key).emit('user_typing', { userId, username, chatKey: key });
  });

  socket.on('user_stop_typing', (data) => {
    const { channelId, groupChatId, dmPartnerId, isGlobal, userId } = data;
    const key = channelId ? `channel-${channelId}` : 
                groupChatId ? `group-${groupChatId}` :
                dmPartnerId ? `dm-${Math.min(userId, dmPartnerId)}-${Math.max(userId, dmPartnerId)}` :
                isGlobal ? 'global-chat' : null;
    
    if (typingUsers[key]) delete typingUsers[key][userId];
    if (key) socket.to(key).emit('user_stop_typing', { userId, chatKey: key });
  });

  // Reaction events
  socket.on('add_reaction', (data) => {
    const { messageId, emoji, userId, username } = data;
    io.emit('reaction_added', { messageId, emoji, userId, username });
  });

  socket.on('remove_reaction', (data) => {
    const { messageId, emoji, userId } = data;
    io.emit('reaction_removed', { messageId, emoji, userId });
  });

  // Message edit event
  socket.on('edit_message', (data) => {
    const { messageId, newContent, userId } = data;
    db.get('SELECT user_id FROM messages WHERE id = ?', [messageId], (err, msg) => {
      if (msg && msg.user_id === userId) {
        db.run('UPDATE messages SET content = ?, is_edited = 1, edited_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newContent, messageId], (err) => {
            if (!err) {
              io.emit('message_edited', { messageId, newContent, editedAt: new Date().toISOString() });
            }
          });
      }
    });
  });

  // Mark messages as read
  socket.on('mark_read', (data) => {
    const { userId, channelId, groupChatId, dmPartnerId, isGlobal, lastMessageId } = data;
    db.run(`
      INSERT OR REPLACE INTO message_read_status 
      (user_id, channel_id, group_chat_id, dm_partner_id, is_global, last_read_message_id, last_read_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [userId, channelId || null, groupChatId || null, dmPartnerId || null, isGlobal ? 1 : 0, lastMessageId]);
  });

  // Join channel room
  socket.on('join_channel', (data) => {
    socket.join(`channel-${data.channelId}`);
  });

  // Leave channel room
  socket.on('leave_channel', (data) => {
    socket.leave(`channel-${data.channelId}`);
  });

  // Send message (channel, group chat, DM, or global) with reply and attachment support
  socket.on('send_message', (data) => {
    const { channelId, groupChatId, dmPartnerId, userId, content, isGlobal, replyToId, attachment } = data;
    
    // First check if user is banned from chatting
    db.get('SELECT role, ban_until FROM users WHERE id = ?', [userId], (err, user) => {
      if (err || !user) {
        socket.emit('message_error', { error: 'User not found' });
        return;
      }
      
      // Check if user is currently banned (ban_until is in the future)
      if (user.ban_until) {
        const banUntil = new Date(user.ban_until);
        if (banUntil > new Date()) {
          socket.emit('message_error', { 
            error: 'You are banned from chatting',
            banUntil: user.ban_until
          });
          return;
        }
      }
      
      // Check if trying to message in Welcome server (ID: 1) - admin only
      if (channelId) {
        db.get('SELECT server_id FROM channels WHERE id = ?', [channelId], (err, channel) => {
          if (channel && channel.server_id === 1) {
            // Only admins can message in Welcome server
            if (user.role !== 'admin') {
              socket.emit('message_error', { error: 'Only admins can send messages in this server' });
              return;
            }
          }
          // Proceed with sending message
          sendMessageToDb(channelId, groupChatId, dmPartnerId, userId, content, isGlobal, socket, replyToId, attachment);
        });
      } else {
        // Not a channel message, proceed
        sendMessageToDb(channelId, groupChatId, dmPartnerId, userId, content, isGlobal, socket, replyToId, attachment);
      }
    });
  });
  
  // Helper function to send message to database
  function sendMessageToDb(channelId, groupChatId, dmPartnerId, userId, content, isGlobal, socket, replyToId, attachment) {
    // Check for blocks on DMs
    if (dmPartnerId) {
      db.get('SELECT id FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
        [userId, dmPartnerId, dmPartnerId, userId], (err, block) => {
          if (block) {
            socket.emit('message_error', { error: 'Cannot send message to this user' });
            return;
          }
          insertMessage(channelId, groupChatId, dmPartnerId, userId, content, isGlobal, socket, replyToId, attachment);
        });
    } else {
      insertMessage(channelId, groupChatId, dmPartnerId, userId, content, isGlobal, socket, replyToId, attachment);
    }
  }
  
  function insertMessage(channelId, groupChatId, dmPartnerId, userId, content, isGlobal, socket, replyToId, attachment) {
    let query, params;
    if (isGlobal) {
      query = `INSERT INTO messages (user_id, content, is_global, reply_to_id) VALUES (?, ?, 1, ?)`;
      params = [userId, content, replyToId || null];
    } else if (dmPartnerId) {
      query = `INSERT INTO messages (channel_id, group_chat_id, dm_partner_id, user_id, content, reply_to_id)
               VALUES (?, ?, ?, ?, ?, ?)`;
      params = [null, null, dmPartnerId, userId, content, replyToId || null];
    } else {
      query = `INSERT INTO messages (channel_id, group_chat_id, user_id, content, reply_to_id)
               VALUES (?, ?, ?, ?, ?)`;
      params = [channelId || null, groupChatId || null, userId, content, replyToId || null];
    }
    
    db.run(query, params, function(err) {
      if (!err) {
        const messageId = this.lastID;
        
        if (attachment) {
          db.run(`INSERT INTO attachments (message_id, filename, original_name, file_type, file_size, url) 
                  VALUES (?, ?, ?, ?, ?, ?)`,
            [messageId, attachment.filename, attachment.originalName, attachment.type, attachment.size, attachment.url]);
        }
        
        db.get(
          `SELECT m.*, u.username, u.profile_picture,
                  rm.content as reply_content, ru.username as reply_username
           FROM messages m 
           JOIN users u ON m.user_id = u.id 
           LEFT JOIN messages rm ON m.reply_to_id = rm.id
           LEFT JOIN users ru ON rm.user_id = ru.id
           WHERE m.id = ?`,
          [messageId],
          (err, message) => {
            if (!err && message) {
              if (attachment) {
                message.attachment = attachment;
              }
              
              if (message.reply_to_id) {
                message.replyTo = {
                  id: message.reply_to_id,
                  content: message.reply_content,
                  username: message.reply_username
                };
              }
              
              if (isGlobal) {
                message.isGlobal = true;
                message.createdAt = new Date(message.created_at).toISOString();
                io.to('global-chat').emit('new_message', message);
              } else if (channelId) {
                message.channelId = channelId;
                io.to(`channel-${channelId}`).emit('new_message', message);
              } else if (groupChatId) {
                message.groupChatId = groupChatId;
                io.to(`group-${groupChatId}`).emit('new_message', message);
              } else if (dmPartnerId) {
                message.dmPartnerId = dmPartnerId;
                message.createdAt = new Date(message.created_at).toISOString();
                const roomId = `dm-${Math.min(userId, dmPartnerId)}-${Math.max(userId, dmPartnerId)}`;
                io.to(roomId).emit('new_message', message);
              }
              
              // Check for @mentions and notify
              const mentions = content.match(/@(\w+)/g);
              if (mentions) {
                mentions.forEach(mention => {
                  const mentionedUsername = mention.slice(1);
                  db.get('SELECT id FROM users WHERE username = ?', [mentionedUsername], (err, mentionedUser) => {
                    if (mentionedUser && userSockets[mentionedUser.id]) {
                      io.to(userSockets[mentionedUser.id]).emit('mention_notification', {
                        messageId,
                        fromUsername: message.username,
                        content: content.substring(0, 100),
                        channelId,
                        groupChatId,
                        dmPartnerId,
                        isGlobal
                      });
                    }
                  });
                });
              }
            }
          }
        );
      }
    });
  }

  // Join DM room (use consistent naming to avoid duplicates)
  socket.on('join_dm', (data) => {
    const { userId, dmPartnerId } = data;
    const roomId = `dm-${Math.min(userId, dmPartnerId)}-${Math.max(userId, dmPartnerId)}`;
    socket.join(roomId);
  });

  // Join group chat room
  socket.on('join_group', (data) => {
    socket.join(`group-${data.groupChatId}`);
  });

  // Delete message
  socket.on('delete_message', (data) => {
    const { messageId, userId, isAdmin } = data;
    
    db.get('SELECT user_id FROM messages WHERE id = ?', [messageId], (err, msg) => {
      if (msg && (msg.user_id === userId || isAdmin)) {
        db.run('DELETE FROM messages WHERE id = ?', [messageId], () => {
          io.emit('message_deleted', { messageId });
        });
      }
    });
  });

  // User disconnect
  socket.on('disconnect', () => {
    for (let userId in userSockets) {
      if (userSockets[userId] === socket.id) {
        db.run('UPDATE users SET is_online = 0 WHERE id = ?', [userId], (err) => {
          if (!err) {
            io.emit('user_offline', { userId });
          }
        });
        delete userSockets[userId];
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Chat server running on http://0.0.0.0:${PORT}`);
});
