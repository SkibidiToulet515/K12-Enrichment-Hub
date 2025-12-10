// ======================================
// ENHANCED THEME MANAGEMENT - 36 THEMES
// ======================================

const THEMES = {
  nebulacore: { name: 'NebulaCore', category: 'Sci-Fi', icon: '🌌' },
  ocean: { name: 'Deep Ocean', category: 'Nature', icon: '🌊' },
  arcade: { name: 'Neon Arcade', category: 'Gaming', icon: '🕹️' },
  candy: { name: 'Cotton Candy', category: 'Light', icon: '🍭' },
  eclipse: { name: 'Solar Eclipse', category: 'Dark', icon: '🌑' },
  matrix: { name: 'Cyber Matrix', category: 'Sci-Fi', icon: '💻' },
  notebook: { name: 'School Notebook', category: 'Light', icon: '📓' },
  gaming: { name: 'Midnight Gaming', category: 'Gaming', icon: '🎮' },
  pixel: { name: 'Retro Pixel', category: 'Retro', icon: '👾' },
  cloudy: { name: 'Cloudy Day', category: 'Light', icon: '☁️' },
  academia: { name: 'Royal Academia', category: 'Classic', icon: '📚' },
  aurora: { name: 'Aurora Borealis', category: 'Nature', icon: '🌈' },
  cherry: { name: 'Cherry Blossom', category: 'Nature', icon: '🌸' },
  volcanic: { name: 'Volcanic', category: 'Dark', icon: '🌋' },
  forest: { name: 'Forest Depths', category: 'Nature', icon: '🌲' },
  cyberpunk: { name: 'Cyberpunk', category: 'Sci-Fi', icon: '🤖' },
  sunset: { name: 'Sunset Vibes', category: 'Warm', icon: '🌅' },
  arctic: { name: 'Arctic Ice', category: 'Cool', icon: '❄️' },
  grape: { name: 'Grape Soda', category: 'Fun', icon: '🍇' },
  coffee: { name: 'Coffee House', category: 'Classic', icon: '☕' },
  midnight: { name: 'Midnight Purple', category: 'Dark', icon: '🔮' },
  tokyo: { name: 'Neon Tokyo', category: 'Sci-Fi', icon: '🗼' },
  emerald: { name: 'Emerald City', category: 'Nature', icon: '💎' },
  bloodmoon: { name: 'Blood Moon', category: 'Dark', icon: '🩸' },
  cottonblue: { name: 'Cotton Blue', category: 'Light', icon: '🩵' },
  steampunk: { name: 'Steampunk', category: 'Retro', icon: '⚙️' },
  lavender: { name: 'Lavender Dream', category: 'Light', icon: '💜' },
  spacegray: { name: 'Space Gray', category: 'Minimal', icon: '🌑' },
  mint: { name: 'Mint Fresh', category: 'Light', icon: '🍃' },
  darkrose: { name: 'Dark Rose', category: 'Dark', icon: '🌹' },
  electric: { name: 'Electric Blue', category: 'Neon', icon: '⚡' },
  golden: { name: 'Golden Hour', category: 'Warm', icon: '✨' },
  synthwave: { name: 'Synthwave', category: 'Retro', icon: '🎵' },
  breeze: { name: 'Ocean Breeze', category: 'Light', icon: '🌴' },
  mono: { name: 'Dark Mono', category: 'Minimal', icon: '⬛' },
  jungle: { name: 'Neon Jungle', category: 'Nature', icon: '🌿' }
};

const THEME_CATEGORIES = [
  { id: 'all', name: 'All Themes', icon: '🎨' },
  { id: 'Sci-Fi', name: 'Sci-Fi', icon: '🚀' },
  { id: 'Gaming', name: 'Gaming', icon: '🎮' },
  { id: 'Nature', name: 'Nature', icon: '🌿' },
  { id: 'Dark', name: 'Dark', icon: '🌙' },
  { id: 'Light', name: 'Light', icon: '☀️' },
  { id: 'Neon', name: 'Neon', icon: '💡' },
  { id: 'Retro', name: 'Retro', icon: '📺' },
  { id: 'Warm', name: 'Warm', icon: '🔥' },
  { id: 'Cool', name: 'Cool', icon: '❄️' },
  { id: 'Classic', name: 'Classic', icon: '📖' },
  { id: 'Minimal', name: 'Minimal', icon: '⬜' },
  { id: 'Fun', name: 'Fun', icon: '🎉' }
];

