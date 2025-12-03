const StealthMode = {
  originalTitle: document.title,
  originalFavicon: null,
  isActive: false,
  
  disguises: [
    { name: 'Google Docs', title: 'Untitled document - Google Docs', favicon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico', url: 'https://docs.google.com' },
    { name: 'Google Classroom', title: 'Google Classroom', favicon: 'https://ssl.gstatic.com/classroom/favicon.png', url: 'https://classroom.google.com' },
    { name: 'Khan Academy', title: 'Khan Academy | Free Online Courses', favicon: 'https://cdn.kastatic.org/images/favicon.ico', url: 'https://khanacademy.org' },
    { name: 'Google Drive', title: 'My Drive - Google Drive', favicon: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png', url: 'https://drive.google.com' },
    { name: 'Wikipedia', title: 'Wikipedia', favicon: 'https://en.wikipedia.org/static/favicon/wikipedia.ico', url: 'https://wikipedia.org' },
    { name: 'Quizlet', title: 'Quizlet: Learn & Study', favicon: 'https://quizlet.com/favicon.ico', url: 'https://quizlet.com' }
  ],
  
  currentDisguise: null,
  
  init() {
    this.originalFavicon = this.getFavicon();
    this.loadSettings();
    this.createPanicButton();
    this.setupKeyboardShortcut();
    this.createSettingsUI();
    
    if (localStorage.getItem('stealthAutoEnabled') === 'true') {
      this.activate();
    }
  },
  
  getFavicon() {
    const link = document.querySelector("link[rel*='icon']");
    return link ? link.href : '/favicon.ico';
  },
  
  setFavicon(url) {
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = url;
  },
  
  loadSettings() {
    const savedDisguise = localStorage.getItem('stealthDisguise');
    if (savedDisguise) {
      this.currentDisguise = this.disguises.find(d => d.name === savedDisguise) || this.disguises[0];
    } else {
      this.currentDisguise = this.disguises[0];
    }
  },
  
  createPanicButton() {
    const btn = document.createElement('button');
    btn.id = 'panicButton';
    btn.innerHTML = '🛡️';
    btn.title = 'Panic Button (` or ESC twice)';
    btn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, #e74c3c, #c0392b);
      border: none;
      font-size: 24px;
      cursor: pointer;
      z-index: 99999;
      box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    btn.onmouseenter = () => btn.style.transform = 'scale(1.1)';
    btn.onmouseleave = () => btn.style.transform = 'scale(1)';
    btn.onclick = () => this.activate();
    document.body.appendChild(btn);
  },
  
  setupKeyboardShortcut() {
    let escCount = 0;
    let escTimer = null;
    
    document.addEventListener('keydown', (e) => {
      if (e.key === '`' && !e.target.matches('input, textarea, [contenteditable]')) {
        e.preventDefault();
        this.activate();
      }
      
      if (e.key === 'Escape') {
        escCount++;
        if (escCount >= 2) {
          this.activate();
          escCount = 0;
        }
        clearTimeout(escTimer);
        escTimer = setTimeout(() => escCount = 0, 500);
      }
    });
  },
  
  activate() {
    if (this.isActive) return;
    this.isActive = true;
    
    document.title = this.currentDisguise.title;
    this.setFavicon(this.currentDisguise.favicon);
    
    const overlay = document.createElement('div');
    overlay.id = 'stealthOverlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #fff;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      font-family: 'Google Sans', Roboto, Arial, sans-serif;
    `;
    
    overlay.innerHTML = this.getDisguiseContent();
    document.body.appendChild(overlay);
    
    const panicBtn = document.getElementById('panicButton');
    if (panicBtn) panicBtn.style.display = 'none';
    
    document.addEventListener('keydown', this.deactivateHandler);
  },
  
  deactivateHandler: function(e) {
    if (e.key === 'Escape' || e.key === '`') {
      StealthMode.deactivate();
    }
  },
  
  deactivate() {
    this.isActive = false;
    document.title = this.originalTitle;
    this.setFavicon(this.originalFavicon);
    
    const overlay = document.getElementById('stealthOverlay');
    if (overlay) overlay.remove();
    
    const panicBtn = document.getElementById('panicButton');
    if (panicBtn) panicBtn.style.display = 'flex';
    
    document.removeEventListener('keydown', this.deactivateHandler);
  },
  
  getDisguiseContent() {
    const name = this.currentDisguise.name;
    
    if (name === 'Google Docs') {
      return `
        <div style="height: 64px; background: #1a73e8; display: flex; align-items: center; padding: 0 20px;">
          <img src="https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico" style="width: 40px; margin-right: 15px;">
          <span style="color: white; font-size: 18px;">Untitled document</span>
        </div>
        <div style="flex: 1; background: #f8f9fa; display: flex; justify-content: center; padding-top: 40px;">
          <div style="width: 816px; min-height: 1056px; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); padding: 96px;">
            <p style="color: #5f6368; font-size: 14px;">Start typing or paste (Ctrl + V) content here...</p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">Press ESC or \` to return</p>
          </div>
        </div>
      `;
    }
    
    if (name === 'Google Classroom') {
      return `
        <div style="height: 64px; background: #1967d2; display: flex; align-items: center; padding: 0 20px;">
          <span style="color: white; font-size: 22px; font-weight: 500;">Google Classroom</span>
        </div>
        <div style="flex: 1; background: #f1f3f4; padding: 24px;">
          <div style="max-width: 800px; margin: 0 auto;">
            <div style="background: white; border-radius: 8px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
              <h2 style="margin: 0 0 8px; color: #1967d2;">Welcome to Class</h2>
              <p style="color: #5f6368; margin: 0;">No assignments due today.</p>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center;">Press ESC or \` to return</p>
          </div>
        </div>
      `;
    }
    
    if (name === 'Khan Academy') {
      return `
        <div style="height: 60px; background: #1865f2; display: flex; align-items: center; padding: 0 20px;">
          <span style="color: white; font-size: 20px; font-weight: bold;">Khan Academy</span>
        </div>
        <div style="flex: 1; background: #f7f8fa; padding: 40px; text-align: center;">
          <h1 style="color: #21242c; margin-bottom: 20px;">You can learn anything.</h1>
          <p style="color: #6b6e73;">For free. For everyone. Forever.</p>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">Press ESC or \` to return</p>
        </div>
      `;
    }
    
    if (name === 'Google Drive') {
      return `
        <div style="height: 64px; background: white; border-bottom: 1px solid #ddd; display: flex; align-items: center; padding: 0 20px;">
          <img src="https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png" style="width: 32px; margin-right: 10px;">
          <span style="font-size: 22px; color: #5f6368;">Drive</span>
        </div>
        <div style="flex: 1; background: #f8f9fa; display: flex;">
          <div style="width: 240px; background: white; padding: 20px; border-right: 1px solid #ddd;">
            <button style="background: white; border: 1px solid #ddd; padding: 10px 20px; border-radius: 24px; cursor: pointer;">+ New</button>
          </div>
          <div style="flex: 1; padding: 20px;">
            <p style="color: #5f6368;">My Drive is empty</p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">Press ESC or \` to return</p>
          </div>
        </div>
      `;
    }
    
    return `
      <div style="flex: 1; background: #f8f9fa; display: flex; align-items: center; justify-content: center; flex-direction: column;">
        <h1 style="color: #333;">${this.currentDisguise.name}</h1>
        <p style="color: #666;">Loading...</p>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">Press ESC or \` to return</p>
      </div>
    `;
  },
  
  createSettingsUI() {
    const style = document.createElement('style');
    style.textContent = `
      #stealthSettings {
        position: fixed;
        bottom: 80px;
        right: 20px;
        background: var(--card, #1e1e2e);
        border: 2px solid var(--accent, #45475a);
        border-radius: 12px;
        padding: 15px;
        z-index: 99998;
        display: none;
        min-width: 220px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      }
      #stealthSettings.active { display: block; }
      #stealthSettings h4 {
        margin: 0 0 12px;
        color: var(--primary, #89b4fa);
        font-size: 14px;
      }
      .stealth-option {
        display: flex;
        align-items: center;
        padding: 8px;
        margin: 4px 0;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.2s;
        color: var(--text, #cdd6f4);
        font-size: 13px;
      }
      .stealth-option:hover {
        background: var(--bg, #11111b);
      }
      .stealth-option.selected {
        background: var(--primary, #89b4fa);
        color: var(--bg, #11111b);
      }
      .stealth-option input {
        margin-right: 8px;
      }
    `;
    document.head.appendChild(style);
    
    const settings = document.createElement('div');
    settings.id = 'stealthSettings';
    settings.innerHTML = `
      <h4>Disguise Mode</h4>
      ${this.disguises.map(d => `
        <label class="stealth-option ${d.name === this.currentDisguise.name ? 'selected' : ''}">
          <input type="radio" name="disguise" value="${d.name}" ${d.name === this.currentDisguise.name ? 'checked' : ''}>
          ${d.name}
        </label>
      `).join('')}
    `;
    document.body.appendChild(settings);
    
    settings.querySelectorAll('input[name="disguise"]').forEach(input => {
      input.addEventListener('change', (e) => {
        this.currentDisguise = this.disguises.find(d => d.name === e.target.value);
        localStorage.setItem('stealthDisguise', e.target.value);
        settings.querySelectorAll('.stealth-option').forEach(opt => opt.classList.remove('selected'));
        e.target.parentElement.classList.add('selected');
      });
    });
    
    const panicBtn = document.getElementById('panicButton');
    if (panicBtn) {
      panicBtn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        settings.classList.toggle('active');
      });
      
      document.addEventListener('click', (e) => {
        if (!settings.contains(e.target) && e.target !== panicBtn) {
          settings.classList.remove('active');
        }
      });
    }
  },
  
  setTabCloak(title, faviconUrl) {
    document.title = title || this.originalTitle;
    if (faviconUrl) {
      this.setFavicon(faviconUrl);
    }
    localStorage.setItem('cloakTitle', title || '');
    localStorage.setItem('cloakFavicon', faviconUrl || '');
  },
  
  clearTabCloak() {
    document.title = this.originalTitle;
    this.setFavicon(this.originalFavicon);
    localStorage.removeItem('cloakTitle');
    localStorage.removeItem('cloakFavicon');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('/private/')) {
    StealthMode.init();
  }
});
