const SOUNDS = [
  { id: 'airhorn', name: 'Airhorn', category: 'memes', icon: '📢', url: '/sounds/airhorn.mp3' },
  { id: 'bruh', name: 'Bruh', category: 'memes', icon: '😐', url: '/sounds/bruh.mp3' },
  { id: 'sad-trombone', name: 'Sad Trombone', category: 'memes', icon: '🎺', url: '/sounds/sad-trombone.mp3' },
  { id: 'wow', name: 'WOW', category: 'memes', icon: '😮', url: '/sounds/wow.mp3' },
  { id: 'oof', name: 'Oof', category: 'memes', icon: '💀', url: '/sounds/oof.mp3' },
  { id: 'vineboom', name: 'Boom', category: 'memes', icon: '💥', url: '/sounds/boom.mp3' },
  { id: 'nope', name: 'Nope', category: 'memes', icon: '🙅', url: '/sounds/nope.mp3' },
  { id: 'what', name: 'What?!', category: 'memes', icon: '❓', url: '/sounds/what.mp3' },
  { id: 'fail', name: 'Fail', category: 'memes', icon: '❌', url: '/sounds/fail.mp3' },
  { id: 'dramatic', name: 'Dramatic', category: 'memes', icon: '🎭', url: '/sounds/dramatic.mp3' },
  { id: 'surprised', name: 'Surprised', category: 'memes', icon: '😲', url: '/sounds/surprised.mp3' },
  { id: 'bell-ding', name: 'Bell Ding', category: 'memes', icon: '🔔', url: '/sounds/bell.mp3' },
  { id: 'error', name: 'Error', category: 'memes', icon: '💻', url: '/sounds/error.mp3' },
  { id: 'metal-clang', name: 'Metal Clang', category: 'memes', icon: '🔧', url: '/sounds/clang.mp3' },
  
  { id: 'levelup', name: 'Level Up', category: 'games', icon: '⬆️', url: '/sounds/levelup.mp3' },
  { id: 'coin', name: 'Coin', category: 'games', icon: '🪙', url: '/sounds/coin.mp3' },
  { id: '1up', name: '1-Up', category: 'games', icon: '🍄', url: '/sounds/1up.mp3' },
  { id: 'powerup', name: 'Power Up', category: 'games', icon: '⭐', url: '/sounds/powerup.mp3' },
  { id: 'gameover', name: 'Game Over', category: 'games', icon: '☠️', url: '/sounds/gameover.mp3' },
  { id: 'victory', name: 'Victory', category: 'games', icon: '🏆', url: '/sounds/victory.mp3' },
  { id: 'explosion', name: 'Explosion', category: 'games', icon: '💣', url: '/sounds/explosion.mp3' },
  { id: 'collect', name: 'Collect', category: 'games', icon: '✨', url: '/sounds/collect.mp3' },
  { id: 'hit', name: 'Hit', category: 'games', icon: '💔', url: '/sounds/hit.mp3' },
  { id: 'secret', name: 'Secret Found', category: 'games', icon: '🗝️', url: '/sounds/secret.mp3' },
  { id: 'ring', name: 'Ring', category: 'games', icon: '💍', url: '/sounds/ring.mp3' },
  { id: 'success', name: 'Success', category: 'games', icon: '🧱', url: '/sounds/success.mp3' },
  
  { id: 'dog-bark', name: 'Dog Bark', category: 'animals', icon: '🐕', url: '/sounds/dog.mp3' },
  { id: 'cat-meow', name: 'Cat Meow', category: 'animals', icon: '🐱', url: '/sounds/cat.mp3' },
  { id: 'duck-quack', name: 'Duck Quack', category: 'animals', icon: '🦆', url: '/sounds/duck.mp3' },
  { id: 'cow-moo', name: 'Cow Moo', category: 'animals', icon: '🐄', url: '/sounds/cow.mp3' },
  { id: 'chicken', name: 'Chicken', category: 'animals', icon: '🐔', url: '/sounds/chicken.mp3' },
  { id: 'rooster', name: 'Rooster', category: 'animals', icon: '🐓', url: '/sounds/rooster.mp3' },
  { id: 'frog', name: 'Frog Ribbit', category: 'animals', icon: '🐸', url: '/sounds/frog.mp3' },
  { id: 'horse', name: 'Horse Neigh', category: 'animals', icon: '🐴', url: '/sounds/horse.mp3' },
  { id: 'elephant', name: 'Elephant', category: 'animals', icon: '🐘', url: '/sounds/elephant.mp3' },
  { id: 'lion-roar', name: 'Lion Roar', category: 'animals', icon: '🦁', url: '/sounds/lion.mp3' },
  { id: 'owl', name: 'Owl Hoot', category: 'animals', icon: '🦉', url: '/sounds/owl.mp3' },
  { id: 'wolf', name: 'Wolf Howl', category: 'animals', icon: '🐺', url: '/sounds/wolf.mp3' },
  
  { id: 'drum-roll', name: 'Drum Roll', category: 'music', icon: '🥁', url: '/sounds/drumroll.mp3' },
  { id: 'rimshot', name: 'Rimshot', category: 'music', icon: '🎭', url: '/sounds/rimshot.mp3' },
  { id: 'cymbal', name: 'Cymbal Crash', category: 'music', icon: '🎵', url: '/sounds/cymbal.mp3' },
  { id: 'guitar-riff', name: 'Guitar Riff', category: 'music', icon: '🎸', url: '/sounds/guitar.mp3' },
  { id: 'piano-chord', name: 'Piano Chord', category: 'music', icon: '🎹', url: '/sounds/piano.mp3' },
  { id: 'violin', name: 'Violin', category: 'music', icon: '🎻', url: '/sounds/violin.mp3' },
  { id: 'trumpet', name: 'Trumpet', category: 'music', icon: '🎺', url: '/sounds/trumpet.mp3' },
  { id: 'dj-scratch', name: 'DJ Scratch', category: 'music', icon: '🎧', url: '/sounds/scratch.mp3' },
  { id: 'horn', name: 'Air Horn', category: 'music', icon: '🎉', url: '/sounds/horn.mp3' },
  { id: 'beat-drop', name: 'Beat Drop', category: 'music', icon: '🔊', url: '/sounds/beatdrop.mp3' },
  { id: 'bass', name: 'Bass Hit', category: 'music', icon: '🎸', url: '/sounds/bass.mp3' },
  { id: 'snare', name: 'Snare Drum', category: 'music', icon: '🥁', url: '/sounds/snare.mp3' },
  
  { id: 'whoosh', name: 'Whoosh', category: 'effects', icon: '💨', url: '/sounds/whoosh.mp3' },
  { id: 'boing', name: 'Boing', category: 'effects', icon: '🔄', url: '/sounds/boing.mp3' },
  { id: 'pop', name: 'Pop', category: 'effects', icon: '💫', url: '/sounds/pop.mp3' },
  { id: 'ding', name: 'Ding', category: 'effects', icon: '🔔', url: '/sounds/ding.mp3' },
  { id: 'buzzer', name: 'Buzzer', category: 'effects', icon: '🚨', url: '/sounds/buzzer.mp3' },
  { id: 'correct', name: 'Correct', category: 'effects', icon: '✅', url: '/sounds/correct.mp3' },
  { id: 'applause', name: 'Applause', category: 'effects', icon: '👏', url: '/sounds/applause.mp3' },
  { id: 'laugh-track', name: 'Laugh Track', category: 'effects', icon: '😂', url: '/sounds/laugh.mp3' },
  { id: 'gasp', name: 'Gasp', category: 'effects', icon: '😱', url: '/sounds/gasp.mp3' },
  { id: 'suspense', name: 'Suspense', category: 'effects', icon: '🎬', url: '/sounds/suspense.mp3' },
  { id: 'magic', name: 'Magic', category: 'effects', icon: '🪄', url: '/sounds/magic.mp3' },
  { id: 'thunder', name: 'Thunder', category: 'effects', icon: '⛈️', url: '/sounds/thunder.mp3' },
  { id: 'laser', name: 'Laser', category: 'effects', icon: '⚡', url: '/sounds/laser.mp3' },
  { id: 'alarm', name: 'Alarm', category: 'effects', icon: '🚨', url: '/sounds/alarm.mp3' },
  { id: 'click', name: 'Click', category: 'effects', icon: '👆', url: '/sounds/click.mp3' },
  { id: 'swoosh', name: 'Swoosh', category: 'effects', icon: '🌀', url: '/sounds/swoosh.mp3' }
];

