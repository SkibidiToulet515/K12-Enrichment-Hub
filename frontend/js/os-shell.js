/* NebulaCore OS Shell - Window Manager */

const OSShell = {
  windows: new Map(),
  windowZIndex: 100,
  focusedWindow: null,
  startMenuOpen: false,
  notificationsOpen: false,
  dragState: null,
  resizeState: null,
  
  apps: [
    { id: 'dashboard', name: 'Dashboard', icon: 'dashboard', color: '#00d4ff', url: '/private/dashboard.html', pinned: true },
    { id: 'games', name: 'Games', icon: 'games', color: '#ff6b6b', url: '/private/games.html', pinned: true },
    { id: 'chat', name: 'Chat', icon: 'chat', color: '#a855f7', url: '/private/chat.html', pinned: true },
    { id: 'forums', name: 'Forums', icon: 'forums', color: '#22c55e', url: '/private/forums.html', pinned: true },
    { id: 'youtube', name: 'Videos', icon: 'videos', color: '#ef4444', url: '/private/youtube.html', pinned: true },
    { id: 'apps', name: 'Apps', icon: 'apps', color: '#3b82f6', url: '/private/apps.html', pinned: true },
    { id: 'music', name: 'Music', icon: 'music', color: '#ec4899', url: '/private/music.html', pinned: false },
    { id: 'proxy', name: 'Web Proxy', icon: 'proxy', color: '#14b8a6', url: '/private/proxy.html', pinned: true },
    { id: 'profile', name: 'Profile', icon: 'profile', color: '#f59e0b', url: '/private/profile.html', pinned: false },
    { id: 'settings', name: 'Settings', icon: 'settings', color: '#6b7280', url: '/private/settings.html', pinned: false },
    { id: 'themes', name: 'Themes', icon: 'themes', color: '#8b5cf6', url: '/private/themes.html', pinned: false },
    { id: 'leaderboard', name: 'Leaderboard', icon: 'leaderboard', color: '#eab308', url: '/private/leaderboard.html', pinned: false },
    { id: 'shop', name: 'Shop', icon: 'shop', color: '#06b6d4', url: '/private/shop.html', pinned: false },
    { id: 'admin', name: 'Admin', icon: 'admin', color: '#dc2626', url: '/private/admin.html', pinned: false, adminOnly: true }
  ],
  
  icons: {
    dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>`,
    games: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="16" cy="10" r="1" fill="currentColor"/><circle cx="18" cy="12" r="1" fill="currentColor"/></svg>`,
    chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/></svg>`,
    forums: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    videos: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10 9 16 12 10 15" fill="currentColor"/></svg>`,
    apps: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    music: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="15.5" r="3.5"/><line x1="9" y1="17" x2="9" y2="4"/><line x1="22" y1="15" x2="22" y2="2"/><path d="M9 8l13-4"/></svg>`,
    proxy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    profile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    themes: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`,
    leaderboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 22V8a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v14"/><path d="M14 14h2a2 2 0 0 1 2 2v6"/><path d="M6 18a2 2 0 0 1 2-2h2v6H6z"/></svg>`,
    shop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
    admin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`
  },
  
  getIcon(iconName, color) {
    const svg = this.icons[iconName] || this.icons.apps;
    return `<div class="app-icon-wrapper" style="--icon-color: ${color}">${svg}</div>`;
  },
  
  notifications: [],
  
  init() {
    const layoutMode = localStorage.getItem('layoutMode') || 'classic';
    document.body.classList.add(`layout-${layoutMode}`);
    
    if (layoutMode === 'os') {
      this.renderOSShell();
      this.setupEventListeners();
      this.startClock();
    }
  },
  
  renderOSShell() {
    const desktop = document.createElement('div');
    desktop.className = 'os-desktop';
    desktop.id = 'osDesktop';
    desktop.innerHTML = `
      <div class="os-desktop-icons" id="osDesktopIcons"></div>
      <div class="os-widgets-container" id="osWidgets"></div>
    `;
    
    const taskbar = document.createElement('div');
    taskbar.className = 'os-taskbar';
    taskbar.id = 'osTaskbar';
    taskbar.innerHTML = `
      <div class="os-taskbar-start">
        <button class="os-start-btn" id="osStartBtn" title="Start Menu">⚡</button>
      </div>
      <div class="os-taskbar-apps" id="osTaskbarApps"></div>
      <div class="os-taskbar-system">
        <button class="os-notification-btn" id="osNotificationBtn" title="Notifications">
          🔔
          <span class="os-notification-badge" id="osNotificationBadge" style="display:none;"></span>
        </button>
        <button class="os-settings-btn" id="osSettingsBtn" title="Settings">⚙️</button>
        <div class="os-system-clock" id="osSystemClock">
          <div class="os-system-clock-time">--:--</div>
          <div class="os-system-clock-date">---</div>
        </div>
      </div>
    `;
    
    const startMenu = this.createStartMenu();
    const notificationsPanel = this.createNotificationsPanel();
    
    document.body.appendChild(desktop);
    document.body.appendChild(taskbar);
    document.body.appendChild(startMenu);
    document.body.appendChild(notificationsPanel);
    
    this.renderDesktopIcons();
    this.renderTaskbarApps();
    this.renderWidgets();
  },
  
  renderWidgets() {
    const container = document.getElementById('osWidgets');
    if (!container) return;
    
    const user = this.getCurrentUser();
    const username = user ? user.username : 'Guest';
    const now = new Date();
    const hour = now.getHours();
    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';
    
    container.innerHTML = `
      <div class="os-widget os-widget-welcome">
        <div class="widget-header">
          <span class="widget-icon">👋</span>
          <span class="widget-title">Welcome</span>
        </div>
        <div class="widget-content">
          <h2>${greeting}, ${username}!</h2>
          <p>Ready to learn something new today?</p>
        </div>
      </div>
      
      <div class="os-widget os-widget-clock">
        <div class="widget-header">
          <span class="widget-icon">🕐</span>
          <span class="widget-title">Clock</span>
        </div>
        <div class="widget-content">
          <div class="widget-time" id="widgetTime">${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
          <div class="widget-date">${now.toLocaleDateString([], {weekday: 'long', month: 'long', day: 'numeric'})}</div>
        </div>
      </div>
      
      <div class="os-widget os-widget-quick-launch">
        <div class="widget-header">
          <span class="widget-icon">⚡</span>
          <span class="widget-title">Quick Launch</span>
        </div>
        <div class="widget-content widget-quick-apps">
          <button class="widget-quick-btn" onclick="location.href='/private/games.html'" title="Games">
            ${this.getIcon('games', '#ff6b6b')}
          </button>
          <button class="widget-quick-btn" onclick="location.href='/private/chat.html'" title="Chat">
            ${this.getIcon('chat', '#a855f7')}
          </button>
          <button class="widget-quick-btn" onclick="location.href='/private/youtube.html'" title="Videos">
            ${this.getIcon('videos', '#ef4444')}
          </button>
          <button class="widget-quick-btn" onclick="location.href='/private/music.html'" title="Music">
            ${this.getIcon('music', '#ec4899')}
          </button>
        </div>
      </div>
      
      <div class="os-widget os-widget-stats">
        <div class="widget-header">
          <span class="widget-icon">📊</span>
          <span class="widget-title">Your Stats</span>
        </div>
        <div class="widget-content widget-stats-grid">
          <div class="widget-stat">
            <span class="stat-value" id="widgetXp">0</span>
            <span class="stat-label">XP</span>
          </div>
          <div class="widget-stat">
            <span class="stat-value" id="widgetLevel">1</span>
            <span class="stat-label">Level</span>
          </div>
          <div class="widget-stat">
            <span class="stat-value" id="widgetCoins">0</span>
            <span class="stat-label">Coins</span>
          </div>
        </div>
      </div>
      
      <div class="os-widget os-widget-tip">
        <div class="widget-header">
          <span class="widget-icon">💡</span>
          <span class="widget-title">Tip of the Day</span>
        </div>
        <div class="widget-content">
          <p id="widgetTip">Press the backtick key (\`) to activate stealth mode!</p>
        </div>
      </div>
    `;
    
    this.loadWidgetStats();
    this.startWidgetClock();
  },
  
  loadWidgetStats() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    fetch('/api/xp/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.xp !== undefined) {
          document.getElementById('widgetXp').textContent = data.xp.toLocaleString();
          document.getElementById('widgetLevel').textContent = data.level || 1;
        }
      })
      .catch(() => {});
    
    fetch('/api/shop/balance', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.coins !== undefined) {
          document.getElementById('widgetCoins').textContent = data.coins.toLocaleString();
        }
      })
      .catch(() => {});
  },
  
  startWidgetClock() {
    setInterval(() => {
      const timeEl = document.getElementById('widgetTime');
      if (timeEl) {
        timeEl.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      }
    }, 1000);
  },
  
  createStartMenu() {
    const menu = document.createElement('div');
    menu.className = 'os-start-menu';
    menu.id = 'osStartMenu';
    
    const user = this.getCurrentUser();
    const isAdmin = user && user.is_admin;
    
    const pinnedApps = this.apps.filter(app => app.pinned && (!app.adminOnly || isAdmin));
    const allApps = this.apps.filter(app => !app.adminOnly || isAdmin);
    
    const pinnedHtml = pinnedApps.map(app => `
      <div class="os-start-menu-app" data-app="${app.id}">
        <div class="os-start-menu-app-icon">${this.getIcon(app.icon, app.color)}</div>
        <div class="os-start-menu-app-info">
          <h4>${app.name}</h4>
        </div>
      </div>
    `).join('');
    
    const allAppsHtml = allApps.map(app => `
      <div class="os-start-menu-app" data-app="${app.id}">
        <div class="os-start-menu-app-icon">${this.getIcon(app.icon, app.color)}</div>
        <div class="os-start-menu-app-info">
          <h4>${app.name}</h4>
        </div>
      </div>
    `).join('');
    
    menu.innerHTML = `
      <div class="os-start-menu-header">
        <input type="text" class="os-start-menu-search" id="osStartSearch" placeholder="Search apps...">
      </div>
      <div class="os-start-menu-apps" id="osStartMenuApps">
        <div class="os-start-menu-section">
          <div class="os-start-menu-section-title">Pinned</div>
          ${pinnedHtml}
        </div>
        <div class="os-start-menu-section">
          <div class="os-start-menu-section-title">All Apps</div>
          ${allAppsHtml}
        </div>
      </div>
      <div class="os-start-menu-footer">
        <div class="os-start-menu-user" id="osStartMenuUser">
          <div class="os-start-menu-avatar">${user ? user.username.charAt(0).toUpperCase() : '?'}</div>
          <div class="os-start-menu-username">${user ? user.username : 'Guest'}</div>
        </div>
        <button class="os-power-btn" id="osPowerBtn" title="Sign Out">⏻</button>
      </div>
    `;
    
    return menu;
  },
  
  createNotificationsPanel() {
    const panel = document.createElement('div');
    panel.className = 'os-notifications-panel';
    panel.id = 'osNotificationsPanel';
    panel.innerHTML = `
      <div class="os-notifications-header">
        <h3>Notifications</h3>
        <button class="os-notifications-clear" id="osClearNotifications">Clear all</button>
      </div>
      <div class="os-notifications-list" id="osNotificationsList">
        <div class="os-notifications-empty">No new notifications</div>
      </div>
    `;
    return panel;
  },
  
  renderDesktopIcons() {
    const container = document.getElementById('osDesktopIcons');
    if (!container) return;
    
    const user = this.getCurrentUser();
    const isAdmin = user && user.is_admin;
    const currentPage = window.location.pathname;
    
    let visibleApps = this.apps.filter(app => !app.adminOnly || isAdmin);
    
    if (currentPage.includes('dashboard')) {
      visibleApps = visibleApps.filter(app => app.id !== 'dashboard');
    }
    
    container.innerHTML = visibleApps.map(app => `
      <div class="os-desktop-icon" data-app="${app.id}">
        <div class="os-desktop-icon-img">${this.getIcon(app.icon, app.color)}</div>
        <div class="os-desktop-icon-label">${app.name}</div>
      </div>
    `).join('');
    
    this.setupDesktopIconEvents();
  },
  
  setupDesktopIconEvents() {
    const container = document.getElementById('osDesktopIcons');
    if (!container) return;
    
    const icons = container.querySelectorAll('.os-desktop-icon');
    
    icons.forEach(icon => {
      let isDragging = false;
      let hasMoved = false;
      let startX, startY, startLeft, startTop;
      
      icon.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        
        isDragging = true;
        hasMoved = false;
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = icon.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        startLeft = rect.left - containerRect.left;
        startTop = rect.top - containerRect.top;
        
        icon.style.position = 'absolute';
        icon.style.left = startLeft + 'px';
        icon.style.top = startTop + 'px';
        icon.style.zIndex = '100';
        icon.classList.add('dragging');
        
        e.preventDefault();
      });
      
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          hasMoved = true;
        }
        
        icon.style.left = (startLeft + dx) + 'px';
        icon.style.top = (startTop + dy) + 'px';
      });
      
      document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        icon.classList.remove('dragging');
        icon.style.zIndex = '';
      });
      
      icon.addEventListener('dblclick', () => {
        const appId = icon.dataset.app;
        OSShell.openApp(appId);
      });
      
      icon.addEventListener('click', (e) => {
        if (hasMoved) {
          e.stopPropagation();
          return;
        }
      });
    });
  },
  
  renderTaskbarApps() {
    const container = document.getElementById('osTaskbarApps');
    if (!container) return;
    
    const user = this.getCurrentUser();
    const isAdmin = user && user.is_admin;
    const pinnedApps = this.apps.filter(app => app.pinned && (!app.adminOnly || isAdmin));
    
    let html = pinnedApps.map(app => `
      <button class="os-taskbar-app" data-app="${app.id}" onclick="OSShell.openApp('${app.id}')" title="${app.name}">
        ${this.getIcon(app.icon, app.color)}
      </button>
    `).join('');
    
    container.innerHTML = html;
    this.updateTaskbarApps();
  },
  
  updateTaskbarApps() {
    document.querySelectorAll('.os-taskbar-app').forEach(btn => {
      const appId = btn.dataset.app;
      btn.classList.toggle('active', this.windows.has(appId) && !this.windows.get(appId).minimized);
    });
  },
  
  setupEventListeners() {
    document.getElementById('osStartBtn')?.addEventListener('click', () => this.toggleStartMenu());
    document.getElementById('osNotificationBtn')?.addEventListener('click', () => this.toggleNotifications());
    document.getElementById('osSettingsBtn')?.addEventListener('click', () => this.openApp('settings'));
    document.getElementById('osPowerBtn')?.addEventListener('click', () => this.signOut());
    document.getElementById('osClearNotifications')?.addEventListener('click', () => this.clearNotifications());
    
    document.getElementById('osStartSearch')?.addEventListener('input', (e) => this.filterStartMenu(e.target.value));
    
    document.querySelectorAll('.os-start-menu-app').forEach(el => {
      el.addEventListener('click', () => {
        const appId = el.dataset.app;
        this.openApp(appId);
        this.closeStartMenu();
      });
    });
    
    document.addEventListener('click', (e) => {
      if (this.startMenuOpen && !e.target.closest('#osStartMenu') && !e.target.closest('#osStartBtn')) {
        this.closeStartMenu();
      }
      if (this.notificationsOpen && !e.target.closest('#osNotificationsPanel') && !e.target.closest('#osNotificationBtn')) {
        this.closeNotifications();
      }
    });
    
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', () => this.handleMouseUp());
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeStartMenu();
        this.closeNotifications();
      }
    });
  },
  
  openApp(appId) {
    const app = this.apps.find(a => a.id === appId);
    if (!app) return;
    
    if (this.windows.has(appId)) {
      const win = this.windows.get(appId);
      if (win.minimized) {
        this.restoreWindow(appId);
      } else {
        this.focusWindow(appId);
      }
      return;
    }
    
    this.createWindow(app);
  },
  
  createWindow(app) {
    const desktop = document.getElementById('osDesktop');
    if (!desktop) return;
    
    const windowEl = document.createElement('div');
    windowEl.className = 'os-window';
    windowEl.id = `osWindow-${app.id}`;
    windowEl.dataset.appId = app.id;
    
    const offsetX = 50 + (this.windows.size % 5) * 30;
    const offsetY = 50 + (this.windows.size % 5) * 30;
    const width = Math.min(1200, window.innerWidth - 100);
    const height = Math.min(700, window.innerHeight - 150);
    
    windowEl.style.cssText = `
      left: ${offsetX}px;
      top: ${offsetY}px;
      width: ${width}px;
      height: ${height}px;
    `;
    
    windowEl.innerHTML = `
      <div class="os-window-header" data-window="${app.id}">
        <span class="os-window-icon">${this.getIcon(app.icon, app.color)}</span>
        <span class="os-window-title">${app.name}</span>
        <div class="os-window-controls">
          <button class="os-window-btn minimize" onclick="OSShell.minimizeWindow('${app.id}')" title="Minimize">−</button>
          <button class="os-window-btn maximize" onclick="OSShell.toggleMaximize('${app.id}')" title="Maximize">□</button>
          <button class="os-window-btn close" onclick="OSShell.closeWindow('${app.id}')" title="Close">×</button>
        </div>
      </div>
      <div class="os-window-content">
        <iframe src="${app.url}" title="${app.name}"></iframe>
      </div>
      <div class="os-window-resize n"></div>
      <div class="os-window-resize s"></div>
      <div class="os-window-resize e"></div>
      <div class="os-window-resize w"></div>
      <div class="os-window-resize ne"></div>
      <div class="os-window-resize nw"></div>
      <div class="os-window-resize se"></div>
      <div class="os-window-resize sw"></div>
    `;
    
    desktop.appendChild(windowEl);
    
    this.windows.set(app.id, {
      element: windowEl,
      app: app,
      minimized: false,
      maximized: false,
      prevState: null
    });
    
    this.setupWindowEvents(windowEl, app.id);
    
    requestAnimationFrame(() => {
      windowEl.classList.add('visible');
      this.focusWindow(app.id);
    });
    
    this.updateTaskbarApps();
  },
  
  setupWindowEvents(windowEl, appId) {
    const header = windowEl.querySelector('.os-window-header');
    
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.os-window-controls')) return;
      
      const win = this.windows.get(appId);
      if (win.maximized) return;
      
      this.dragState = {
        appId,
        startX: e.clientX,
        startY: e.clientY,
        startLeft: windowEl.offsetLeft,
        startTop: windowEl.offsetTop
      };
      
      this.focusWindow(appId);
    });
    
    header.addEventListener('dblclick', (e) => {
      if (!e.target.closest('.os-window-controls')) {
        this.toggleMaximize(appId);
      }
    });
    
    windowEl.querySelectorAll('.os-window-resize').forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const win = this.windows.get(appId);
        if (win.maximized) return;
        
        const direction = Array.from(handle.classList).find(c => c !== 'os-window-resize');
        
        this.resizeState = {
          appId,
          direction,
          startX: e.clientX,
          startY: e.clientY,
          startWidth: windowEl.offsetWidth,
          startHeight: windowEl.offsetHeight,
          startLeft: windowEl.offsetLeft,
          startTop: windowEl.offsetTop
        };
        
        this.focusWindow(appId);
      });
    });
    
    windowEl.addEventListener('mousedown', () => this.focusWindow(appId));
  },
  
  handleMouseMove(e) {
    if (this.dragState) {
      const { appId, startX, startY, startLeft, startTop } = this.dragState;
      const win = this.windows.get(appId);
      if (!win) return;
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      win.element.style.left = `${startLeft + dx}px`;
      win.element.style.top = `${Math.max(0, startTop + dy)}px`;
    }
    
    if (this.resizeState) {
      const { appId, direction, startX, startY, startWidth, startHeight, startLeft, startTop } = this.resizeState;
      const win = this.windows.get(appId);
      if (!win) return;
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const minWidth = 400;
      const minHeight = 300;
      
      if (direction.includes('e')) {
        win.element.style.width = `${Math.max(minWidth, startWidth + dx)}px`;
      }
      if (direction.includes('w')) {
        const newWidth = Math.max(minWidth, startWidth - dx);
        if (newWidth > minWidth || dx < 0) {
          win.element.style.width = `${newWidth}px`;
          win.element.style.left = `${startLeft + (startWidth - newWidth)}px`;
        }
      }
      if (direction.includes('s')) {
        win.element.style.height = `${Math.max(minHeight, startHeight + dy)}px`;
      }
      if (direction.includes('n')) {
        const newHeight = Math.max(minHeight, startHeight - dy);
        if (newHeight > minHeight || dy < 0) {
          win.element.style.height = `${newHeight}px`;
          win.element.style.top = `${Math.max(0, startTop + (startHeight - newHeight))}px`;
        }
      }
    }
  },
  
  handleMouseUp() {
    this.dragState = null;
    this.resizeState = null;
  },
  
  focusWindow(appId) {
    this.windows.forEach((win, id) => {
      win.element.classList.toggle('focused', id === appId);
      if (id === appId) {
        win.element.style.zIndex = ++this.windowZIndex;
      }
    });
    this.focusedWindow = appId;
  },
  
  minimizeWindow(appId) {
    const win = this.windows.get(appId);
    if (!win) return;
    
    win.minimized = true;
    win.element.classList.add('minimized');
    this.updateTaskbarApps();
  },
  
  restoreWindow(appId) {
    const win = this.windows.get(appId);
    if (!win) return;
    
    win.minimized = false;
    win.element.classList.remove('minimized');
    this.focusWindow(appId);
    this.updateTaskbarApps();
  },
  
  toggleMaximize(appId) {
    const win = this.windows.get(appId);
    if (!win) return;
    
    if (win.maximized) {
      if (win.prevState) {
        win.element.style.left = win.prevState.left;
        win.element.style.top = win.prevState.top;
        win.element.style.width = win.prevState.width;
        win.element.style.height = win.prevState.height;
      }
      win.maximized = false;
      win.element.classList.remove('maximized');
    } else {
      win.prevState = {
        left: win.element.style.left,
        top: win.element.style.top,
        width: win.element.style.width,
        height: win.element.style.height
      };
      win.maximized = true;
      win.element.classList.add('maximized');
    }
  },
  
  closeWindow(appId) {
    const win = this.windows.get(appId);
    if (!win) return;
    
    win.element.classList.remove('visible');
    setTimeout(() => {
      win.element.remove();
      this.windows.delete(appId);
      this.updateTaskbarApps();
    }, 200);
  },
  
  toggleStartMenu() {
    if (this.startMenuOpen) {
      this.closeStartMenu();
    } else {
      this.closeNotifications();
      document.getElementById('osStartMenu')?.classList.add('active');
      this.startMenuOpen = true;
      document.getElementById('osStartSearch')?.focus();
    }
  },
  
  closeStartMenu() {
    document.getElementById('osStartMenu')?.classList.remove('active');
    this.startMenuOpen = false;
  },
  
  toggleNotifications() {
    if (this.notificationsOpen) {
      this.closeNotifications();
    } else {
      this.closeStartMenu();
      document.getElementById('osNotificationsPanel')?.classList.add('active');
      this.notificationsOpen = true;
    }
  },
  
  closeNotifications() {
    document.getElementById('osNotificationsPanel')?.classList.remove('active');
    this.notificationsOpen = false;
  },
  
  filterStartMenu(query) {
    const apps = document.querySelectorAll('.os-start-menu-app');
    const lowerQuery = query.toLowerCase();
    
    apps.forEach(el => {
      const name = el.querySelector('h4')?.textContent.toLowerCase() || '';
      el.style.display = name.includes(lowerQuery) ? 'flex' : 'none';
    });
  },
  
  addNotification(title, body, icon = '🔔') {
    const notification = {
      id: Date.now(),
      title,
      body,
      icon,
      time: new Date()
    };
    
    this.notifications.unshift(notification);
    this.renderNotifications();
    this.showNotificationBadge();
    this.showToastNotification(notification);
  },
  
  renderNotifications() {
    const list = document.getElementById('osNotificationsList');
    if (!list) return;
    
    if (this.notifications.length === 0) {
      list.innerHTML = '<div class="os-notifications-empty">No new notifications</div>';
      return;
    }
    
    list.innerHTML = this.notifications.map(n => `
      <div class="os-notification-item" data-id="${n.id}">
        <div class="os-notification-item-header">
          <span class="os-notification-item-icon">${n.icon}</span>
          <span class="os-notification-item-title">${n.title}</span>
          <span class="os-notification-item-time">${this.formatTime(n.time)}</span>
        </div>
        <div class="os-notification-item-body">${n.body}</div>
      </div>
    `).join('');
  },
  
  showNotificationBadge() {
    const badge = document.getElementById('osNotificationBadge');
    if (badge) badge.style.display = this.notifications.length > 0 ? 'block' : 'none';
  },
  
  showToastNotification(notification) {
    const toast = document.createElement('div');
    toast.className = 'os-toast-notification';
    toast.innerHTML = `
      <span class="os-toast-icon">${notification.icon}</span>
      <div class="os-toast-content">
        <div class="os-toast-title">${notification.title}</div>
        <div class="os-toast-body">${notification.body}</div>
      </div>
    `;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(30, 30, 40, 0.98);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 15px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      max-width: 350px;
      z-index: 99999;
      animation: slideInRight 0.3s ease-out;
      cursor: pointer;
    `;
    
    document.body.appendChild(toast);
    
    toast.addEventListener('click', () => toast.remove());
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  },
  
  clearNotifications() {
    this.notifications = [];
    this.renderNotifications();
    this.showNotificationBadge();
  },
  
  startClock() {
    const updateClock = () => {
      const clock = document.getElementById('osSystemClock');
      if (!clock) return;
      
      const now = new Date();
      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const date = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
      
      clock.innerHTML = `
        <div class="os-system-clock-time">${time}</div>
        <div class="os-system-clock-date">${date}</div>
      `;
    };
    
    updateClock();
    setInterval(updateClock, 1000);
  },
  
  formatTime(date) {
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  },
  
  getCurrentUser() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch {
      return null;
    }
  },
  
  signOut() {
    localStorage.removeItem('authToken');
    window.location.href = '/login.html';
  },
  
  setLayoutMode(mode) {
    document.body.classList.remove('layout-classic', 'layout-os');
    document.body.classList.add(`layout-${mode}`);
    localStorage.setItem('layoutMode', mode);
    
    if (mode === 'os') {
      if (!document.getElementById('osDesktop')) {
        this.renderOSShell();
        this.setupEventListeners();
        this.startClock();
      }
    }
  }
};

const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(100px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideOutRight {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(100px); }
  }
  .os-toast-icon { font-size: 24px; }
  .os-toast-title { font-weight: 600; font-size: 13px; color: var(--text); margin-bottom: 4px; }
  .os-toast-body { font-size: 12px; color: var(--text-secondary); }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => OSShell.init());

window.OSShell = OSShell;
