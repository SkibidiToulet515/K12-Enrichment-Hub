// Chat page
let socket;
let currentUser;
let currentChannel = null;
let currentFriend = null;
let currentGroupChat = null;
let isGlobalChat = false;
let messageOffset = 0;
let isLoadingMessages = false;
let hasMoreMessages = true;
let currentMessageEndpoint = null;
let userInfoCache = {};
let isAdmin = false;

document.addEventListener('DOMContentLoaded', () => {
  currentUser = checkAuth();
  if (!currentUser) return;

  initSocket();
  loadServers();
  loadGroupChats();
  loadPendingRequests();
  loadFriends();
  setupEventListeners();
  setupGlobalChat();
  checkAdminStatus();
  
  // Add scroll listener for infinite load of older messages
  const container = document.getElementById('messagesContainer');
  container.addEventListener('scroll', () => {
    if (container.scrollTop < 150 && hasMoreMessages && !isLoadingMessages) {
      loadMessages(true);
    }
  });
  
  // Refresh pending requests every 10 seconds
  setInterval(loadPendingRequests, 10000);
});

// Check if current user is admin
function checkAdminStatus() {
  fetch('/api/admin/check', {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      isAdmin = data.isAdmin;
      if (isAdmin) {
        document.getElementById('adminSection').style.display = 'block';
        setupAdminPanel();
      }
    });
}

// Setup admin panel
function setupAdminPanel() {
  const openBtn = document.getElementById('openAdminBtn');
  const closeBtn = document.getElementById('closeAdminBtn');
  const overlay = document.getElementById('adminOverlay');
  const panel = document.getElementById('adminPanel');
  const tabs = document.querySelectorAll('.admin-tab');
  
  openBtn.addEventListener('click', () => {
    overlay.classList.add('active');
    panel.classList.add('active');
    loadAdminUsers();
    loadServerRequests();
  });
  
  closeBtn.addEventListener('click', closeAdminPanel);
  overlay.addEventListener('click', closeAdminPanel);
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.admin-content').forEach(c => c.classList.remove('active'));
      document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');
    });
  });
}

function closeAdminPanel() {
  document.getElementById('adminOverlay').classList.remove('active');
  document.getElementById('adminPanel').classList.remove('active');
}

// Load all users for admin
function loadAdminUsers() {
  fetch('/api/admin/users', {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(users => {
      const list = document.getElementById('adminUsersList');
      list.innerHTML = '';
      
      users.forEach(user => {
        const row = document.createElement('div');
        row.className = 'user-row';
        
        // Check if user is currently banned (ban_until is in the future)
        const isBanned = user.ban_until && new Date(user.ban_until) > new Date();
        const banTimeLeft = isBanned ? getTimeRemaining(new Date(user.ban_until)) : '';
        
        let badges = '';
        if (user.role === 'admin') badges += '<span class="badge-admin">ADMIN</span>';
        if (isBanned) badges += `<span class="badge-banned">BANNED (${banTimeLeft})</span>`;
        if (user.warning_count > 0) badges += `<span class="badge-warn">${user.warning_count} warns</span>`;
        
        let actions = '';
        if (user.role !== 'admin') {
          if (isBanned) {
            actions = `<button class="btn-unban" onclick="unbanUser(${user.id})">Unban</button>`;
          } else {
            actions = `
              <button class="btn-warn" onclick="warnUser(${user.id}, '${escapeHtml(user.username)}')">Warn</button>
              <button class="btn-ban" onclick="banUser(${user.id}, '${escapeHtml(user.username)}')">Ban</button>
            `;
          }
          if (user.warning_count > 0) {
            actions += `<button onclick="clearWarnings(${user.id})" style="background:#3498db;color:white;">Clear</button>`;
          }
        }
        
        row.innerHTML = `
          <img src="${user.profile_picture || 'https://via.placeholder.com/36'}" alt="">
          <div class="info">
            <div class="name">${escapeHtml(user.username)}${badges}</div>
            <div class="status">${user.is_online ? 'Online' : 'Offline'} - Joined ${new Date(user.created_at).toLocaleDateString()}</div>
            ${isBanned && user.ban_reason ? `<div class="status" style="color:#e74c3c;">Reason: ${escapeHtml(user.ban_reason)}</div>` : ''}
          </div>
          <div class="actions">${actions}</div>
        `;
        list.appendChild(row);
      });
    });
}

// Load server requests for admin
function loadServerRequests() {
  fetch('/api/admin/server-requests', {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(requests => {
      const list = document.getElementById('serverRequestsList');
      list.innerHTML = requests.length === 0 
        ? '<p style="color: var(--text-light);">No pending server requests</p>'
        : '';
      
      requests.forEach(req => {
        const row = document.createElement('div');
        row.className = 'request-row';
        row.innerHTML = `
          <h4>${escapeHtml(req.server_name)}</h4>
          <p>Requested by: ${escapeHtml(req.username)} - ${new Date(req.created_at).toLocaleDateString()}</p>
          <p>${req.description ? escapeHtml(req.description) : 'No description'}</p>
          <div style="display:flex;gap:10px;">
            <button class="btn-approve" onclick="approveServer(${req.id})">Approve</button>
            <button class="btn-deny" onclick="denyServer(${req.id})">Deny</button>
          </div>
        `;
        list.appendChild(row);
      });
    });
}

// Admin actions
function warnUser(userId, username) {
  const reason = prompt(`Warn ${username}. Enter reason:`);
  if (!reason) return;
  
  fetch(`/api/admin/warn/${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify({ reason })
  })
    .then(r => r.json())
    .then(data => {
      alert(data.message);
      loadAdminUsers();
    });
}

function banUser(userId, username) {
  const duration = prompt(`Ban ${username} from chatting.\n\nEnter duration (e.g., "30 minutes", "1 hour", "2 days"):`);
  if (!duration) return;
  
  const reason = prompt(`Enter reason for banning ${username}:`) || 'No reason provided';
  
  fetch(`/api/admin/ban/${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify({ reason, duration })
  })
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        alert('Error: ' + data.error);
      } else {
        alert(data.message);
        loadAdminUsers();
      }
    });
}

function unbanUser(userId) {
  fetch(`/api/admin/unban/${userId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      alert(data.message);
      loadAdminUsers();
    });
}

function clearWarnings(userId) {
  fetch(`/api/admin/clear-warnings/${userId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      alert(data.message);
      loadAdminUsers();
    });
}

function approveServer(requestId) {
  fetch(`/api/admin/approve-server/${requestId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      alert('Server approved!');
      loadServerRequests();
      loadServers();
    });
}

function denyServer(requestId) {
  fetch(`/api/admin/deny-server/${requestId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(() => {
      alert('Server request denied');
      loadServerRequests();
    });
}

// Group chats
let currentGroupChatData = null;
let currentServerData = null;

function loadGroupChats() {
  fetch(`/api/messages/user/${currentUser.id}/group-chats`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(groups => {
      const list = document.getElementById('groupChatsList');
      list.innerHTML = '';
      groups.forEach(group => {
        const container = document.createElement('div');
        container.className = 'group-item';
        container.style.cssText = 'display: flex; align-items: center; gap: 5px; margin-bottom: 2px;';
        
        const btn = document.createElement('button');
        btn.className = 'server-btn';
        btn.style.cssText = 'flex: 1;';
        btn.textContent = group.name || 'Group Chat';
        btn.addEventListener('click', () => selectGroupChat(group));
        
        const isOwner = group.owner_id === currentUser.id;
        
        const optBtn = document.createElement('button');
        optBtn.textContent = '⚙';
        optBtn.title = isOwner ? 'Manage Group' : 'Leave Group';
        optBtn.style.cssText = 'padding: 5px 8px; background: var(--accent); border: none; border-radius: 4px; cursor: pointer; font-size: 12px;';
        optBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          showGroupChatOptions(group, isOwner);
        });
        
        container.appendChild(btn);
        container.appendChild(optBtn);
        list.appendChild(container);
      });
    });
}

function selectGroupChat(group) {
  currentGroupChat = group.id;
  currentGroupChatData = group;
  currentChannel = null;
  currentFriend = null;
  isGlobalChat = false;
  messageOffset = 0;
  hasMoreMessages = true;
  document.getElementById('chatTitle').textContent = group.name || 'Group Chat';
  document.getElementById('globalChatBtn').classList.remove('active');
  currentMessageEndpoint = `/api/messages/group/${group.id}`;
  socket.emit('join_group', { groupChatId: group.id });
  loadMessages();
}

function showGroupChatOptions(group, isOwner) {
  if (isOwner) {
    const action = prompt(`Manage "${group.name}":\n\n1 - View/Kick Members\n2 - Delete Group Chat\n\nEnter 1 or 2:`);
    if (action === '1') {
      manageGroupChatMembers(group);
    } else if (action === '2') {
      if (confirm(`Are you sure you want to DELETE "${group.name}"? This cannot be undone.`)) {
        deleteGroupChat(group.id);
      }
    }
  } else {
    if (confirm(`Leave "${group.name}"?`)) {
      leaveGroupChat(group.id);
    }
  }
}

function manageGroupChatMembers(group) {
  fetch(`/api/messages/group-chat/${group.id}/details`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      const memberList = data.members.map((m, i) => 
        `${i + 1}. ${m.username}${m.id === group.owner_id ? ' (Owner)' : ''}`
      ).join('\n');
      
      const choice = prompt(`Members of "${group.name}":\n\n${memberList}\n\nEnter member number to kick (or cancel):`);
      if (choice) {
        const idx = parseInt(choice) - 1;
        if (idx >= 0 && idx < data.members.length) {
          const member = data.members[idx];
          if (member.id === currentUser.id) {
            alert('Cannot kick yourself!');
            return;
          }
          if (confirm(`Kick ${member.username} from the group?`)) {
            kickFromGroupChat(group.id, member.id);
          }
        }
      }
    });
}

function leaveGroupChat(groupChatId) {
  fetch(`/api/messages/group-chat/${groupChatId}/leave`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        alert(data.error);
      } else {
        alert('Left group chat');
        loadGroupChats();
        if (currentGroupChat === groupChatId) {
          currentGroupChat = null;
          document.getElementById('messagesContainer').innerHTML = '<div class="welcome">Select a chat to start messaging</div>';
          document.getElementById('chatTitle').textContent = 'Chat';
        }
      }
    });
}

function deleteGroupChat(groupChatId) {
  fetch(`/api/messages/group-chat/${groupChatId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        alert(data.error);
      } else {
        alert('Group chat deleted');
        loadGroupChats();
        if (currentGroupChat === groupChatId) {
          currentGroupChat = null;
          document.getElementById('messagesContainer').innerHTML = '<div class="welcome">Select a chat to start messaging</div>';
          document.getElementById('chatTitle').textContent = 'Chat';
        }
      }
    });
}

function kickFromGroupChat(groupChatId, userId) {
  fetch(`/api/messages/group-chat/${groupChatId}/kick/${userId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        alert(data.error);
      } else {
        alert('Member kicked');
      }
    });
}

function createGroupChat() {
  const name = prompt('Group chat name:');
  if (!name) return;
  
  const memberIdsStr = prompt('Enter member usernames (comma-separated):');
  if (!memberIdsStr) return;
  
  const memberNames = memberIdsStr.split(',').map(s => s.trim());
  
  // Get user IDs from usernames
  Promise.all(memberNames.map(username => 
    fetch(`/api/users/search?username=${encodeURIComponent(username)}`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    }).then(r => r.json())
  ))
    .then(results => {
      const memberIds = [currentUser.id];
      results.forEach(r => {
        if (r && r.id) memberIds.push(r.id);
      });
      
      return fetch('/api/messages/group-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ name, memberIds })
      });
    })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        alert('Group chat created!');
        loadGroupChats();
      }
    })
    .catch(() => alert('Failed to create group chat'));
}

function initSocket() {
  socket = io({ transports: ['websocket'] });

  socket.on('connect', () => {
    socket.emit('user_join', { userId: currentUser.id });
  });

  socket.on('new_message', (message) => {
    // Check if message is for current channel/friend/group/global
    const isRelevant = (message.channel_id === currentChannel) || 
                       (message.dmPartnerId === currentFriend) || 
                       (message.groupChatId === currentGroupChat) ||
                       (message.isGlobal && isGlobalChat);
    if (isRelevant) {
      displayMessage(message);
    }
  });

  socket.on('message_deleted', (data) => {
    const msgId = data.messageId || data;
    document.querySelector(`[data-msg-id="${msgId}"]`)?.remove();
  });
  
  // Handle message errors (ban, admin-only servers, etc.)
  socket.on('message_error', (data) => {
    if (data.banUntil) {
      const banDate = new Date(data.banUntil);
      showBanNotice(banDate);
    } else {
      alert(data.error || 'Unable to send message');
    }
  });
  
  // Handle warning notifications
  socket.on('user_warned', (data) => {
    if (data.userId === currentUser.id) {
      showWarningNotice(data.warningCount, data.reason);
    }
  });
  
  // Handle ban notifications
  socket.on('user_banned', (data) => {
    if (data.userId === currentUser.id) {
      const banDate = new Date(data.banUntil);
      showBanNotice(banDate, data.reason, data.duration);
    }
  });
  
  // Handle permanent ban notifications
  socket.on('user_permabanned', (data) => {
    if (data.userId === currentUser.id) {
      showPermaBanNotice(data.reason);
    }
  });
  
  // Handle server approval notification
  socket.on('server_approved', (data) => {
    if (data.userId === currentUser.id) {
      loadServers();
      showServerSetupModal({ id: data.serverId, name: data.serverName });
    }
  });
}