let currentAudio = null;
let currentSoundId = null;
let favorites = JSON.parse(localStorage.getItem('soundboard_favorites') || '[]');
let customSounds = [];
let cachedSounds = [];
let masterVolume = parseInt(localStorage.getItem('soundboard_volume') || '50') / 100;
let isAdmin = false;
let myinstantsPage = 1;
let lastSearchQuery = '';
let lastSearchType = '';

document.addEventListener('DOMContentLoaded', async () => {
  checkAuth();
  initVolumeControl();
  loadCustomSounds();
  loadCachedSounds();
  renderSounds();
  initFilters();
  initSearch();
  initMyInstantsSearch();
});

function getAuthToken() {
  return localStorage.getItem('userToken') || localStorage.getItem('authToken');
}

async function checkAuth() {
  const token = getAuthToken();
  if (!token) return;
  
  try {
    const res = await fetch('/api/users/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const user = await res.json();
      isAdmin = user.role === 'admin';
      if (isAdmin) {
        document.getElementById('adminPanel').style.display = 'block';
        initAdminUpload();
      }
    }
  } catch (e) {
    console.error('Auth check failed:', e);
  }
}

function initVolumeControl() {
  const volumeSlider = document.getElementById('masterVolume');
  const volumeValue = document.getElementById('volumeValue');
  
  volumeSlider.value = masterVolume * 100;
  volumeValue.textContent = Math.round(masterVolume * 100) + '%';
  updateVolumeIcon();
  
  volumeSlider.addEventListener('input', (e) => {
    masterVolume = e.target.value / 100;
    volumeValue.textContent = e.target.value + '%';
    localStorage.setItem('soundboard_volume', e.target.value);
    updateVolumeIcon();
    if (currentAudio) {
      currentAudio.volume = masterVolume;
    }
  });
}