// Initialize theme on page load
function initTheme() {
  // Check for custom theme first
  const customTheme = localStorage.getItem('customTheme');
  if (customTheme) {
    try {
      applyCustomTheme(JSON.parse(customTheme));
      createStarField();
      return;
    } catch (e) {
      console.error('Failed to parse custom theme:', e);
    }
  }
  
  const saved = localStorage.getItem('theme') || 'nebulacore';
  applyTheme(saved);
  updateThemeSelector(saved);
  createStarField();
}

// Apply a custom theme from theme creator
function applyCustomTheme(themeData) {
  if (!themeData || !themeData.colors) return;
  
  const colors = themeData.colors;
  const root = document.documentElement;
  
  // Apply custom CSS variables
  root.style.setProperty('--bg', colors.bg);
  root.style.setProperty('--bg-secondary', colors.bgSecondary);
  root.style.setProperty('--bg-tertiary', colors.card);
  root.style.setProperty('--accent', colors.accent);
  root.style.setProperty('--primary', colors.accent);
  root.style.setProperty('--text', colors.text);
  root.style.setProperty('--text-secondary', colors.text + 'aa');
  root.style.setProperty('--border', colors.border);
  root.style.setProperty('--card', colors.card);
  root.style.setProperty('--glass-bg', colors.card + 'cc');
  root.style.setProperty('--glass-border', colors.border);
  
  // Mark as custom theme
  root.setAttribute('data-theme', 'custom');
  
  // Update star colors
  if (window.updateStarColors) {
    window.updateStarColors();
  }
}

// Clear custom theme and use preset
function clearCustomTheme() {
  localStorage.removeItem('customTheme');
  document.documentElement.style.cssText = '';
  const saved = localStorage.getItem('theme') || 'nebulacore';
  applyTheme(saved);
}

// Apply theme to document
function applyTheme(themeId) {
  // Clear any custom theme styles
  document.documentElement.style.cssText = '';
  localStorage.removeItem('customTheme');
  
  if (!THEMES[themeId]) themeId = 'nebulacore';
  document.documentElement.setAttribute('data-theme', themeId);
  localStorage.setItem('theme', themeId);
  updateThemeSelector(themeId);
  
  // Update star colors for particle system
  if (window.updateStarColors) {
    window.updateStarColors();
  }
}

// Update theme selector dropdown
function updateThemeSelector(themeId) {
  const selector = document.getElementById('themeSelector');
  if (selector) {
    selector.value = themeId;
  }
}

