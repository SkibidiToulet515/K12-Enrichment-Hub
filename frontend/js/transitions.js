// Smooth Page Transitions
(function() {
  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', function() {
    // Add click handler to all internal links
    document.querySelectorAll('a[href]').forEach(function(link) {
      // Skip external links, anchor links, and special links
      const href = link.getAttribute('href');
      if (!href || 
          href.startsWith('#') || 
          href.startsWith('http') || 
          href.startsWith('//') ||
          link.getAttribute('target') === '_blank' ||
          link.hasAttribute('download')) {
        return;
      }
      
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const destination = this.href;
        
        // Add exit animation class
        document.body.classList.add('page-exit');
        
        // Navigate after animation completes
        setTimeout(function() {
          window.location.href = destination;
        }, 280);
      });
    });
    
    // Handle browser back/forward buttons
    window.addEventListener('pageshow', function(event) {
      if (event.persisted) {
        // Page was loaded from cache (back/forward)
        document.body.classList.remove('page-exit');
      }
    });
  });
  
  // Smooth transition for dashboard cards
  const cards = document.querySelectorAll('.dashboard-card');
  cards.forEach(function(card, index) {
    card.style.animationDelay = (index * 0.08) + 's';
  });
  
  // Stagger animation for game cards
  const gameCards = document.querySelectorAll('.game-card');
  gameCards.forEach(function(card, index) {
    card.style.animationDelay = (index * 0.03) + 's';
  });
})();
