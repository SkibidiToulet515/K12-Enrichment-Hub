const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { createBareServer } = require('@nebula-services/bare-server-node');
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
const proxyRoutes = require('./routes/proxy');
const bookmarksRoutes = require('./routes/bookmarks');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../frontend/uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const app = express();
const bareServer = createBareServer('/bare/');
const server = http.createServer((req, res) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

server.on('upgrade', (req, socket, head) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeUpgrade(req, socket, head);
  } else {
    socket.end();
  }
});

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

// Service Worker headers - must come before static serving
app.get('/uv/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(__dirname, '../frontend/uv/sw.js'));
});
app.get('/scram/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(__dirname, '../frontend/scram/sw.js'));
});

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
app.use('/api/proxy', proxyRoutes);
app.use('/api/bookmarks', bookmarksRoutes);

// XOR encode/decode functions for proxy URLs
function xorDecode(encoded) {
  return encoded.split('').map((c, i) => i % 2 ? String.fromCharCode(c.charCodeAt(0) ^ 2) : c).join('');
}

function xorEncode(url) {
  return url.split('').map((c, i) => i % 2 ? String.fromCharCode(c.charCodeAt(0) ^ 2) : c).join('');
}

// Robust proxy handler using native http/https modules for streaming
const proxyHttp = require('http');
const proxyHttps = require('https');

function proxyRequest(targetUrl, req, res, prefix) {
  const parsedUrl = new URL(targetUrl);
  const protocol = parsedUrl.protocol === 'https:' ? proxyHttps : proxyHttp;
  
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: parsedUrl.pathname + parsedUrl.search,
    method: req.method,
    headers: {
      'Host': parsedUrl.host,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'identity',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
  };

  const proxyReq = protocol.request(options, (proxyRes) => {
    // Handle redirects
    if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
      let redirectUrl = proxyRes.headers.location;
      if (!redirectUrl.startsWith('http')) {
        redirectUrl = parsedUrl.origin + (redirectUrl.startsWith('/') ? '' : '/') + redirectUrl;
      }
      return proxyRequest(redirectUrl, req, res, prefix);
    }

    const contentType = proxyRes.headers['content-type'] || '';
    
    // Set response headers - strip security headers that block iframes
    res.status(proxyRes.statusCode);
    const blockedHeaders = [
      'content-encoding', 
      'transfer-encoding', 
      'content-length', 
      'content-security-policy',
      'content-security-policy-report-only',
      'x-frame-options',
      'x-content-type-options',
      'strict-transport-security',
      'cross-origin-opener-policy',
      'cross-origin-embedder-policy',
      'cross-origin-resource-policy',
      'permissions-policy'
    ];
    Object.keys(proxyRes.headers).forEach(key => {
      if (!blockedHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, proxyRes.headers[key]);
      }
    });
    // Add permissive headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    
    // For HTML, buffer and inject base tag + fetch interceptor
    if (contentType.includes('text/html')) {
      let chunks = [];
      proxyRes.on('data', chunk => chunks.push(chunk));
      proxyRes.on('end', () => {
        let html = Buffer.concat(chunks).toString('utf-8');
        
        const currentOrigin = parsedUrl.origin;
        
        // XOR encode function for client-side
        const xorEncodeJS = `function __xorEncode(u){return u.split('').map((c,i)=>i%2?String.fromCharCode(c.charCodeAt(0)^2):c).join('')}`;
        
        // Fetch/XHR interceptor script
        const interceptorScript = `
<script>
(function(){
  ${xorEncodeJS}
  const BASE="${currentOrigin}";
  const PROXY_PREFIX="/service/";
  
  function toProxyUrl(url){
    try{
      const u=new URL(url,BASE);
      if(u.origin!==location.origin){
        return PROXY_PREFIX+encodeURIComponent(__xorEncode(u.href));
      }
    }catch(e){}
    return url;
  }
  
  // Intercept fetch
  const _fetch=window.fetch;
  window.fetch=function(url,opts){
    if(typeof url==='string'){
      url=toProxyUrl(url);
    }else if(url instanceof Request){
      url=new Request(toProxyUrl(url.url),url);
    }
    return _fetch.call(this,url,opts);
  };
  
  // Intercept XMLHttpRequest
  const _open=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(method,url){
    arguments[1]=toProxyUrl(url);
    return _open.apply(this,arguments);
  };
  
  // Intercept WebSocket (basic)
  const _WS=window.WebSocket;
  window.WebSocket=function(url,protocols){
    console.log('[Proxy] WebSocket blocked:',url);
    return {send:()=>{},close:()=>{},addEventListener:()=>{}};
  };
})();
</script>`;
        
        // Inject base tag and interceptor
        const baseTag = `<base href="${currentOrigin}/">`;
        if (html.includes('<head>')) {
          html = html.replace('<head>', '<head>' + baseTag + interceptorScript);
        } else if (html.includes('<HEAD>')) {
          html = html.replace('<HEAD>', '<HEAD>' + baseTag + interceptorScript);
        } else if (html.includes('<html>') || html.includes('<HTML>')) {
          html = html.replace(/<html>/i, '<html><head>' + baseTag + interceptorScript + '</head>');
        } else {
          html = baseTag + interceptorScript + html;
        }
        
        res.send(html);
      });
    } else {
      // Stream non-HTML content directly
      proxyRes.pipe(res);
    }
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy request error:', err.message);
    if (!res.headersSent) {
      res.status(502).send('Proxy error: ' + err.message);
    }
  });

  proxyReq.setTimeout(30000, () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.status(504).send('Proxy timeout');
    }
  });

  proxyReq.end();
}

function handleProxyRequest(req, res, prefix) {
  // Express strips mount path, so req.url starts with / + the encoded URL
  const encodedPath = req.url.slice(1); // Remove leading /
  if (!encodedPath) return res.status(400).send('No URL provided');
  
  try {
    // The path may still be URL encoded, decode it first
    const decoded = decodeURIComponent(encodedPath.split('?')[0]);
    const decodedUrl = xorDecode(decoded);
    
    console.log('Proxy request - Encoded:', encodedPath.substring(0, 30), '-> Decoded:', decodedUrl.substring(0, 50));
    
    if (!decodedUrl.startsWith('http://') && !decodedUrl.startsWith('https://')) {
      return res.status(400).send('Invalid URL: ' + decodedUrl.substring(0, 50));
    }

    proxyRequest(decodedUrl, req, res, prefix);
  } catch (error) {
    console.error('Proxy decode error:', error.message);
    res.status(500).send('Proxy error: ' + error.message);
  }
}

app.use('/service', (req, res, next) => {
  if (req.path === '' || req.path === '/') return next();
  handleProxyRequest(req, res, '/service/');
});

app.use('/scram/service', (req, res, next) => {
  if (req.path === '' || req.path === '/') return next();
  handleProxyRequest(req, res, '/scram/service/');
});

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
      INSERT INTO message_read_status 
      (user_id, channel_id, group_chat_id, dm_partner_id, is_global, last_read_message_id, last_read_at)
      VALUES (?, COALESCE(?, 0), COALESCE(?, 0), COALESCE(?, 0), ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, channel_id, group_chat_id, dm_partner_id, is_global) DO UPDATE SET
        last_read_message_id = excluded.last_read_message_id,
        last_read_at = CURRENT_TIMESTAMP
    `, [userId, channelId || 0, groupChatId || 0, dmPartnerId || 0, isGlobal ? 1 : 0, lastMessageId]);
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
