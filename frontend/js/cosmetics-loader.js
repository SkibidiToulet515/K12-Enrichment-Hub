/* Global Cosmetics Loader - Applies equipped shop items across all pages */

const CosmeticsLoader = {
  equipped: {},
  loaded: false,

  async init() {
    if (this.loaded) return;
    
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch('/api/shop/equipped', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) return;
      
      this.equipped = await res.json();
      this.loaded = true;
      this.applyAll();
    } catch (e) {
      console.log('Could not load cosmetics');
    }
  },

  applyAll() {
    this.applyTheme();
    this.applyFrame();
    this.applyBubble();
    this.applyCursor();
    this.applyBackground();
  },

  applyTheme() {
    const theme = this.equipped.theme;
    if (!theme) return;

    if (theme.css_vars) {
      try {
        const vars = JSON.parse(theme.css_vars);
        Object.entries(vars).forEach(([key, value]) => {
          document.documentElement.style.setProperty(key, value);
        });
      } catch (e) {}
    }

    if (theme.css_class) {
      document.body.classList.add(theme.css_class);
    }
  },

  applyFrame() {
    const frame = this.equipped.frame;
    if (!frame) return;

    const style = document.createElement('style');
    style.id = 'cosmetic-frame';
    
    if (frame.css_vars) {
      try {
        const vars = JSON.parse(frame.css_vars);
        let css = ':root {';
        Object.entries(vars).forEach(([key, value]) => {
          css += `${key}: ${value};`;
        });
        css += '}';
        style.textContent = css;
      } catch (e) {}
    }

    if (frame.asset_url) {
      style.textContent += `
        .user-avatar, .profile-avatar, .avatar {
          border: 3px solid transparent;
          background-image: url('${frame.asset_url}');
          background-size: cover;
          background-clip: padding-box;
        }
      `;
    }

    document.head.appendChild(style);
  },

  applyBubble() {
    const bubble = this.equipped.bubble;
    if (!bubble) return;

    const style = document.createElement('style');
    style.id = 'cosmetic-bubble';

    if (bubble.css_class) {
      style.textContent = `.message.own .message-content { ${bubble.css_class} }`;
    }

    if (bubble.css_vars) {
      try {
        const vars = JSON.parse(bubble.css_vars);
        let css = '.message.own .message-content {';
        Object.entries(vars).forEach(([key, value]) => {
          css += `${key.replace('--', '')}: ${value};`;
        });
        css += '}';
        style.textContent = css;
      } catch (e) {}
    }

    document.head.appendChild(style);
  },

  applyCursor() {
    const cursor = this.equipped.cursor;
    if (!cursor || !cursor.asset_url) return;

    document.body.style.cursor = `url('${cursor.asset_url}'), auto`;
  },

  applyBackground() {
    const bg = this.equipped.background;
    if (!bg || !bg.asset_url) return;

    const style = document.createElement('style');
    style.id = 'cosmetic-background';
    style.textContent = `
      body::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image: url('${bg.asset_url}');
        background-size: cover;
        background-position: center;
        opacity: 0.15;
        z-index: -1;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  },

  getEquippedBadge() {
    return this.equipped.badge || null;
  },

  getEquippedStatus() {
    return this.equipped.status || null;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  CosmeticsLoader.init();
});
