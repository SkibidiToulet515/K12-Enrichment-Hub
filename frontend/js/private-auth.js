// Real account system for private area
// Separate from the public cover login

function checkPrivateAuth() {
  if (!localStorage.getItem('userToken')) {
    window.location.href = '/private/auth.html';
    return false;
  }
  return true;
}

function getCurrentPrivateUser() {
  return {
    token: localStorage.getItem('userToken'),
    userId: localStorage.getItem('userId'),
    username: localStorage.getItem('username'),
    profilePicture: localStorage.getItem('profilePicture')
  };
}

function logoutPrivate() {
  localStorage.clear();
  window.location.href = '/public/index.html';
}

// Check auth on private pages
if (window.location.pathname.includes('/private/')) {
  if (window.location.pathname !== '/private/auth.html') {
    document.addEventListener('DOMContentLoaded', checkPrivateAuth);
  }
}
