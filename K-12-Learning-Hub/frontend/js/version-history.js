const VersionHistory = {
  modal: null,
  currentType: null,
  currentId: null,
  versions: [],
  
  init() {
    this.createModal();
  },
  
  createModal() {
    if (document.getElementById('version-history-modal')) return;
    
    const modal = document.createElement('div');
    modal.id = 'version-history-modal';
    modal.className = 'vh-modal';
    modal.innerHTML = `
      <div class="vh-backdrop"></div>
      <div class="vh-container">
        <div class="vh-header">
          <h3>Version History</h3>
          <button class="vh-close">&times;</button>
        </div>
        <div class="vh-content">
          <div class="vh-list" id="vh-list"></div>
          <div class="vh-preview" id="vh-preview">
            <div class="vh-preview-empty">Select a version to preview</div>
          </div>
        </div>
        <div class="vh-footer">
          <button class="vh-btn vh-btn-secondary" id="vh-cancel">Cancel</button>
          <button class="vh-btn vh-btn-primary" id="vh-restore" disabled>Restore Selected Version</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    const style = document.createElement('style');
    style.textContent = `
      .vh-modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 99998; }
      .vh-modal.open { display: block; }
      .vh-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); }
      .vh-container { position: relative; max-width: 800px; height: 500px; margin: 60px auto; background: var(--bg-primary, #1e1e2e); border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; animation: vhSlideIn 0.2s ease; }
      @keyframes vhSlideIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
      .vh-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border-color, #333); }
      .vh-header h3 { margin: 0; color: var(--text-primary, #fff); }
      .vh-close { background: none; border: none; color: var(--text-muted, #888); font-size: 24px; cursor: pointer; padding: 0 8px; }
      .vh-close:hover { color: var(--text-primary, #fff); }
      .vh-content { display: flex; flex: 1; overflow: hidden; }
      .vh-list { width: 280px; border-right: 1px solid var(--border-color, #333); overflow-y: auto; }
      .vh-preview { flex: 1; padding: 16px; overflow-y: auto; }
      .vh-preview-empty { color: var(--text-muted, #888); text-align: center; padding: 40px; }
      .vh-item { padding: 12px 16px; cursor: pointer; border-bottom: 1px solid var(--border-color, #333); transition: background 0.15s; }
      .vh-item:hover { background: var(--bg-hover, rgba(255,255,255,0.05)); }
      .vh-item.selected { background: var(--accent-color, #7c3aed); }
      .vh-item-version { font-weight: 600; color: var(--text-primary, #fff); margin-bottom: 4px; }
      .vh-item-date { font-size: 12px; color: var(--text-muted, #888); }
      .vh-item.selected .vh-item-date { color: rgba(255,255,255,0.7); }
      .vh-preview-content { background: var(--bg-secondary, #2a2a3e); padding: 16px; border-radius: 8px; white-space: pre-wrap; font-family: monospace; font-size: 13px; color: var(--text-primary, #fff); max-height: 100%; overflow-y: auto; }
      .vh-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 20px; border-top: 1px solid var(--border-color, #333); }
      .vh-btn { padding: 10px 20px; border-radius: 8px; font-weight: 500; cursor: pointer; border: none; transition: all 0.15s; }
      .vh-btn-secondary { background: var(--bg-secondary, #2a2a3e); color: var(--text-primary, #fff); }
      .vh-btn-secondary:hover { background: var(--bg-hover, #3a3a4e); }
      .vh-btn-primary { background: var(--accent-color, #7c3aed); color: white; }
      .vh-btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
      .vh-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
      .vh-empty { text-align: center; padding: 40px 20px; color: var(--text-muted, #888); }
    `;
    document.head.appendChild(style);
    
    modal.querySelector('.vh-backdrop').addEventListener('click', () => this.close());
    modal.querySelector('.vh-close').addEventListener('click', () => this.close());
    modal.querySelector('#vh-cancel').addEventListener('click', () => this.close());
    modal.querySelector('#vh-restore').addEventListener('click', () => this.restore());
    
    this.modal = modal;
  },
  
  async open(type, id, currentContent = '') {
    if (!this.modal) this.init();
    
    this.currentType = type;
    this.currentId = id;
    this.selectedVersion = null;
    
    this.modal.classList.add('open');
    await this.loadVersions();
  },
  
  close() {
    if (this.modal) {
      this.modal.classList.remove('open');
    }
  },
  
  async loadVersions() {
    const token = localStorage.getItem('userToken') || localStorage.getItem('authToken');
    if (!token) return;
    
    const endpoint = this.currentType === 'note' 
      ? `/api/version-history/notes/${this.currentId}`
      : `/api/version-history/tasks/${this.currentId}`;
    
    try {
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        this.versions = await response.json();
        this.renderVersionList();
      }
    } catch (err) {
      console.error('Failed to load versions:', err);
    }
  },
  
  renderVersionList() {
    const list = document.getElementById('vh-list');
    const preview = document.getElementById('vh-preview');
    
    if (this.versions.length === 0) {
      list.innerHTML = '<div class="vh-empty">No version history available</div>';
      preview.innerHTML = '<div class="vh-preview-empty">No versions to preview</div>';
      return;
    }
    
    list.innerHTML = this.versions.map((v, i) => `
      <div class="vh-item" data-index="${i}">
        <div class="vh-item-version">Version ${v.version_number}</div>
        <div class="vh-item-date">${this.formatDate(v.created_at)}</div>
      </div>
    `).join('');
    
    list.querySelectorAll('.vh-item').forEach(el => {
      el.addEventListener('click', () => this.selectVersion(parseInt(el.dataset.index)));
    });
  },
  
  selectVersion(index) {
    const version = this.versions[index];
    if (!version) return;
    
    this.selectedVersion = version;
    
    document.querySelectorAll('.vh-item').forEach(el => el.classList.remove('selected'));
    document.querySelector(`.vh-item[data-index="${index}"]`)?.classList.add('selected');
    
    const preview = document.getElementById('vh-preview');
    const content = this.currentType === 'note' 
      ? version.content 
      : `Title: ${version.title}\nDescription: ${version.description || 'N/A'}\nPriority: ${version.priority || 'normal'}\nCompleted: ${version.completed ? 'Yes' : 'No'}`;
    
    preview.innerHTML = `<div class="vh-preview-content">${this.escapeHtml(content)}</div>`;
    
    document.getElementById('vh-restore').disabled = false;
  },
  
  async restore() {
    if (!this.selectedVersion) return;
    
    const token = localStorage.getItem('userToken') || localStorage.getItem('authToken');
    if (!token) return;
    
    if (this.currentType === 'task') {
      try {
        const response = await fetch(`/api/version-history/tasks/${this.currentId}/restore/${this.selectedVersion.version_number}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          this.close();
          document.dispatchEvent(new CustomEvent('versionRestored', { 
            detail: { type: this.currentType, id: this.currentId, version: this.selectedVersion }
          }));
          if (typeof showNotification === 'function') {
            showNotification('Version restored successfully!', 'success');
          }
        }
      } catch (err) {
        console.error('Restore failed:', err);
      }
    } else {
      document.dispatchEvent(new CustomEvent('versionRestored', { 
        detail: { type: this.currentType, id: this.currentId, version: this.selectedVersion }
      }));
      this.close();
    }
  },
  
  async saveVersion(type, id, data) {
    const token = localStorage.getItem('userToken') || localStorage.getItem('authToken');
    if (!token) return;
    
    const endpoint = type === 'note' 
      ? `/api/version-history/notes/${id}`
      : `/api/version-history/tasks/${id}`;
    
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
    } catch (err) {
      console.error('Failed to save version:', err);
    }
  },
  
  formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
    
    return date.toLocaleDateString();
  },
  
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  VersionHistory.init();
});

if (typeof window !== 'undefined') {
  window.VersionHistory = VersionHistory;
}