// Show warning notice to user
function showWarningNotice(warningCount, reason) {
  const existing = document.getElementById('warningNotice');
  if (existing) existing.remove();
  
  const notice = document.createElement('div');
  notice.id = 'warningNotice';
  notice.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #f39c12, #e67e22);
    color: white;
    padding: 30px 40px;
    border-radius: 15px;
    z-index: 2000;
    text-align: center;
    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    font-weight: 600;
    animation: warningPulse 0.5s ease-out;
    max-width: 400px;
  `;
  notice.innerHTML = `
    <div style="font-size: 40px; margin-bottom: 15px;">⚠️</div>
    <div style="font-size: 22px; margin-bottom: 10px;">You have been warned.</div>
    <div style="font-size: 28px; color: #fff; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); margin-bottom: 15px;">(${warningCount}/3)</div>
    <div style="font-size: 16px; opacity: 0.95; margin-bottom: 10px;">3/3 = PermBan</div>
    <div style="font-size: 13px; opacity: 0.8; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; margin-top: 15px;">
      Reason: ${escapeHtml(reason)}
    </div>
    <button onclick="this.parentElement.remove()" style="margin-top: 20px; padding: 10px 30px; background: white; color: #e67e22; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
      I Understand
    </button>
  `;
  
  // Add animation styles
  if (!document.getElementById('warningStyles')) {
    const style = document.createElement('style');
    style.id = 'warningStyles';
    style.textContent = `
      @keyframes warningPulse {
        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
        50% { transform: translate(-50%, -50%) scale(1.05); }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notice);
  
  // Add overlay
  const overlay = document.createElement('div');
  overlay.id = 'warningOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.7);
    z-index: 1999;
  `;
  overlay.onclick = () => {
    overlay.remove();
    notice.remove();
  };
  document.body.appendChild(overlay);
}

// Show permanent ban notice
function showPermaBanNotice(reason) {
  const existing = document.getElementById('permaBanNotice');
  if (existing) existing.remove();
  
  const notice = document.createElement('div');
  notice.id = 'permaBanNotice';
  notice.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #c0392b, #8e1d1d);
    color: white;
    padding: 40px 50px;
    border-radius: 15px;
    z-index: 2000;
    text-align: center;
    box-shadow: 0 10px 40px rgba(0,0,0,0.6);
    font-weight: 600;
    animation: warningPulse 0.5s ease-out;
    max-width: 450px;
  `;
  notice.innerHTML = `
    <div style="font-size: 50px; margin-bottom: 15px;">🚫</div>
    <div style="font-size: 26px; margin-bottom: 10px;">PERMANENTLY BANNED</div>
    <div style="font-size: 18px; opacity: 0.9; margin-bottom: 15px;">You have received 3/3 warnings</div>
    <div style="font-size: 14px; opacity: 0.8; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 8px;">
      ${escapeHtml(reason)}
    </div>
    <div style="font-size: 12px; opacity: 0.7; margin-top: 15px;">
      You can no longer send messages. Contact an admin to appeal.
    </div>
  `;
  
  document.body.appendChild(notice);
  
  // Add overlay
  const overlay = document.createElement('div');
  overlay.id = 'permaBanOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    z-index: 1999;
  `;
  document.body.appendChild(overlay);
}

// Show ban notice to user
function showBanNotice(banUntil, reason, duration) {
  const existing = document.getElementById('banNotice');
  if (existing) existing.remove();
  
  const timeLeft = getTimeRemaining(banUntil);
  const notice = document.createElement('div');
  notice.id = 'banNotice';
  notice.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #e74c3c, #c0392b);
    color: white;
    padding: 20px 30px;
    border-radius: 12px;
    z-index: 1000;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    font-weight: 600;
    max-width: 350px;
  `;
  notice.innerHTML = `
    <div style="font-size: 16px; margin-bottom: 8px;">🚫 You have been banned from chatting</div>
    <div style="font-size: 13px; opacity: 0.9; margin-bottom: 5px;">Duration: ${duration || timeLeft}</div>
    <div style="font-size: 12px; opacity: 0.85; margin-bottom: 8px;">Time remaining: ${timeLeft}</div>
    ${reason ? `<div style="font-size: 11px; opacity: 0.8; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px;">Reason: ${escapeHtml(reason)}</div>` : ''}
    <div style="font-size: 10px; opacity: 0.7; margin-top: 8px;">You can still access games, movies, and other features</div>
  `;
  document.body.appendChild(notice);
  
  // Auto-remove after 8 seconds
  setTimeout(() => notice.remove(), 8000);
}

// Get time remaining in human readable format
function getTimeRemaining(banUntil) {
  const now = new Date();
  const diff = banUntil - now;
  
  if (diff <= 0) return 'Expired';
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`;
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

function setupEventListeners() {
  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  document.getElementById('addServerBtn').addEventListener('click', createServerRequest);
  document.getElementById('joinServerBtn').addEventListener('click', openJoinServerModal);
  document.getElementById('addFriendBtn').addEventListener('click', addFriend);
  document.getElementById('createGroupBtn').addEventListener('click', createGroupChat);
}

// Setup Global Chat
function setupGlobalChat() {
  const globalBtn = document.getElementById('globalChatBtn');
  if (globalBtn) {
    globalBtn.addEventListener('click', selectGlobalChat);
  }
}

// Select Global Chat
function selectGlobalChat() {
  // Reset other chat contexts
  currentChannel = null;
  currentFriend = null;
  currentGroupChat = null;
  isGlobalChat = true;
  messageOffset = 0;
  hasMoreMessages = true;
  
  // Update UI
  document.getElementById('chatTitle').textContent = 'Global Chat - Everyone\'s Hangout';
  document.getElementById('globalChatBtn').classList.add('active');
  
  // Remove active state from other buttons
  document.querySelectorAll('.server-btn, .friend-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Set endpoint and load messages
  currentMessageEndpoint = '/api/messages/global';
  loadMessages();
}

function loadServers() {
  fetch(`/api/servers/user/${currentUser.id}`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(servers => {
      const list = document.getElementById('serversList');
      list.innerHTML = '';
      servers.forEach(server => {
        const container = document.createElement('div');
        container.className = 'server-item';
        container.style.cssText = 'display: flex; align-items: center; gap: 5px; margin-bottom: 2px;';
        
        const btn = document.createElement('button');
        btn.className = 'server-btn';
        btn.style.cssText = 'flex: 1;';
        btn.textContent = server.name;
        btn.addEventListener('click', () => selectServer(server));
        
        // Don't show options for Welcome server (ID: 1)
        if (server.id !== 1) {
          const isOwner = server.owner_id === currentUser.id;
          
          const optBtn = document.createElement('button');
          optBtn.textContent = '⚙';
          optBtn.title = isOwner ? 'Manage Server' : 'Leave Server';
          optBtn.style.cssText = 'padding: 5px 8px; background: var(--accent); border: none; border-radius: 4px; cursor: pointer; font-size: 12px;';
          optBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showServerOptions(server, isOwner);
          });
          
          container.appendChild(btn);
          container.appendChild(optBtn);
        } else {
          container.appendChild(btn);
        }
        
        list.appendChild(container);
      });
    });
}

function showServerOptions(server, isOwner) {
  if (isOwner) {
    const action = prompt(`Manage "${server.name}":\n\n1 - Edit Server/Channels\n2 - View/Kick Members\n3 - Roles & Permissions\n4 - Create Invite Link\n5 - View Invites\n6 - Delete Server\n\nEnter 1-6:`);
    if (action === '1') {
      openServerManageModal(server.id, server.name);
    } else if (action === '2') {
      manageServerMembers(server);
    } else if (action === '3') {
      openServerSettings(server.id);
    } else if (action === '4') {
      showCreateInviteModal(server.id);
    } else if (action === '5') {
      showServerInvites(server.id, server.name);
    } else if (action === '6') {
      if (confirm(`Are you sure you want to DELETE "${server.name}"? This will delete all channels and messages. This cannot be undone.`)) {
        deleteServer(server.id);
      }
    }
  } else {
    const action = prompt(`"${server.name}" Options:\n\n1 - Create Invite Link\n2 - Leave Server\n\nEnter 1 or 2:`);
    if (action === '1') {
      showCreateInviteModal(server.id);
    } else if (action === '2') {
      if (confirm(`Leave "${server.name}"?`)) {
        leaveServer(server.id);
      }
    }
  }
}

function manageServerMembers(server) {
  fetch(`/api/servers/${server.id}/members`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(members => {
      const memberList = members.map((m, i) => 
        `${i + 1}. ${m.username}${m.id === server.owner_id ? ' (Owner)' : ''}`
      ).join('\n');
      
      const choice = prompt(`Members of "${server.name}":\n\n${memberList}\n\nEnter member number to kick (or cancel):`);
      if (choice) {
        const idx = parseInt(choice) - 1;
        if (idx >= 0 && idx < members.length) {
          const member = members[idx];
          if (member.id === currentUser.id) {
            alert('Cannot kick yourself!');
            return;
          }
          if (confirm(`Kick ${member.username} from the server?`)) {
            kickFromServer(server.id, member.id);
          }
        }
      }
    });
}

function leaveServer(serverId) {
  fetch(`/api/servers/${serverId}/leave`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        alert(data.error);
      } else {
        alert('Left server');
        loadServers();
      }
    });
}

function deleteServer(serverId) {
  fetch(`/api/servers/${serverId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        alert(data.error);
      } else {
        alert('Server deleted');
        loadServers();
      }
    });
}

function kickFromServer(serverId, userId) {
  fetch(`/api/servers/${serverId}/kick/${userId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        alert(data.error);
      } else {
        alert('Member kicked');
      }
    });
}

function loadPendingRequests() {
  fetch('/api/friends/pending', {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(requests => {
      const list = document.getElementById('pendingRequestsList');
      list.innerHTML = '';
      
      if (requests.length === 0) {
        list.innerHTML = '<p style="padding: 10px; color: var(--text-light); font-size: 12px;">No pending requests</p>';
        return;
      }
      
      requests.forEach(req => {
        const container = document.createElement('div');
        container.style.cssText = 'padding: 8px; border-bottom: 1px solid var(--accent); display: flex; gap: 8px; align-items: center;';
        
        const info = document.createElement('div');
        info.style.cssText = 'flex: 1; min-width: 0;';
        info.innerHTML = `
          <div style="font-weight: 600; font-size: 13px; color: var(--text);">${escapeHtml(req.username)}</div>
          <div style="font-size: 11px; color: var(--text-light);">wants to be friends</div>
        `;
        
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display: flex; gap: 4px;';
        
        const acceptBtn = document.createElement('button');
        acceptBtn.textContent = '✓';
        acceptBtn.style.cssText = 'padding: 4px 8px; background: #2ecc71; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;';
        acceptBtn.addEventListener('click', () => acceptFriendRequest(req.userId, req.username));
        
        const rejectBtn = document.createElement('button');
        rejectBtn.textContent = '✕';
        rejectBtn.style.cssText = 'padding: 4px 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;';
        rejectBtn.addEventListener('click', () => rejectFriendRequest(req.userId));
        
        btnContainer.appendChild(acceptBtn);
        btnContainer.appendChild(rejectBtn);
        
        container.appendChild(info);
        container.appendChild(btnContainer);
        list.appendChild(container);
      });
    });
}

function acceptFriendRequest(userId, username) {
  fetch(`/api/friends/${userId}/accept`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(() => {
      alert(`You're now friends with ${username}!`);
      loadPendingRequests();
      loadFriends();
    })
    .catch(() => alert('Failed to accept request'));
}

