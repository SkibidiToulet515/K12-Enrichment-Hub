// PreferencesService - Syncs user preferences between localStorage and database
// This ensures settings persist across devices and sessions

(function() {
  'use strict';
  
  const SYNC_KEYS = [
    'theme',
    'customTheme',
    'layoutMode',
    'globalFont',
    'fontSize',
    'reduceMotion',
    'highContrast',
    'notifications',
    'sounds',
    'soundsEnabled',
    'soundVolume',
    'notifSound',
    'clickSound',
    'cursorStyle',
    'panicButtonEnabled',
    'showPanicButton',
    'panicTarget',
    'stealthDisguise',
    'cloakSettings',
    'chatNotifications',
    'particleDensity',
    'particlesEnabled',
    'visualEffectsEnabled',
    'pinnedGames',
    'likedGames',
    'bookmarks',
    'widgetLayout',
    'recentSearches'
  ];
  
  const SYNC_DEBOUNCE_MS = 1000;
  let syncTimeout = null;
  let isLoading = false;
  let hasLoadedFromServer = false;
  
  function getAuthToken() {
    return localStorage.getItem('userToken') || localStorage.getItem('authToken');
  }
  
  function isAuthenticated() {
    return !!getAuthToken();
  }
  
  async function loadFromServer() {
    if (!isAuthenticated() || isLoading || hasLoadedFromServer) return;
    
    isLoading = true;
    try {
      const res = await fetch('/api/preferences/all', {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          for (const [key, value] of Object.entries(data.settings)) {
            if (SYNC_KEYS.includes(key)) {
              const currentValue = localStorage.getItem(key);
              if (currentValue === null || currentValue === undefined) {
                if (typeof value === 'object') {
                  localStorage.setItem(key, JSON.stringify(value));
                } else {
                  localStorage.setItem(key, String(value));
                }
              }
            }
          }
          hasLoadedFromServer = true;
          window.dispatchEvent(new CustomEvent('preferencesLoaded', { detail: data.settings }));
        }
      }
    } catch (e) {
      console.warn('Failed to load preferences from server:', e);
    } finally {
      isLoading = false;
    }
  }
  
  async function syncToServer() {
    if (!isAuthenticated()) return;
    
    const settings = {};
    for (const key of SYNC_KEYS) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        try {
          settings[key] = JSON.parse(value);
        } catch {
          settings[key] = value;
        }
      }
    }
    
    try {
      await fetch('/api/preferences/all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings })
      });
    } catch (e) {
      console.warn('Failed to sync preferences to server:', e);
    }
  }
  
  function debouncedSync() {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(syncToServer, SYNC_DEBOUNCE_MS);
  }
  
  async function saveSetting(key, value) {
    if (typeof value === 'object') {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      localStorage.setItem(key, String(value));
    }
    
    if (isAuthenticated() && SYNC_KEYS.includes(key)) {
      debouncedSync();
    }
  }
  
  function getSetting(key, defaultValue = null) {
    const value = localStorage.getItem(key);
    if (value === null) return defaultValue;
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  
  async function migrateExistingSettings() {
    if (!isAuthenticated()) return;
    
    const migrated = localStorage.getItem('_preferencesMigrated');
    if (migrated) return;
    
    await syncToServer();
    localStorage.setItem('_preferencesMigrated', 'true');
  }
  
  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(key, value) {
    originalSetItem(key, value);
    
    if (SYNC_KEYS.includes(key) && isAuthenticated()) {
      debouncedSync();
    }
  };
  
  window.PreferencesService = {
    load: loadFromServer,
    sync: syncToServer,
    save: saveSetting,
    get: getSetting,
    migrate: migrateExistingSettings,
    SYNC_KEYS: SYNC_KEYS
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      await loadFromServer();
      await migrateExistingSettings();
    });
  } else {
    loadFromServer().then(() => migrateExistingSettings());
  }
  
})();
