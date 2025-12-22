const Presence = {
  socket: null,
  userId: null,
  currentActivity: null,
  
  init(socket, userId) {
    this.socket = socket;
    this.userId = userId;
    this.setupListeners();
  },
  
  setupListeners() {
    if (!this.socket) return;
    
    this.socket.on('presence_update', (data) => {
      document.dispatchEvent(new CustomEvent('presenceUpdate', { detail: data }));
      this.updatePresenceUI(data.userId, data.presence);
    });
  },
  
  setPlaying(gameName, gameId) {
    this.updatePresence('playing', gameName, { gameId });
  },
  
  setWatching(videoTitle, videoId) {
    this.updatePresence('watching', videoTitle, { videoId });
  },
  
  setListening(songName, artist) {
    this.updatePresence('listening', artist ? `${songName} by ${artist}` : songName, { song: songName, artist });
  },
  
  setStudying(subject) {
    this.updatePresence('studying', subject || 'Studying');
  },
  
  setAFK(reason) {
    this.updatePresence('afk', reason || 'Away');
  },
  
  setBrowsing(site) {
    this.updatePresence('browsing', site);
  },
  
  clear() {
    if (this.socket && this.userId) {
      this.socket.emit('clear_presence', { userId: this.userId });
      this.currentActivity = null;
    }
    
    const token = localStorage.getItem('userToken') || localStorage.getItem('authToken');
    if (token) {
      fetch('/api/activity/clear', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
    }
  },
  
  updatePresence(type, name, data = {}) {
    this.currentActivity = { type, name, data };
    
    if (this.socket && this.userId) {
      this.socket.emit('update_presence', {
        userId: this.userId,
        activityType: type,
        activityName: name,
        activityData: data
      });
    }
    
    const token = localStorage.getItem('userToken') || localStorage.getItem('authToken');
    if (token) {
      const endpoint = type === 'playing' ? '/api/activity/playing' :
                       type === 'watching' ? '/api/activity/watching' :
                       type === 'listening' ? '/api/activity/listening' :
                       type === 'studying' ? '/api/activity/studying' :
                       type === 'afk' ? '/api/activity/afk' :
                       type === 'browsing' ? '/api/activity/browsing' : null;
      
      if (endpoint) {
        const body = type === 'playing' ? { game_name: name } :
                     type === 'watching' ? { title: name } :
                     type === 'listening' ? { song_name: data.song, artist: data.artist } :
                     type === 'studying' ? { subject: name } :
                     type === 'afk' ? { reason: name } :
                     { site: name };
        
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }).catch(() => {});
      }
    }
  },
  
  updatePresenceUI(userId, presence) {
    const badges = document.querySelectorAll(`[data-presence-user="${userId}"]`);
    badges.forEach(badge => {
      if (!presence || !presence.activity_type) {
        badge.style.display = 'none';
        badge.innerHTML = '';
      } else {
        badge.style.display = 'flex';
        badge.innerHTML = this.getPresenceHTML(presence);
      }
    });
    
    const indicators = document.querySelectorAll(`[data-activity-user="${userId}"]`);
    indicators.forEach(ind => {
      ind.textContent = presence?.activity_name || '';
      ind.style.display = presence?.activity_type ? 'block' : 'none';
    });
  },
  
  getPresenceHTML(presence) {
    if (!presence || !presence.activity_type) return '';
    
    const icons = {
      playing: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
      watching: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12zM10 8l6 4-6 4V8z"/></svg>',
      listening: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
      studying: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/></svg>',
      afk: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
      browsing: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>'
    };
    
    const colors = {
      playing: '#43b581',
      watching: '#f04747',
      listening: '#1db954',
      studying: '#faa61a',
      afk: '#747f8d',
      browsing: '#7289da'
    };
    
    return `
      <span class="presence-icon" style="color: ${colors[presence.activity_type] || '#fff'}">${icons[presence.activity_type] || ''}</span>
      <span class="presence-text">${this.getPresenceLabel(presence)}</span>
    `;
  },
  
  getPresenceLabel(presence) {
    if (!presence) return '';
    const labels = {
      playing: 'Playing',
      watching: 'Watching',
      listening: 'Listening to',
      studying: 'Studying',
      afk: 'AFK',
      browsing: 'Browsing'
    };
    return `${labels[presence.activity_type] || ''} ${presence.activity_name || ''}`;
  },
  
  formatDuration(startedAt) {
    if (!startedAt) return '';
    const start = new Date(startedAt);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000);
    
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  }
};

if (typeof window !== 'undefined') {
  window.Presence = Presence;
}