function rejectFriendRequest(userId) {
  fetch(`/api/friends/${userId}/reject`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(() => {
      loadPendingRequests();
    })
    .catch(() => alert('Failed to reject request'));
}

function loadFriends() {
  fetch('/api/friends', {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(friends => {
      const list = document.getElementById('friendsList');
      list.innerHTML = '';
      friends.forEach(friend => {
        const container = document.createElement('div');
        container.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:4px;';
        
        const btn = document.createElement('button');
        btn.className = 'friend-btn';
        btn.style.cssText = 'flex:1;display:flex;align-items:center;gap:8px;';
        
        const statusColor = friend.is_online ? '#2ecc71' : '#7f8c8d';
        btn.innerHTML = `
          <div style="position:relative;">
            <img src="${friend.profilePicture || 'https://via.placeholder.com/24'}" style="width:24px;height:24px;border-radius:50%;">
            <span style="position:absolute;bottom:-2px;right:-2px;width:10px;height:10px;border-radius:50%;background:${statusColor};border:2px solid var(--bg-secondary);"></span>
          </div>
          <span>${escapeHtml(friend.username)}</span>
        `;
        btn.addEventListener('click', () => selectFriend(friend));
        
        const profileBtn = document.createElement('button');
        profileBtn.textContent = 'i';
        profileBtn.title = 'View Profile';
        profileBtn.style.cssText = 'padding:4px 8px;background:var(--accent);border:none;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;color:var(--text);';
        profileBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          showUserProfile(friend.id);
        });
        
        container.appendChild(btn);
        container.appendChild(profileBtn);
        list.appendChild(container);
      });
    });
}

function selectServer(server) {
  currentGroupChat = null;
  currentFriend = null;
  isGlobalChat = false;
  messageOffset = 0;
  hasMoreMessages = true;
  document.getElementById('chatTitle').textContent = server.name;
  document.getElementById('globalChatBtn').classList.remove('active');
  
  // Fetch the actual first channel ID for this server
  fetch(`/api/servers/${server.id}`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(serverData => {
      if (serverData.channels && serverData.channels.length > 0) {
        const firstChannel = serverData.channels[0];
        currentChannel = firstChannel.id;
        currentMessageEndpoint = `/api/messages/channel/${firstChannel.id}`;
        socket.emit('join_channel', { channelId: firstChannel.id });
        loadMessages();
      } else {
        currentChannel = null;
        document.getElementById('messagesContainer').innerHTML = '<div class="welcome">This server has no channels yet</div>';
      }
    })
    .catch(() => {
      currentChannel = server.id;
      currentMessageEndpoint = `/api/servers/${server.id}/messages`;
      socket.emit('join_channel', { channelId: server.id });
      loadMessages();
    });
}

function selectFriend(friend) {
  currentFriend = friend.id;
  currentChannel = null;
  currentGroupChat = null;
  isGlobalChat = false;
  messageOffset = 0;
  hasMoreMessages = true;
  document.getElementById('chatTitle').textContent = `Direct Message: ${friend.username}`;
  document.getElementById('globalChatBtn').classList.remove('active');
  socket.emit('join_dm', { userId: currentUser.id, dmPartnerId: friend.id });
  currentMessageEndpoint = `/api/messages/dms/${friend.id}/messages`;
  loadMessages();
}

function loadMessages(loadOlder = false) {
  if (isLoadingMessages || !currentMessageEndpoint) return;
  isLoadingMessages = true;

  const offset = loadOlder ? messageOffset : 0;
  
  fetch(`${currentMessageEndpoint}?offset=${offset}&limit=50`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(messages => {
      const container = document.getElementById('messagesContainer');
      
      if (!loadOlder) {
        // Initial load - clear container
        container.innerHTML = '';
        messageOffset = 0;
        hasMoreMessages = true;
      }
      
      if (messages.length < 50) {
        hasMoreMessages = false;
      }
      
      if (loadOlder && messages.length > 0) {
        // Add "Load More" button at top
        const loadBtn = document.createElement('button');
        loadBtn.textContent = '↑ Load older messages';
        loadBtn.style.cssText = 'width: 100%; padding: 10px; margin-bottom: 10px; background: var(--accent); color: var(--text); border: none; border-radius: 6px; cursor: pointer;';
        loadBtn.addEventListener('click', () => {
          loadBtn.remove();
          loadMessages(true);
        });
        container.insertBefore(loadBtn, container.firstChild);
        
        // Add old messages before new ones
        const firstMessage = container.querySelector('.message');
        messages.reverse().forEach(msg => {
          const el = createMessageElement(msg);
          if (firstMessage) {
            container.insertBefore(el, firstMessage);
          } else {
            container.appendChild(el);
          }
        });
        
        messageOffset += messages.length;
      } else if (!loadOlder) {
        // New load - add messages normally
        messages.forEach((msg, idx) => {
          displayMessage(msg, idx === messages.length - 1);
        });
        messageOffset = messages.length;
      }
      
      isLoadingMessages = false;
    });
}

function createMessageElement(msg) {
  const el = document.createElement('div');
  el.className = 'message';
  el.setAttribute('data-msg-id', msg.id);
  
  // Handle both snake_case (from DB) and camelCase (from socket) property names
  const userId = msg.user_id || msg.userId;
  const username = msg.username || 'Unknown';
  const profilePicture = msg.profile_picture || msg.profilePicture || 'https://via.placeholder.com/36';
  const createdAt = msg.created_at || msg.createdAt || new Date().toISOString();
  
  // Format the date properly
  let formattedTime;
  try {
    formattedTime = new Date(createdAt).toLocaleTimeString();
    if (formattedTime === 'Invalid Date') {
      formattedTime = new Date().toLocaleTimeString();
    }
  } catch(e) {
    formattedTime = new Date().toLocaleTimeString();
  }
  
  el.innerHTML = `
    <img src="${profilePicture}" class="message-avatar" style="cursor:pointer;" onclick="showUserProfile(${userId})">
    <div class="message-content">
      <div class="message-header">
        <span class="message-username" style="cursor:pointer;" onclick="showUserProfile(${userId})">${escapeHtml(username)}</span>
        <span class="message-timestamp">${formattedTime}</span>
      </div>
      <div class="message-text">${escapeHtml(msg.content)}</div>
    </div>
  `;
  return el;
}

function displayMessage(msg, shouldScroll = false) {
  const container = document.getElementById('messagesContainer');
  const el = document.createElement('div');
  el.className = 'message';
  el.style.position = 'relative';
  el.setAttribute('data-msg-id', msg.id);
  
  const userId = msg.user_id || msg.userId;
  const username = msg.username || 'Unknown';
  const profilePicture = msg.profile_picture || msg.profilePicture || 'https://via.placeholder.com/36';
  const createdAt = msg.created_at || msg.createdAt || new Date().toISOString();
  const isEdited = msg.is_edited || msg.isEdited;
  const replyTo = msg.replyTo || (msg.reply_to_id ? { id: msg.reply_to_id, content: msg.reply_content, username: msg.reply_username } : null);
  const attachment = msg.attachment;
  
  let formattedTime;
  try {
    formattedTime = new Date(createdAt).toLocaleTimeString();
    if (formattedTime === 'Invalid Date') formattedTime = new Date().toLocaleTimeString();
  } catch(e) {
    formattedTime = new Date().toLocaleTimeString();
  }
  
  let replyHtml = '';
  if (replyTo && replyTo.content) {
    replyHtml = `<div class="msg-reply-preview">↩ <strong>${escapeHtml(replyTo.username || 'User')}</strong>: ${escapeHtml(replyTo.content.substring(0, 60))}${replyTo.content.length > 60 ? '...' : ''}</div>`;
  }
  
  let attachmentHtml = '';
  if (attachment) {
    if (attachment.type?.startsWith('image/')) {
      attachmentHtml = `<div class="msg-attachment"><img src="${attachment.url}" alt="${escapeHtml(attachment.originalName || 'Image')}" onclick="window.open('${attachment.url}','_blank')"></div>`;
    } else {
      attachmentHtml = `<div class="msg-attachment"><a href="${attachment.url}" target="_blank">📎 ${escapeHtml(attachment.originalName || 'File')}</a></div>`;
    }
  }
  
  const contentWithMentions = formatMessageMentions(msg.content);
  
  const isOwn = userId === currentUser?.id;
  const canEdit = isOwn;
  const canDelete = isOwn || isAdmin;
  
  el.innerHTML = `
    <img src="${profilePicture}" class="message-avatar" style="cursor:pointer;" onclick="showUserProfile(${userId})">
    <div class="message-content" style="flex:1;">
      ${replyHtml}
      <div class="message-header">
        <span class="message-username" style="cursor:pointer;" onclick="showUserProfile(${userId})">${escapeHtml(username)}</span>
        <span class="message-timestamp">${formattedTime}</span>
        ${isEdited ? '<span class="msg-edited">(edited)</span>' : ''}
      </div>
      <div class="message-text msg-content">${contentWithMentions}</div>
      ${attachmentHtml}
      <div class="msg-reactions"></div>
    </div>
    <div class="msg-actions">
      <button class="msg-action-btn" onclick="setReplyTo(${msg.id}, '${escapeHtml(username)}', '${escapeHtml(msg.content.replace(/'/g, "\\'"))}')">↩</button>
      <button class="msg-action-btn" onclick="showReactionPicker(${msg.id})">😀</button>
      <button class="msg-action-btn" onclick="pinMessage(${msg.id})">📌</button>
      ${canEdit ? `<button class="msg-action-btn" onclick="editMessage(${msg.id})">✏️</button>` : ''}
      ${canDelete ? `<button class="msg-action-btn" onclick="deleteMessageById(${msg.id})" style="color:#e74c3c;">🗑</button>` : ''}
    </div>
  `;
  container.appendChild(el);
  
  setTimeout(() => loadReactionsForMessage(msg.id), 100);
  
  if (shouldScroll) {
    container.scrollTop = container.scrollHeight;
  }
}

function formatMessageMentions(content) {
  return escapeHtml(content).replace(/@(\w+)/g, '<span class="mention" onclick="viewUserProfile(\'$1\')">@$1</span>');
}

function deleteMessageById(messageId) {
  if (!confirm('Delete this message?')) return;
  socket.emit('delete_message', { messageId, userId: currentUser.id, isAdmin });
}

function sendMessage() {
  const input = document.getElementById('messageInput');
  const content = input.value.trim();
  if (!content || (!currentChannel && !currentFriend && !currentGroupChat && !isGlobalChat)) return;

  const messageData = {
    channelId: currentChannel,
    groupChatId: currentGroupChat,
    dmPartnerId: currentFriend,
    isGlobal: isGlobalChat,
    userId: currentUser.id,
    content
  };
  
  if (replyingToMessage) {
    messageData.replyToId = replyingToMessage.id;
  }
  
  if (pendingAttachment) {
    messageData.attachment = pendingAttachment;
  }
  
  socket.emit('send_message', messageData);

  input.value = '';
  cancelReply();
  pendingAttachment = null;
  stopTyping();
}

function createServerRequest() {
  const name = prompt('Server name:');
  if (!name) return;
  
  const description = prompt('Server description (optional):') || '';

  fetch('/api/servers/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify({ 
      userId: currentUser.id,
      serverName: name,
      description 
    })
  })
    .then(r => r.json())
    .then(data => {
      alert('Server request submitted! Waiting for admin approval.');
      loadServers();
    })
    .catch(() => alert('Failed to submit request'));
}

function addFriend() {
  const username = prompt('Username to add:');
  if (!username) return;

  const token = getAuthToken();
  if (!token) {
    alert('You must be logged in');
    return;
  }

  fetch('/api/friends/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ username })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success || data.message) {
        alert('✅ Friend request sent to ' + username + '!');
        loadPendingRequests();
        loadFriends();
      } else if (data.error && data.error.includes('not found')) {
        alert('❌ User "' + username + '" not found. Make sure the account exists!');
      } else {
        alert('❌ ' + (data.error || 'Failed to send request'));
      }
    })
    .catch(err => {
      console.error('Friend request error:', err);
      alert('❌ Failed to send request: ' + err.message);
    });
}

// Fetch current user info by ID - always gets the latest username and profile picture
async function getCurrentUserInfo(userId) {
  // Check cache first
  if (userInfoCache[userId]) {
    return userInfoCache[userId];
  }
  
  try {
    const response = await fetch(`/api/users/${userId}`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    if (!response.ok) {
      return { username: 'Unknown', profilePicture: 'https://via.placeholder.com/36' };
    }
    const data = await response.json();
    userInfoCache[userId] = {
      username: data.username || 'Unknown',
      profilePicture: data.profilePicture || 'https://via.placeholder.com/36'
    };
    return userInfoCache[userId];
  } catch (err) {
    console.error('Error fetching user info:', err);
    return { username: 'Unknown', profilePicture: 'https://via.placeholder.com/36' };
  }
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ============== STATUS PICKER ==============
const statusConfig = {
  online: { label: 'Online', color: '#2ecc71', icon: '🟢' },
  away: { label: 'Away', color: '#f39c12', icon: '🟡' },
  dnd: { label: 'Do Not Disturb', color: '#e74c3c', icon: '🔴' },
  invisible: { label: 'Invisible', color: '#95a5a6', icon: '⚫' },
  offline: { label: 'Offline', color: '#7f8c8d', icon: '⚪' }
};

function initStatusPicker() {
  const statusBtn = document.getElementById('statusBtn');
  if (!statusBtn) return;
  
  statusBtn.addEventListener('click', showStatusPicker);
  loadCurrentStatus();
}

function loadCurrentStatus() {
  fetch(`/api/users/${currentUser.id}/status`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      updateStatusDisplay(data.status || 'online', data.customStatus);
    });
}

function updateStatusDisplay(status, customStatus) {
  const indicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  if (indicator) {
    indicator.style.background = statusConfig[status]?.color || '#2ecc71';
  }
  if (statusText) {
    statusText.textContent = customStatus || statusConfig[status]?.label || 'Online';
  }
}

function showStatusPicker() {
  const existing = document.getElementById('statusPickerModal');
  if (existing) existing.remove();
  
  const modal = document.createElement('div');
  modal.id = 'statusPickerModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;';
  
  modal.innerHTML = `
    <div style="background:var(--bg-secondary);padding:25px;border-radius:12px;max-width:350px;width:90%;">
      <h3 style="margin:0 0 20px;color:var(--text);">Set Your Status</h3>
      <div id="statusOptions" style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
        ${Object.entries(statusConfig).filter(([k]) => k !== 'offline').map(([key, val]) => `
          <button onclick="setStatus('${key}')" style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--accent);border:none;border-radius:8px;cursor:pointer;color:var(--text);">
            <span style="font-size:16px;">${val.icon}</span>
            <span>${val.label}</span>
          </button>
        `).join('')}
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block;margin-bottom:5px;color:var(--text-light);font-size:12px;">Custom Status Message</label>
        <input type="text" id="customStatusInput" placeholder="What are you up to?" maxlength="128"
          style="width:100%;padding:10px;border-radius:6px;border:1px solid var(--accent);background:var(--bg);color:var(--text);box-sizing:border-box;">
      </div>
      <div style="display:flex;gap:10px;">
        <button onclick="saveCustomStatus()" style="flex:1;padding:10px;background:var(--primary);color:white;border:none;border-radius:6px;cursor:pointer;">Save</button>
        <button onclick="clearCustomStatus()" style="padding:10px;background:var(--accent);color:var(--text);border:none;border-radius:6px;cursor:pointer;">Clear</button>
        <button onclick="closeStatusPicker()" style="padding:10px;background:var(--accent);color:var(--text);border:none;border-radius:6px;cursor:pointer;">Close</button>
      </div>
    </div>
  `;
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeStatusPicker();
  });
  
  document.body.appendChild(modal);
}

function setStatus(status) {
  fetch(`/api/users/${currentUser.id}/status`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}` 
    },
    body: JSON.stringify({ status })
  })
    .then(r => r.json())
    .then(() => {
      updateStatusDisplay(status, null);
      closeStatusPicker();
    });
}

function saveCustomStatus() {
  const input = document.getElementById('customStatusInput');
  const customStatus = input.value.trim();
  
  fetch(`/api/users/${currentUser.id}/status`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}` 
    },
    body: JSON.stringify({ customStatus })
  })
    .then(r => r.json())
    .then(() => {
      loadCurrentStatus();
      closeStatusPicker();
    });
}

