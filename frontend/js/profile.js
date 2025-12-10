// Profile page
document.addEventListener('DOMContentLoaded', () => {
  const user = checkAuth();
  if (!user) return;

  document.getElementById('profileName').textContent = user.username;
  document.getElementById('usernameInfo').textContent = user.username;
  document.getElementById('joinedInfo').textContent = new Date().toLocaleDateString();
  document.getElementById('profilePic').src = user.profilePicture || 'https://via.placeholder.com/100';

  // Check if user is admin and show admin section
  checkAdminAndShowUsers();

  const uploadBtn = document.getElementById('uploadBtn');
  const removeBtn = document.getElementById('removeBtn');
  const avatarInput = document.getElementById('avatarInput');

  uploadBtn.addEventListener('click', async () => {
    if (!avatarInput.files.length) return alert('Please select a file');

    const formData = new FormData();
    formData.append('profilePicture', avatarInput.files[0]);

    try {
      const response = await fetch('/api/auth/upload-avatar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        user.profilePicture = data.profilePicture;
        localStorage.setItem('user', JSON.stringify(user));
        document.getElementById('profilePic').src = data.profilePicture;
        alert('Avatar updated!');
        avatarInput.value = '';
      } else {
        alert(`Upload failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + err.message);
    }
  });

  removeBtn.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/auth/remove-avatar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });

      const data = await response.json();

      if (response.ok) {
        user.profilePicture = null;
        localStorage.setItem('user', JSON.stringify(user));
        document.getElementById('profilePic').src = 'https://via.placeholder.com/100';
        alert('Avatar removed!');
      } else {
        alert(`Remove failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Remove error:', err);
      alert('Remove failed: ' + err.message);
    }
  });

  // Delete Account
  const deleteAccountBtn = document.getElementById('deleteAccountBtn');
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', async () => {
      const confirmFirst = confirm('Are you sure you want to delete your account? This action cannot be undone.');
      if (!confirmFirst) return;
      
      const confirmSecond = confirm('This will permanently delete all your messages, friends, and data. Type "DELETE" in the next prompt to confirm.');
      if (!confirmSecond) return;
      
      const typed = prompt('Type DELETE to confirm account deletion:');
      if (typed !== 'DELETE') {
        alert('Account deletion cancelled.');
        return;
      }
      
      try {
        const response = await fetch('/api/auth/delete-account', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        
        const data = await response.json();
        
        if (response.ok) {
          alert('Your account has been deleted. Goodbye!');
          localStorage.clear();
          window.location.href = '/public/index.html';
        } else {
          alert(`Failed to delete account: ${data.error || 'Unknown error'}`);
        }
      } catch (err) {
        console.error('Delete account error:', err);
        alert('Failed to delete account: ' + err.message);
      }
    });
  }

  // Change username
  const changeUsernameBtn = document.getElementById('changeUsernameBtn');
  const newUsernameInput = document.getElementById('newUsernameInput');
  const usernameMessage = document.getElementById('usernameMessage');

  changeUsernameBtn.addEventListener('click', async () => {
    const newUsername = newUsernameInput.value.trim();

    if (!newUsername) {
      usernameMessage.textContent = '❌ Username cannot be empty';
      usernameMessage.style.color = '#e74c3c';
      usernameMessage.style.display = 'block';
      return;
    }

    if (newUsername.length < 3) {
      usernameMessage.textContent = '❌ Username must be at least 3 characters';
      usernameMessage.style.color = '#e74c3c';
      usernameMessage.style.display = 'block';
      return;
    }

    if (newUsername.length > 20) {
      usernameMessage.textContent = '❌ Username must be at most 20 characters';
      usernameMessage.style.color = '#e74c3c';
      usernameMessage.style.display = 'block';
      return;
    }

    try {
      const response = await fetch('/api/auth/change-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ newUsername })
      });

      const data = await response.json();

      if (response.ok) {
        // Update user object and tokens
        user.username = newUsername;
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('username', newUsername);

        // Update UI
        document.getElementById('profileName').textContent = newUsername;
        document.getElementById('usernameInfo').textContent = newUsername;
        newUsernameInput.value = '';

        usernameMessage.textContent = '✅ Username updated successfully!';
        usernameMessage.style.color = '#27ae60';
        usernameMessage.style.display = 'block';
      } else {
        usernameMessage.textContent = `❌ ${data.error || 'Failed to update username'}`;
        usernameMessage.style.color = '#e74c3c';
        usernameMessage.style.display = 'block';
      }
    } catch (err) {
      usernameMessage.textContent = '❌ Update failed';
      usernameMessage.style.color = '#e74c3c';
      usernameMessage.style.display = 'block';
    }
  });
});

