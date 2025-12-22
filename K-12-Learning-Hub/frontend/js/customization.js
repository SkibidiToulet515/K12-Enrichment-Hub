const Customization = {
  customCursors: {
    neon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="8" fill="none" stroke="%2300ffff" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="%2300ffff"/></svg>',
    retro: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="4" height="4" fill="%23000"/><rect x="4" y="4" width="4" height="4" fill="%23000"/><rect x="8" y="8" width="4" height="4" fill="%23000"/><rect x="12" y="12" width="4" height="4" fill="%23000"/></svg>',
    minimal: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><circle cx="6" cy="6" r="5" fill="%23fff" stroke="%23000" stroke-width="1"/></svg>'
  },

  soundEffects: {
    chime: [523.25, 659.25, 783.99],
    pop: [880],
    ding: [1046.5],
    swoosh: [200, 400, 600],
    bubble: [300, 450],
    bell: [440, 554.37, 659.25],
    click: [1000],
    tap: [800],
    soft: [400]
  },

  audioContext: null,

  init() {
    this.applyCursor();
    this.setupClickSounds();
  },

  applyCursor(style) {
    style = style || localStorage.getItem('cursorStyle') || 'default';
    if (this.customCursors[style]) {
      document.body.style.cursor = `url("${this.customCursors[style]}") 12 12, auto`;
    } else if (style === 'default') {
      document.body.style.cursor = '';
    } else {
      document.body.style.cursor = style;
    }
  },

  getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
  },

  playTone(frequencies, duration = 0.1) {
    if (localStorage.getItem('soundsEnabled') === 'false') return;
    
    const ctx = this.getAudioContext();
    const volume = (parseInt(localStorage.getItem('soundVolume') || '50')) / 100;
    
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.value = volume * 0.3;
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.start(ctx.currentTime + (i * 0.05));
      osc.stop(ctx.currentTime + duration + (i * 0.05));
    });
  },

  playNotification() {
    const sound = localStorage.getItem('notifSound') || 'chime';
    if (this.soundEffects[sound]) {
      this.playTone(this.soundEffects[sound]);
    }
  },

  playClick() {
    const sound = localStorage.getItem('clickSound') || 'none';
    if (sound !== 'none' && this.soundEffects[sound]) {
      this.playTone(this.soundEffects[sound], 0.05);
    }
  },

  setupClickSounds() {
    document.addEventListener('click', (e) => {
      if (e.target.matches('button, .btn, .app-card, .setting-btn, a')) {
        this.playClick();
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => Customization.init());