function clearCustomStatus() {
  fetch(`/api/users/${currentUser.id}/status`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}` 
    },
    body: JSON.stringify({ customStatus: null })
  })
    .then(r => r.json())
    .then(() => {
      loadCurrentStatus();
      closeStatusPicker();
    });
}

function closeStatusPicker() {
  const modal = document.getElementById('statusPickerModal');
  if (modal) modal.remove();
}

// ============== USER PROFILE MODAL ==============
function showUserProfile(userId) {
  // Guard against undefined or invalid userId
  if (!userId || userId === 'undefined' || isNaN(userId)) {
    return;
  }
  
  fetch(`/api/users/${userId}/profile`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(profile => {
      if (profile.error) {
        alert(profile.error);
        return;
      }
      renderProfileModal(profile);
    });
}

function renderProfileModal(profile) {
  const existing = document.getElementById('profileModal');
  if (existing) existing.remove();
  
  const statusInfo = statusConfig[profile.status] || statusConfig.offline;
  const isOwnProfile = profile.id === currentUser.id;
  
  const modal = document.createElement('div');
  modal.id = 'profileModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;';
  
  modal.innerHTML = `
    <div style="background:var(--bg-secondary);border-radius:12px;max-width:400px;width:90%;overflow:hidden;">
      <div style="background:linear-gradient(135deg,var(--primary),var(--accent));padding:40px 20px 20px;text-align:center;position:relative;">
        <img src="${profile.profilePicture || 'https://via.placeholder.com/80'}" 
          style="width:80px;height:80px;border-radius:50%;border:4px solid var(--bg-secondary);">
        <div style="position:absolute;bottom:15px;right:calc(50% - 50px);width:16px;height:16px;border-radius:50%;background:${statusInfo.color};border:3px solid var(--bg-secondary);"></div>
      </div>
      <div style="padding:20px;">
        <h2 style="margin:0 0 5px;color:var(--text);text-align:center;">${escapeHtml(profile.username)}</h2>
        <p style="margin:0 0 15px;color:var(--text-light);text-align:center;font-size:13px;">
          ${statusInfo.icon} ${profile.customStatus || statusInfo.label}
        </p>
        
        ${profile.mutualServers?.length > 0 ? `
          <div style="margin-bottom:15px;">
            <h4 style="margin:0 0 8px;color:var(--text);font-size:12px;text-transform:uppercase;">Mutual Servers (${profile.mutualServers.length})</h4>
            <div style="display:flex;flex-wrap:wrap;gap:5px;">
              ${profile.mutualServers.map(s => `<span style="background:var(--accent);padding:4px 8px;border-radius:4px;font-size:11px;color:var(--text);">${escapeHtml(s.name)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        
        ${profile.mutualFriends?.length > 0 ? `
          <div style="margin-bottom:15px;">
            <h4 style="margin:0 0 8px;color:var(--text);font-size:12px;text-transform:uppercase;">Mutual Friends (${profile.mutualFriends.length})</h4>
            <div style="display:flex;flex-wrap:wrap;gap:5px;">
              ${profile.mutualFriends.map(f => `<span style="background:var(--accent);padding:4px 8px;border-radius:4px;font-size:11px;color:var(--text);">${escapeHtml(f.username)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        
        <p style="margin:0 0 15px;color:var(--text-light);font-size:11px;text-align:center;">
          Member since ${new Date(profile.createdAt).toLocaleDateString()}
        </p>
        
        ${!isOwnProfile ? `
          <div style="display:flex;gap:10px;justify-content:center;">
            ${!profile.friendshipStatus ? `
              <button onclick="sendFriendRequest(${profile.id})" style="padding:10px 20px;background:var(--primary);color:white;border:none;border-radius:6px;cursor:pointer;">Add Friend</button>
            ` : profile.friendshipStatus === 'pending' ? `
              <button disabled style="padding:10px 20px;background:var(--accent);color:var(--text-light);border:none;border-radius:6px;">Pending</button>
            ` : `
              <button onclick="startDM(${profile.id}, '${escapeHtml(profile.username)}')" style="padding:10px 20px;background:var(--primary);color:white;border:none;border-radius:6px;cursor:pointer;">Message</button>
            `}
            <button onclick="toggleBlock(${profile.id}, ${profile.isBlocked})" style="padding:10px 20px;background:${profile.isBlocked ? '#e74c3c' : 'var(--accent)'};color:${profile.isBlocked ? 'white' : 'var(--text)'};border:none;border-radius:6px;cursor:pointer;">
              ${profile.isBlocked ? 'Unblock' : 'Block'}
            </button>
          </div>
        ` : ''}
        
        <button onclick="closeProfileModal()" style="margin-top:15px;width:100%;padding:10px;background:var(--accent);color:var(--text);border:none;border-radius:6px;cursor:pointer;">Close</button>
      </div>
    </div>
  `;
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeProfileModal();
  });
  
  document.body.appendChild(modal);
}

function closeProfileModal() {
  const modal = document.getElementById('profileModal');
  if (modal) modal.remove();
}

function sendFriendRequest(userId) {
  fetch(`/api/friends/${userId}/request`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        alert('Friend request sent!');
        closeProfileModal();
      } else {
        alert(data.error || 'Failed to send request');
      }
    });
}

function startDM(userId, username) {
  closeProfileModal();
  selectFriend({ id: userId, username });
}

// ============== BLOCK SYSTEM ==============
let blockedUsers = [];

function loadBlockedUsers() {
  fetch('/api/blocks', {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(blocks => {
      blockedUsers = blocks.map(b => b.blocked_id);
    });
}

function toggleBlock(userId, currentlyBlocked) {
  if (currentlyBlocked) {
    unblockUser(userId);
  } else {
    blockUser(userId);
  }
}

function blockUser(userId) {
  if (!confirm('Are you sure you want to block this user? They will not be able to message you.')) return;
  
  fetch(`/api/blocks/${userId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        alert(data.message);
        blockedUsers.push(userId);
        closeProfileModal();
        loadFriends();
      } else {
        alert(data.error || 'Failed to block user');
      }
    });
}

function unblockUser(userId) {
  fetch(`/api/blocks/${userId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        alert('User unblocked');
        blockedUsers = blockedUsers.filter(id => id !== userId);
        closeProfileModal();
      } else {
        alert(data.error || 'Failed to unblock user');
      }
    });
}

function showBlockedUsersList() {
  fetch('/api/blocks', {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(blocks => {
      const existing = document.getElementById('blockedListModal');
      if (existing) existing.remove();
      
      const modal = document.createElement('div');
      modal.id = 'blockedListModal';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;';
      
      modal.innerHTML = `
        <div style="background:var(--bg-secondary);padding:25px;border-radius:12px;max-width:350px;width:90%;max-height:60vh;overflow-y:auto;">
          <h3 style="margin:0 0 20px;color:var(--text);">Blocked Users (${blocks.length})</h3>
          ${blocks.length === 0 ? '<p style="color:var(--text-light);">No blocked users</p>' : 
            blocks.map(b => `
              <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--accent);border-radius:8px;margin-bottom:8px;">
                <img src="${b.profile_picture || 'https://via.placeholder.com/32'}" style="width:32px;height:32px;border-radius:50%;">
                <span style="flex:1;color:var(--text);">${escapeHtml(b.username)}</span>
                <button onclick="unblockUser(${b.blocked_id});document.getElementById('blockedListModal').remove();" 
                  style="padding:6px 12px;background:#e74c3c;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Unblock</button>
              </div>
            `).join('')
          }
          <button onclick="document.getElementById('blockedListModal').remove()" 
            style="margin-top:15px;width:100%;padding:10px;background:var(--accent);color:var(--text);border:none;border-radius:6px;cursor:pointer;">Close</button>
        </div>
      `;
      
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
      });
      
      document.body.appendChild(modal);
    });
}

// Initialize new features when page loads
if (typeof initStatusPicker === 'function') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      initStatusPicker();
      loadBlockedUsers();
      checkPendingServerSetup();
    }, 500);
  });
}

// ============== SERVER SETUP & CHANNEL MANAGEMENT ==============
let currentSetupServerId = null;
let currentManageServerId = null;
let setupChannels = [];

// Check if user has any servers pending setup
function checkPendingServerSetup() {
  if (!currentUser) return;
  
  fetch(`/api/servers/pending-setup/${currentUser.id}`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(servers => {
      if (servers && servers.length > 0) {
        showServerSetupModal(servers[0]);
      }
    })
    .catch(() => {});
}

// Show server setup modal
function showServerSetupModal(server) {
  currentSetupServerId = server.id;
  setupChannels = [{ name: '', id: null }];
  
  document.getElementById('setupServerName').textContent = server.name;
  document.getElementById('serverSetupOverlay').style.display = 'block';
  document.getElementById('serverSetupModal').style.display = 'block';
  
  renderSetupChannels();
  
  document.getElementById('addMoreChannelsBtn').onclick = () => {
    setupChannels.push({ name: '', id: null });
    renderSetupChannels();
  };
  
  document.getElementById('completeSetupBtn').onclick = completeServerSetup;
  document.getElementById('serverSetupOverlay').onclick = () => {};
}

function renderSetupChannels() {
  const list = document.getElementById('channelSetupList');
  list.innerHTML = setupChannels.map((ch, i) => `
    <div style="display:flex;gap:10px;margin-bottom:10px;align-items:center;">
      <span style="color:var(--text-light);font-size:18px;">#</span>
      <input type="text" 
        class="setup-channel-input" 
        data-index="${i}" 
        value="${ch.name}" 
        placeholder="channel-name"
        style="flex:1;padding:10px;background:var(--bg);border:1px solid var(--accent);border-radius:6px;color:var(--text);">
      ${setupChannels.length > 1 ? `<button onclick="removeSetupChannel(${i})" style="padding:8px 12px;background:#e74c3c;color:white;border:none;border-radius:6px;cursor:pointer;">×</button>` : ''}
    </div>
  `).join('');
  
  document.querySelectorAll('.setup-channel-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index);
      setupChannels[idx].name = e.target.value;
    });
  });
}

function removeSetupChannel(index) {
  if (setupChannels.length > 1) {
    setupChannels.splice(index, 1);
    renderSetupChannels();
  }
}

async function completeServerSetup() {
  const validChannels = setupChannels.filter(ch => ch.name.trim().length > 0);
  
  if (validChannels.length === 0) {
    alert('Please name at least one channel');
    return;
  }
  
  const btn = document.getElementById('completeSetupBtn');
  btn.disabled = true;
  btn.textContent = 'Setting up...';
  
  try {
    for (const channel of validChannels) {
      await fetch(`/api/servers/${currentSetupServerId}/channels`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}` 
        },
        body: JSON.stringify({ name: channel.name })
      });
    }
    
    await fetch(`/api/servers/${currentSetupServerId}/complete-setup`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    
    closeServerSetupModal();
    loadServers();
    alert('Server setup complete!');
  } catch (err) {
    alert('Failed to complete setup. Please try again.');
  }
  
  btn.disabled = false;
  btn.textContent = 'Complete Setup';
}

function closeServerSetupModal() {
  document.getElementById('serverSetupOverlay').style.display = 'none';
  document.getElementById('serverSetupModal').style.display = 'none';
  currentSetupServerId = null;
  setupChannels = [];
}

// Server management modal (for owners)
function openServerManageModal(serverId, serverName) {
  currentManageServerId = serverId;
  document.getElementById('manageServerTitle').textContent = serverName + ' Settings';
  document.getElementById('manageServerNameInput').value = serverName;
  document.getElementById('serverManageOverlay').style.display = 'block';
  document.getElementById('serverManageModal').style.display = 'block';
  
  loadManageChannels();
  
  document.getElementById('serverManageOverlay').onclick = closeServerManageModal;
}

function closeServerManageModal() {
  document.getElementById('serverManageOverlay').style.display = 'none';
  document.getElementById('serverManageModal').style.display = 'none';
  currentManageServerId = null;
}

function loadManageChannels() {
  fetch(`/api/servers/${currentManageServerId}/channels`)
    .then(r => r.json())
    .then(channels => {
      const list = document.getElementById('manageChannelsList');
      list.innerHTML = channels.map(ch => `
        <div style="display:flex;gap:10px;margin-bottom:8px;align-items:center;padding:8px;background:var(--bg);border-radius:6px;">
          <span style="color:var(--text-light);font-size:16px;">#</span>
          <input type="text" 
            id="channel-name-${ch.id}" 
            value="${escapeHtml(ch.name)}" 
            style="flex:1;padding:8px;background:var(--card);border:1px solid var(--accent);border-radius:4px;color:var(--text);font-size:13px;">
          <button onclick="renameChannel(${ch.id})" style="padding:6px 12px;background:var(--primary);color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Save</button>
          <button onclick="deleteChannel(${ch.id})" style="padding:6px 12px;background:#e74c3c;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">×</button>
        </div>
      `).join('');
    });
}

function renameServer() {
  const newName = document.getElementById('manageServerNameInput').value.trim();
  if (!newName) {
    alert('Server name cannot be empty');
    return;
  }
  
  fetch(`/api/servers/${currentManageServerId}/rename`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}` 
    },
    body: JSON.stringify({ name: newName })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        document.getElementById('manageServerTitle').textContent = newName + ' Settings';
        loadServers();
        alert('Server renamed!');
      } else {
        alert(data.error || 'Failed to rename server');
      }
    });
}

function renameChannel(channelId) {
  const input = document.getElementById(`channel-name-${channelId}`);
  const newName = input.value.trim();
  if (!newName) {
    alert('Channel name cannot be empty');
    return;
  }
  
  fetch(`/api/servers/${currentManageServerId}/channels/${channelId}/rename`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}` 
    },
    body: JSON.stringify({ name: newName })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        loadServers();
        loadManageChannels();
      } else {
        alert(data.error || 'Failed to rename channel');
      }
    });
}

function deleteChannel(channelId) {
  if (!confirm('Delete this channel? All messages will be lost.')) return;
  
  fetch(`/api/servers/${currentManageServerId}/channels/${channelId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        loadServers();
        loadManageChannels();
      } else {
        alert(data.error || 'Failed to delete channel');
      }
    });
}

function addNewChannel() {
  const input = document.getElementById('newChannelNameInput');
  const name = input.value.trim();
  if (!name) {
    alert('Channel name cannot be empty');
    return;
  }
  
  fetch(`/api/servers/${currentManageServerId}/channels`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}` 
    },
    body: JSON.stringify({ name })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        input.value = '';
        loadServers();
        loadManageChannels();
      } else {
        alert(data.error || 'Failed to add channel');
      }
    });
}

// ============== DISCORD FEATURES ==============

// Reply system
let replyingToMessage = null;
let pendingAttachment = null;
let typingTimeout = null;
let unreadCounts = {};

// Common emojis for picker
const commonEmojis = ['😀','😂','😍','🥰','😎','🤔','😢','😡','👍','👎','❤️','🔥','⭐','🎉','💯','🙏','👏','🤝','💪','✨','🎮','🏆','💬','📌','🔍','⚡','💡','🌟','🚀','💎'];

