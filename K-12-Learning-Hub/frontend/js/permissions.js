const PERMISSION_LABELS = {
  view_channel: { name: 'View Channel', description: 'See this channel and read messages' },
  send_messages: { name: 'Send Messages', description: 'Send messages in this channel' },
  send_files: { name: 'Send Files', description: 'Upload and send files' },
  add_reactions: { name: 'Add Reactions', description: 'Add emoji reactions to messages' },
  mention_everyone: { name: 'Mention Everyone', description: 'Use @everyone and @here' },
  delete_messages: { name: 'Delete Messages', description: 'Delete other users\' messages' },
  pin_messages: { name: 'Pin Messages', description: 'Pin messages to channel' },
  manage_channel: { name: 'Manage Channel', description: 'Edit channel settings' },
  manage_permissions: { name: 'Manage Permissions', description: 'Edit channel permissions' },
  mute_members: { name: 'Mute Members', description: 'Prevent members from sending messages' },
  kick_members: { name: 'Kick Members', description: 'Remove members from the server' },
  ban_members: { name: 'Ban Members', description: 'Permanently ban members' },
  manage_roles: { name: 'Manage Roles', description: 'Create and edit server roles' },
  manage_server: { name: 'Manage Server', description: 'Full server administration' },
  create_invites: { name: 'Create Invites', description: 'Create server invite links' }
};

let permissionsData = null;
let currentPermTab = 'roles';
let pendingChanges = {};
let currentChannelId = null;

function openPermissionsModal(channelId) {
  currentChannelId = channelId;
  pendingChanges = {};
  document.getElementById('permissionsOverlay').style.display = 'block';
  document.getElementById('permissionsModal').style.display = 'block';
  loadPermissions(channelId);
}

function closePermissionsModal() {
  document.getElementById('permissionsOverlay').style.display = 'none';
  document.getElementById('permissionsModal').style.display = 'none';
  permissionsData = null;
  currentChannelId = null;
  pendingChanges = {};
}

