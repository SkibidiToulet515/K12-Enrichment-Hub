// Mobile Navigation Handler for K-12 Learning Portal

(function() {
  'use strict';
  
  // Only run on mobile/tablet
  function isMobile() {
    return window.innerWidth <= 768;
  }
  
  // Create mobile menu toggle button
  function createMobileMenuToggle() {
    if (document.querySelector('.mobile-menu-toggle')) return;
    
    const toggle = document.createElement('button');
    toggle.className = 'mobile-menu-toggle';
    toggle.innerHTML = '<span></span><span></span><span></span>';
    toggle.setAttribute('aria-label', 'Toggle menu');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.appendChild(toggle);
    
    return toggle;
  }
  
  // Create overlay
  function createOverlay() {
    if (document.querySelector('.mobile-overlay')) return;
    
    const overlay = document.createElement('div');
    overlay.className = 'mobile-overlay';
    document.body.appendChild(overlay);
    
    return overlay;
  }
  
  // Find sidebar element
  function findSidebar() {
    const selectors = [
      '.sidebar',
      'nav.sidebar',
      '.nav-sidebar',
      'aside.sidebar',
      '.os-sidebar',
      '.admin-sidebar',
      '.settings-sidebar',
      '.chat-sidebar'
    ];
    
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  }
  
  // Toggle sidebar
  function toggleSidebar(sidebar, toggle, overlay, open) {
    if (open) {
      sidebar.classList.add('mobile-open');
      toggle.classList.add('active');
      overlay.classList.add('active');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('sidebar-open');
    } else {
      sidebar.classList.remove('mobile-open');
      toggle.classList.remove('active');
      overlay.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('sidebar-open');
    }
  }
  
  // Initialize mobile navigation
  function initMobileNav() {
    const sidebar = findSidebar();
    if (!sidebar) return;
    
    const toggle = createMobileMenuToggle();
    const overlay = createOverlay();
    
    if (!toggle || !overlay) return;
    
    // Toggle button click
    toggle.addEventListener('click', function(e) {
      e.stopPropagation();
      const isOpen = sidebar.classList.contains('mobile-open');
      toggleSidebar(sidebar, toggle, overlay, !isOpen);
    });
    
    // Overlay click closes sidebar
    overlay.addEventListener('click', function() {
      toggleSidebar(sidebar, toggle, overlay, false);
    });
    
    // Close sidebar when clicking a nav link
    sidebar.querySelectorAll('a, .nav-item, .menu-item').forEach(function(link) {
      link.addEventListener('click', function() {
        if (isMobile()) {
          setTimeout(function() {
            toggleSidebar(sidebar, toggle, overlay, false);
          }, 150);
        }
      });
    });
    
    // Close on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && sidebar.classList.contains('mobile-open')) {
        toggleSidebar(sidebar, toggle, overlay, false);
      }
    });
    
    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function() {
        if (!isMobile()) {
          toggleSidebar(sidebar, toggle, overlay, false);
          sidebar.classList.remove('mobile-open');
        }
      }, 100);
    });
    
    // Handle swipe gestures
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', function(e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    document.addEventListener('touchend', function(e) {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe(sidebar, toggle, overlay);
    }, { passive: true });
    
    function handleSwipe(sidebar, toggle, overlay) {
      const swipeThreshold = 50;
      const diff = touchEndX - touchStartX;
      
      // Swipe right to open (only from left edge)
      if (diff > swipeThreshold && touchStartX < 30 && !sidebar.classList.contains('mobile-open')) {
        toggleSidebar(sidebar, toggle, overlay, true);
      }
      
      // Swipe left to close
      if (diff < -swipeThreshold && sidebar.classList.contains('mobile-open')) {
        toggleSidebar(sidebar, toggle, overlay, false);
      }
    }
  }
  
  // Add viewport meta if missing
  function ensureViewportMeta() {
    if (!document.querySelector('meta[name="viewport"]')) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(meta);
    }
  }
  
  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      ensureViewportMeta();
      initMobileNav();
    });
  } else {
    ensureViewportMeta();
    initMobileNav();
  }
  
  // Re-initialize if page content changes (for SPA-like behavior)
  window.initMobileNav = initMobileNav;
  
})();
