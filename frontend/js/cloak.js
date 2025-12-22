const CloakManager = {
  CLOAK_ICON: 'https://play-lh.googleusercontent.com/ujsa1M8GdT-fo-GfPazpUwgPXVWEOWKUgKZk-SdnUhmcL3opS24MiHe6ypEgqxGpllw',
  CLOAK_TITLE: 'My Apps',
  
  getSettings() {
    return JSON.parse(localStorage.getItem('cloakSettings') || '{}');
  },
  
  saveSettings(settings) {
    localStorage.setItem('cloakSettings', JSON.stringify(settings));
  },
  
  applyTabCloak() {
    const settings = this.getSettings();
    if (settings.tabCloak) {
      document.title = this.CLOAK_TITLE;
      let link = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/png';
      link.rel = 'shortcut icon';
      link.href = this.CLOAK_ICON;
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  },
  
  openInAboutBlank() {
    localStorage.setItem('layoutMode', 'os');
    const baseUrl = window.location.origin;
    const targetUrl = baseUrl + '/private/desktop.html';
    const newWindow = window.open('about:blank', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${this.CLOAK_TITLE}</title>
          <link rel="icon" href="${this.CLOAK_ICON}">
          <style>
            body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
            iframe { width: 100%; height: 100%; border: none; }
          </style>
        </head>
        <body>
          <iframe src="${targetUrl}" allowfullscreen></iframe>
        </body>
        </html>
      `);
      newWindow.document.close();
      window.close();
    }
  },
  
  openInBlob() {
    localStorage.setItem('layoutMode', 'os');
    const baseUrl = window.location.origin;
    const targetUrl = baseUrl + '/private/desktop.html';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${this.CLOAK_TITLE}</title>
        <link rel="icon" href="${this.CLOAK_ICON}">
        <style>
          body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
          iframe { width: 100%; height: 100%; border: none; }
        </style>
      </head>
      <body>
        <iframe src="${targetUrl}" allowfullscreen></iframe>
      </body>
      </html>
    `;
    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    window.close();
  },
  
  checkAutoCloak() {
    const settings = this.getSettings();
    if (settings.autoCloak === 'aboutblank' && !window.location.href.includes('about:blank') && !sessionStorage.getItem('cloaked')) {
      sessionStorage.setItem('cloaked', 'true');
      this.openInAboutBlank();
      return true;
    }
    if (settings.autoCloak === 'blob' && !window.location.protocol.includes('blob') && !sessionStorage.getItem('cloaked')) {
      sessionStorage.setItem('cloaked', 'true');
      this.openInBlob();
      return true;
    }
    return false;
  },
  
  init() {
    if (!this.checkAutoCloak()) {
      this.applyTabCloak();
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => CloakManager.init());
} else {
  CloakManager.init();
}
