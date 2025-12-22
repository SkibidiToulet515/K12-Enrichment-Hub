const SpotlightSearch = {
  isOpen: false,
  recentSearches: [],
  searchTimeout: null,
  
  init() {
    this.createModal();
    this.setupKeyboardShortcuts();
    this.loadRecentSearches();
  },
  
  createModal() {
    if (document.getElementById('spotlight-search-modal')) return;
    
    const modal = document.createElement('div');
    modal.id = 'spotlight-search-modal';
    modal.className = 'spotlight-modal';
    modal.innerHTML = `
      <div class="spotlight-backdrop"></div>
      <div class="spotlight-container">
        <div class="spotlight-search-box">
          <svg class="spotlight-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input type="text" id="spotlight-input" placeholder="Search games, users, forums, tasks, messages..." autocomplete="off">
          <kbd class="spotlight-kbd">ESC</kbd>
        </div>
        <div class="spotlight-results" id="spotlight-results">
          <div class="spotlight-section spotlight-recent" id="spotlight-recent">
            <div class="spotlight-section-title">Recent Searches</div>
            <div class="spotlight-section-items" id="spotlight-recent-items"></div>
          </div>
          <div class="spotlight-section" id="spotlight-games" style="display:none">
            <div class="spotlight-section-title"><span class="section-icon">🎮</span> Games</div>
            <div class="spotlight-section-items" id="spotlight-games-items"></div>
          </div>
          <div class="spotlight-section" id="spotlight-users" style="display:none">
            <div class="spotlight-section-title"><span class="section-icon">👤</span> Users</div>
            <div class="spotlight-section-items" id="spotlight-users-items"></div>
          </div>
          <div class="spotlight-section" id="spotlight-forums" style="display:none">
            <div class="spotlight-section-title"><span class="section-icon">💬</span> Forums</div>
            <div class="spotlight-section-items" id="spotlight-forums-items"></div>
          </div>
          <div class="spotlight-section" id="spotlight-tasks" style="display:none">
            <div class="spotlight-section-title"><span class="section-icon">✓</span> Tasks</div>
            <div class="spotlight-section-items" id="spotlight-tasks-items"></div>
          </div>
          <div class="spotlight-section" id="spotlight-messages" style="display:none">
            <div class="spotlight-section-title"><span class="section-icon">✉️</span> Messages</div>
            <div class="spotlight-section-items" id="spotlight-messages-items"></div>
          </div>
          <div class="spotlight-section" id="spotlight-channels" style="display:none">
            <div class="spotlight-section-title"><span class="section-icon">#</span> Channels</div>
            <div class="spotlight-section-items" id="spotlight-channels-items"></div>
          </div>
          <div class="spotlight-section" id="spotlight-servers" style="display:none">
            <div class="spotlight-section-title"><span class="section-icon">🏠</span> Servers</div>
            <div class="spotlight-section-items" id="spotlight-servers-items"></div>
          </div>
          <div class="spotlight-empty" id="spotlight-empty" style="display:none">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <p>No results found</p>
          </div>
        </div>
        <div class="spotlight-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
          <span><kbd>Enter</kbd> Open</span>
          <span><kbd>ESC</kbd> Close</span>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    const style = document.createElement('style');
    style.textContent = `
      .spotlight-modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 99999; }
      .spotlight-modal.open { display: block; }
      .spotlight-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); }
      .spotlight-container { position: relative; max-width: 640px; margin: 80px auto; background: var(--bg-primary, #1e1e2e); border-radius: 16px; box-shadow: 0 25px 50px rgba(0,0,0,0.5); overflow: hidden; animation: spotlightSlideIn 0.2s ease; }
      @keyframes spotlightSlideIn { from { opacity: 0; transform: scale(0.95) translateY(-20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      .spotlight-search-box { display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border-color, #333); gap: 12px; }
      .spotlight-icon { color: var(--text-muted, #888); flex-shrink: 0; }
      #spotlight-input { flex: 1; background: none; border: none; font-size: 18px; color: var(--text-primary, #fff); outline: none; }
      #spotlight-input::placeholder { color: var(--text-muted, #666); }
      .spotlight-kbd { background: var(--bg-secondary, #2a2a3e); padding: 4px 8px; border-radius: 4px; font-size: 11px; color: var(--text-muted, #888); font-family: monospace; }
      .spotlight-results { max-height: 400px; overflow-y: auto; padding: 8px 0; }
      .spotlight-section { padding: 0 8px; }
      .spotlight-section-title { font-size: 11px; font-weight: 600; color: var(--text-muted, #888); padding: 8px 12px 4px; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px; }
      .section-icon { font-size: 14px; }
      .spotlight-section-items { display: flex; flex-direction: column; gap: 2px; }
      .spotlight-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: background 0.15s; }
      .spotlight-item:hover, .spotlight-item.selected { background: var(--bg-hover, rgba(255,255,255,0.1)); }
      .spotlight-item-icon { width: 36px; height: 36px; border-radius: 8px; background: var(--bg-secondary, #2a2a3e); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; overflow: hidden; }
      .spotlight-item-icon img { width: 100%; height: 100%; object-fit: cover; }
      .spotlight-item-content { flex: 1; min-width: 0; }
      .spotlight-item-title { font-weight: 500; color: var(--text-primary, #fff); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .spotlight-item-subtitle { font-size: 12px; color: var(--text-muted, #888); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .spotlight-item-badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: var(--accent-color, #7c3aed); color: white; }
      .spotlight-empty { text-align: center; padding: 40px 20px; color: var(--text-muted, #888); }
      .spotlight-empty p { margin-top: 12px; }
      .spotlight-footer { display: flex; gap: 20px; padding: 12px 20px; border-top: 1px solid var(--border-color, #333); font-size: 12px; color: var(--text-muted, #888); }
      .spotlight-footer kbd { background: var(--bg-secondary, #2a2a3e); padding: 2px 6px; border-radius: 3px; font-family: monospace; margin: 0 2px; }
      .spotlight-recent { display: none; }
      .spotlight-recent.has-items { display: block; }
    `;
    document.head.appendChild(style);
    
    modal.querySelector('.spotlight-backdrop').addEventListener('click', () => this.close());
    
    const input = document.getElementById('spotlight-input');
    input.addEventListener('input', (e) => this.handleSearch(e.target.value));
    input.addEventListener('keydown', (e) => this.handleKeydown(e));
  },
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.toggle();
      }
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        this.open();
      }
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  },
  
  toggle() {
    this.isOpen ? this.close() : this.open();
  },
  
  open() {
    const modal = document.getElementById('spotlight-search-modal');
    if (!modal) return;
    
    modal.classList.add('open');
    this.isOpen = true;
    document.getElementById('spotlight-input').focus();
    this.showRecentSearches();
  },
  
  close() {
    const modal = document.getElementById('spotlight-search-modal');
    if (!modal) return;
    
    modal.classList.remove('open');
    this.isOpen = false;
    document.getElementById('spotlight-input').value = '';
    this.clearResults();
  },
  
  async handleSearch(query) {
    clearTimeout(this.searchTimeout);
    
    if (query.length < 2) {
      this.clearResults();
      this.showRecentSearches();
      return;
    }
    
    this.searchTimeout = setTimeout(async () => {
      const token = localStorage.getItem('userToken') || localStorage.getItem('authToken');
      if (!token) return;
      
      try {
        const response = await fetch(`/api/search/unified?q=${encodeURIComponent(query)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.displayResults(data.grouped, query);
        }
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 200);
  },
  
  displayResults(grouped, query) {
    this.clearResults();
    document.getElementById('spotlight-recent').style.display = 'none';
    
    let hasResults = false;
    
    const sections = [
      { key: 'games', items: grouped.games || [] },
      { key: 'users', items: grouped.users || [] },
      { key: 'forums', items: grouped.forums || [] },
      { key: 'tasks', items: grouped.tasks || [] },
      { key: 'messages', items: grouped.messages || [] },
      { key: 'channels', items: grouped.channels || [] },
      { key: 'servers', items: grouped.servers || [] }
    ];
    
    sections.forEach(({ key, items }) => {
      const section = document.getElementById(`spotlight-${key}`);
      const container = document.getElementById(`spotlight-${key}-items`);
      
      if (items.length > 0) {
        hasResults = true;
        section.style.display = 'block';
        container.innerHTML = items.map(item => this.renderItem(item, key)).join('');
        container.querySelectorAll('.spotlight-item').forEach(el => {
          el.addEventListener('click', () => this.selectItem(el.dataset, query));
        });
      } else {
        section.style.display = 'none';
      }
    });
    
    document.getElementById('spotlight-empty').style.display = hasResults ? 'none' : 'block';
  },
  
  renderItem(item, type) {
    const icons = { game: '🎮', user: '👤', forum: '💬', task: '✓', message: '✉️', channel: '#', server: '🏠' };
    
    let title = '', subtitle = '', icon = icons[type] || '📄', badge = '';
    
    switch (type) {
      case 'games':
        title = item.title;
        subtitle = item.category || 'Game';
        icon = '🎮';
        break;
      case 'users':
        title = item.username;
        subtitle = item.bio || 'User';
        icon = item.profile_picture ? `<img src="${this.escapeHtml(item.profile_picture)}" alt="">` : '👤';
        badge = item.is_online ? '<span class="spotlight-item-badge" style="background:#43b581">Online</span>' : '';
        break;
      case 'forums':
        title = item.title;
        subtitle = item.category_name || 'Forum post';
        icon = '💬';
        break;
      case 'tasks':
        title = item.title;
        subtitle = `Priority: ${item.priority || 'normal'}`;
        icon = item.completed ? '✅' : '📝';
        badge = item.completed ? '<span class="spotlight-item-badge" style="background:#43b581">Done</span>' : '';
        break;
      case 'messages':
        title = item.content?.substring(0, 50) + (item.content?.length > 50 ? '...' : '');
        subtitle = `${item.sender || 'Unknown'} in #${item.channel_name || 'channel'}`;
        icon = '✉️';
        break;
      case 'channels':
        title = `#${item.name}`;
        subtitle = item.server_name || 'Server';
        icon = '#';
        break;
      case 'servers':
        title = item.name;
        subtitle = item.description?.substring(0, 40) || 'Server';
        icon = item.icon ? `<img src="${this.escapeHtml(item.icon)}" alt="">` : '🏠';
        break;
    }
    
    return `
      <div class="spotlight-item" data-type="${type}" data-id="${item.id}">
        <div class="spotlight-item-icon">${icon}</div>
        <div class="spotlight-item-content">
          <div class="spotlight-item-title">${this.escapeHtml(title)}</div>
          <div class="spotlight-item-subtitle">${this.escapeHtml(subtitle)}</div>
        </div>
        ${badge}
      </div>
    `;
  },
  
  selectItem(data, query) {
    this.saveSearch(query);
    
    const { type, id } = data;
    
    switch (type) {
      case 'games':
        window.location.href = `/private/games.html?play=${id}`;
        break;
      case 'users':
        window.location.href = `/private/profile.html?id=${id}`;
        break;
      case 'forums':
        window.location.href = `/private/forums.html?post=${id}`;
        break;
      case 'tasks':
        window.location.href = `/private/tasks.html?id=${id}`;
        break;
      case 'messages':
      case 'channels':
        window.location.href = `/private/chat.html?channel=${id}`;
        break;
      case 'servers':
        window.location.href = `/private/chat.html?server=${id}`;
        break;
    }
    
    this.close();
  },
  
  clearResults() {
    ['games', 'users', 'forums', 'tasks', 'messages', 'channels', 'servers'].forEach(key => {
      document.getElementById(`spotlight-${key}`).style.display = 'none';
      document.getElementById(`spotlight-${key}-items`).innerHTML = '';
    });
    document.getElementById('spotlight-empty').style.display = 'none';
  },
  
  handleKeydown(e) {
    const items = document.querySelectorAll('.spotlight-item');
    if (!items.length) return;
    
    const selected = document.querySelector('.spotlight-item.selected');
    let index = selected ? Array.from(items).indexOf(selected) : -1;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (selected) selected.classList.remove('selected');
      index = (index + 1) % items.length;
      items[index].classList.add('selected');
      items[index].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (selected) selected.classList.remove('selected');
      index = index <= 0 ? items.length - 1 : index - 1;
      items[index].classList.add('selected');
      items[index].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && selected) {
      e.preventDefault();
      selected.click();
    }
  },
  
  async loadRecentSearches() {
    const token = localStorage.getItem('userToken') || localStorage.getItem('authToken');
    if (!token) return;
    
    try {
      const response = await fetch('/api/search/recent', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        this.recentSearches = await response.json();
      }
    } catch (err) {}
  },
  
  showRecentSearches() {
    const container = document.getElementById('spotlight-recent-items');
    const section = document.getElementById('spotlight-recent');
    
    if (this.recentSearches.length > 0) {
      section.classList.add('has-items');
      section.style.display = 'block';
      container.innerHTML = this.recentSearches.map(s => `
        <div class="spotlight-item" data-query="${this.escapeHtml(s.query)}">
          <div class="spotlight-item-icon">🕐</div>
          <div class="spotlight-item-content">
            <div class="spotlight-item-title">${this.escapeHtml(s.query)}</div>
            <div class="spotlight-item-subtitle">Searched ${s.search_count}x</div>
          </div>
        </div>
      `).join('');
      
      container.querySelectorAll('.spotlight-item').forEach(el => {
        el.addEventListener('click', () => {
          const input = document.getElementById('spotlight-input');
          input.value = el.dataset.query;
          this.handleSearch(el.dataset.query);
        });
      });
    } else {
      section.style.display = 'none';
    }
  },
  
  saveSearch(query) {
    if (!query || query.length < 2) return;
    
    const existing = this.recentSearches.find(s => s.query === query);
    if (!existing) {
      this.recentSearches.unshift({ query, search_count: 1 });
      if (this.recentSearches.length > 10) this.recentSearches.pop();
    }
  },
  
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  SpotlightSearch.init();
});

if (typeof window !== 'undefined') {
  window.SpotlightSearch = SpotlightSearch;
}
