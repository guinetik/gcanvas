/**
 * Study 006 - Psychedelic Drop
 *
 * A grid of particles that reacts to a "drop" in the center, creating
 * psychedelic ripples and interference patterns.
 *
 * Features:
 * - Grid-based particle system
 * - Wave propagation math (sine waves based on distance)
 * - Dynamic color cycling (HSL)
 * - Mouse interaction to move the "drop" source
 */

import { gcanvas } from "../../src/index.js";

// Configuration
const CONFIG = {
  // Grid settings
  spacing: 20,
  baseSize: 4,
  
  // Wave settings
  waveSpeed: 3.0,
  waveFreq: 0.05,
  amplitude: 15,
  
  // Color settings
  colorSpeed: 50,
  baseHue: 0,
  hueRange: 180,
  saturation: 80,
  lightness: 60,
  
  // Interaction
  dropDecay: 0.95,
  
  // Background
  bgColor: "#050505",
};

/**
 * A single particle in the grid
 */
class DropParticle {
  constructor(x, y, col, row) {
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.baseY = y;
    this.col = col;
    this.row = row;
    this.size = CONFIG.baseSize;
    this.hue = 0;
  }

  update(dt, time, dropX, dropY) {
    // Calculate distance from the "drop" point
    const dx = this.baseX - dropX;
    const dy = this.baseY - dropY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Calculate wave effect
    // sin(distance * frequency - time * speed)
    const angle = dist * CONFIG.waveFreq - time * CONFIG.waveSpeed;
    const wave = Math.sin(angle);
    
    // Secondary interference wave
    const wave2 = Math.cos(angle * 0.5 + time);

    // Displacement
    const displacement = wave * CONFIG.amplitude;
    const displacement2 = wave2 * (CONFIG.amplitude * 0.5);

    // this.x = this.baseX + (dx / dist) * displacement; // Radial displacement
    // this.y = this.baseY + (dy / dist) * displacement;
    
    // Vertical/Z-like displacement simulated by size and color
    this.size = CONFIG.baseSize + (wave + 1) * 3 + (wave2 + 1);

    // Color calculation
    // Base hue + wave offset + time cycling
    this.hue = (CONFIG.baseHue + dist * 0.5 + time * CONFIG.colorSpeed) % 360;
    
    // Opacity based on wave peaks
    this.alpha = 0.3 + (wave + 1) * 0.35;
  }

  render(ctx) {
    ctx.fillStyle = `hsla(${this.hue}, ${CONFIG.saturation}%, ${CONFIG.lightness}%, ${this.alpha})`;
    
    // Draw circle
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Optional: Draw a small connection line to neighbors if close enough (too expensive for many particles)
  }
}

// Initialize
window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  if (!canvas) return;

  const game = gcanvas({ canvas, bg: CONFIG.bgColor, fluid: true });
  const gameInstance = game.game;

  let particles = [];
  let dropX = 0;
  let dropY = 0;
  let time = 0;

  function createGrid(w, h) {
    particles = [];
    const cols = Math.ceil(w / CONFIG.spacing);
    const rows = Math.ceil(h / CONFIG.spacing);
    
    // Center the grid
    const startX = (w - (cols - 1) * CONFIG.spacing) / 2;
    const startY = (h - (rows - 1) * CONFIG.spacing) / 2;

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = startX + i * CONFIG.spacing;
        const y = startY + j * CONFIG.spacing;
        particles.push(new DropParticle(x, y, i, j));
      }
    }
  }

  // Initial setup
  dropX = gameInstance.width / 2;
  dropY = gameInstance.height / 2;
  createGrid(gameInstance.width, gameInstance.height);

  // Handle resize
  let resizeTimeout = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      dropX = gameInstance.width / 2;
      dropY = gameInstance.height / 2;
      createGrid(gameInstance.width, gameInstance.height);
    }, 100);
  });

  // Custom render loop
  gameInstance.clear = function() {
    // Standard clear
    this.ctx.fillStyle = CONFIG.bgColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Render all particles
    for (const p of particles) {
      p.render(this.ctx);
    }
  };

  game.on("update", (dt) => {
    time += dt;
    
    // Update all particles
    for (const p of particles) {
      p.update(dt, time, dropX, dropY);
    }
  });

  // Mouse interaction
  let isDragging = false;
  
  gameInstance.events.on("mousedown", () => {
    isDragging = true;
  });

  gameInstance.events.on("mouseup", () => {
    isDragging = false;
  });

  gameInstance.events.on("mousemove", (e) => {
    if (!isDragging) return;
    dropX = e.x;
    dropY = e.y;
  });

  // Click to change palette
  gameInstance.events.on("click", () => {
    CONFIG.baseHue = Math.random() * 360;
    CONFIG.waveFreq = 0.02 + Math.random() * 0.08;
    CONFIG.waveSpeed = 1.0 + Math.random() * 4.0;
  });

  game.start();
});