async function loadPermissions(channelId) {
  const token = localStorage.getItem('authToken');
  try {
    const response = await fetch(`/api/permissions/channel/${channelId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      const err = await response.json();
      alert(err.error || 'Failed to load permissions');
      closePermissionsModal();
      return;
    }
    
    permissionsData = await response.json();
    switchPermTab('roles');
  } catch (err) {
    console.error('Error loading permissions:', err);
    alert('Failed to load permissions');
    closePermissionsModal();
  }
}

function switchPermTab(tab) {
  currentPermTab = tab;
  
  document.getElementById('permRolesTab').style.background = tab === 'roles' ? 'var(--primary)' : 'var(--bg)';
  document.getElementById('permRolesTab').style.color = tab === 'roles' ? 'var(--bg)' : 'var(--text)';
  document.getElementById('permRolesTab').style.border = tab === 'roles' ? 'none' : '1px solid var(--accent)';
  
  document.getElementById('permUsersTab').style.background = tab === 'users' ? 'var(--primary)' : 'var(--bg)';
  document.getElementById('permUsersTab').style.color = tab === 'users' ? 'var(--bg)' : 'var(--text)';
  document.getElementById('permUsersTab').style.border = tab === 'users' ? 'none' : '1px solid var(--accent)';
  
  updateTargetSelect();
}

function updateTargetSelect() {
  const select = document.getElementById('permTargetSelect');
  select.innerHTML = '';
  
  if (currentPermTab === 'roles' && permissionsData?.roles) {
    permissionsData.roles.forEach(role => {
      const option = document.createElement('option');
      option.value = role.id;
      option.textContent = role.name;
      option.style.color = role.color || '#99AAB5';
      select.appendChild(option);
    });
  } else if (currentPermTab === 'users' && permissionsData?.members) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '-- Select a user to override permissions --';
    select.appendChild(option);
    
    permissionsData.members.forEach(member => {
      const option = document.createElement('option');
      option.value = member.id;
      option.textContent = member.username;
      select.appendChild(option);
    });
  }
  
  select.onchange = () => renderPermissionsGrid();
  renderPermissionsGrid();
}

function renderPermissionsGrid() {
  const grid = document.getElementById('permissionsGrid');
  const targetId = document.getElementById('permTargetSelect').value;
  
  if (!targetId) {
    grid.innerHTML = '<div style="text-align:center;color:var(--text-light);padding:20px;">Select a user or role to manage permissions</div>';
    return;
  }
  
  const targetType = currentPermTab === 'roles' ? 'role' : 'user';
  
  grid.innerHTML = '';
  
  permissionsData.permissionList.forEach(permKey => {
    const permInfo = PERMISSION_LABELS[permKey] || { name: permKey, description: '' };
    
    const override = permissionsData.overrides.find(
      o => o.target_type === targetType && o.target_id == targetId && o.permission === permKey
    );
    
    const pendingValue = pendingChanges[`${targetType}-${targetId}-${permKey}`];
    const currentValue = pendingValue !== undefined ? pendingValue : (override?.value ?? null);
    
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg);border-radius:8px;';
    
    row.innerHTML = `
      <div>
        <div style="font-weight:600;color:var(--text);">${permInfo.name}</div>
        <div style="font-size:12px;color:var(--text-light);">${permInfo.description}</div>
      </div>
      <div style="display:flex;gap:5px;">
        <button onclick="setPermValue('${targetType}', ${targetId}, '${permKey}', 1)" 
                style="width:36px;height:36px;border-radius:50%;border:2px solid ${currentValue === 1 ? '#2ecc71' : 'var(--accent)'};
                       background:${currentValue === 1 ? '#2ecc71' : 'transparent'};cursor:pointer;display:flex;align-items:center;justify-content:center;
                       font-size:18px;color:${currentValue === 1 ? 'white' : '#2ecc71'};">✓</button>
        <button onclick="setPermValue('${targetType}', ${targetId}, '${permKey}', null)" 
                style="width:36px;height:36px;border-radius:50%;border:2px solid ${currentValue === null ? 'var(--primary)' : 'var(--accent)'};
                       background:${currentValue === null ? 'var(--primary)' : 'transparent'};cursor:pointer;display:flex;align-items:center;justify-content:center;
                       font-size:14px;color:${currentValue === null ? 'var(--bg)' : 'var(--text-light)'};">—</button>
        <button onclick="setPermValue('${targetType}', ${targetId}, '${permKey}', 0)" 
                style="width:36px;height:36px;border-radius:50%;border:2px solid ${currentValue === 0 ? '#e74c3c' : 'var(--accent)'};
                       background:${currentValue === 0 ? '#e74c3c' : 'transparent'};cursor:pointer;display:flex;align-items:center;justify-content:center;
                       font-size:18px;color:${currentValue === 0 ? 'white' : '#e74c3c'};">✕</button>
      </div>
    `;
    
    grid.appendChild(row);
  });
}

function setPermValue(targetType, targetId, permission, value) {
  pendingChanges[`${targetType}-${targetId}-${permission}`] = value;
  renderPermissionsGrid();
}

async function savePermissions() {
  const token = localStorage.getItem('authToken');
  const changes = Object.entries(pendingChanges);
  
  if (changes.length === 0) {
    closePermissionsModal();
    return;
  }
  
  try {
    for (const [key, value] of changes) {
      const [targetType, targetId, permission] = key.split('-');
      
      await fetch(`/api/permissions/channel/${currentChannelId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetType,
          targetId: parseInt(targetId),
          permission,
          value
        })
      });
    }
    
    alert('Permissions saved successfully!');
    closePermissionsModal();
  } catch (err) {
    console.error('Error saving permissions:', err);
    alert('Failed to save some permissions');
  }
}

window.openPermissionsModal = openPermissionsModal;
window.closePermissionsModal = closePermissionsModal;
window.switchPermTab = switchPermTab;
window.setPermValue = setPermValue;
window.savePermissions = savePermissions;