// Check if user is admin and show all users
async function checkAdminAndShowUsers() {
  try {
    const response = await fetch('/api/admin/check', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    const data = await response.json();
    
    if (data.isAdmin) {
      document.getElementById('adminUsersSection').style.display = 'block';
      loadAllUsers();
    }
  } catch (err) {
    console.error('Admin check failed:', err);
  }
}

// Load all users for admin view
async function loadAllUsers() {
  try {
    const response = await fetch('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    const users = await response.json();
    
    const list = document.getElementById('allUsersList');
    const countEl = document.getElementById('userCount');
    
    countEl.textContent = `Total: ${users.length} users registered`;
    list.innerHTML = '';
    
    users.forEach(user => {
      const item = document.createElement('div');
      item.className = 'user-item';
      
      let badges = '';
      if (user.role === 'admin') badges += '<span class="badge badge-admin">ADMIN</span>';
      if (user.is_banned) badges += '<span class="badge badge-banned">BANNED</span>';
      else if (user.is_online) badges += '<span class="badge badge-online">Online</span>';
      else badges += '<span class="badge badge-offline">Offline</span>';
      if (user.warning_count > 0) badges += `<span class="badge badge-warn">${user.warning_count} warns</span>`;
      
      item.innerHTML = `
        <img src="${user.profile_picture || 'https://via.placeholder.com/40'}" alt="">
        <div class="info">
          <div class="name">${escapeHtml(user.username)}${badges}</div>
          <div class="meta">Joined ${new Date(user.created_at).toLocaleDateString()}</div>
        </div>
      `;
      list.appendChild(item);
    });
  } catch (err) {
    console.error('Failed to load users:', err);
  }
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Profile Banner Functionality
function setupBannerUpload() {
  const bannerInput = document.getElementById('bannerInput');
  const uploadBannerBtn = document.getElementById('uploadBannerBtn');
  const removeBannerBtn = document.getElementById('removeBannerBtn');
  const bannerPreview = document.getElementById('bannerPreview');

  // Load current banner
  loadBanner();

  uploadBannerBtn.addEventListener('click', async () => {
    if (!bannerInput.files.length) {
      alert('Please select an image file');
      return;
    }

    const formData = new FormData();
    formData.append('banner', bannerInput.files[0]);

    try {
      const response = await fetch('/api/customization/banner', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        bannerPreview.style.backgroundImage = `url(${data.bannerUrl})`;
        bannerInput.value = '';
        alert('Banner updated!');
      } else {
        alert(data.error || 'Failed to upload banner');
      }
    } catch (err) {
      console.error('Banner upload error:', err);
      alert('Failed to upload banner');
    }
  });

  removeBannerBtn.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/customization/banner', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });

      if (response.ok) {
        bannerPreview.style.backgroundImage = '';
        alert('Banner removed!');
      }
    } catch (err) {
      console.error('Banner remove error:', err);
    }
  });
}

async function loadBanner() {
  try {
    const response = await fetch('/api/customization/banner', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    const data = await response.json();
    if (data.bannerUrl) {
      document.getElementById('bannerPreview').style.backgroundImage = `url(${data.bannerUrl})`;
    }
  } catch (err) {
    console.error('Failed to load banner:', err);
  }
}

// Wallpaper Functionality
function setupWallpaperUpload() {
  const wallpaperInput = document.getElementById('wallpaperInput');
  const uploadWallpaperBtn = document.getElementById('uploadWallpaperBtn');
  const removeWallpaperBtn = document.getElementById('removeWallpaperBtn');
  const wallpaperStatus = document.getElementById('wallpaperStatus');

  uploadWallpaperBtn.addEventListener('click', async () => {
    if (!wallpaperInput.files.length) {
      alert('Please select an image file');
      return;
    }

    const formData = new FormData();
    formData.append('wallpaper', wallpaperInput.files[0]);

    try {
      const response = await fetch('/api/customization/wallpaper', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('customWallpaper', data.wallpaperUrl);
        wallpaperStatus.textContent = 'Wallpaper set! Refresh dashboard to see it.';
        wallpaperStatus.style.color = 'var(--accent)';
        wallpaperStatus.style.display = 'block';
        wallpaperInput.value = '';
      } else {
        alert(data.error || 'Failed to upload wallpaper');
      }
    } catch (err) {
      console.error('Wallpaper upload error:', err);
      alert('Failed to upload wallpaper');
    }
  });

  removeWallpaperBtn.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/customization/wallpaper', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });

      if (response.ok) {
        localStorage.removeItem('customWallpaper');
        wallpaperStatus.textContent = 'Wallpaper removed!';
        wallpaperStatus.style.color = 'var(--text-secondary)';
        wallpaperStatus.style.display = 'block';
      }
    } catch (err) {
      console.error('Wallpaper remove error:', err);
    }
  });
}

// Initialize banner and wallpaper on page load
document.addEventListener('DOMContentLoaded', () => {
  setupBannerUpload();
  setupWallpaperUpload();
});
