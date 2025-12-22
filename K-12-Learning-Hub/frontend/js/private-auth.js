// Real account system for private area
// Separate from the public cover login

function checkPrivateAuth() {
  const userToken = localStorage.getItem('userToken');
  const authToken = localStorage.getItem('authToken');
  const isGuest = localStorage.getItem('isGuest') === 'true';
  
  // Check for valid guest session (must have been set within last 24 hours)
  if (isGuest) {
    const guestStart = parseInt(localStorage.getItem('guestSessionStart') || '0');
    const sessionAge = Date.now() - guestStart;
    const maxGuestAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (sessionAge > maxGuestAge) {
      // Guest session expired, clear it and redirect to auth
      localStorage.removeItem('isGuest');
      localStorage.removeItem('guestSessionStart');
      localStorage.removeItem('userToken');
      localStorage.removeItem('authToken');
      localStorage.removeItem('username');
      window.location.href = '/auth';
      return false;
    }
    return true;
  }
  
  // No valid token and not a valid guest session
  if (!userToken && !authToken) {
    window.location.href = '/auth';
    return false;
  }
  
  // Guest token should also be treated as needing validation
  if (userToken === 'guest' || authToken === 'guest') {
    // If there's a guest token but no isGuest flag, clear and redirect
    localStorage.removeItem('userToken');
    localStorage.removeItem('authToken');
    window.location.href = '/auth';
    return false;
  }
  
  return true;
}

function getCurrentPrivateUser() {
  const isGuest = localStorage.getItem('isGuest') === 'true';
  return {
    token: localStorage.getItem('userToken'),
    userId: isGuest ? 'guest' : localStorage.getItem('userId'),
    username: localStorage.getItem('username') || 'Guest',
    profilePicture: localStorage.getItem('profilePicture'),
    isGuest: isGuest
  };
}

function isGuestUser() {
  return localStorage.getItem('isGuest') === 'true' || localStorage.getItem('userToken') === 'guest';
}

function requireLogin(action) {
  if (isGuestUser()) {
    showGuestRestrictionModal(action);
    return false;
  }
  return true;
}

function showGuestRestrictionModal(action) {
  const existingModal = document.getElementById('guestRestrictionModal');
  if (existingModal) existingModal.remove();
  
  const modal = document.createElement('div');
  modal.id = 'guestRestrictionModal';
  modal.innerHTML = `
    <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;">
      <div style="background:var(--card,#1a1a2e);padding:30px;border-radius:16px;max-width:400px;text-align:center;border:2px solid var(--primary,#00d4ff);">
        <div style="font-size:48px;margin-bottom:15px;">🔒</div>
        <h3 style="color:var(--text,white);margin-bottom:10px;">Login Required</h3>
        <p style="color:var(--text-secondary,#aaa);margin-bottom:20px;">
          ${action || 'This feature'} is not available for guests. Create an account to unlock all features!
        </p>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button onclick="window.location.href='/auth'" style="padding:12px 24px;background:linear-gradient(135deg,var(--primary,#00d4ff),var(--secondary,#7c3aed));border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;">
            Create Account
          </button>
          <button onclick="this.closest('#guestRestrictionModal').remove()" style="padding:12px 24px;background:transparent;border:2px solid var(--border,#333);border-radius:8px;color:var(--text,white);cursor:pointer;">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function logoutPrivate() {
  localStorage.clear();
  window.location.href = '/public/index.html';
}

// Check auth on private pages
if (window.location.pathname.includes('/private/')) {
  if (window.location.pathname !== '/auth') {
    document.addEventListener('DOMContentLoaded', checkPrivateAuth);
  }
}
