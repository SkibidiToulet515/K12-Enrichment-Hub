// Security measures to prevent dev tools access
(function() {
  // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
  document.addEventListener('keydown', function(e) {
    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      showAccessDenied();
      return false;
    }
    
    // Ctrl+Shift+I (Dev Tools)
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
      e.preventDefault();
      e.stopPropagation();
      showAccessDenied();
      return false;
    }
    
    // Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
      e.preventDefault();
      e.stopPropagation();
      showAccessDenied();
      return false;
    }
    
    // Ctrl+U (View Source)
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
      e.preventDefault();
      e.stopPropagation();
      showAccessDenied();
      return false;
    }
    
    // Ctrl+Shift+C (Inspect Element)
    if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
      e.preventDefault();
      e.stopPropagation();
      showAccessDenied();
      return false;
    }
  }, true);
  
  // Allow right-click but block "Inspect" option via keyboard shortcuts only
  
  function showAccessDenied() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'accessDeniedOverlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      z-index: 999999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease;
    `;
    
    overlay.innerHTML = `
      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      </style>
      <div style="text-align: center; animation: shake 0.5s ease;">
        <div style="font-size: 80px; margin-bottom: 20px; animation: pulse 1s infinite;">🚫</div>
        <h1 style="color: #ff4444; font-size: 48px; margin: 0 0 15px 0; font-family: 'Space Grotesk', sans-serif; text-shadow: 0 0 20px rgba(255,68,68,0.5);">ACCESS DENIED</h1>
        <p style="color: #888; font-size: 18px; margin-bottom: 30px;">Developer tools are not permitted on this platform.</p>
        <p style="color: #666; font-size: 14px;">This tab will close in <span id="countdown">3</span> seconds...</p>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Countdown and close
    let count = 3;
    const countdownEl = overlay.querySelector('#countdown');
    
    const interval = setInterval(function() {
      count--;
      if (countdownEl) countdownEl.textContent = count;
      
      if (count <= 0) {
        clearInterval(interval);
        // Try to close the tab
        try {
          window.open('', '_self');
          window.close();
        } catch(e) {
          // If can't close, redirect to blank page or landing
          window.location.href = 'about:blank';
        }
        // Fallback: redirect to landing page
        setTimeout(function() {
          window.location.href = '/';
        }, 500);
      }
    }, 1000);
  }
})();
