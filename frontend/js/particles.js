// Animated Particle Background for NebulaCore
// Creates floating particles with glow effects

class ParticleBackground {
  constructor(options = {}) {
    this.options = {
      particleCount: options.particleCount || 50,
      colors: options.colors || ['var(--primary)', 'var(--secondary)', 'var(--accent)'],
      minSize: options.minSize || 2,
      maxSize: options.maxSize || 6,
      speed: options.speed || 0.5,
      opacity: options.opacity || 0.6,
      blur: options.blur || 1,
      container: options.container || document.body
    };
    
    this.particles = [];
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.enabled = localStorage.getItem('particlesEnabled') !== 'false';
    
    if (this.enabled) {
      this.init();
    }
  }
  
  init() {
    this.createCanvas();
    this.createParticles();
    this.animate();
    this.handleResize();
  }
  
  createCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'particle-canvas';
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
      opacity: ${this.options.opacity};
    `;
    
    document.body.insertBefore(this.canvas, document.body.firstChild);
    this.ctx = this.canvas.getContext('2d');
    this.resize();
  }
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  handleResize() {
    window.addEventListener('resize', () => this.resize());
  }
  
  createParticles() {
    const computedStyle = getComputedStyle(document.documentElement);
    const primary = computedStyle.getPropertyValue('--primary').trim() || '#00d4ff';
    const secondary = computedStyle.getPropertyValue('--secondary').trim() || '#a855f7';
    const accent = computedStyle.getPropertyValue('--accent').trim() || '#ec4899';
    
    this.resolvedColors = [primary, secondary, accent];
    
    for (let i = 0; i < this.options.particleCount; i++) {
      this.particles.push(this.createParticle());
    }
  }
  
  createParticle() {
    const size = Math.random() * (this.options.maxSize - this.options.minSize) + this.options.minSize;
    return {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: size,
      speedX: (Math.random() - 0.5) * this.options.speed,
      speedY: (Math.random() - 0.5) * this.options.speed,
      color: this.resolvedColors[Math.floor(Math.random() * this.resolvedColors.length)],
      opacity: Math.random() * 0.5 + 0.3,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.02 + 0.01
    };
  }
  
  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.particles.forEach(particle => {
      particle.x += particle.speedX;
      particle.y += particle.speedY;
      particle.pulse += particle.pulseSpeed;
      
      if (particle.x < -50) particle.x = this.canvas.width + 50;
      if (particle.x > this.canvas.width + 50) particle.x = -50;
      if (particle.y < -50) particle.y = this.canvas.height + 50;
      if (particle.y > this.canvas.height + 50) particle.y = -50;
      
      const pulseFactor = Math.sin(particle.pulse) * 0.3 + 1;
      const currentSize = particle.size * pulseFactor;
      const currentOpacity = particle.opacity * (0.7 + Math.sin(particle.pulse) * 0.3);
      
      this.ctx.save();
      this.ctx.globalAlpha = currentOpacity;
      
      const gradient = this.ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, currentSize * 3
      );
      gradient.addColorStop(0, particle.color);
      gradient.addColorStop(0.4, particle.color);
      gradient.addColorStop(1, 'transparent');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, currentSize * 3, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, currentSize, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.restore();
    });
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('particlesEnabled', this.enabled);
    
    if (this.enabled) {
      this.init();
    } else {
      this.destroy();
    }
    
    return this.enabled;
  }
  
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.particles = [];
  }
  
  setSpeed(speed) {
    this.options.speed = speed;
    this.particles.forEach(p => {
      p.speedX = (Math.random() - 0.5) * speed;
      p.speedY = (Math.random() - 0.5) * speed;
    });
  }
  
  setOpacity(opacity) {
    this.options.opacity = opacity;
    if (this.canvas) {
      this.canvas.style.opacity = opacity;
    }
  }
  
  setParticleCount(count) {
    const diff = count - this.particles.length;
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        this.particles.push(this.createParticle());
      }
    } else if (diff < 0) {
      this.particles.splice(0, Math.abs(diff));
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const savedDensity = localStorage.getItem('particleDensity') || 'medium';
  const densityCounts = { low: 20, medium: 40, high: 60 };
  const particleCount = densityCounts[savedDensity] || 40;
  
  window.particleBackground = new ParticleBackground({
    particleCount: particleCount,
    speed: 0.3,
    opacity: 0.4,
    minSize: 2,
    maxSize: 5
  });
});
