/* NebulaCore OS Shell - Sidebar Mode with Animations */

const OSShell = {
  currentApp: null,
  isTransitioning: false,
  
  apps: [
    { id: 'games', name: 'Games', icon: 'games', color: '#ff6b6b', url: '/private/games.html' },
    { id: 'chat', name: 'Chat', icon: 'chat', color: '#a855f7', url: '/private/chat.html' },
    { id: 'forums', name: 'Forums', icon: 'forums', color: '#22c55e', url: '/private/forums.html' },
    { id: 'youtube', name: 'Videos', icon: 'videos', color: '#ef4444', url: '/private/youtube.html' },
    { id: 'apps', name: 'Apps', icon: 'apps', color: '#3b82f6', url: '/private/apps.html' },
    { id: 'music', name: 'Music', icon: 'music', color: '#ec4899', url: '/private/music.html' },
    { id: 'proxy', name: 'Web Proxy', icon: 'proxy', color: '#14b8a6', url: '/private/proxy.html' },
    { id: 'profile', name: 'Profile', icon: 'profile', color: '#f59e0b', url: '/private/profile.html' },
    { id: 'settings', name: 'Settings', icon: 'settings', color: '#6b7280', url: '/private/settings.html' },
    { id: 'themes', name: 'Themes', icon: 'themes', color: '#8b5cf6', url: '/private/theme-creator.html' },
    { id: 'leaderboard', name: 'Stats', icon: 'leaderboard', color: '#eab308', url: '/private/stats.html' },
    { id: 'shop', name: 'Shop', icon: 'shop', color: '#06b6d4', url: '/private/shop.html' },
    { id: 'admin', name: 'Admin', icon: 'admin', color: '#dc2626', url: '/private/admin.html', adminOnly: true }
  ],
  
  icons: {
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
  
  init() {
    if (window.self !== window.top) {
      return;
    }
    
    const layoutMode = localStorage.getItem('layoutMode') || 'classic';
    document.body.classList.add(`layout-${layoutMode}`);
    
    if (layoutMode === 'os') {
      this.renderOSShell();
      this.setupEventListeners();
      setTimeout(() => this.openApp('proxy', false), 100);
    }
  },
  
  renderOSShell() {
    const sidebar = document.createElement('div');
    sidebar.className = 'os-sidebar';
    sidebar.id = 'osSidebar';
    
    const user = this.getCurrentUser();
    const isAdmin = user && user.is_admin;
    
    const appsList = this.apps.filter(app => !app.adminOnly || isAdmin);
    
    const appsHtml = appsList.map(app => `
      <button class="os-sidebar-app" data-app="${app.id}" title="${app.name}">
        ${this.getIcon(app.icon, app.color)}
        <span class="os-sidebar-app-label">${app.name}</span>
      </button>
    `).join('');
    
    sidebar.innerHTML = `
      <div class="os-sidebar-header">
        <div class="os-sidebar-logo">NC</div>
        <span class="os-sidebar-title">NebulaCore</span>
      </div>
      <div class="os-sidebar-apps">
        ${appsHtml}
      </div>
      <div class="os-sidebar-footer">
        <button class="os-sidebar-app os-sidebar-logout" title="Sign Out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="logout-icon">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span class="os-sidebar-app-label">Sign Out</span>
        </button>
      </div>
    `;
    
    const hoverZone = document.createElement('div');
    hoverZone.className = 'os-sidebar-hover-zone';
    hoverZone.id = 'osSidebarHoverZone';
    
    const mainContent = document.createElement('div');
    mainContent.className = 'os-main-content';
    mainContent.id = 'osMainContent';
    mainContent.innerHTML = `
      <div class="os-page-container" id="osPageContainer">
        <iframe class="os-page active" id="osMainFrame" src="about:blank"></iframe>
      </div>
      <div class="os-loading-overlay" id="osLoadingOverlay">
        <div class="os-loading-spinner"></div>
      </div>
    `;
    
    document.body.appendChild(hoverZone);
    document.body.appendChild(sidebar);
    document.body.appendChild(mainContent);
  },
  
  setupEventListeners() {
    const sidebar = document.getElementById('osSidebar');
    const hoverZone = document.getElementById('osSidebarHoverZone');
    
    hoverZone.addEventListener('mouseenter', () => {
      sidebar.classList.add('visible');
    });
    
    sidebar.addEventListener('mouseenter', () => {
      sidebar.classList.add('visible');
    });
    
    sidebar.addEventListener('mouseleave', () => {
      sidebar.classList.remove('visible');
    });
    
    document.querySelectorAll('.os-sidebar-app').forEach(btn => {
      btn.addEventListener('click', () => {
        const appId = btn.dataset.app;
        if (appId) {
          this.openApp(appId, true);
        }
      });
    });
    
    document.querySelector('.os-sidebar-logout')?.addEventListener('click', () => {
      this.signOut();
    });
    
    const frame = document.getElementById('osMainFrame');
    if (frame) {
      frame.addEventListener('load', () => {
        this.hideLoading();
      });
    }
  },
  
  openApp(appId, animate = true) {
    if (this.isTransitioning || appId === this.currentApp) {
      document.getElementById('osSidebar')?.classList.remove('visible');
      return;
    }
    
    const app = this.apps.find(a => a.id === appId);
    if (!app) return;
    
    this.isTransitioning = true;
    const container = document.getElementById('osPageContainer');
    const currentFrame = document.getElementById('osMainFrame');
    
    if (animate && this.currentApp) {
      this.showLoading();
      
      currentFrame.classList.add('slide-out');
      
      setTimeout(() => {
        currentFrame.classList.remove('slide-out', 'active');
        currentFrame.src = app.url;
        currentFrame.classList.add('slide-in');
        
        setTimeout(() => {
          currentFrame.classList.remove('slide-in');
          currentFrame.classList.add('active');
          this.isTransitioning = false;
        }, 300);
      }, 200);
    } else {
      this.showLoading();
      currentFrame.src = app.url;
      currentFrame.classList.add('active');
      this.isTransitioning = false;
    }
    
    this.currentApp = appId;
    this.updateActiveApp();
    document.getElementById('osSidebar')?.classList.remove('visible');
  },
  
  updateActiveApp() {
    document.querySelectorAll('.os-sidebar-app').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.app === this.currentApp);
    });
  },
  
  showLoading() {
    document.getElementById('osLoadingOverlay')?.classList.add('visible');
  },
  
  hideLoading() {
    setTimeout(() => {
      document.getElementById('osLoadingOverlay')?.classList.remove('visible');
    }, 100);
  },
  
  getCurrentUser() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch {
      return null;
    }
  },
  
  signOut() {
    const mainContent = document.getElementById('osMainContent');
    if (mainContent) {
      mainContent.classList.add('fade-out');
    }
    
    setTimeout(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      window.location.href = '/login.html';
    }, 300);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  OSShell.init();
});
