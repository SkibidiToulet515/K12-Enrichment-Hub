const QuickSwitcher = {
  isOpen: false,
  results: [],
  selectedIndex: 0,
  
  init() {
    this.createUI();
    this.setupKeyboardShortcuts();
  },
  
  createUI() {
    const style = document.createElement('style');
    style.textContent = `
      #quickSwitcher {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        z-index: 100000;
        display: none;
        align-items: flex-start;
        justify-content: center;
        padding-top: 15vh;
      }
      #quickSwitcher.active { display: flex; }
      .qs-container {
        background: var(--card, #1e1e2e);
        border-radius: 12px;
        width: 90%;
        max-width: 600px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        overflow: hidden;
      }
      .qs-input-wrap {
        padding: 16px;
        border-bottom: 1px solid var(--accent, #45475a);
      }
      .qs-input {
        width: 100%;
        padding: 12px 16px;
        background: var(--bg, #11111b);
        border: 2px solid var(--accent, #45475a);
        border-radius: 8px;
        color: var(--text, #cdd6f4);
        font-size: 16px;
        outline: none;
      }
      .qs-input:focus {
        border-color: var(--primary, #89b4fa);
      }
      .qs-input::placeholder {
        color: var(--text-light, #6c7086);
      }
      .qs-results {
        max-height: 400px;
        overflow-y: auto;
      }
      .qs-section {
        padding: 8px 16px;
      }
      .qs-section-title {
        font-size: 11px;
        font-weight: 600;
        color: var(--text-light, #6c7086);
        text-transform: uppercase;
        margin-bottom: 8px;
      }
      .qs-item {
        display: flex;
        align-items: center;
        padding: 10px 12px;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.1s;
        gap: 12px;
      }
      .qs-item:hover, .qs-item.selected {
        background: var(--primary, #89b4fa);
        color: var(--bg, #11111b);
      }
      .qs-item-icon {
        font-size: 20px;
        width: 32px;
        text-align: center;
      }
      .qs-item-info {
        flex: 1;
      }
      .qs-item-name {
        font-weight: 500;
        font-size: 14px;
      }
      .qs-item-desc {
        font-size: 12px;
        opacity: 0.7;
      }
      .qs-item-badge {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 10px;
        background: var(--accent, #45475a);
      }
      .qs-empty {
        padding: 40px;
        text-align: center;
        color: var(--text-light, #6c7086);
      }
      .qs-hint {
        padding: 12px 16px;
        background: var(--bg, #11111b);
        font-size: 12px;
        color: var(--text-light, #6c7086);
        display: flex;
        gap: 20px;
      }
      .qs-hint kbd {
        background: var(--accent, #45475a);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: monospace;
      }
    `;
    document.head.appendChild(style);
    
    const overlay = document.createElement('div');
    overlay.id = 'quickSwitcher';
    overlay.innerHTML = `
      <div class="qs-container">
        <div class="qs-input-wrap">
          <input type="text" class="qs-input" placeholder="Search users, servers, games, pages..." autofocus>
        </div>
        <div class="qs-results"></div>
        <div class="qs-hint">
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>Enter</kbd> Select</span>
          <span><kbd>Esc</kbd> Close</span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    
    const input = overlay.querySelector('.qs-input');
    input.addEventListener('input', (e) => this.search(e.target.value));
    input.addEventListener('keydown', (e) => this.handleKeydown(e));
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });
  },
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.toggle();
      }
      if (e.key === '/' && !e.target.matches('input, textarea, [contenteditable]')) {
        e.preventDefault();
        this.open();
      }
    });
  },
  
  toggle() {
    this.isOpen ? this.close() : this.open();
  },
  
  open() {
    this.isOpen = true;
    const overlay = document.getElementById('quickSwitcher');
    overlay.classList.add('active');
    const input = overlay.querySelector('.qs-input');
    input.value = '';
    input.focus();
    this.search('');
  },
  
  close() {
    this.isOpen = false;
    document.getElementById('quickSwitcher').classList.remove('active');
  },
  
  async search(query) {
    const results = [];
    const q = query.toLowerCase().trim();
    
    const pages = [
      { name: 'Dashboard', icon: '🏠', desc: 'Home page', url: '/private/dashboard.html', type: 'page' },
      { name: 'Games', icon: '🎮', desc: 'Play games', url: '/private/games.html', type: 'page' },
      { name: 'Chat', icon: '💬', desc: 'Chat & servers', url: '/private/chat.html', type: 'page' },
      { name: 'Profile', icon: '👤', desc: 'Your profile', url: '/private/profile.html', type: 'page' },
      { name: 'Shop', icon: '🛒', desc: 'Cosmetic shop', url: '/private/shop.html', type: 'page' },
      { name: 'Shortcuts', icon: '⌨️', desc: 'Keyboard shortcuts', url: '/private/shortcuts.html', type: 'page' },
      { name: 'Movies', icon: '🎬', desc: 'Educational media', url: '/private/movies.html', type: 'page' },
      { name: 'Proxy', icon: '🌐', desc: 'Proxy tools', url: '/private/proxy.html', type: 'page' }
    ];
    
    const commands = [
      { name: 'Panic Mode', icon: '🛡️', desc: 'Activate stealth mode', action: () => StealthMode.activate(), type: 'command' },
      { name: 'Toggle Theme', icon: '🎨', desc: 'Switch dark/light mode', action: () => this.toggleTheme(), type: 'command' },
      { name: 'Logout', icon: '🚪', desc: 'Sign out of your account', action: () => { localStorage.clear(); location.href = '/auth'; }, type: 'command' },
      { name: 'Clear Cache', icon: '🗑️', desc: 'Clear local storage', action: () => { if(confirm('Clear all cached data?')) localStorage.clear(); }, type: 'command' }
    ];
    
    if (q === '') {
      results.push(...pages.slice(0, 4));
      results.push(...commands.slice(0, 2));
    } else {
      const matchPages = pages.filter(p => 
        p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)
      );
      const matchCommands = commands.filter(c => 
        c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)
      );
      results.push(...matchPages, ...matchCommands);
      
      if (q.length >= 2) {
        try {
          const token = localStorage.getItem('authToken') || localStorage.getItem('userToken');
          
          const [usersRes, serversRes] = await Promise.all([
            fetch(`/api/users/search-all?q=${encodeURIComponent(q)}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => ({ ok: false })),
            fetch('/api/servers', {
              headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => ({ ok: false }))
          ]);
          
          if (usersRes.ok) {
            const users = await usersRes.json();
            results.push(...(users || []).slice(0, 5).map(u => ({
              name: u.username,
              icon: '👤',
              desc: u.is_online ? 'Online' : 'Offline',
              type: 'user',
              action: () => this.openUserProfile(u.id)
            })));
          }
          
          if (serversRes.ok) {
            const servers = await serversRes.json();
            const matchServers = (servers || []).filter(s => 
              s.name.toLowerCase().includes(q)
            ).slice(0, 5);
            results.push(...matchServers.map(s => ({
              name: s.name,
              icon: '📡',
              desc: `${s.member_count || 0} members`,
              type: 'server',
              action: () => this.openServer(s.id)
            })));
          }
        } catch (e) {
          console.log('Search API error:', e);
        }
      }
    }
    
    this.results = results;
    this.selectedIndex = 0;
    this.renderResults();
  },
  
  renderResults() {
    const container = document.querySelector('.qs-results');
    
    if (this.results.length === 0) {
      container.innerHTML = '<div class="qs-empty">No results found</div>';
      return;
    }
    
    const grouped = {};
    this.results.forEach((r, i) => {
      const type = r.type || 'other';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push({ ...r, index: i });
    });
    
    const typeLabels = {
      page: 'Pages',
      command: 'Commands',
      user: 'Users',
      server: 'Servers',
      game: 'Games'
    };
    
    container.innerHTML = Object.entries(grouped).map(([type, items]) => `
      <div class="qs-section">
        <div class="qs-section-title">${typeLabels[type] || type}</div>
        ${items.map(item => `
          <div class="qs-item ${item.index === this.selectedIndex ? 'selected' : ''}" data-index="${item.index}">
            <span class="qs-item-icon">${item.icon}</span>
            <div class="qs-item-info">
              <div class="qs-item-name">${item.name}</div>
              <div class="qs-item-desc">${item.desc || ''}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `).join('');
    
    container.querySelectorAll('.qs-item').forEach(el => {
      el.addEventListener('click', () => {
        this.selectedIndex = parseInt(el.dataset.index);
        this.execute();
      });
    });
  },
  
  handleKeydown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, this.results.length - 1);
      this.renderResults();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.renderResults();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.execute();
    } else if (e.key === 'Escape') {
      this.close();
    }
  },
  
  execute() {
    const item = this.results[this.selectedIndex];
    if (!item) return;
    
    this.close();
    
    if (item.url) {
      window.location.href = item.url;
    } else if (item.action) {
      item.action();
    }
  },
  
  toggleTheme() {
    const current = localStorage.getItem('selectedTheme') || 'ocean';
    const themes = ['ocean', 'arcade', 'candy', 'eclipse', 'matrix'];
    const next = themes[(themes.indexOf(current) + 1) % themes.length];
    localStorage.setItem('selectedTheme', next);
    if (window.applyTheme) window.applyTheme(next);
  },
  
  openUserProfile(userId) {
    if (window.viewUserProfile) {
      window.viewUserProfile(userId);
    } else {
      window.location.href = `/private/chat.html?viewUser=${userId}`;
    }
  },
  
  openServer(serverId) {
    window.location.href = `/private/chat.html?server=${serverId}`;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('/private/')) {
    QuickSwitcher.init();
  }
});