function updateVolumeIcon() {
  const icon = document.querySelector('.volume-icon');
  if (masterVolume === 0) {
    icon.textContent = '🔇';
  } else if (masterVolume < 0.5) {
    icon.textContent = '🔉';
  } else {
    icon.textContent = '🔊';
  }
}

async function loadCustomSounds() {
  const token = getAuthToken();
  if (!token) return;
  
  try {
    const res = await fetch('/api/soundboard/custom', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      customSounds = await res.json();
      renderSounds();
    }
  } catch (e) {
    console.error('Failed to load custom sounds:', e);
  }
}

async function loadCachedSounds() {
  try {
    const res = await fetch('/api/soundboard/cached');
    if (res.ok) {
      cachedSounds = await res.json();
      renderSounds();
    }
  } catch (e) {
    console.error('Failed to load cached sounds:', e);
  }
}

function getAllSounds() {
  const all = [
    ...SOUNDS,
    ...cachedSounds.map(s => ({
      id: `cached-${s.id}`,
      name: s.name,
      category: 'cached',
      icon: '💾',
      url: s.local_path,
      isCached: true,
      playCount: s.play_count
    })),
    ...customSounds.map(s => ({
      ...s,
      icon: getCategoryIcon(s.category),
      isCustom: true
    }))
  ];
  return all;
}

function getCategoryIcon(category) {
  const icons = {
    memes: '😂',
    games: '🎮',
    animals: '🐾',
    music: '🎵',
    effects: '✨',
    custom: '📁',
    cached: '💾'
  };
  return icons[category] || '🔊';
}