// Initialize Discord features
function initDiscordFeatures() {
  initEmojiPicker();
  initTypingIndicator();
  initFileUpload();
  initSearchModal();
  initReplySystem();
  loadUnreadCounts();
  
  document.getElementById('pinsBtn')?.addEventListener('click', openPinsModal);
  document.getElementById('searchBtn')?.addEventListener('click', openSearchModal);
}

// Call after DOM is ready
setTimeout(initDiscordFeatures, 1000);

// Emoji Picker
function initEmojiPicker() {
  const grid = document.getElementById('emojiGrid');
  const btn = document.getElementById('emojiBtn');
  const picker = document.getElementById('emojiPicker');
  
  if (!grid || !btn) return;
  
  grid.innerHTML = commonEmojis.map(e => `<button class="emoji-btn" onclick="insertEmoji('${e}')">${e}</button>`).join('');
  
  btn.addEventListener('click', () => picker.classList.toggle('active'));
  
  document.addEventListener('click', (e) => {
    if (!picker.contains(e.target) && e.target !== btn) {
      picker.classList.remove('active');
    }
  });
}

function insertEmoji(emoji) {
  const input = document.getElementById('messageInput');
  input.value += emoji;
  input.focus();
  document.getElementById('emojiPicker').classList.remove('active');
}

// Typing Indicator
function initTypingIndicator() {
  const input = document.getElementById('messageInput');
  if (!input) return;
  
  input.addEventListener('input', () => {
    emitTyping();
  });
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      stopTyping();
    }
  });
}

function emitTyping() {
  if (!socket || !currentUser) return;
  
  socket.emit('user_typing', {
    channelId: currentChannel,
    groupChatId: currentGroupChat,
    dmPartnerId: currentFriend,
    isGlobal: isGlobalChat,
    userId: currentUser.id,
    username: currentUser.username
  });
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(stopTyping, 3000);
}

function stopTyping() {
  if (!socket || !currentUser) return;
  
  socket.emit('user_stop_typing', {
    channelId: currentChannel,
    groupChatId: currentGroupChat,
    dmPartnerId: currentFriend,
    isGlobal: isGlobalChat,
    userId: currentUser.id
  });
}

// Reply System
function initReplySystem() {
  document.getElementById('cancelReply')?.addEventListener('click', cancelReply);
}

function setReplyTo(messageId, username, content) {
  replyingToMessage = { id: messageId, username, content };
  document.getElementById('replyUsername').textContent = username;
  document.getElementById('replyContent').textContent = content.substring(0, 100);
  document.getElementById('replyBar').classList.add('active');
  document.getElementById('messageInput').focus();
}

function cancelReply() {
  replyingToMessage = null;
  document.getElementById('replyBar').classList.remove('active');
}

// File Upload
function initFileUpload() {
  const uploadBtn = document.getElementById('uploadBtn');
  const fileInput = document.getElementById('fileInput');
  
  if (!uploadBtn || !fileInput) return;
  
  uploadBtn.addEventListener('click', () => fileInput.click());
  
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Max 10MB');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
        body: formData
      });
      const data = await res.json();
      
      if (data.success) {
        pendingAttachment = {
          url: data.url,
          filename: data.filename,
          originalName: data.originalName,
          type: data.type,
          size: data.size
        };
        
        const input = document.getElementById('messageInput');
        if (!input.value.trim()) {
          input.value = `[Attached: ${data.originalName}]`;
        }
        input.focus();
      }
    } catch (err) {
      alert('Failed to upload file');
    }
    
    fileInput.value = '';
  });
}

// Search Modal
function initSearchModal() {
  const input = document.getElementById('searchInput');
  if (!input) return;
  
  let searchTimeout;
  input.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => performSearch(input.value), 300);
  });
}

function openSearchModal() {
  document.getElementById('searchOverlay').style.display = 'block';
  document.getElementById('searchModal').classList.add('active');
  document.getElementById('searchInput').focus();
}

function closeSearchModal() {
  document.getElementById('searchOverlay').style.display = 'none';
  document.getElementById('searchModal').classList.remove('active');
  document.getElementById('searchInput').value = '';
  document.getElementById('searchResults').innerHTML = '<p style="color:var(--text-light);text-align:center;">Enter at least 2 characters to search</p>';
}

function performSearch(query) {
  const results = document.getElementById('searchResults');
  if (query.length < 2) {
    results.innerHTML = '<p style="color:var(--text-light);text-align:center;">Enter at least 2 characters to search</p>';
    return;
  }
  
  fetch(`/api/search/messages?q=${encodeURIComponent(query)}&channelId=${currentChannel || ''}&limit=20`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(messages => {
      if (messages.length === 0) {
        results.innerHTML = '<p style="color:var(--text-light);text-align:center;">No messages found</p>';
        return;
      }
      
      results.innerHTML = messages.map(m => `
        <div class="search-result" onclick="jumpToMessage(${m.id})">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <img src="${m.profile_picture || 'https://via.placeholder.com/24'}" style="width:24px;height:24px;border-radius:50%;">
            <strong style="color:var(--text);">${escapeHtml(m.username)}</strong>
            <span style="font-size:11px;color:var(--text-light);">${formatDate(m.created_at)}</span>
          </div>
          <div style="color:var(--text);">${highlightSearch(escapeHtml(m.content), query)}</div>
          ${m.server_name ? `<div style="font-size:11px;color:var(--text-light);">in #${m.channel_name} - ${m.server_name}</div>` : ''}
        </div>
      `).join('');
    });
}

function highlightSearch(text, query) {
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark style="background:var(--primary);color:white;padding:0 2px;border-radius:2px;">$1</mark>');
}

function jumpToMessage(messageId) {
  closeSearchModal();
  const msgEl = document.querySelector(`[data-msg-id="${messageId}"]`);
  if (msgEl) {
    msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    msgEl.style.animation = 'flash 1s';
    setTimeout(() => msgEl.style.animation = '', 1000);
  }
}

// Pins Modal
function openPinsModal() {
  document.getElementById('pinsOverlay').style.display = 'block';
  document.getElementById('pinsModal').classList.add('active');
  loadPinnedMessages();
}

function closePinsModal() {
  document.getElementById('pinsOverlay').style.display = 'none';
  document.getElementById('pinsModal').classList.remove('active');
}

function loadPinnedMessages() {
  const list = document.getElementById('pinnedMessagesList');
  const endpoint = currentChannel ? `/api/pins/channel/${currentChannel}` : 
                   currentGroupChat ? `/api/pins/group/${currentGroupChat}` : null;
  
  if (!endpoint) {
    list.innerHTML = '<p style="color:var(--text-light);text-align:center;">Select a channel to view pins</p>';
    return;
  }
  
  fetch(endpoint, { headers: { 'Authorization': `Bearer ${getAuthToken()}` } })
    .then(r => r.json())
    .then(pins => {
      if (pins.length === 0) {
        list.innerHTML = '<p style="color:var(--text-light);text-align:center;">No pinned messages</p>';
        return;
      }
      
      list.innerHTML = pins.map(p => `
        <div class="search-result">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <img src="${p.profile_picture || 'https://via.placeholder.com/24'}" style="width:24px;height:24px;border-radius:50%;">
            <strong style="color:var(--text);">${escapeHtml(p.username)}</strong>
          </div>
          <div style="color:var(--text);">${escapeHtml(p.content)}</div>
          <div style="font-size:11px;color:var(--text-light);margin-top:4px;">Pinned by ${p.pinned_by_username}</div>
        </div>
      `).join('');
    });
}

function pinMessage(messageId) {
  fetch(`/api/pins/${messageId}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}` 
    },
    body: JSON.stringify({ 
      channelId: currentChannel, 
      groupChatId: currentGroupChat 
    })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        alert('Message pinned!');
      } else {
        alert(data.error || 'Failed to pin message');
      }
    });
}

function unpinMessage(messageId) {
  fetch(`/api/pins/${messageId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        alert('Message unpinned');
        loadPinnedMessages();
      }
    });
}

// Invite System
let currentInviteServerId = null;
let previewTimeout = null;

function showCreateInviteModal(serverId) {
  currentInviteServerId = serverId;
  document.getElementById('inviteExpiry').value = '24';
  document.getElementById('inviteMaxUses').value = '0';
  document.getElementById('createInviteOverlay').style.display = 'block';
  document.getElementById('createInviteModal').classList.add('active');
}

function closeCreateInviteModal() {
  document.getElementById('createInviteOverlay').style.display = 'none';
  document.getElementById('createInviteModal').classList.remove('active');
  currentInviteServerId = null;
}

function generateInvite() {
  if (!currentInviteServerId) return;
  
  const expiresIn = document.getElementById('inviteExpiry').value;
  const maxUses = document.getElementById('inviteMaxUses').value;
  
  fetch(`/api/invites/server/${currentInviteServerId}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}` 
    },
    body: JSON.stringify({ maxUses: parseInt(maxUses), expiresIn: parseInt(expiresIn) })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        closeCreateInviteModal();
        document.getElementById('inviteCode').textContent = data.code;
        
        let details = [];
        if (expiresIn === '0') {
          details.push('Never expires');
        } else if (expiresIn === '1') {
          details.push('Expires in 1 hour');
        } else if (expiresIn === '24') {
          details.push('Expires in 24 hours');
        } else if (expiresIn === '168') {
          details.push('Expires in 7 days');
        } else {
          details.push(`Expires in ${expiresIn} hours`);
        }
        if (maxUses === '0') {
          details.push('Unlimited uses');
        } else {
          details.push(`${maxUses} use${maxUses === '1' ? '' : 's'} max`);
        }
        document.getElementById('inviteDetails').textContent = details.join(' • ');
        
        document.getElementById('inviteOverlay').style.display = 'block';
        document.getElementById('inviteModal').classList.add('active');
      } else {
        alert(data.error || 'Failed to create invite. Please try again.');
      }
    })
    .catch(() => {
      alert('Network error. Please try again.');
    });
}

function createServerInvite(serverId) {
  showCreateInviteModal(serverId);
}

function closeInviteModal() {
  document.getElementById('inviteOverlay').style.display = 'none';
  document.getElementById('inviteModal').classList.remove('active');
}

function copyInviteCode() {
  const code = document.getElementById('inviteCode').textContent;
  navigator.clipboard.writeText(code).then(() => {
    alert('Invite code copied to clipboard!');
  });
}

