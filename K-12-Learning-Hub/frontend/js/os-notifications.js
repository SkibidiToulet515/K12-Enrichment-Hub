const OSNotifications = {
  container: null,
  notifications: [],
  maxNotifications: 5,
  defaultDuration: 5000,

  init() {
    if (this.container) return;
    
    this.container = document.createElement('div');
    this.container.id = 'os-notifications-container';
    this.container.style.cssText = `
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
    document.body.appendChild(this.container);
  },

  show(options) {
    this.init();
    
    const {
      title = 'Notification',
      message = '',
      type = 'info',
      icon = null,
      duration = this.defaultDuration,
      onClick = null,
      actions = []
    } = typeof options === 'string' ? { message: options } : options;

    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      message: '💬',
      achievement: '🏆',
      friend: '👤',
      system: '🔔'
    };

    const colors = {
      info: '#4cc9f0',
      success: '#00ff88',
      warning: '#ffcc00',
      error: '#ff6b6b',
      message: '#a855f7',
      achievement: '#ffd700',
      friend: '#3b82f6',
      system: '#6b7280'
    };

    const notification = document.createElement('div');
    notification.className = 'os-notification';
    notification.style.cssText = `
      background: linear-gradient(135deg, rgba(30, 30, 50, 0.95), rgba(20, 20, 40, 0.95));
      border: 1px solid ${colors[type] || colors.info};
      border-left: 4px solid ${colors[type] || colors.info};
      border-radius: 12px;
      padding: 14px 16px;
      color: white;
      font-family: 'Inter', 'Segoe UI', sans-serif;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px ${colors[type] || colors.info}33;
      transform: translateX(120%);
      transition: transform 0.3s ease, opacity 0.3s ease;
      pointer-events: all;
      cursor: ${onClick ? 'pointer' : 'default'};
      animation: slideIn 0.3s ease forwards;
    `;

    notification.innerHTML = `
      <div style="display: flex; gap: 12px; align-items: flex-start;">
        <span style="font-size: 24px;">${icon || icons[type] || icons.info}</span>
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 2px;">${this.escapeHtml(title)}</div>
          ${message ? `<div style="font-size: 13px; opacity: 0.8; word-wrap: break-word;">${this.escapeHtml(message)}</div>` : ''}
          ${actions.length > 0 ? `
            <div style="display: flex; gap: 8px; margin-top: 10px;">
              ${actions.map((action, i) => `
                <button data-action="${i}" style="
                  padding: 6px 12px;
                  background: ${action.primary ? colors[type] || colors.info : 'rgba(255,255,255,0.1)'};
                  border: none;
                  border-radius: 6px;
                  color: ${action.primary ? '#000' : '#fff'};
                  font-size: 12px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.2s;
                ">${this.escapeHtml(action.label)}</button>
              `).join('')}
            </div>
          ` : ''}
        </div>
        <button class="close-notification" style="
          background: none;
          border: none;
          color: rgba(255,255,255,0.5);
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        ">&times;</button>
      </div>
    `;

    if (onClick) {
      notification.addEventListener('click', (e) => {
        if (!e.target.classList.contains('close-notification') && !e.target.dataset.action) {
          onClick();
          this.dismiss(notification);
        }
      });
    }

    notification.querySelector('.close-notification').addEventListener('click', (e) => {
      e.stopPropagation();
      this.dismiss(notification);
    });

    actions.forEach((action, i) => {
      const btn = notification.querySelector(`[data-action="${i}"]`);
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (action.onClick) action.onClick();
          this.dismiss(notification);
        });
      }
    });

    this.container.appendChild(notification);
    this.notifications.push(notification);

    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });

    while (this.notifications.length > this.maxNotifications) {
      this.dismiss(this.notifications[0]);
    }

    if (duration > 0) {
      setTimeout(() => this.dismiss(notification), duration);
    }

    return notification;
  },

  dismiss(notification) {
    if (!notification || !notification.parentElement) return;
    
    notification.style.transform = 'translateX(120%)';
    notification.style.opacity = '0';
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.parentElement.removeChild(notification);
      }
      const index = this.notifications.indexOf(notification);
      if (index > -1) {
        this.notifications.splice(index, 1);
      }
    }, 300);
  },

  dismissAll() {
    [...this.notifications].forEach(n => this.dismiss(n));
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  success(title, message) {
    return this.show({ title, message, type: 'success' });
  },

  error(title, message) {
    return this.show({ title, message, type: 'error' });
  },

  warning(title, message) {
    return this.show({ title, message, type: 'warning' });
  },

  info(title, message) {
    return this.show({ title, message, type: 'info' });
  },

  achievement(title, message) {
    return this.show({ 
      title, 
      message, 
      type: 'achievement',
      duration: 8000
    });
  },

  friendRequest(username) {
    return this.show({
      title: 'Friend Request',
      message: `${username} sent you a friend request`,
      type: 'friend',
      icon: '👋',
      actions: [
        { label: 'Accept', primary: true, onClick: () => console.log('Accept clicked') },
        { label: 'Decline', onClick: () => console.log('Decline clicked') }
      ]
    });
  },

  newMessage(sender, preview) {
    return this.show({
      title: `Message from ${sender}`,
      message: preview,
      type: 'message',
      onClick: () => window.location.href = '/private/chat.html'
    });
  }
};

if (typeof window !== 'undefined') {
  window.OSNotifications = OSNotifications;
}