function renderSounds(filter = 'all', searchTerm = '') {
  const grid = document.getElementById('soundsGrid');
  const noResults = document.getElementById('noResults');
  
  let sounds = getAllSounds();
  
  if (filter === 'favorites') {
    sounds = sounds.filter(s => favorites.includes(s.id));
  } else if (filter === 'cached') {
    sounds = sounds.filter(s => s.isCached);
  } else if (filter !== 'all') {
    sounds = sounds.filter(s => s.category === filter);
  }
  
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    sounds = sounds.filter(s => 
      s.name.toLowerCase().includes(term) || 
      s.category.toLowerCase().includes(term)
    );
  }
  
  if (sounds.length === 0) {
    grid.innerHTML = '';
    noResults.style.display = 'block';
    return;
  }
  
  noResults.style.display = 'none';
  
  grid.innerHTML = sounds.map(sound => `
    <div class="sound-card ${currentSoundId === sound.id ? 'playing' : ''}" 
         data-id="${sound.id}" 
         onclick="playSound('${sound.id}')">
      ${sound.isCustom && isAdmin ? `<button class="delete-btn" onclick="event.stopPropagation(); deleteCustomSound('${sound.id}')">🗑️</button>` : ''}
      <button class="favorite-btn ${favorites.includes(sound.id) ? 'active' : ''}" 
              onclick="event.stopPropagation(); toggleFavorite('${sound.id}')">
        ${favorites.includes(sound.id) ? '❤️' : '🤍'}
      </button>
      <span class="sound-icon">${sound.icon}</span>
      <div class="sound-name">${sound.name}</div>
      <div class="sound-category">${sound.category}${sound.playCount ? ` (${sound.playCount} plays)` : ''}</div>
    </div>
  `).join('');
}

function playSound(soundId) {
  const sound = getAllSounds().find(s => s.id === soundId);
  if (!sound) return;
  
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  
  document.querySelectorAll('.sound-card').forEach(card => {
    card.classList.remove('playing');
  });
  
  // Always use proxy for external URLs to avoid CORS issues
  let audioUrl = sound.url;
  if (sound.url.startsWith('http')) {
    audioUrl = `/api/soundboard/proxy?url=${encodeURIComponent(sound.url)}`;
  }
  
  const audio = new Audio(audioUrl);
  audio.volume = masterVolume;
  currentAudio = audio;
  currentSoundId = soundId;
  
  const card = document.querySelector(`[data-id="${soundId}"]`);
  if (card) card.classList.add('playing');
  
  const nowPlaying = document.getElementById('nowPlaying');
  const nowPlayingText = document.getElementById('nowPlayingText');
  nowPlayingText.textContent = sound.name;
  nowPlaying.style.display = 'flex';
  
  audio.play().catch(e => {
    console.error('Playback failed:', e);
    nowPlayingText.textContent = 'Failed to play';
    setTimeout(hideNowPlaying, 1500);
  });
  
  audio.onended = () => {
    hideNowPlaying();
  };
  
  document.getElementById('stopSound').onclick = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    hideNowPlaying();
  };
}

function tryBackupSound(sound) {
  const backupAudio = new Audio(`/api/soundboard/proxy?url=${encodeURIComponent(sound.url)}`);
  backupAudio.volume = masterVolume;
  currentAudio = backupAudio;
  
  const nowPlayingText = document.getElementById('nowPlayingText');
  nowPlayingText.textContent = sound.name;
  
  backupAudio.play().catch(e => {
    console.error('Backup also failed:', e);
    nowPlayingText.textContent = 'Failed to play';
    setTimeout(hideNowPlaying, 1500);
  });
  
  backupAudio.onended = () => {
    hideNowPlaying();
  };
}

function hideNowPlaying() {
  currentSoundId = null;
  document.querySelectorAll('.sound-card').forEach(card => {
    card.classList.remove('playing');
  });
  document.getElementById('nowPlaying').style.display = 'none';
}

function toggleFavorite(soundId) {
  const idx = favorites.indexOf(soundId);
  if (idx > -1) {
    favorites.splice(idx, 1);
  } else {
    favorites.push(soundId);
  }
  localStorage.setItem('soundboard_favorites', JSON.stringify(favorites));
  
  const activeFilter = document.querySelector('.filter-tab.active').dataset.category;
  const searchTerm = document.getElementById('searchInput').value;
  renderSounds(activeFilter, searchTerm);
  
  saveFavoritesToServer();
}

async function saveFavoritesToServer() {
  const token = getAuthToken();
  if (!token) return;
  
  try {
    await fetch('/api/soundboard/favorites', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ favorites })
    });
  } catch (e) {
    console.error('Failed to save favorites:', e);
  }
}

async function loadFavoritesFromServer() {
  const token = getAuthToken();
  if (!token) return;
  
  try {
    const res = await fetch('/api/soundboard/favorites', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.favorites && data.favorites.length > 0) {
        favorites = data.favorites;
        localStorage.setItem('soundboard_favorites', JSON.stringify(favorites));
        renderSounds();
      }
    }
  } catch (e) {
    console.error('Failed to load favorites:', e);
  }
}