function showServerInvites(serverId, serverName) {
  const list = document.getElementById('invitesList');
  list.innerHTML = '<p style="color:var(--text-light);text-align:center;">Loading invites...</p>';
  document.getElementById('viewInvitesOverlay').style.display = 'block';
  document.getElementById('viewInvitesModal').classList.add('active');
  
  fetch(`/api/invites/server/${serverId}`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(invites => {
      if (!invites || invites.length === 0) {
        list.innerHTML = `
          <div style="text-align:center;padding:20px;">
            <p style="color:var(--text-light);margin-bottom:15px;">No active invites for this server</p>
            <button onclick="closeViewInvitesModal();showCreateInviteModal(${serverId})" 
                    style="padding:10px 20px;background:var(--primary);color:white;border:none;border-radius:6px;cursor:pointer;">
              Create New Invite
            </button>
          </div>
        `;
      } else {
        list.innerHTML = invites.map(inv => {
          if (!inv || !inv.code) return '';
          const expiresText = inv.expires_at ? 
            `Expires: ${new Date(inv.expires_at).toLocaleString()}` : 
            'Never expires';
          const usesText = inv.max_uses > 0 ? 
            `${inv.uses || 0}/${inv.max_uses} uses` : 
            `${inv.uses || 0} uses`;
          const createdBy = inv.created_by_username ? escapeHtml(inv.created_by_username) : 'Unknown';
          return `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg);border-radius:8px;margin-bottom:8px;">
              <div>
                <div style="font-family:monospace;font-size:16px;color:var(--primary);letter-spacing:2px;">${inv.code}</div>
                <div style="font-size:11px;color:var(--text-light);margin-top:4px;">
                  Created by ${createdBy} • ${usesText}
                </div>
                <div style="font-size:10px;color:var(--text-light);">${expiresText}</div>
              </div>
              <div style="display:flex;gap:6px;">
                <button onclick="navigator.clipboard.writeText('${inv.code}').then(()=>alert('Copied!'))" 
                        style="padding:6px 12px;background:var(--primary);color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;">
                  Copy
                </button>
                <button onclick="deleteInvite(${inv.id})" 
                        style="padding:6px 12px;background:#e74c3c;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;">
                  Delete
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    })
    .catch(() => {
      list.innerHTML = '<p style="color:#e74c3c;text-align:center;">Failed to load invites. Please try again.</p>';
    });
}

function closeViewInvitesModal() {
  document.getElementById('viewInvitesOverlay').style.display = 'none';
  document.getElementById('viewInvitesModal').classList.remove('active');
}

function deleteInvite(inviteId) {
  if (!confirm('Delete this invite?')) return;
  
  fetch(`/api/invites/${inviteId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        closeViewInvitesModal();
      } else {
        alert(data.error || 'Failed to delete invite');
      }
    });
}

function resetJoinPreview() {
  if (previewTimeout) {
    clearTimeout(previewTimeout);
    previewTimeout = null;
  }
  const preview = document.getElementById('invitePreview');
  const error = document.getElementById('inviteError');
  if (preview) {
    preview.style.display = 'none';
    document.getElementById('previewServerName').textContent = '';
    document.getElementById('previewMemberCount').textContent = '';
    document.getElementById('previewCreatedBy').textContent = '';
  }
  if (error) {
    error.style.display = 'none';
    error.textContent = '';
  }
}

function openJoinServerModal() {
  resetJoinPreview();
  document.getElementById('joinCodeInput').value = '';
  document.getElementById('joinServerOverlay').style.display = 'block';
  document.getElementById('joinServerModal').classList.add('active');
  document.getElementById('joinCodeInput').focus();
}

function closeJoinServerModal() {
  resetJoinPreview();
  document.getElementById('joinServerOverlay').style.display = 'none';
  document.getElementById('joinServerModal').classList.remove('active');
  document.getElementById('joinCodeInput').value = '';
}

function previewInvite(code) {
  if (previewTimeout) {
    clearTimeout(previewTimeout);
    previewTimeout = null;
  }
  
  const preview = document.getElementById('invitePreview');
  const error = document.getElementById('inviteError');
  
  const trimmedCode = code.trim();
  if (trimmedCode.length < 8) {
    preview.style.display = 'none';
    error.style.display = 'none';
    document.getElementById('previewServerName').textContent = '';
    document.getElementById('previewMemberCount').textContent = '';
    document.getElementById('previewCreatedBy').textContent = '';
    return;
  }
  
  previewTimeout = setTimeout(() => {
    fetch(`/api/invites/code/${trimmedCode.toUpperCase()}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          preview.style.display = 'none';
          error.style.display = 'block';
          error.textContent = data.error;
        } else {
          error.style.display = 'none';
          preview.style.display = 'block';
          document.getElementById('previewServerName').textContent = data.server_name || 'Unknown Server';
          document.getElementById('previewMemberCount').textContent = `${data.member_count || 0} member${data.member_count !== 1 ? 's' : ''}`;
          document.getElementById('previewCreatedBy').textContent = `Invited by ${data.created_by_username || 'Unknown'}`;
        }
      })
      .catch(() => {
        preview.style.display = 'none';
        error.style.display = 'block';
        error.textContent = 'Unable to verify invite code';
      });
  }, 300);
}

function joinServerByCode() {
  const code = document.getElementById('joinCodeInput').value.trim();
  if (!code) {
    alert('Please enter an invite code');
    return;
  }
  
  fetch(`/api/invites/join/${code}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        alert(data.message || 'Successfully joined the server!');
        closeJoinServerModal();
        loadServers();
      } else {
        document.getElementById('inviteError').style.display = 'block';
        document.getElementById('inviteError').textContent = data.error || 'Failed to join server';
      }
    });
}

// Reactions
function addReaction(messageId, emoji) {
  fetch(`/api/reactions/${messageId}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}` 
    },
    body: JSON.stringify({ emoji })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        socket.emit(data.action === 'added' ? 'add_reaction' : 'remove_reaction', {
          messageId, emoji, userId: currentUser.id, username: currentUser.username
        });
        loadReactionsForMessage(messageId);
      }
    });
}

function loadReactionsForMessage(messageId) {
  fetch(`/api/reactions/${messageId}`)
    .then(r => r.json())
    .then(reactions => {
      const container = document.querySelector(`[data-msg-id="${messageId}"] .msg-reactions`);
      if (!container) return;
      
      container.innerHTML = reactions.map(r => `
        <button class="msg-reaction ${r.userIds.includes(currentUser.id) ? 'user-reacted' : ''}"
                onclick="addReaction(${messageId}, '${r.emoji}')"
                title="${r.users.join(', ')}">
          ${r.emoji} ${r.count}
        </button>
      `).join('') + `<button class="msg-reaction" onclick="showReactionPicker(${messageId})">+</button>`;
    });
}

function showReactionPicker(messageId) {
  const picker = prompt('Enter an emoji:');
  if (picker && picker.trim()) {
    addReaction(messageId, picker.trim());
  }
}

// Message Editing
function editMessage(messageId) {
  const msgEl = document.querySelector(`[data-msg-id="${messageId}"] .msg-content`);
  if (!msgEl) return;
  
  const currentContent = msgEl.textContent;
  const newContent = prompt('Edit message:', currentContent);
  
  if (newContent !== null && newContent !== currentContent) {
    socket.emit('edit_message', {
      messageId,
      newContent,
      userId: currentUser.id
    });
  }
}

// Unread Counts
function loadUnreadCounts() {
  if (!currentUser) return;
  
  fetch(`/api/messages/unread/${currentUser.id}`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(counts => {
      unreadCounts = counts;
      updateUnreadBadges();
    })
    .catch(() => {});
}

function updateUnreadBadges() {
  document.querySelectorAll('.unread-badge').forEach(b => b.remove());
  
  for (const [key, count] of Object.entries(unreadCounts)) {
    if (count > 0) {
      let selector = null;
      if (key === 'global') {
        selector = '#globalChatBtn';
      } else if (key.startsWith('channel-')) {
        const channelId = key.split('-')[1];
        selector = `.channel-btn[data-channel-id="${channelId}"]`;
      } else if (key.startsWith('group-')) {
        const groupId = key.split('-')[1];
        selector = `.group-btn[data-group-id="${groupId}"]`;
      }
      
      if (selector) {
        const el = document.querySelector(selector);
        if (el && !el.querySelector('.unread-badge')) {
          const badge = document.createElement('span');
          badge.className = 'unread-badge';
          badge.textContent = count > 99 ? '99+' : count;
          el.appendChild(badge);
        }
      }
    }
  }
}

function markAsRead() {
  if (!currentUser) return;
  
  const lastMsg = document.querySelector('.message:last-child');
  const lastMessageId = lastMsg ? parseInt(lastMsg.dataset.msgId) : 0;
  
  socket.emit('mark_read', {
    userId: currentUser.id,
    channelId: currentChannel,
    groupChatId: currentGroupChat,
    dmPartnerId: currentFriend,
    isGlobal: isGlobalChat,
    lastMessageId
  });
  
  const key = currentChannel ? `channel-${currentChannel}` :
              currentGroupChat ? `group-${currentGroupChat}` :
              currentFriend ? `dm-${currentFriend}` :
              isGlobalChat ? 'global' : null;
  
  if (key) {
    delete unreadCounts[key];
    updateUnreadBadges();
  }
}

// Format mentions in message content
function formatMentions(content) {
  return content.replace(/@(\w+)/g, '<span class="mention" onclick="viewUserProfile(\'$1\')">@$1</span>');
}

// Socket listeners for Discord features
function setupDiscordSocketListeners() {
  if (!socket) return;
  
  socket.on('user_typing', (data) => {
    if (data.userId === currentUser?.id) return;
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
      indicator.textContent = `${data.username} is typing...`;
      indicator.classList.add('active');
    }
  });
  
  socket.on('user_stop_typing', (data) => {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
      indicator.classList.remove('active');
    }
  });
  
  socket.on('reaction_added', (data) => {
    loadReactionsForMessage(data.messageId);
  });
  
  socket.on('reaction_removed', (data) => {
    loadReactionsForMessage(data.messageId);
  });
  
  socket.on('message_edited', (data) => {
    const msgEl = document.querySelector(`[data-msg-id="${data.messageId}"] .msg-content`);
    if (msgEl) {
      msgEl.textContent = data.newContent;
      const editedSpan = msgEl.parentElement.querySelector('.msg-edited');
      if (!editedSpan) {
        const span = document.createElement('span');
        span.className = 'msg-edited';
        span.textContent = '(edited)';
        msgEl.after(span);
      }
    }
  });
  
  socket.on('mention_notification', (data) => {
    if (Notification.permission === 'granted') {
      new Notification(`${data.fromUsername} mentioned you`, {
        body: data.content,
        icon: '/favicon.ico'
      });
    }
    showMentionToast(data);
  });
}

function showMentionToast(data) {
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:80px;right:20px;background:var(--primary);color:white;padding:12px 20px;border-radius:8px;z-index:1000;animation:slideIn 0.3s ease;';
  toast.innerHTML = `<strong>@${escapeHtml(data.fromUsername)}</strong> mentioned you`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Request notification permission
if (Notification.permission === 'default') {
  Notification.requestPermission();
}

// Call socket setup after socket is initialized
setTimeout(setupDiscordSocketListeners, 1500);

// ============== PHASE 2: ROLES & PERMISSIONS ==============

let currentSettingsServerId = null;
let currentSelectedRole = null;
let serverRoles = [];
let serverMembers = [];

const PERMISSION_LABELS = {
  administrator: 'Administrator (Full Access)',
  manage_server: 'Manage Server',
  manage_roles: 'Manage Roles',
  manage_channels: 'Manage Channels',
  kick_members: 'Kick Members',
  ban_members: 'Ban Members',
  create_invites: 'Create Invites',
  manage_messages: 'Manage Messages',
  send_messages: 'Send Messages',
  view_channels: 'View Channels',
  read_history: 'Read Message History',
  mention_everyone: 'Mention @everyone',
  add_reactions: 'Add Reactions',
  attach_files: 'Attach Files'
};

function openServerSettings(serverId) {
  currentSettingsServerId = serverId;
  document.getElementById('serverSettingsOverlay').style.display = 'block';
  document.getElementById('serverSettingsModal').classList.add('active');
  
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', () => switchSettingsTab(tab.dataset.tab));
  });
  
  loadRoles();
}

function closeServerSettings() {
  document.getElementById('serverSettingsOverlay').style.display = 'none';
  document.getElementById('serverSettingsModal').classList.remove('active');
  currentSettingsServerId = null;
  currentSelectedRole = null;
}

function switchSettingsTab(tabName) {
  document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
  
  document.querySelector(`.settings-tab[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`${tabName}Panel`).classList.add('active');
  
  if (tabName === 'roles') loadRoles();
  else if (tabName === 'categories') loadCategories();
  else if (tabName === 'members') loadServerMembers();
  else if (tabName === 'audit') loadAuditLog();
}

function loadRoles() {
  if (!currentSettingsServerId) return;
  
  fetch(`/api/roles/server/${currentSettingsServerId}`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(roles => {
      serverRoles = roles;
      const list = document.getElementById('rolesList');
      list.innerHTML = roles.map(role => `
        <div class="role-item ${currentSelectedRole?.id === role.id ? 'active' : ''}" 
             onclick="selectRole(${role.id})" data-role-id="${role.id}">
          <div class="role-color" style="background:${role.color}"></div>
          <span class="role-name">${escapeHtml(role.name)}</span>
        </div>
      `).join('');
    });
}

function selectRole(roleId) {
  currentSelectedRole = serverRoles.find(r => r.id === roleId);
  if (!currentSelectedRole) return;
  
  document.querySelectorAll('.role-item').forEach(item => {
    item.classList.toggle('active', parseInt(item.dataset.roleId) === roleId);
  });
  
  const editor = document.getElementById('roleEditor');
  const permissions = currentSelectedRole.permissions || {};
  const isEveryone = currentSelectedRole.name === '@everyone';
  
  editor.innerHTML = `
    <div class="role-form">
      <div class="form-group">
        <label>Role Name</label>
        <input type="text" id="roleName" value="${escapeHtml(currentSelectedRole.name)}" ${isEveryone ? 'disabled' : ''}>
      </div>
      <div class="form-group">
        <label>Role Color</label>
        <input type="color" id="roleColor" value="${currentSelectedRole.color || '#99AAB5'}">
      </div>
      <div class="form-group">
        <label>Permissions</label>
        <div class="permissions-grid">
          ${Object.entries(PERMISSION_LABELS).map(([key, label]) => `
            <div class="permission-item">
              <input type="checkbox" id="perm_${key}" ${permissions[key] ? 'checked' : ''}>
              <label for="perm_${key}">${label}</label>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="role-actions">
        <button class="save-role-btn" onclick="saveRole()">Save Changes</button>
        ${!isEveryone ? `<button class="delete-role-btn" onclick="deleteRole(${roleId})">Delete Role</button>` : ''}
      </div>
    </div>
  `;
}

function createNewRole() {
  const name = prompt('Role name:');
  if (!name) return;
  
  fetch(`/api/roles/server/${currentSettingsServerId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify({ name, color: '#99AAB5' })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        loadRoles();
        alert('Role created!');
      } else {
        alert(data.error || 'Failed to create role');
      }
    });
}

function saveRole() {
  if (!currentSelectedRole) return;
  
  const name = document.getElementById('roleName').value;
  const color = document.getElementById('roleColor').value;
  const permissions = {};
  
  Object.keys(PERMISSION_LABELS).forEach(key => {
    const checkbox = document.getElementById(`perm_${key}`);
    if (checkbox?.checked) permissions[key] = true;
  });
  
  fetch(`/api/roles/server/${currentSettingsServerId}/${currentSelectedRole.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify({ name, color, permissions })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        loadRoles();
        alert('Role saved!');
      } else {
        alert(data.error || 'Failed to save role');
      }
    });
}

function deleteRole(roleId) {
  if (!confirm('Delete this role? Members will lose it.')) return;
  
  fetch(`/api/roles/server/${currentSettingsServerId}/${roleId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        currentSelectedRole = null;
        document.getElementById('roleEditor').innerHTML = '<p class="no-role-selected">Select a role to edit</p>';
        loadRoles();
      } else {
        alert(data.error || 'Failed to delete role');
      }
    });
}

function loadCategories() {
  if (!currentSettingsServerId) return;
  
  fetch(`/api/categories/server/${currentSettingsServerId}`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(categories => {
      const list = document.getElementById('categoriesList');
      if (categories.length === 0) {
        list.innerHTML = '<p style="color:var(--text-light);text-align:center;">No categories yet</p>';
        return;
      }
      
      list.innerHTML = categories.map(cat => `
        <div class="category-item" data-category-id="${cat.id}">
          <input type="text" value="${escapeHtml(cat.name)}" id="cat_${cat.id}">
          <button onclick="renameCategory(${cat.id})" style="background:var(--primary);color:white;">Save</button>
          <button onclick="deleteCategory(${cat.id})" style="background:#e74c3c;color:white;">Delete</button>
        </div>
      `).join('');
    });
}

function createNewCategory() {
  const name = prompt('Category name:');
  if (!name) return;
  
  fetch(`/api/categories/server/${currentSettingsServerId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify({ name })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        loadCategories();
        loadServers();
      } else {
        alert(data.error || 'Failed to create category');
      }
    });
}

function renameCategory(categoryId) {
  const name = document.getElementById(`cat_${categoryId}`).value.trim();
  if (!name) return;
  
  fetch(`/api/categories/server/${currentSettingsServerId}/${categoryId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify({ name })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        loadServers();
        alert('Category renamed!');
      }
    });
}

function deleteCategory(categoryId) {
  if (!confirm('Delete this category? Channels will be moved to uncategorized.')) return;
  
  fetch(`/api/categories/server/${currentSettingsServerId}/${categoryId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        loadCategories();
        loadServers();
      }
    });
}

