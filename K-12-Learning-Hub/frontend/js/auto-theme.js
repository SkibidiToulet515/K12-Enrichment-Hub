const AutoTheme = {
  async init() {
    await this.loadPreferences();
    this.checkAndApply();
    
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        this.checkAndApply();
      });
    }
    
    setInterval(() => this.checkAndApply(), 60000);
  },
  
  async loadPreferences() {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('userToken');
      if (!token) return;
      
      const res = await fetch('/api/preferences', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const prefs = await res.json();
        if (prefs.theme_mode) {
          localStorage.setItem('themeMode', prefs.theme_mode);
        }
        if (prefs.auto_theme_schedule) {
          localStorage.setItem('themeSchedule', prefs.auto_theme_schedule);
        }
      }
    } catch (e) {
      console.log('Failed to load preferences:', e);
    }
  },
  
  async checkAndApply() {
    const mode = localStorage.getItem('themeMode') || 'manual';
    
    if (mode === 'manual') return;
    
    if (mode === 'system') {
      this.applySystemTheme();
      return;
    }
    
    if (mode === 'time') {
      this.applyTimeBasedTheme();
      return;
    }
    
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('userToken');
      if (!token) return;
      
      const res = await fetch('/api/preferences/theme-suggestion', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.suggestion && data.suggestion !== 'system') {
        this.setTheme(data.suggestion);
      } else if (data.suggestion === 'system') {
        this.applySystemTheme();
      }
    } catch (e) {
      console.log('Auto theme check failed:', e);
    }
  },
  
  applySystemTheme() {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = prefersDark ? 'gaming' : 'cloudy';
    this.setTheme(theme);
  },
  
  applyTimeBasedTheme() {
    const hour = new Date().getHours();
    let theme;
    
    if (hour >= 6 && hour < 12) {
      theme = 'cloudy';
    } else if (hour >= 12 && hour < 18) {
      theme = 'ocean';
    } else if (hour >= 18 && hour < 21) {
      theme = 'eclipse';
    } else {
      theme = 'gaming';
    }
    
    this.setTheme(theme);
  },
  
  setTheme(themeName) {
    const currentTheme = localStorage.getItem('selectedTheme');
    if (currentTheme === themeName) return;
    
    localStorage.setItem('selectedTheme', themeName);
    
    if (window.applyTheme) {
      window.applyTheme(themeName);
    } else {
      const selector = document.getElementById('themeSelector');
      if (selector) {
        selector.value = themeName;
        selector.dispatchEvent(new Event('change'));
      }
    }
  },
  
  async setMode(mode) {
    localStorage.setItem('themeMode', mode);
    
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('userToken');
      if (token) {
        await fetch('/api/preferences', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ theme_mode: mode })
        });
      }
    } catch (e) {
      console.log('Failed to save theme mode:', e);
    }
    
    this.checkAndApply();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('/private/')) {
    AutoTheme.init();
  }
});
