/* Wave OS - Calm, Fluid, Premium macOS-inspired Design */

const WaveOS = {
  currentApp: null,
  windows: {},
  windowZIndex: 100,
  isInitialized: false,
  
  apps: [
    { id: 'games', name: 'Games', url: '/private/games.html' },
    { id: 'chat', name: 'Chat', url: '/private/chat.html' },
    { id: 'proxy', name: 'Browse', url: '/private/proxy.html' },
    { id: 'apps', name: 'Apps', url: '/private/apps.html' },
    { id: 'youtube', name: 'Videos', url: '/private/youtube.html' },
    { id: 'music', name: 'Music', url: '/private/music.html' },
    { id: 'forums', name: 'Forums', url: '/private/forums.html' },
    { id: 'shop', name: 'Shop', url: '/private/shop.html' },
    { id: 'settings', name: 'Settings', url: '/private/settings.html' },
    { id: 'profile', name: 'Profile', url: '/private/profile.html' },
    { id: 'admin', name: 'Admin', url: '/admin' }
  ],
  
  icons: {
    games: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="17" cy="10" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1.5" fill="currentColor" stroke="none"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    forums: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/></svg>',
    apps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    music: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="15.5" r="3.5"/><path d="M9 17.5V5l12-2v12.5"/></svg>',
    proxy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="8" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    shop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>'
  },
  
  init() {
    if (window.self !== window.top) return;
    if (this.isInitialized) return;
    
    const layoutMode = localStorage.getItem('layoutMode') || 'classic';
    document.body.classList.remove('layout-classic', 'layout-os', 'layout-os-wave');
    document.body.classList.add(`layout-${layoutMode}`);
    
    if (layoutMode === 'os-wave') {
      this.isInitialized = true;
      this.render();
      this.setupEventListeners();
      this.startClock();
      setTimeout(() => this.openApp('games'), 300);
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
    
    const googleSlides = document.createElement('div');
    googleSlides.id = 'waveGoogleSlides';
    googleSlides.className = 'wave-google-slides';
    googleSlides.title = 'Open Google Slides';
    googleSlides.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
        <path d="M7 12h10v2H7zm0-4h10v2H7z"/>
      </svg>
    `;
    googleSlides.onclick = () => window.open('https://docs.google.com/document/d/1lkOFIi2Dv_fsQayAbvd87dKXL-MyPUBJt6BWs7f7K_4/edit?usp=sharing', '_blank');
    
    const slidesStyle = document.createElement('style');
    slidesStyle.textContent = `
      .wave-google-slides {
        position: fixed;
        bottom: 100px;
        right: 20px;
        width: 44px;
        height: 44px;
        background: linear-gradient(135deg, #FBBC04 0%, #F9AB00 100%);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(251, 188, 4, 0.4);
        transition: transform 0.2s, box-shadow 0.2s;
        z-index: 9998;
      }
      .wave-google-slides:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(251, 188, 4, 0.6);
      }
    `;
    
    document.body.appendChild(background);
    document.body.appendChild(mainContent);
    document.body.appendChild(dock);
    document.body.appendChild(systemTray);
    document.body.appendChild(googleSlides);
    document.head.appendChild(slidesStyle);
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
        const win = document.querySelector(`.wave-window[data-app="${this.currentApp}"]`);
        if (win && win.classList.contains('fullscreen')) {
          win.classList.remove('fullscreen');
        }
      }
    });
  },
  
  openApp(appId) {
    const app = this.apps.find(a => a.id === appId);
    if (!app) return;
    
    // Update dock active states
    document.querySelectorAll('.wave-dock-item').forEach(item => {
      item.classList.toggle('active', item.dataset.app === appId);
    });
    
    // Check if window already exists (might be minimized)
    let existingWindow = document.querySelector(`.wave-window[data-app="${appId}"]`);
    if (existingWindow) {
      existingWindow.style.display = '';
      existingWindow.style.zIndex = ++this.windowZIndex;
      existingWindow.classList.remove('minimized');
      this.currentApp = appId;
      return;
    }
    
    // Close other windows
    document.querySelectorAll('.wave-window').forEach(win => {
      win.classList.add('closing');
      setTimeout(() => win.remove(), 250);
    });
    
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
    
    windowEl.innerHTML = `
      <div class="wave-window-titlebar">
        <div class="wave-window-controls">
          <button class="wave-window-btn close" title="Close">
            <svg viewBox="0 0 12 12"><path d="M3.5 3.5l5 5m0-5l-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
          <button class="wave-window-btn minimize" title="Minimize">
            <svg viewBox="0 0 12 12"><path d="M2 6h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
          <button class="wave-window-btn fullscreen-btn" title="Fullscreen">
            <svg viewBox="0 0 12 12"><path d="M2 4V2h2M8 2h2v2M2 8v2h2M8 10h2V8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
          </button>
        </div>
        <div class="wave-window-title">
          <div class="wave-window-title-icon">${this.icons[app.id] || ''}</div>
          <span class="wave-window-title-text">${app.name}</span>
        </div>
        <div style="width: 60px;"></div>
      </div>
      <div class="wave-window-content">
        <div class="wave-loading visible" id="waveLoading-${app.id}">
          <div class="wave-loading-spinner"></div>
          <div class="wave-loading-text">Loading ${app.name}...</div>
        </div>
        <iframe src="${app.url}" id="waveFrame-${app.id}"></iframe>
      </div>
    `;
    
    mainContent.appendChild(windowEl);
    
    // Setup window controls
    const closeBtn = windowEl.querySelector('.wave-window-btn.close');
    const minimizeBtn = windowEl.querySelector('.wave-window-btn.minimize');
    const fullscreenBtn = windowEl.querySelector('.wave-window-btn.fullscreen-btn');
    
    closeBtn.addEventListener('click', () => this.closeWindow(app.id));
    minimizeBtn.addEventListener('click', () => this.minimizeWindow(app.id));
    fullscreenBtn.addEventListener('click', () => this.toggleFullscreen(app.id));
    
    // Hide loading when iframe loads
    const iframe = windowEl.querySelector('iframe');
    const loading = windowEl.querySelector('.wave-loading');
    
    iframe.addEventListener('load', () => {
      setTimeout(() => {
        loading.classList.remove('visible');
      }, 300);
    });
    
    this.windows[app.id] = windowEl;
  },
  
  closeWindow(appId) {
    const win = document.querySelector(`.wave-window[data-app="${appId}"]`);
    if (win) {
      win.classList.add('closing');
      setTimeout(() => {
        win.remove();
        delete this.windows[appId];
      }, 250);
    }
    
    // Deactivate dock item
    const dockItem = document.querySelector(`.wave-dock-item[data-app="${appId}"]`);
    if (dockItem) {
      dockItem.classList.remove('active');
    }
    
    if (this.currentApp === appId) {
      this.currentApp = null;
    }
  },
  
  minimizeWindow(appId) {
    const win = document.querySelector(`.wave-window[data-app="${appId}"]`);
    if (win) {
      win.classList.add('minimized');
      setTimeout(() => {
        win.style.display = 'none';
      }, 300);
    }
    this.currentApp = null;
  },
  
  toggleFullscreen(appId) {
    const win = document.querySelector(`.wave-window[data-app="${appId}"]`);
    if (win) {
      win.classList.toggle('fullscreen');
    }
  },
  
  startClock() {
    const updateClock = () => {
      const clock = document.getElementById('waveClock');
      if (clock) {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const h = hours % 12 || 12;
        clock.textContent = `${h}:${minutes} ${ampm}`;
      }
    };
    updateClock();
    setInterval(updateClock, 1000);
  },
  
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('user');
    window.location.href = '/auth';
  }
};

document.addEventListener('DOMContentLoaded', () => WaveOS.init());