function loadServerMembers() {
  if (!currentSettingsServerId) return;
  
  fetch(`/api/roles/server/${currentSettingsServerId}/members`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(members => {
      serverMembers = members;
      renderMembers(members);
    });
}

function renderMembers(members) {
  const list = document.getElementById('membersList');
  list.innerHTML = members.map(m => `
    <div class="member-item">
      <img src="${m.profilePicture || 'https://via.placeholder.com/36'}" alt="">
      <div class="member-info">
        <div class="member-name" style="color:${m.color}">${escapeHtml(m.username)}</div>
        <div class="member-roles">
          ${m.roles.map(r => `<span class="member-role-tag">${escapeHtml(r.name)}</span>`).join('')}
        </div>
      </div>
      <button onclick="manageMemberRoles(${m.id})" style="padding:6px 12px;background:var(--accent);border:none;border-radius:4px;cursor:pointer;">Manage</button>
    </div>
  `).join('');
}

function filterMembers(query) {
  const filtered = serverMembers.filter(m => 
    m.username.toLowerCase().includes(query.toLowerCase())
  );
  renderMembers(filtered);
}

function manageMemberRoles(userId) {
  const member = serverMembers.find(m => m.id === userId);
  if (!member) return;
  
  const memberRoleIds = member.roles.map(r => r.id);
  const options = serverRoles.map(role => {
    const hasRole = memberRoleIds.includes(role.id);
    return `${role.name}: ${hasRole ? 'Has' : 'No'}`;
  }).join('\n');
  
  const action = prompt(`Roles for ${member.username}:\n${options}\n\nEnter role name to toggle:`);
  if (!action) return;
  
  const role = serverRoles.find(r => r.name.toLowerCase() === action.toLowerCase());
  if (!role) {
    alert('Role not found');
    return;
  }
  
  const hasRole = memberRoleIds.includes(role.id);
  const method = hasRole ? 'DELETE' : 'POST';
  const url = hasRole 
    ? `/api/roles/server/${currentSettingsServerId}/member/${userId}/${role.id}`
    : `/api/roles/server/${currentSettingsServerId}/member/${userId}`;
  
  fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: hasRole ? null : JSON.stringify({ roleId: role.id })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        loadServerMembers();
      } else {
        alert(data.error || 'Failed to update role');
      }
    });
}

