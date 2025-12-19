// Detect if page is loaded in an iframe (OS mode) and hide back buttons
(function() {
  if (window.self !== window.top) {
    // We're in an iframe - add class to hide back buttons
    document.documentElement.classList.add('in-iframe');
    document.addEventListener('DOMContentLoaded', function() {
      document.body.classList.add('in-iframe');
      
      // Hide all back buttons and back links
      const backElements = document.querySelectorAll('.back-btn, .back-link, a[href*="dashboard"], .header .back-btn, .settings-header .back-btn');
      backElements.forEach(el => {
        el.style.display = 'none';
      });
    });
  }
})();
