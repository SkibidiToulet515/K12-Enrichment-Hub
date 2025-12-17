const StealthMode = {
  originalTitle: document.title,
  originalFavicon: null,
  isActive: false,
  
  // ClassLink favicon
  classLinkIcon: 'https://www.classlink.com/favicon.ico',
  
  panicTargets: [
    { name: 'ClassLink Launchpad', url: 'https://myapps.classlink.com/home', title: 'ClassLink Launchpad', favicon: 'https://www.classlink.com/favicon.ico' },
    { name: 'Fake ClassLink Login', url: '/classlink', title: 'ClassLink Launchpad', favicon: 'https://www.classlink.com/favicon.ico' }
  ],
  
  // Custom flood history URL
  customFloodUrl: localStorage.getItem('customFloodUrl') || '',
  
  disguises: [
    { name: 'Google Docs', title: 'Untitled document - Google Docs', favicon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico', url: 'https://docs.google.com' },
    { name: 'Google Classroom', title: 'Google Classroom', favicon: 'https://ssl.gstatic.com/classroom/favicon.png', url: 'https://classroom.google.com' },
    { name: 'Khan Academy', title: 'Khan Academy | Free Online Courses', favicon: 'https://cdn.kastatic.org/images/favicon.ico', url: 'https://khanacademy.org' },
    { name: 'Google Drive', title: 'My Drive - Google Drive', favicon: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png', url: 'https://drive.google.com' }
  ],
  
  currentPanicTarget: null,
  currentDisguise: null,
  
  init() {
    this.originalFavicon = this.getFavicon();
    this.loadSettings();
    this.createPanicButton();
    this.setupKeyboardShortcut();
    this.createSettingsUI();
    this.applyTabCloak();
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
    const savedPanic = localStorage.getItem('panicTarget');
    this.currentPanicTarget = this.panicTargets.find(p => p.name === savedPanic) || this.panicTargets[0];
    
    const savedDisguise = localStorage.getItem('stealthDisguise');
    this.currentDisguise = this.disguises.find(d => d.name === savedDisguise) || this.disguises[0];
  },
  
  createPanicButton() {
    const btn = document.createElement('button');
    btn.id = 'panicButton';
    btn.innerHTML = '🛡️';
    btn.title = 'Panic Button (` or ESC twice) - Right-click for settings';
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
    btn.onclick = () => this.panic();
    document.body.appendChild(btn);
  },
  
  setupKeyboardShortcut() {
    let escCount = 0;
    let escTimer = null;
    
    document.addEventListener('keydown', (e) => {
      if (e.key === '`' && !e.target.matches('input, textarea, [contenteditable]')) {
        e.preventDefault();
        this.panic();
      }
      
      if (e.key === 'Escape') {
        escCount++;
        if (escCount >= 2) {
          this.panic();
          escCount = 0;
        }
        clearTimeout(escTimer);
        escTimer = setTimeout(() => escCount = 0, 500);
      }
    });
  },
  
  panic() {
    window.location.href = this.currentPanicTarget.url;
  },
  
  openInAboutBlank() {
    const newWindow = window.open('about:blank', '_blank');
    if (newWindow) {
      const currentUrl = window.location.href;
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${this.currentPanicTarget.title}</title>
          <link rel="icon" href="${this.currentPanicTarget.favicon}">
          <style>
            * { margin: 0; padding: 0; }
            body { overflow: hidden; }
            iframe { width: 100vw; height: 100vh; border: none; }
          </style>
        </head>
        <body>
          <iframe src="${currentUrl}"></iframe>
        </body>
        </html>
      `);
      newWindow.document.close();
      window.location.href = this.currentPanicTarget.url;
    }
  },
  
  floodHistory(count = 50, customUrl = null) {
    const baseUrls = [
      'https://myapps.classlink.com/home',
      'https://myapps.classlink.com/home#dashboard',
      'https://myapps.classlink.com/home#apps',
      'https://classroom.google.com',
      'https://classroom.google.com/u/0/h',
      'https://docs.google.com/document',
      'https://drive.google.com/drive/my-drive',
      'https://www.khanacademy.org',
      'https://www.onenote.com/notebooks',
      'https://outlook.office.com/mail'
    ];
    
    // Add custom URL if provided
    const urls = customUrl ? [customUrl, ...baseUrls] : baseUrls;
    
    for (let i = 0; i < count; i++) {
      const randomUrl = urls[Math.floor(Math.random() * urls.length)];
      history.pushState({}, '', window.location.pathname + '?t=' + Date.now() + i);
    }
    history.replaceState({}, '', window.location.pathname);
    
    return `Flooded history with ${count} entries`;
  },
  
  openInBlobLink() {
    const currentUrl = window.location.href;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${this.currentPanicTarget.title}</title>
        <link rel="icon" href="${this.currentPanicTarget.favicon}">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { overflow: hidden; }
          iframe { width: 100vw; height: 100vh; border: none; }
        </style>
      </head>
      <body>
        <iframe src="${currentUrl}"></iframe>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  },
  
  saveCustomFloodUrl() {
    const input = document.getElementById('customFloodUrl');
    if (input && input.value.trim()) {
      this.customFloodUrl = input.value.trim();
      localStorage.setItem('customFloodUrl', this.customFloodUrl);
      alert('Custom flood URL saved!');
    } else {
      localStorage.removeItem('customFloodUrl');
      this.customFloodUrl = '';
      alert('Custom flood URL cleared!');
    }
  },
  
  floodWithCustomUrl() {
    const input = document.getElementById('customFloodUrl');
    const url = input ? input.value.trim() : this.customFloodUrl;
    if (url) {
      this.floodHistory(50, url);
      alert(`History flooded with custom URL: ${url}`);
    } else {
      alert('Please enter a custom URL first!');
    }
  },
  
  manipulateHistory() {
    const fakeEntries = [
      { title: 'ClassLink Launchpad', url: 'https://myapps.classlink.com/home' },
      { title: 'Google Classroom', url: 'https://classroom.google.com' },
      { title: 'OneNote', url: 'https://www.onenote.com/notebooks' }
    ];
    
    fakeEntries.forEach((entry, i) => {
      setTimeout(() => {
        history.pushState({ fake: true }, entry.title, window.location.pathname);
      }, i * 10);
    });
    
    setTimeout(() => {
      history.replaceState({}, document.title, window.location.pathname);
    }, fakeEntries.length * 10 + 50);
    
    return 'History manipulated successfully';
  },
  
  activateDisguise() {
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
      StealthMode.deactivateDisguise();
    }
  },
  
  deactivateDisguise() {
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
        pointer-events: none;
        min-width: 280px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      }
      #stealthSettings.active { display: block; pointer-events: auto; }
      #stealthSettings h4 {
        margin: 0 0 12px;
        color: var(--primary, #89b4fa);
        font-size: 14px;
        border-bottom: 1px solid var(--accent, #45475a);
        padding-bottom: 8px;
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
      .stealth-btn {
        width: 100%;
        padding: 10px;
        margin: 5px 0;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        transition: all 0.2s;
      }
      .stealth-btn.primary {
        background: linear-gradient(135deg, var(--primary, #89b4fa), var(--accent, #cba6f7));
        color: var(--bg, #11111b);
      }
      .stealth-btn.secondary {
        background: var(--bg, #11111b);
        color: var(--text, #cdd6f4);
        border: 1px solid var(--accent, #45475a);
      }
      .stealth-btn:hover {
        filter: brightness(1.1);
        transform: translateY(-1px);
      }
      .stealth-section {
        margin-bottom: 15px;
      }
      .stealth-divider {
        height: 1px;
        background: var(--accent, #45475a);
        margin: 12px 0;
      }
    `;
    document.head.appendChild(style);
    
    const settings = document.createElement('div');
    settings.id = 'stealthSettings';
    settings.innerHTML = `
      <div class="stealth-section">
        <h4>🚨 Panic Target (Redirect To)</h4>
        ${this.panicTargets.map(p => `
          <label class="stealth-option ${p.name === this.currentPanicTarget.name ? 'selected' : ''}">
            <input type="radio" name="panicTarget" value="${p.name}" ${p.name === this.currentPanicTarget.name ? 'checked' : ''}>
            ${p.name}
          </label>
        `).join('')}
      </div>
      
      <div class="stealth-divider"></div>
      
      <div class="stealth-section">
        <h4>🎭 Tab Cloak (Disguise Tab)</h4>
        <label class="stealth-option ${!localStorage.getItem('tabCloakEnabled') ? 'selected' : ''}">
          <input type="radio" name="tabCloak" value="none" ${!localStorage.getItem('tabCloakEnabled') ? 'checked' : ''}>
          None (Original)
        </label>
        ${this.panicTargets.map(p => `
          <label class="stealth-option ${localStorage.getItem('tabCloakName') === p.name ? 'selected' : ''}">
            <input type="radio" name="tabCloak" value="${p.name}" ${localStorage.getItem('tabCloakName') === p.name ? 'checked' : ''}>
            ${p.name}
          </label>
        `).join('')}
      </div>
      
      <div class="stealth-divider"></div>
      
      <div class="stealth-section">
        <h4>🔧 Stealth Tools</h4>
        <button class="stealth-btn primary" onclick="StealthMode.openInAboutBlank()">
          📄 Open in about:blank
        </button>
        <button class="stealth-btn primary" onclick="StealthMode.openInBlobLink()">
          🔗 Open in Blob Link
        </button>
        <button class="stealth-btn secondary" onclick="StealthMode.floodHistory(); alert('History flooded!')">
          📚 Flood History (50 entries)
        </button>
        <button class="stealth-btn secondary" onclick="StealthMode.manipulateHistory(); alert('History manipulated!')">
          🔄 Manipulate History
        </button>
      </div>
      
      <div class="stealth-divider"></div>
      
      <div class="stealth-section">
        <h4>🌊 Custom Flood URL</h4>
        <input type="text" id="customFloodUrl" placeholder="Enter custom URL (e.g. Flood Escape link)" 
          value="${this.customFloodUrl}"
          style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--accent, #45475a); background: var(--bg, #11111b); color: var(--text, #cdd6f4); font-size: 12px; margin-bottom: 8px;">
        <button class="stealth-btn secondary" onclick="StealthMode.saveCustomFloodUrl()">
          💾 Save Custom URL
        </button>
        <button class="stealth-btn secondary" onclick="StealthMode.floodWithCustomUrl()">
          🌊 Flood with Custom URL
        </button>
      </div>
      
      <div class="stealth-divider"></div>
      
      <div class="stealth-section">
        <h4>🎨 Quick Disguise (Overlay)</h4>
        ${this.disguises.map(d => `
          <label class="stealth-option" onclick="StealthMode.currentDisguise = StealthMode.disguises.find(x => x.name === '${d.name}'); StealthMode.activateDisguise();">
            ${d.name}
          </label>
        `).join('')}
      </div>
    `;
    document.body.appendChild(settings);
    
    settings.querySelectorAll('input[name="panicTarget"]').forEach(input => {
      input.addEventListener('change', (e) => {
        this.currentPanicTarget = this.panicTargets.find(p => p.name === e.target.value);
        localStorage.setItem('panicTarget', e.target.value);
        settings.querySelectorAll('input[name="panicTarget"]').forEach(i => {
          i.parentElement.classList.toggle('selected', i.checked);
        });
      });
    });
    
    settings.querySelectorAll('input[name="tabCloak"]').forEach(input => {
      input.addEventListener('change', (e) => {
        const value = e.target.value;
        if (value === 'none') {
          localStorage.removeItem('tabCloakEnabled');
          localStorage.removeItem('tabCloakName');
          document.title = this.originalTitle;
          this.setFavicon(this.originalFavicon);
        } else {
          const target = this.panicTargets.find(p => p.name === value);
          if (target) {
            localStorage.setItem('tabCloakEnabled', 'true');
            localStorage.setItem('tabCloakName', value);
            document.title = target.title;
            this.setFavicon(target.favicon);
          }
        }
        settings.querySelectorAll('input[name="tabCloak"]').forEach(i => {
          i.parentElement.classList.toggle('selected', i.checked);
        });
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
  
  applyTabCloak() {
    if (localStorage.getItem('tabCloakEnabled') === 'true') {
      const cloakName = localStorage.getItem('tabCloakName');
      const target = this.panicTargets.find(p => p.name === cloakName);
      if (target) {
        document.title = target.title;
        this.setFavicon(target.favicon);
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('/private/')) {
    StealthMode.init();
  }
});
