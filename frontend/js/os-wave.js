/* Wave-Style Browser OS - Calm, Fluid, Human */

const WaveOS = {
  currentApp: null,
  windows: {},
  windowZIndex: 100,
  isInitialized: false,
  
  apps: [
    { id: 'games', name: 'Games', url: '/private/games.html' },
    { id: 'chat', name: 'Chat', url: '/private/chat.html' },
    { id: 'forums', name: 'Forums', url: '/private/forums.html' },
    { id: 'youtube', name: 'Videos', url: '/private/youtube.html' },
    { id: 'apps', name: 'Apps', url: '/private/apps.html' },
    { id: 'music', name: 'Music', url: '/private/music.html' },
    { id: 'proxy', name: 'Browse', url: '/private/proxy.html' },
    { id: 'profile', name: 'Profile', url: '/private/profile.html' },
    { id: 'settings', name: 'Settings', url: '/private/settings.html' },
    { id: 'shop', name: 'Shop', url: '/private/shop.html' }
  ],
  
  icons: {
    games: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="17" cy="10" r="1"/><circle cx="15" cy="13" r="1"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    forums: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10,8 16,12 10,16"/></svg>',
    apps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    music: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="15.5" r="3.5"/><path d="M9 17.5V5l12-2v12.5"/></svg>',
    proxy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="8" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    shop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>'
  },
  
  init() {
    if (window.self !== window.top) return;
    if (this.isInitialized) return;
    
    const layoutMode = localStorage.getItem('layoutMode') || 'classic';
    document.body.classList.add(`layout-${layoutMode}`);
    
    if (layoutMode === 'os-wave') {
      this.isInitialized = true;
      this.render();
      this.setupEventListeners();
      this.startClock();
      setTimeout(() => this.openApp('proxy'), 200);
    }
  },
  
  render() {
    const background = document.createElement('div');
    background.className = 'wave-background';
    background.id = 'waveBackground';
    
    const mainContent = document.createElement('div');
    mainContent.className = 'wave-main-content';
    mainContent.id = 'waveMainContent';
    
    const dock = document.createElement('div');
    dock.className = 'wave-dock';
    dock.id = 'waveDock';
    dock.innerHTML = this.apps.map(app => `
      <button class="wave-dock-item" data-app="${app.id}" title="${app.name}">
        <div class="wave-dock-icon">${this.icons[app.id] || this.icons.apps}</div>
        <span class="wave-dock-tooltip">${app.name}</span>
      </button>
    `).join('') + `
      <div class="wave-dock-divider"></div>
      <button class="wave-dock-item" id="waveLogoutBtn" title="Sign Out">
        <div class="wave-dock-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </div>
        <span class="wave-dock-tooltip">Sign Out</span>
      </button>
    `;
    
    const systemTray = document.createElement('div');
    systemTray.className = 'wave-system-tray';
    systemTray.id = 'waveSystemTray';
    systemTray.innerHTML = `
      <div class="wave-clock" id="waveClock">--:--</div>
    `;
    
    document.body.appendChild(background);
    document.body.appendChild(mainContent);
    document.body.appendChild(dock);
    document.body.appendChild(systemTray);
  },
  
  setupEventListeners() {
    const dock = document.getElementById('waveDock');
    if (dock) {
      dock.addEventListener('click', (e) => {
        const item = e.target.closest('.wave-dock-item');
        if (!item) return;
        
        if (item.id === 'waveLogoutBtn') {
          this.logout();
          return;
        }
        
        const appId = item.dataset.app;
        if (appId) {
          this.openApp(appId);
        }
      });
    }
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentApp) {
        const window = document.querySelector(`.wave-window[data-app="${this.currentApp}"]`);
        if (window && window.classList.contains('fullscreen')) {
          window.classList.remove('fullscreen');
        }
      }
    });
  },
  
  openApp(appId) {
    const app = this.apps.find(a => a.id === appId);
    if (!app) return;
    
    document.querySelectorAll('.wave-dock-item').forEach(item => {
      item.classList.toggle('active', item.dataset.app === appId);
    });
    
    if (this.windows[appId]) {
      this.focusWindow(appId);
      return;
    }
    
    this.createWindow(app);
    this.currentApp = appId;
  },
  
  createWindow(app) {
    const mainContent = document.getElementById('waveMainContent');
    if (!mainContent) return;
    
    const windowEl = document.createElement('div');
    windowEl.className = 'wave-window fullscreen';
    windowEl.dataset.app = app.id;
    windowEl.style.zIndex = ++this.windowZIndex;
    
    // Set default floating dimensions for when user exits fullscreen
    windowEl.style.setProperty('--float-width', '80%');
    windowEl.style.setProperty('--float-height', '80%');
    windowEl.style.setProperty('--float-top', '5%');
    windowEl.style.setProperty('--float-left', '10%');
    
    windowEl.innerHTML = `
      <div class="wave-window-titlebar">
        <div class="wave-window-title">
          ${this.icons[app.id] || ''}
          <span>${app.name}</span>
        </div>
        <div class="wave-window-controls">
          <button class="wave-window-control minimize" title="Minimize"></button>
          <button class="wave-window-control maximize" title="Fullscreen"></button>
          <button class="wave-window-control close" title="Close"></button>
        </div>
      </div>
      <div class="wave-window-content">
        <iframe src="${app.url}" title="${app.name}"></iframe>
      </div>
    `;
    
    mainContent.appendChild(windowEl);
    
    const controls = windowEl.querySelector('.wave-window-controls');
    controls.querySelector('.close').addEventListener('click', () => this.closeWindow(app.id));
    controls.querySelector('.maximize').addEventListener('click', () => {
      windowEl.classList.toggle('fullscreen');
    });
    controls.querySelector('.minimize').addEventListener('click', () => {
      windowEl.classList.remove('visible');
      setTimeout(() => {
        windowEl.style.display = 'none';
      }, 300);
    });
    
    windowEl.addEventListener('mousedown', () => this.focusWindow(app.id));
    
    this.windows[app.id] = windowEl;
    
    requestAnimationFrame(() => {
      windowEl.classList.add('visible', 'focused');
    });
  },
  
  focusWindow(appId) {
    document.querySelectorAll('.wave-window').forEach(w => {
      w.classList.remove('focused');
    });
    
    const window = this.windows[appId];
    if (window) {
      window.style.zIndex = ++this.windowZIndex;
      window.style.display = '';
      window.classList.add('visible', 'focused');
      this.currentApp = appId;
    }
  },
  
  closeWindow(appId) {
    const window = this.windows[appId];
    if (!window) return;
    
    window.classList.add('closing');
    window.classList.remove('visible');
    
    setTimeout(() => {
      window.remove();
      delete this.windows[appId];
      
      const remainingApps = Object.keys(this.windows);
      if (remainingApps.length > 0) {
        this.focusWindow(remainingApps[remainingApps.length - 1]);
      } else {
        this.currentApp = null;
      }
      
      document.querySelectorAll('.wave-dock-item').forEach(item => {
        if (item.dataset.app === appId) {
          item.classList.remove('active');
        }
      });
    }, 300);
  },
  
  startClock() {
    const updateClock = () => {
      const clock = document.getElementById('waveClock');
      if (clock) {
        const now = new Date();
        clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    };
    updateClock();
    setInterval(updateClock, 1000);
  },
  
  logout() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('authToken');
    window.location.href = '/auth';
  }
};

document.addEventListener('DOMContentLoaded', () => WaveOS.init());