function loadAuditLog() {
  if (!currentSettingsServerId) return;
  
  fetch(`/api/audit/server/${currentSettingsServerId}?limit=50`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(logs => {
      const list = document.getElementById('auditLogList');
      if (logs.length === 0) {
        list.innerHTML = '<p style="color:var(--text-light);text-align:center;">No audit log entries</p>';
        return;
      }
      
      list.innerHTML = logs.map(log => `
        <div class="audit-item">
          <img src="${log.actor.profilePicture || 'https://via.placeholder.com/32'}" alt="">
          <div class="audit-info">
            <div class="audit-action">
              <strong>${escapeHtml(log.actor.username)}</strong> ${formatAuditAction(log)}
            </div>
            <div class="audit-time">${new Date(log.createdAt).toLocaleString()}</div>
          </div>
        </div>
      `).join('');
    })
    .catch(() => {
      document.getElementById('auditLogList').innerHTML = '<p style="color:var(--text-light);text-align:center;">Unable to load audit log</p>';
    });
}

function formatAuditAction(log) {
  const actions = {
    ROLE_CREATE: 'created a role',
    ROLE_UPDATE: 'updated a role',
    ROLE_DELETE: 'deleted a role',
    ROLE_ASSIGN: 'assigned a role',
    ROLE_REMOVE: 'removed a role',
    CHANNEL_CREATE: 'created a channel',
    CHANNEL_DELETE: 'deleted a channel',
    MEMBER_KICK: 'kicked a member',
    MEMBER_BAN: 'banned a member'
  };
  return actions[log.actionType] || log.actionType.toLowerCase().replace(/_/g, ' ');
}

// ============== SHOP SYSTEM ==============
let shopCategories = [];
let shopItems = [];
let userInventory = [];
let userEquipped = {};
let currentShopCategory = null;
let userCoins = 0;

function initShop() {
  document.getElementById('openShopBtn').addEventListener('click', openShop);
  loadUserCoins();
  loadUserEquipped();
}

function loadUserCoins() {
  fetch('/api/shop/wallet', {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      userCoins = data.coins || 0;
      updateCoinDisplays();
    })
    .catch(() => {});
}

function updateCoinDisplays() {
  const coinDisplay = document.getElementById('coinDisplay');
  const shopBalance = document.getElementById('shopCoinBalance');
  if (coinDisplay) coinDisplay.textContent = `${userCoins} 🪙`;
  if (shopBalance) shopBalance.textContent = userCoins;
}

function openShop() {
  document.getElementById('shopOverlay').style.display = 'block';
  document.getElementById('shopModal').style.display = 'block';
  loadShopCategories();
  loadUserCoins();
  checkDailyRewardStatus();
  
  fetch('/api/shop/inventory', {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(items => {
      userInventory = items || [];
      loadShopItems();
    })
    .catch(() => {
      userInventory = [];
      loadShopItems();
    });
}

function closeShop() {
  document.getElementById('shopOverlay').style.display = 'none';
  document.getElementById('shopModal').style.display = 'none';
}

function switchShopTab(tab) {
  document.querySelectorAll('.shop-tab').forEach(btn => {
    btn.style.background = btn.dataset.tab === tab ? 'var(--primary)' : 'var(--bg)';
    btn.style.color = btn.dataset.tab === tab ? 'white' : 'var(--text)';
  });
  
  document.getElementById('browseTab').style.display = tab === 'browse' ? 'flex' : 'none';
  document.getElementById('inventoryTab').style.display = tab === 'inventory' ? 'block' : 'none';
  
  if (tab === 'inventory') {
    loadUserInventory();
  }
}

function loadShopCategories() {
  fetch('/api/shop/categories', {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(categories => {
      shopCategories = categories;
      const list = document.getElementById('shopCategoriesList');
      list.innerHTML = `
        <button class="shop-category-btn active" onclick="selectCategory(null)" style="width:100%;padding:12px;margin-bottom:8px;background:var(--primary);color:white;border:none;border-radius:8px;cursor:pointer;text-align:left;font-weight:600;">
          All Items
        </button>
      ` + categories.map(cat => `
        <button class="shop-category-btn" onclick="selectCategory('${cat.slug}')" data-category="${cat.slug}" style="width:100%;padding:12px;margin-bottom:8px;background:var(--card);color:var(--text);border:1px solid var(--accent);border-radius:8px;cursor:pointer;text-align:left;">
          ${cat.icon} ${cat.name}
        </button>
      `).join('');
    });
}

function selectCategory(categorySlug) {
  currentShopCategory = categorySlug;
  
  document.querySelectorAll('.shop-category-btn').forEach(btn => {
    const isSelected = btn.dataset.category === categorySlug || (!categorySlug && !btn.dataset.category);
    btn.style.background = isSelected ? 'var(--primary)' : 'var(--card)';
    btn.style.color = isSelected ? 'white' : 'var(--text)';
  });
  
  const category = shopCategories.find(c => c.slug === categorySlug);
  document.getElementById('shopCategoryTitle').textContent = category ? `${category.icon} ${category.name}` : 'All Items';
  
  loadShopItems(categorySlug);
}

function loadShopItems(category = null) {
  const rarity = document.getElementById('shopRarityFilter')?.value || '';
  let url = '/api/shop/items?';
  if (category) url += `category=${category}&`;
  if (rarity) url += `rarity=${rarity}&`;
  
  fetch(url, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(items => {
      shopItems = items;
      renderShopItems(items);
    });
}

function filterShopItems() {
  loadShopItems(currentShopCategory);
}

function renderShopItems(items) {
  const grid = document.getElementById('shopItemsGrid');
  
  if (items.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-light);text-align:center;grid-column:1/-1;">No items found</p>';
    return;
  }
  
  grid.innerHTML = items.map(item => {
    const rarityColors = {
      common: '#9e9e9e',
      uncommon: '#4caf50',
      rare: '#2196f3',
      epic: '#9c27b0',
      legendary: '#ff9800'
    };
    const rarityColor = rarityColors[item.rarity] || '#9e9e9e';
    const isOwned = userInventory.some(i => i.id === item.id);
    
    return `
      <div class="shop-item-card" onclick="showItemPreview(${item.id})" style="background:var(--bg);border-radius:12px;padding:15px;cursor:pointer;border:2px solid ${rarityColor}30;transition:transform 0.2s;">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px;">
          <span style="font-size:24px;">${getCategoryIcon(item.item_type)}</span>
          <span style="background:${rarityColor};color:white;padding:2px 8px;border-radius:12px;font-size:10px;text-transform:uppercase;">${item.rarity}</span>
        </div>
        <h4 style="margin:0 0 5px;color:var(--text);font-size:14px;">${escapeHtml(item.name)}</h4>
        <p style="margin:0 0 10px;color:var(--text-light);font-size:11px;line-height:1.4;">${escapeHtml(item.description || '')}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:var(--primary);font-weight:600;">${item.price} 🪙</span>
          ${item.is_animated ? '<span style="font-size:10px;color:var(--secondary);">✨ Animated</span>' : ''}
        </div>
        ${isOwned ? '<div style="margin-top:8px;text-align:center;background:var(--accent);color:var(--text);padding:4px;border-radius:6px;font-size:11px;">Owned</div>' : ''}
      </div>
    `;
  }).join('');
}

function getCategoryIcon(itemType) {
  const icons = {
    theme: '🎨',
    frame: '🖼️',
    badge: '🏅',
    bubble: '💬',
    sound: '🔊',
    avatar: '✨',
    server_icon: '🏠',
    server_banner: '🏠',
    status: '🔴',
    bio_upgrade: '📝',
    boost: '🚀'
  };
  return icons[itemType] || '📦';
}

function showItemPreview(itemId) {
  const item = shopItems.find(i => i.id === itemId);
  if (!item) return;
  
  const isOwned = userInventory.some(i => i.id === itemId);
  const isEquipped = Object.values(userEquipped).some(e => e.item_id === itemId);
  const canAfford = userCoins >= item.price;
  
  const rarityColors = {
    common: '#9e9e9e',
    uncommon: '#4caf50',
    rare: '#2196f3',
    epic: '#9c27b0',
    legendary: '#ff9800'
  };
  const rarityColor = rarityColors[item.rarity] || '#9e9e9e';
  
  let previewContent = '';
  if (item.item_type === 'theme' && item.css_vars) {
    try {
      const vars = JSON.parse(item.css_vars);
      previewContent = `
        <div style="display:flex;gap:5px;justify-content:center;margin:15px 0;">
          ${Object.entries(vars).map(([key, val]) => `
            <div style="width:30px;height:30px;background:${val};border-radius:50%;border:2px solid white;"></div>
          `).join('')}
        </div>
      `;
    } catch(e) {}
  } else if (item.item_type === 'badge' && item.metadata) {
    try {
      const meta = JSON.parse(item.metadata);
      previewContent = `<div style="font-size:48px;margin:15px 0;">${meta.emoji || '🏅'}</div>`;
    } catch(e) {}
  }
  
  document.getElementById('itemPreviewContent').innerHTML = `
    <div style="font-size:48px;margin-bottom:15px;">${getCategoryIcon(item.item_type)}</div>
    <h2 style="margin:0 0 10px;color:var(--text);">${escapeHtml(item.name)}</h2>
    <span style="display:inline-block;background:${rarityColor};color:white;padding:4px 12px;border-radius:12px;font-size:12px;text-transform:uppercase;margin-bottom:15px;">${item.rarity}</span>
    <p style="color:var(--text-light);margin:0 0 15px;">${escapeHtml(item.description || '')}</p>
    ${previewContent}
    <div style="font-size:24px;color:var(--primary);font-weight:700;margin:15px 0;">${item.price} 🪙</div>
    ${item.is_animated ? '<p style="color:var(--secondary);font-size:12px;margin-bottom:15px;">✨ This item is animated!</p>' : ''}
    ${isOwned ? `
      <button onclick="equipItem(${item.id}, '${item.item_type}')" style="width:100%;padding:12px;background:${isEquipped ? 'var(--accent)' : 'var(--primary)'};color:${isEquipped ? 'var(--text)' : 'white'};border:none;border-radius:8px;cursor:pointer;font-weight:600;margin-bottom:10px;">
        ${isEquipped ? 'Unequip' : 'Equip'}
      </button>
    ` : `
      <button onclick="purchaseItem(${item.id})" style="width:100%;padding:12px;background:${canAfford ? 'var(--primary)' : '#666'};color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;margin-bottom:10px;" ${canAfford ? '' : 'disabled'}>
        ${canAfford ? 'Purchase' : 'Not Enough Coins'}
      </button>
    `}
    <button onclick="closeItemPreview()" style="width:100%;padding:10px;background:var(--accent);color:var(--text);border:none;border-radius:8px;cursor:pointer;">Close</button>
  `;
  
  document.getElementById('itemPreviewOverlay').style.display = 'block';
  document.getElementById('itemPreviewModal').style.display = 'block';
}

function closeItemPreview() {
  document.getElementById('itemPreviewOverlay').style.display = 'none';
  document.getElementById('itemPreviewModal').style.display = 'none';
}

function purchaseItem(itemId) {
  fetch(`/api/shop/purchase/${itemId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        userCoins = data.newBalance;
        updateCoinDisplays();
        userInventory.push(data.item);
        closeItemPreview();
        loadShopItems(currentShopCategory);
        alert(data.message);
      } else {
        alert(data.error || 'Purchase failed');
      }
    })
    .catch(() => alert('Purchase failed'));
}

function loadUserInventory() {
  fetch('/api/shop/inventory', {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(items => {
      userInventory = items;
      renderInventory(items);
    });
}

function renderInventory(items) {
  const grid = document.getElementById('inventoryGrid');
  
  if (items.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-light);text-align:center;grid-column:1/-1;">You don\'t own any items yet. Browse the shop to get started!</p>';
    return;
  }
  
  const rarityColors = {
    common: '#9e9e9e',
    uncommon: '#4caf50',
    rare: '#2196f3',
    epic: '#9c27b0',
    legendary: '#ff9800'
  };
  
  grid.innerHTML = items.map(item => {
    const rarityColor = rarityColors[item.rarity] || '#9e9e9e';
    const isEquipped = Object.values(userEquipped).some(e => e.item_id === item.id);
    
    return `
      <div class="inventory-item-card" style="background:var(--bg);border-radius:12px;padding:15px;border:2px solid ${isEquipped ? 'var(--primary)' : rarityColor + '30'};">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px;">
          <span style="font-size:24px;">${getCategoryIcon(item.item_type)}</span>
          ${isEquipped ? '<span style="background:var(--primary);color:white;padding:2px 8px;border-radius:12px;font-size:10px;">EQUIPPED</span>' : ''}
        </div>
        <h4 style="margin:0 0 5px;color:var(--text);font-size:14px;">${escapeHtml(item.name)}</h4>
        <p style="margin:0 0 10px;color:var(--text-light);font-size:11px;">${item.category_name}</p>
        <button onclick="equipItem(${item.id}, '${item.item_type}')" style="width:100%;padding:8px;background:${isEquipped ? 'var(--accent)' : 'var(--primary)'};color:${isEquipped ? 'var(--text)' : 'white'};border:none;border-radius:6px;cursor:pointer;font-size:12px;">
          ${isEquipped ? 'Unequip' : 'Equip'}
        </button>
      </div>
    `;
  }).join('');
}

function loadUserEquipped() {
  fetch('/api/shop/equipped', {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(equipped => {
      userEquipped = equipped;
      applyEquippedCosmetics();
    });
}

function equipItem(itemId, itemType) {
  const isCurrentlyEquipped = Object.values(userEquipped).some(e => e.item_id === itemId);
  
  if (isCurrentlyEquipped) {
    fetch('/api/shop/unequip', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ slot: itemType })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          delete userEquipped[itemType];
          applyEquippedCosmetics();
          closeItemPreview();
          if (document.getElementById('inventoryTab').style.display !== 'none') {
            loadUserInventory();
          }
          loadShopItems(currentShopCategory);
        } else {
          alert(data.error || 'Failed to unequip');
        }
      });
  } else {
    fetch('/api/shop/equip', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ itemId, slot: itemType })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          userEquipped[itemType] = { item_id: itemId, ...data.item };
          applyEquippedCosmetics();
          closeItemPreview();
          if (document.getElementById('inventoryTab').style.display !== 'none') {
            loadUserInventory();
          }
          loadShopItems(currentShopCategory);
        } else {
          alert(data.error || 'Failed to equip');
        }
      });
  }
}

function applyEquippedCosmetics() {
  if (userEquipped.theme && userEquipped.theme.css_vars) {
    try {
      const vars = JSON.parse(userEquipped.theme.css_vars);
      Object.entries(vars).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
      });
    } catch(e) {}
  }
  
  localStorage.setItem('equippedCosmetics', JSON.stringify(userEquipped));
}

function checkDailyRewardStatus() {
  fetch('/api/shop/daily/status', {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      const btn = document.getElementById('dailyRewardBtn');
      if (data.claimed) {
        btn.style.background = 'var(--accent)';
        btn.style.color = 'var(--text)';
        btn.textContent = '✓ Claimed';
        btn.disabled = true;
      } else {
        btn.style.background = 'linear-gradient(135deg,#f7931e,#ff6b35)';
        btn.style.color = 'white';
        btn.textContent = '🎁 Daily';
        btn.disabled = false;
      }
    });
}

function claimDailyReward() {
  fetch('/api/shop/daily', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        userCoins = data.newBalance;
        updateCoinDisplays();
        checkDailyRewardStatus();
        alert(data.message);
      } else {
        alert(data.error || 'Could not claim daily reward');
      }
    });
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initShop, 500);
});

let userShortcuts = {};
let shortcutsEnabled = true;

function openChangelog() {
  document.getElementById('changelogOverlay').style.display = 'block';
  document.getElementById('changelogModal').style.display = 'block';
  loadChangelogs();
}

function closeChangelog() {
  document.getElementById('changelogOverlay').style.display = 'none';
  document.getElementById('changelogModal').style.display = 'none';
}

function loadChangelogs() {
  fetch('/api/changelogs')
    .then(r => r.json())
    .then(changelogs => {
      const container = document.getElementById('changelogContent');
      if (!changelogs.length) {
        container.innerHTML = '<p style="color:var(--text-light);text-align:center;">No changelog entries yet.</p>';
        return;
      }
      
      container.innerHTML = changelogs.map(log => {
        const typeColors = {
          feature: '#2ecc71',
          bugfix: '#e74c3c',
          improvement: '#3498db',
          security: '#f39c12',
          removed: '#95a5a6',
          ui: '#9b59b6'
        };
        const typeLabels = {
          feature: '✨ New Feature',
          bugfix: '🐛 Bug Fix',
          improvement: '📈 Improvement',
          security: '🔒 Security',
          removed: '🗑️ Removed',
          ui: '🎨 UI Update'
        };
        const date = new Date(log.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', month: 'short', day: 'numeric' 
        });
        
        return `
          <div style="margin-bottom:20px;padding:20px;background:var(--bg);border-radius:12px;border-left:4px solid ${typeColors[log.change_type] || '#3498db'};">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <div style="display:flex;align-items:center;gap:10px;">
                ${log.version ? `<span style="background:var(--primary);color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">v${log.version}</span>` : ''}
                <span style="background:${typeColors[log.change_type] || '#3498db'}20;color:${typeColors[log.change_type] || '#3498db'};padding:4px 10px;border-radius:20px;font-size:12px;">${typeLabels[log.change_type] || log.change_type}</span>
              </div>
              <span style="color:var(--text-light);font-size:12px;">${date}</span>
            </div>
            <h3 style="margin:0 0 10px;color:var(--text);font-size:18px;">${log.title}</h3>
            <p style="margin:0;color:var(--text-light);line-height:1.6;">${log.content}</p>
            ${log.author_name ? `<p style="margin:10px 0 0;color:var(--text-light);font-size:12px;">— ${log.author_name}</p>` : ''}
          </div>
        `;
      }).join('');
    })
    .catch(() => {
      document.getElementById('changelogContent').innerHTML = '<p style="color:var(--text-light);text-align:center;">Failed to load changelogs.</p>';
    });
}

function openShortcuts() {
  document.getElementById('shortcutsOverlay').style.display = 'block';
  document.getElementById('shortcutsModal').style.display = 'block';
  loadShortcuts();
}

function closeShortcuts() {
  document.getElementById('shortcutsOverlay').style.display = 'none';
  document.getElementById('shortcutsModal').style.display = 'none';
}

function loadShortcuts() {
  fetch('/api/shortcuts', {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(shortcuts => {
      const container = document.getElementById('shortcutsContent');
      const categories = {};
      
      shortcuts.forEach(s => {
        if (!categories[s.category]) categories[s.category] = [];
        categories[s.category].push(s);
        userShortcuts[s.action] = { shortcut: s.shortcut, enabled: s.is_enabled };
      });
      
      const categoryLabels = {
        navigation: '🧭 Navigation',
        ui: '🖥️ User Interface',
        chat: '💬 Chat',
        advanced: '⚡ Advanced'
      };
      
      container.innerHTML = Object.entries(categories).map(([cat, items]) => `
        <div style="margin-bottom:25px;">
          <h3 style="margin:0 0 15px;color:var(--text);font-size:14px;text-transform:uppercase;letter-spacing:1px;">${categoryLabels[cat] || cat}</h3>
          ${items.map(s => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg);border-radius:8px;margin-bottom:8px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <label style="display:flex;align-items:center;cursor:pointer;">
                  <input type="checkbox" ${s.is_enabled ? 'checked' : ''} onchange="toggleShortcut('${s.action}')" 
                    style="width:18px;height:18px;cursor:pointer;">
                </label>
                <span style="color:var(--text);${!s.is_enabled ? 'opacity:0.5;' : ''}">${s.description}</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <kbd onclick="editShortcut('${s.action}', this)" style="background:var(--card);padding:6px 12px;border-radius:6px;font-family:monospace;font-size:13px;color:var(--primary);border:1px solid var(--accent);cursor:pointer;${!s.is_enabled ? 'opacity:0.5;' : ''}">${formatShortcut(s.shortcut)}</kbd>
              </div>
            </div>
          `).join('')}
        </div>
      `).join('');
    })
    .catch(() => {
      document.getElementById('shortcutsContent').innerHTML = '<p style="color:var(--text-light);text-align:center;">Failed to load shortcuts.</p>';
    });
}

function formatShortcut(shortcut) {
  return shortcut
    .replace('ctrl+', 'Ctrl + ')
    .replace('alt+', 'Alt + ')
    .replace('shift+', 'Shift + ')
    .toUpperCase();
}

function toggleShortcut(action) {
  fetch(`/api/shortcuts/${action}/toggle`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        userShortcuts[action].enabled = data.is_enabled;
        loadShortcuts();
      }
    });
}

function editShortcut(action, element) {
  const originalText = element.textContent;
  element.textContent = 'Press key...';
  element.style.background = 'var(--primary)';
  element.style.color = 'white';
  
  const handler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    let key = e.key.toLowerCase();
    if (key === 'escape') {
      element.textContent = originalText;
      element.style.background = 'var(--card)';
      element.style.color = 'var(--primary)';
      document.removeEventListener('keydown', handler);
      return;
    }
    
    let shortcut = '';
    if (e.ctrlKey) shortcut += 'ctrl+';
    if (e.altKey) shortcut += 'alt+';
    if (e.shiftKey && key !== 'shift') shortcut += 'shift+';
    if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
      shortcut += key;
    }
    
    if (!shortcut || shortcut.endsWith('+')) {
      return;
    }
    
    document.removeEventListener('keydown', handler);
    
    fetch(`/api/shortcuts/${action}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ shortcut })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          userShortcuts[action].shortcut = shortcut;
          element.textContent = formatShortcut(shortcut);
        } else {
          alert(data.error || 'Failed to update shortcut');
          element.textContent = originalText;
        }
        element.style.background = 'var(--card)';
        element.style.color = 'var(--primary)';
      });
  };
  
  document.addEventListener('keydown', handler);
}

function resetShortcuts() {
  if (!confirm('Reset all shortcuts to defaults?')) return;
  
  fetch('/api/shortcuts/reset', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        loadShortcuts();
        initKeyboardShortcuts();
      }
    });
}

function initKeyboardShortcuts() {
  fetch('/api/shortcuts', {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(shortcuts => {
      shortcuts.forEach(s => {
        userShortcuts[s.action] = { shortcut: s.shortcut, enabled: s.is_enabled };
      });
    });
}

document.addEventListener('keydown', (e) => {
  if (!shortcutsEnabled) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
  
  const key = e.key.toLowerCase();
  let pressed = '';
  if (e.ctrlKey) pressed += 'ctrl+';
  if (e.altKey) pressed += 'alt+';
  if (e.shiftKey && key !== 'shift') pressed += 'shift+';
  pressed += key;
  
  for (const [action, config] of Object.entries(userShortcuts)) {
    if (!config.enabled) continue;
    if (config.shortcut === pressed) {
      e.preventDefault();
      executeShortcutAction(action);
      return;
    }
  }
});

function executeShortcutAction(action) {
  const actions = {
    'open_chat': () => document.querySelector('.dm-header')?.click(),
    'open_games': () => window.location.href = '/private/games.html',
    'open_profile': () => window.location.href = '/private/settings.html',
    'focus_search': () => document.getElementById('messageSearchInput')?.focus(),
    'return_dashboard': () => window.location.href = '/private/dashboard.html',
    'open_shop': () => openShop(),
    'toggle_sidebar': () => {
      const sidebar = document.querySelector('.servers-sidebar');
      if (sidebar) sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
    },
    'quick_switcher': () => document.getElementById('messageSearchInput')?.focus(),
    'new_message': () => document.getElementById('messageInput')?.focus(),
    'mark_read': () => {},
    'next_channel': () => {},
    'prev_channel': () => {}
  };
  
  if (actions[action]) actions[action]();
}

function openArchiveModal() {
  document.getElementById('archiveOverlay').style.display = 'block';
  document.getElementById('archiveModal').style.display = 'block';
  loadArchivedChats();
}

function closeArchiveModal() {
  document.getElementById('archiveOverlay').style.display = 'none';
  document.getElementById('archiveModal').style.display = 'none';
}

function loadArchivedChats() {
  fetch('/api/archive', {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(archived => {
      const container = document.getElementById('archiveContent');
      
      if (!archived.length) {
        container.innerHTML = '<p style="color:var(--text-light);text-align:center;">No archived chats. Right-click on a DM or channel to archive it.</p>';
        return;
      }
      
      container.innerHTML = archived.map(chat => {
        const typeIcons = { dm: '👤', group: '👥', channel: '#' };
        const date = new Date(chat.archived_at).toLocaleDateString();
        
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg);border-radius:8px;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="font-size:20px;">${typeIcons[chat.chat_type] || '💬'}</span>
              <div>
                <div style="color:var(--text);font-weight:500;">${chat.chat_name || 'Unknown'}</div>
                <div style="color:var(--text-light);font-size:12px;">Archived ${date}</div>
              </div>
            </div>
            <button onclick="unarchiveChat('${chat.chat_type}', ${chat.chat_id})" 
              style="padding:8px 16px;background:var(--primary);color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">
              Unarchive
            </button>
          </div>
        `;
      }).join('');
    })
    .catch(() => {
      document.getElementById('archiveContent').innerHTML = '<p style="color:var(--text-light);text-align:center;">Failed to load archived chats.</p>';
    });
}

function archiveChat(chatType, chatId) {
  fetch('/api/archive/archive', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ chat_type: chatType, chat_id: chatId })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        loadConversations();
      } else {
        alert(data.error || 'Failed to archive chat');
      }
    });
}

function unarchiveChat(chatType, chatId) {
  fetch('/api/archive/unarchive', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ chat_type: chatType, chat_id: chatId })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        loadArchivedChats();
        loadConversations();
      } else {
        alert(data.error || 'Failed to unarchive chat');
      }
    });
}

setTimeout(initKeyboardShortcuts, 1000);