// Create star field background effect
function createStarField() {
  // Check if star field already exists
  if (document.getElementById('star-field-canvas')) return;
  
  const canvas = document.createElement('canvas');
  canvas.id = 'star-field-canvas';
  canvas.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    pointer-events: none;
    opacity: 0.6;
  `;
  document.body.insertBefore(canvas, document.body.firstChild);
  
  const ctx = canvas.getContext('2d');
  let stars = [];
  let animationId;
  
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initStars();
  }
  
  function initStars() {
    stars = [];
    const numStars = Math.floor((canvas.width * canvas.height) / 10000);
    for (let i = 0; i < Math.min(numStars, 200); i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.3 + 0.05,
        opacity: Math.random() * 0.8 + 0.2,
        twinkle: Math.random() * Math.PI * 2
      });
    }
  }
  
  function getStarColor() {
    const style = getComputedStyle(document.documentElement);
    return style.getPropertyValue('--star-color').trim() || '#4CC9F0';
  }
  
  window.updateStarColors = function() {
    // Colors will be fetched on next render
  };
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const starColor = getStarColor();
    
    stars.forEach(star => {
      star.twinkle += 0.02;
      star.y += star.speed;
      
      if (star.y > canvas.height) {
        star.y = 0;
        star.x = Math.random() * canvas.width;
      }
      
      const twinkleOpacity = star.opacity * (0.5 + 0.5 * Math.sin(star.twinkle));
      
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = starColor.replace(')', `, ${twinkleOpacity})`).replace('rgb', 'rgba');
      
      // Fallback if color format doesn't match
      if (!ctx.fillStyle.includes('rgba')) {
        ctx.fillStyle = `rgba(76, 201, 240, ${twinkleOpacity})`;
      }
      
      ctx.fill();
    });
    
    animationId = requestAnimationFrame(animate);
  }
  
  window.addEventListener('resize', resize);
  resize();
  animate();
}

// Generate theme selector HTML with all 36 themes
function generateThemeSelectorHTML() {
  let html = '';
  Object.entries(THEMES).forEach(([id, theme]) => {
    html += `<option value="${id}">${theme.icon} ${theme.name}</option>\n`;
  });
  return html;
}

// Create theme modal for enhanced theme selection
function createThemeModal() {
  if (document.getElementById('theme-modal')) return;
  
  const modal = document.createElement('div');
  modal.id = 'theme-modal';
  modal.className = 'theme-modal-overlay';
  modal.innerHTML = `
    <div class="theme-modal">
      <div class="theme-modal-header">
        <h2>Choose Your Theme</h2>
        <button class="theme-modal-close" onclick="closeThemeModal()">&times;</button>
      </div>
      <div class="theme-modal-categories" id="themeCategoryFilter">
        ${THEME_CATEGORIES.map(cat => `
          <button class="theme-category-btn ${cat.id === 'all' ? 'active' : ''}" 
                  data-category="${cat.id}" 
                  onclick="filterThemesByCategory('${cat.id}')">
            ${cat.icon} ${cat.name}
          </button>
        `).join('')}
      </div>
      <div class="theme-modal-grid" id="themeGrid">
        ${Object.entries(THEMES).map(([id, theme]) => `
          <div class="theme-card" data-theme="${id}" data-category="${theme.category}" onclick="selectTheme('${id}')">
            <div class="theme-card-preview theme-preview-${id}">
              <span class="theme-card-icon">${theme.icon}</span>
            </div>
            <div class="theme-card-name">${theme.name}</div>
            <div class="theme-card-category">${theme.category}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Add modal styles
  addThemeModalStyles();
}

function addThemeModalStyles() {
  if (document.getElementById('theme-modal-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'theme-modal-styles';
  styles.textContent = `
    .theme-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    }
    
    .theme-modal-overlay.active {
      opacity: 1;
      visibility: visible;
    }
    
    .theme-modal {
      background: var(--glass-bg, rgba(20, 20, 30, 0.95));
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
      border-radius: 24px;
      width: 90%;
      max-width: 900px;
      max-height: 85vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transform: scale(0.9);
      transition: transform 0.3s ease;
    }
    
    .theme-modal-overlay.active .theme-modal {
      transform: scale(1);
    }
    
    .theme-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 28px;
      border-bottom: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
    }
    
    .theme-modal-header h2 {
      margin: 0;
      font-size: 1.5rem;
      background: var(--gradient-primary, linear-gradient(135deg, #4CC9F0, #A04FF9));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .theme-modal-close {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: var(--text, white);
      font-size: 24px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .theme-modal-close:hover {
      background: var(--primary, #4CC9F0);
      transform: rotate(90deg);
    }
    
    .theme-modal-categories {
      display: flex;
      gap: 8px;
      padding: 16px 28px;
      overflow-x: auto;
      border-bottom: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
    }
    
    .theme-category-btn {
      padding: 8px 16px;
      border-radius: 20px;
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
      background: transparent;
      color: var(--text-secondary, #aaa);
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    
    .theme-category-btn:hover {
      border-color: var(--primary, #4CC9F0);
      color: var(--primary, #4CC9F0);
    }
    
    .theme-category-btn.active {
      background: var(--primary, #4CC9F0);
      border-color: var(--primary, #4CC9F0);
      color: var(--bg, #0D1B2A);
    }
    
    .theme-modal-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 16px;
      padding: 24px 28px;
      overflow-y: auto;
      max-height: calc(85vh - 180px);
    }
    
    .theme-card {
      background: var(--card, rgba(30, 30, 40, 0.8));
      border: 2px solid transparent;
      border-radius: 16px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-align: center;
    }
    
    .theme-card:hover {
      border-color: var(--primary, #4CC9F0);
      transform: translateY(-4px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }
    
    .theme-card.active {
      border-color: var(--primary, #4CC9F0);
      box-shadow: 0 0 20px var(--primary-glow, rgba(76, 201, 240, 0.5));
    }
    
    .theme-card-preview {
      height: 80px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 10px;
      position: relative;
      overflow: hidden;
    }
    
    .theme-card-icon {
      font-size: 32px;
      filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
    }
    
    .theme-card-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, white);
      margin-bottom: 4px;
    }
    
    .theme-card-category {
      font-size: 11px;
      color: var(--text-muted, #888);
    }
    
    .theme-card.hidden {
      display: none;
    }
    
    /* Theme preview backgrounds */
    .theme-preview-nebulacore { background: linear-gradient(135deg, #0D1B2A, #1B263B); }
    .theme-preview-ocean { background: linear-gradient(135deg, #0a0e27, #1a1f3a); }
    .theme-preview-arcade { background: linear-gradient(135deg, #0a0a0a, #1a1a1a); border: 1px solid #ff00ff; }
    .theme-preview-candy { background: linear-gradient(135deg, #fff5f8, #ffe8f0); }
    .theme-preview-eclipse { background: linear-gradient(135deg, #0d0d0d, #1a1a1a); border: 1px solid #ffd700; }
    .theme-preview-matrix { background: linear-gradient(135deg, #0a0a0a, #0d1a0d); border: 1px solid #00ff00; }
    .theme-preview-notebook { background: linear-gradient(135deg, #f0f0f0, #e8e8e8); }
    .theme-preview-gaming { background: linear-gradient(135deg, #0a0a14, #1a1a2e); border: 1px solid #00d9ff; }
    .theme-preview-pixel { background: linear-gradient(135deg, #1a1a2e, #16213e); border: 1px solid #ff00ff; }
    .theme-preview-cloudy { background: linear-gradient(135deg, #e8eef3, #d4dfe8); }
    .theme-preview-academia { background: linear-gradient(135deg, #1a1410, #2a221a); border: 1px solid #d4af37; }
    .theme-preview-aurora { background: linear-gradient(135deg, #0a1628, #102035); border: 1px solid #4fd1c5; }
    .theme-preview-cherry { background: linear-gradient(135deg, #1a1215, #2a1f22); border: 1px solid #f48fb1; }
    .theme-preview-volcanic { background: linear-gradient(135deg, #1a0a0a, #2a1010); border: 1px solid #ff6b35; }
    .theme-preview-forest { background: linear-gradient(135deg, #0a1a0f, #102a18); border: 1px solid #66bb6a; }
    .theme-preview-cyberpunk { background: linear-gradient(135deg, #0d0221, #1a0533); border: 1px solid #f72585; }
    .theme-preview-sunset { background: linear-gradient(135deg, #1a0f15, #2a1520); border: 1px solid #ff7f50; }
    .theme-preview-arctic { background: linear-gradient(135deg, #0a1520, #102030); border: 1px solid #00bcd4; }
    .theme-preview-grape { background: linear-gradient(135deg, #1a0a2e, #2a1048); border: 1px solid #9c27b0; }
    .theme-preview-coffee { background: linear-gradient(135deg, #1a1510, #2a2218); border: 1px solid #a67c52; }
    .theme-preview-midnight { background: linear-gradient(135deg, #0f0a1a, #1a1030); border: 1px solid #8b5cf6; }
    .theme-preview-tokyo { background: linear-gradient(135deg, #0a0a12, #141420); border: 1px solid #ff1493; }
    .theme-preview-emerald { background: linear-gradient(135deg, #0a1a15, #103025); border: 1px solid #10b981; }
    .theme-preview-bloodmoon { background: linear-gradient(135deg, #0a0508, #1a0a10); border: 1px solid #dc2626; }
    .theme-preview-cottonblue { background: linear-gradient(135deg, #f0f8ff, #e0f0ff); }
    .theme-preview-steampunk { background: linear-gradient(135deg, #1a1408, #2a2210); border: 1px solid #cd7f32; }
    .theme-preview-lavender { background: linear-gradient(135deg, #f8f5ff, #f0e8ff); }
    .theme-preview-spacegray { background: linear-gradient(135deg, #1c1c1e, #2c2c2e); }
    .theme-preview-mint { background: linear-gradient(135deg, #f0fff8, #e0fff0); }
    .theme-preview-darkrose { background: linear-gradient(135deg, #1a0a10, #2a1018); border: 1px solid #e11d48; }
    .theme-preview-electric { background: linear-gradient(135deg, #000814, #001d3d); border: 1px solid #00b4d8; }
    .theme-preview-golden { background: linear-gradient(135deg, #1a1408, #2a2010); border: 1px solid #f59e0b; }
    .theme-preview-synthwave { background: linear-gradient(135deg, #090014, #15002a); border: 1px solid #ff71ce; }
    .theme-preview-breeze { background: linear-gradient(135deg, #f0fdfa, #e0f7f5); }
    .theme-preview-mono { background: linear-gradient(135deg, #0a0a0a, #141414); }
    .theme-preview-jungle { background: linear-gradient(135deg, #021a09, #042b10); border: 1px solid #22c55e; }
    
    @media (max-width: 600px) {
      .theme-modal-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      
      .theme-modal-categories {
        padding: 12px 16px;
      }
      
      .theme-category-btn {
        padding: 6px 12px;
        font-size: 12px;
      }
    }
  `;
  document.head.appendChild(styles);
}

// Open theme modal
function openThemeModal() {
  createThemeModal();
  const modal = document.getElementById('theme-modal');
  if (modal) {
    modal.classList.add('active');
    highlightCurrentTheme();
  }
}

// Close theme modal
function closeThemeModal() {
  const modal = document.getElementById('theme-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// Select theme from modal
function selectTheme(themeId) {
  applyTheme(themeId);
  highlightCurrentTheme();
  
  // Brief animation feedback
  const card = document.querySelector(`.theme-card[data-theme="${themeId}"]`);
  if (card) {
    card.style.transform = 'scale(1.1)';
    setTimeout(() => {
      card.style.transform = '';
    }, 200);
  }
}

// Highlight current theme in modal
function highlightCurrentTheme() {
  const current = localStorage.getItem('theme') || 'nebulacore';
  document.querySelectorAll('.theme-card').forEach(card => {
    card.classList.toggle('active', card.dataset.theme === current);
  });
}

// Filter themes by category
function filterThemesByCategory(category) {
  // Update active category button
  document.querySelectorAll('.theme-category-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === category);
  });
  
  // Filter theme cards
  document.querySelectorAll('.theme-card').forEach(card => {
    if (category === 'all' || card.dataset.category === category) {
      card.classList.remove('hidden');
    } else {
      card.classList.add('hidden');
    }
  });
}

// Get current theme info
function getCurrentTheme() {
  const themeId = localStorage.getItem('theme') || 'nebulacore';
  return { id: themeId, ...THEMES[themeId] };
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  
  // Setup theme selector dropdown if exists
  const selector = document.getElementById('themeSelector');
  if (selector) {
    // Populate with all themes
    selector.innerHTML = generateThemeSelectorHTML();
    selector.value = localStorage.getItem('theme') || 'nebulacore';
    
    selector.addEventListener('change', (e) => {
      applyTheme(e.target.value);
    });
    
    // Add click handler to open modal on double-click
    selector.addEventListener('dblclick', (e) => {
      e.preventDefault();
      openThemeModal();
    });
  }
  
  // Add theme button if exists
  const themeBtn = document.getElementById('openThemeModalBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', openThemeModal);
  }
});

// Close modal on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeThemeModal();
  }
});

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('theme-modal-overlay')) {
    closeThemeModal();
  }
});

// Export for use in other scripts
window.THEMES = THEMES;
window.THEME_CATEGORIES = THEME_CATEGORIES;
window.applyTheme = applyTheme;
window.openThemeModal = openThemeModal;
window.closeThemeModal = closeThemeModal;
window.selectTheme = selectTheme;
window.filterThemesByCategory = filterThemesByCategory;
window.getCurrentTheme = getCurrentTheme;
