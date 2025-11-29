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