function initFilters() {
  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const searchTerm = document.getElementById('searchInput').value;
      renderSounds(tab.dataset.category, searchTerm);
    });
  });
}

function initSearch() {
  const input = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearch');
  
  input.addEventListener('input', (e) => {
    const activeFilter = document.querySelector('.filter-tab.active').dataset.category;
    renderSounds(activeFilter, e.target.value);
  });
  
  clearBtn.addEventListener('click', () => {
    input.value = '';
    const activeFilter = document.querySelector('.filter-tab.active').dataset.category;
    renderSounds(activeFilter, '');
  });
}

function initMyInstantsSearch() {
  const searchBtn = document.getElementById('myinstantsSearchBtn');
  const trendingBtn = document.getElementById('loadTrending');
  const searchInput = document.getElementById('myinstantsSearch');
  const loadMoreBtn = document.getElementById('loadMoreResults');
  
  searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
      myinstantsPage = 1;
      lastSearchQuery = query;
      lastSearchType = 'search';
      searchMyInstants(query, 1);
    }
  });
  
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchBtn.click();
    }
  });
  
  trendingBtn.addEventListener('click', () => {
    myinstantsPage = 1;
    lastSearchType = 'trending';
    loadTrending(1);
  });
  
  loadMoreBtn.addEventListener('click', () => {
    myinstantsPage++;
    if (lastSearchType === 'trending') {
      loadTrending(myinstantsPage, true);
    } else {
      searchMyInstants(lastSearchQuery, myinstantsPage, true);
    }
  });
}

async function searchMyInstants(query, page = 1, append = false) {
  const resultsDiv = document.getElementById('myinstantsResults');
  const loading = document.getElementById('myinstantsLoading');
  const loadMoreBtn = document.getElementById('loadMoreResults');
  
  if (!append) {
    resultsDiv.innerHTML = '';
  }
  loading.style.display = 'flex';
  loadMoreBtn.style.display = 'none';
  
  try {
    const res = await fetch(`/api/soundboard/myinstants/search?q=${encodeURIComponent(query)}&page=${page}`);
    if (res.ok) {
      const sounds = await res.json();
      renderMyInstantsResults(sounds, append);
      if (sounds && sounds.length >= 20) {
        loadMoreBtn.style.display = 'block';
      }
    } else {
      resultsDiv.innerHTML = '<p style="color: var(--text-secondary);">Search failed. Try again.</p>';
    }
  } catch (e) {
    console.error('Search failed:', e);
    resultsDiv.innerHTML = '<p style="color: var(--text-secondary);">Search failed. Try again.</p>';
  } finally {
    loading.style.display = 'none';
  }
}

async function loadTrending(page = 1, append = false) {
  const resultsDiv = document.getElementById('myinstantsResults');
  const loading = document.getElementById('myinstantsLoading');
  const loadMoreBtn = document.getElementById('loadMoreResults');
  
  if (!append) {
    resultsDiv.innerHTML = '';
  }
  loading.style.display = 'flex';
  loadMoreBtn.style.display = 'none';
  
  try {
    const res = await fetch(`/api/soundboard/myinstants/trending?page=${page}`);
    if (res.ok) {
      const sounds = await res.json();
      renderMyInstantsResults(sounds, append);
      if (sounds && sounds.length >= 20) {
        loadMoreBtn.style.display = 'block';
      }
    } else {
      resultsDiv.innerHTML = '<p style="color: var(--text-secondary);">Failed to load trending sounds.</p>';
    }
  } catch (e) {
    console.error('Failed to load trending:', e);
    resultsDiv.innerHTML = '<p style="color: var(--text-secondary);">Failed to load trending sounds.</p>';
  } finally {
    loading.style.display = 'none';
  }
}

