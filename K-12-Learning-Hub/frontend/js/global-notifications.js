// Global real-time notifications - works on all pages
(function() {
  // Skip if already initialized in this window
  if (window._globalNotificationsInitialized) return;
  window._globalNotificationsInitialized = true;
  
  let socket = null;
  let currentUser = null;
  
  function init() {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');
    
    if (!userStr || !token) return;
    
    try {
      currentUser = JSON.parse(userStr);
    } catch (e) {
      return;
    }
    
    if (typeof io === 'undefined') {
      const script = document.createElement('script');
      script.src = '/socket.io/socket.io.js';
      script.onload = () => connectSocket();
      document.head.appendChild(script);
    } else {
      connectSocket();
    }
  }
  
  function connectSocket() {
    if (socket && socket.connected) return;
    if (window._globalSocket) {
      socket = window._globalSocket;
      return;
    }
    
    socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
    
    window._globalSocket = socket;
    
    socket.on('connect', () => {
      socket.emit('user_join', { userId: currentUser.id });
    });
    
    socket.on('new_message', handleNewMessage);
    socket.on('dm_notification', handleDMNotification);
    socket.on('mention_notification', handleMention);
    socket.on('friend_request', handleFriendRequest);
    socket.on('achievement_unlocked', handleAchievement);
  }
  
  function handleNewMessage(message) {
    if (!message || message.user_id === currentUser.id) return;
    
    const notificationsEnabled = localStorage.getItem('chatNotifications') !== 'false';
    if (!notificationsEnabled) return;
    
    const mutedServers = JSON.parse(localStorage.getItem('mutedServers') || '[]');
    const mutedUsers = JSON.parse(localStorage.getItem('mutedUsers') || '[]');
    
    if (message.server_id && mutedServers.includes(message.server_id)) return;
    if (mutedUsers.includes(message.user_id)) return;
    
    const isOnChatPage = window.location.pathname.includes('/chat');
    if (isOnChatPage) return;
    
    const preview = message.content 
      ? (message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content)
      : 'Sent an attachment';
    
    showNotification({
      title: message.username || 'New Message',
      message: preview,
      type: 'message',
      icon: '💬'
    });
  }
  
  function handleDMNotification(message) {
    if (!message || message.user_id === currentUser.id) return;
    
    const notificationsEnabled = localStorage.getItem('chatNotifications') !== 'false';
    if (!notificationsEnabled) return;
    
    const mutedUsers = JSON.parse(localStorage.getItem('mutedUsers') || '[]');
    if (mutedUsers.includes(message.user_id)) return;
    
    const preview = message.content 
      ? (message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content)
      : 'Sent an attachment';
    
    showNotification({
      title: message.username || 'Direct Message',
      message: preview,
      type: 'message',
      icon: '💬',
      duration: 5000
    });
  }
  
  function handleMention(data) {
    if (!data) return;
    
    showNotification({
      title: `${data.fromUsername} mentioned you`,
      message: data.content || 'You were mentioned in a message',
      type: 'info',
      icon: '@',
      duration: 5000
    });
  }
  
  function handleFriendRequest(data) {
    if (!data) return;
    
    showNotification({
      title: 'Friend Request',
      message: `${data.username || 'Someone'} sent you a friend request`,
      type: 'friend',
      icon: '👤'
    });
  }
  
  function handleAchievement(data) {
    if (!data) return;
    
    showNotification({
      title: 'Achievement Unlocked!',
      message: data.name || 'You earned an achievement!',
      type: 'achievement',
      icon: '🏆',
      duration: 6000
    });
  }
  
  function showNotification(options) {
    if (typeof OSNotifications !== 'undefined') {
      OSNotifications.show(options);
    } else {
      createFallbackNotification(options);
    }
  }
  
  function createFallbackNotification(options) {
    let container = document.getElementById('global-notif-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'global-notif-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 350px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }
    
    const colors = {
      message: '#a855f7',
      friend: '#3b82f6',
      achievement: '#ffd700',
      info: '#4cc9f0',
      success: '#00ff88',
      warning: '#ffcc00',
      error: '#ff6b6b'
    };
    
    const notif = document.createElement('div');
    notif.style.cssText = `
      background: linear-gradient(135deg, rgba(30, 30, 50, 0.95), rgba(20, 20, 40, 0.95));
      border: 1px solid ${colors[options.type] || colors.info};
      border-left: 4px solid ${colors[options.type] || colors.info};
      border-radius: 12px;
      padding: 14px 16px;
      color: white;
      font-family: 'Inter', sans-serif;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px ${colors[options.type] || colors.info}33;
      pointer-events: all;
      animation: slideInRight 0.3s ease forwards;
    `;
    
    notif.innerHTML = `
      <div style="display: flex; gap: 12px; align-items: flex-start;">
        <span style="font-size: 24px;">${options.icon || '🔔'}</span>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 2px;">${escapeHtml(options.title)}</div>
          <div style="font-size: 13px; opacity: 0.8;">${escapeHtml(options.message)}</div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: none;
          border: none;
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          font-size: 18px;
          padding: 0;
          line-height: 1;
        ">×</button>
      </div>
    `;
    
    container.appendChild(notif);
    
    setTimeout(() => {
      notif.style.animation = 'slideOutRight 0.3s ease forwards';
      setTimeout(() => notif.remove(), 300);
    }, options.duration || 4000);
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
  
  // Add animation keyframes
  if (!document.getElementById('global-notif-styles')) {
    const style = document.createElement('style');
    style.id = 'global-notif-styles';
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(120%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(120%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Expose for debugging
  window.globalNotifications = { init, showNotification };
})();
