const DEFAULT_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea"/>
      <stop offset="100%" style="stop-color:#764ba2"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" fill="url(#grad)"/>
  <circle cx="50" cy="38" r="18" fill="rgba(255,255,255,0.9)"/>
  <ellipse cx="50" cy="85" rx="28" ry="22" fill="rgba(255,255,255,0.9)"/>
</svg>
`);

function getDefaultAvatar(username) {
  const colors = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
    ['#a8edea', '#fed6e3'],
    ['#ff9a9e', '#fecfef'],
    ['#ffecd2', '#fcb69f'],
    ['#667eea', '#764ba2'],
    ['#11998e', '#38ef7d']
  ];
  
  const hash = (username || 'user').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const [c1, c2] = colors[hash % colors.length];
  const initials = (username || 'U').substring(0, 2).toUpperCase();
  
  return 'data:image/svg+xml,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g${hash}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c1}"/>
      <stop offset="100%" style="stop-color:${c2}"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" fill="url(#g${hash})"/>
  <text x="50" y="50" text-anchor="middle" dy=".35em" fill="white" font-family="Inter, sans-serif" font-size="36" font-weight="600">${initials}</text>
</svg>
  `);
}

function getUserAvatar(user) {
  if (user?.profilePicture && !user.profilePicture.includes('placeholder')) {
    return user.profilePicture;
  }
  return getDefaultAvatar(user?.username);
}

if (typeof window !== 'undefined') {
  window.DEFAULT_AVATAR = DEFAULT_AVATAR;
  window.getDefaultAvatar = getDefaultAvatar;
  window.getUserAvatar = getUserAvatar;
}