function renderMyInstantsResults(sounds, append = false) {
  const resultsDiv = document.getElementById('myinstantsResults');
  
  if (!sounds || sounds.length === 0) {
    if (!append) {
      resultsDiv.innerHTML = '<p style="color: var(--text-secondary);">No sounds found.</p>';
    }
    return;
  }
  
  const html = sounds.map(sound => {
    const isCached = cachedSounds.some(c => c.myinstants_id === sound.id || c.original_url === sound.mp3Url);
    return `
      <div class="myinstants-card" data-mp3="${sound.mp3Url}" data-title="${escapeHtml(sound.title)}" data-id="${sound.id || ''}">
        <div class="sound-title" title="${escapeHtml(sound.title)}">${escapeHtml(sound.title)}</div>
        <div class="sound-meta">
          ${sound.favorites ? `<span>❤️ ${sound.favorites}</span>` : ''}
          ${sound.views ? `<span>👁 ${sound.views}</span>` : ''}
          ${isCached ? '<span class="cached-badge">Cached</span>' : ''}
        </div>
        <div class="myinstants-card-actions">
          <button class="play-btn" onclick="playMyInstantsSound(this)">▶ Play</button>
          <button class="cache-btn" onclick="cacheSound(this)" ${isCached ? 'disabled' : ''}>${isCached ? '✓ Saved' : '💾 Save'}</button>
        </div>
      </div>
    `;
  }).join('');
  
  if (append) {
    resultsDiv.innerHTML += html;
  } else {
    resultsDiv.innerHTML = html;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function playMyInstantsSound(btn) {
  const card = btn.closest('.myinstants-card');
  const mp3Url = card.dataset.mp3;
  const title = card.dataset.title;
  
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  
  const audio = new Audio(`/api/soundboard/proxy?url=${encodeURIComponent(mp3Url)}`);
  audio.volume = masterVolume;
  currentAudio = audio;
  
  const nowPlaying = document.getElementById('nowPlaying');
  const nowPlayingText = document.getElementById('nowPlayingText');
  nowPlayingText.textContent = title;
  nowPlaying.style.display = 'flex';
  
  audio.play().catch(e => {
    console.error('Playback failed:', e);
    alert('Failed to play sound. It may be blocked on your network.');
    hideNowPlaying();
  });
  
  audio.onended = () => {
    hideNowPlaying();
  };
}

async function cacheSound(btn) {
  const card = btn.closest('.myinstants-card');
  const mp3Url = card.dataset.mp3;
  const title = card.dataset.title;
  const myinstantsId = card.dataset.id;
  
  btn.disabled = true;
  btn.textContent = '⏳ Saving...';
  
  try {
    const res = await fetch('/api/soundboard/cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: title, mp3Url, myinstantsId })
    });
    
    if (res.ok) {
      const data = await res.json();
      btn.textContent = '✓ Saved';
      cachedSounds.push(data.sound);
      renderSounds();
    } else {
      btn.disabled = false;
      btn.textContent = '💾 Save';
      alert('Failed to cache sound');
    }
  } catch (e) {
    console.error('Cache failed:', e);
    btn.disabled = false;
    btn.textContent = '💾 Save';
  }
}

function initAdminUpload() {
  const uploadForm = document.getElementById('uploadForm');
  const uploadBtn = document.getElementById('uploadBtn');
  const audioFile = document.getElementById('audioFile');
  const soundName = document.getElementById('soundName');
  const soundCategory = document.getElementById('soundCategory');
  
  uploadBtn.addEventListener('click', async () => {
    if (!audioFile.files[0] || !soundName.value.trim()) {
      alert('Please select a file and enter a name');
      return;
    }
    
    const formData = new FormData();
    formData.append('audio', audioFile.files[0]);
    formData.append('name', soundName.value.trim());
    formData.append('category', soundCategory.value);
    
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/soundboard/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        customSounds.push(data.sound);
        renderSounds();
        audioFile.value = '';
        soundName.value = '';
        alert('Sound uploaded successfully!');
      } else {
        alert('Upload failed');
      }
    } catch (e) {
      console.error('Upload failed:', e);
      alert('Upload failed');
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = 'Upload Sound';
    }
  });
}

async function deleteCustomSound(soundId) {
  if (!confirm('Delete this sound?')) return;
  
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/soundboard/custom/${soundId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.ok) {
      customSounds = customSounds.filter(s => s.id !== soundId);
      renderSounds();
    }
  } catch (e) {
    console.error('Delete failed:', e);
  }
}

loadFavoritesFromServer();
