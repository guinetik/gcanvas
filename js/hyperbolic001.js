/**
 * Hyperbolic 001 - Wireframe Flux
 *
 * Inspired by hyperbolic space - a torus wireframe that breathes and
 * deforms with noise. Click to disturb, watch it settle to equilibrium.
 *
 * Features:
 * - Torus geometry with simplex noise deformation
 * - Click to add energy - more clicks = more chaos
 * - Settles to subtle vibration equilibrium
 * - Drag to rotate, auto-rotates when idle
 */

import { gcanvas, Noise, Painter } from "/gcanvas.es.min.js";

// Configuration
const CONFIG = {
  // Torus geometry
  majorRadius: 350,
  minorRadius: 140,
  rows: 50,
  cols: 30,

  // Noise settings
  noiseScale: 0.005,
  noiseSpeed: 0.5,
  noiseStrengthBase: 15,    // Calm equilibrium - subtle breathing
  noiseStrengthMax: 120,    // Max when fully energized
  
  // Projection
  fov: 800, // Slightly wider FOV for larger object
  
  // Colors
  baseColor: { h: 280, s: 100, l: 60 },
  bgColor: "#000000",
};

/**
 * 3D Vector helper
 */
class Vec3 {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

/**
 * Main Study Class
 */
class WireframeFlux {
  constructor(game) {
    this.game = game;
    this.width = game.width;
    this.height = game.height;
    
    // Mesh data
    this.vertices = [];
    this.projected = [];
    this.indices = [];
    
    // Animation state
    this.time = 0;
    this.rotation = { x: 0, y: 0 };
    this.targetRotation = { x: 0.5, y: 0.5 };
    this.autoRotate = true;
    
    // Interaction state - energy decays toward equilibrium
    this.energy = 0;
    this.noiseStrength = CONFIG.noiseStrengthBase;
    
    this.initMesh();
  }

  initMesh() {
    this.vertices = [];
    this.indices = [];
    
    // Generate Torus vertices
    for (let i = 0; i < CONFIG.rows; i++) {
      const u = (i / CONFIG.rows) * Math.PI * 2;
      
      for (let j = 0; j < CONFIG.cols; j++) {
        const v = (j / CONFIG.cols) * Math.PI * 2;
        
        // Torus parametric equation
        // x = (R + r * cos(v)) * cos(u)
        // y = (R + r * cos(v)) * sin(u)
        // z = r * sin(v)
        
        const r = CONFIG.minorRadius;
        const R = CONFIG.majorRadius;
        
        const x = (R + r * Math.cos(v)) * Math.cos(u);
        const y = (R + r * Math.cos(v)) * Math.sin(u);
        const z = r * Math.sin(v);
        
        this.vertices.push(new Vec3(x, y, z));
        
        // Generate indices for wireframe (quads)
        const nextI = (i + 1) % CONFIG.rows;
        const nextJ = (j + 1) % CONFIG.cols;
        
        const current = i * CONFIG.cols + j;
        const right = nextI * CONFIG.cols + j;
        const down = i * CONFIG.cols + nextJ;
        
        // Horizontal line
        this.indices.push([current, right]);
        // Vertical line
        this.indices.push([current, down]);
      }
    }
  }

  update(dt) {
    this.time += dt;
    
    // Update dimensions in case of resize
    this.width = this.game.width;
    this.height = this.game.height;

    // Responsive scaling: Adjust radius based on screen size
    const minDim = Math.min(this.width, this.height);
    const scaleFactor = minDim / 1000; // Base scale on ~1000px screen
    
    // Smoothly interpolate the actual drawing scale
    // (We'll use a local property for rendering scale to avoid rebuilding mesh)
    this.renderScale = scaleFactor;

    // Smooth rotation
    this.rotation.x += (this.targetRotation.x - this.rotation.x) * 0.1;
    this.rotation.y += (this.targetRotation.y - this.rotation.y) * 0.1;
    
    // Auto rotate
    if (this.autoRotate) {
      this.targetRotation.y += dt * 0.2;
      this.targetRotation.x += dt * 0.1;
    }
    
    // Decay energy smoothly toward 0
    this.energy *= 0.95;
    if (this.energy < 0.001) this.energy = 0;

    // Interpolate noise strength: base (calm) + energy * (max - base)
    const targetStrength = CONFIG.noiseStrengthBase + this.energy * (CONFIG.noiseStrengthMax - CONFIG.noiseStrengthBase);
    this.noiseStrength += (targetStrength - this.noiseStrength) * 0.1;
  }

  render(ctx, width, height) {
    const cx = width / 2;
    const cy = height / 2;
    
    // Clear
    ctx.fillStyle = CONFIG.bgColor;
    ctx.fillRect(0, 0, width, height);
    
    // Pre-calculate rotation matrices
    const cosX = Math.cos(this.rotation.x);
    const sinX = Math.sin(this.rotation.x);
    const cosY = Math.cos(this.rotation.y);
    const sinY = Math.sin(this.rotation.y);
    
    // Transform and project vertices
    const projectedVertices = new Array(this.vertices.length);
    
    for (let i = 0; i < this.vertices.length; i++) {
      const v = this.vertices[i];
      
      // 1. Apply Noise Displacement
      // We calculate noise based on the original position + time
      const nX = v.x * CONFIG.noiseScale;
      const nY = v.y * CONFIG.noiseScale;
      const nZ = v.z * CONFIG.noiseScale;
      const t = this.time * CONFIG.noiseSpeed;
      
      const noiseVal = Noise.simplex3(nX + t, nY + t, nZ);
      const displacement = noiseVal * this.noiseStrength;
      
      // Displace along the normal (approximated by position for torus)
      // Or just simple directional displacement for "glitch" look
      let dx = v.x + displacement * (v.x / CONFIG.majorRadius);
      let dy = v.y + displacement * (v.y / CONFIG.majorRadius);
      let dz = v.z + displacement * (v.z / CONFIG.minorRadius);
      
      // 2. Rotate
      // Rotate around Y
      let x1 = dx * cosY - dz * sinY;
      let z1 = dz * cosY + dx * sinY;
      let y1 = dy;
      
      // Rotate around X
      let y2 = y1 * cosX - z1 * sinX;
      let z2 = z1 * cosX + y1 * sinX;
      let x2 = x1;
      
      // 3. Project
      // Apply responsive scale factor to coordinates before projection
      const sx = x2 * (this.renderScale || 1);
      const sy = y2 * (this.renderScale || 1);
      const sz = z2 * (this.renderScale || 1);
      
      const scale = CONFIG.fov / (CONFIG.fov + sz + 400); 
      const px = sx * scale + cx;
      const py = sy * scale + cy;
      
      projectedVertices[i] = { x: px, y: py, z: sz, scale: scale };
    }
    
    // Draw edges
    ctx.lineWidth = 2 * (this.renderScale || 1); // Scale line width too
    
    // We can batch stroke calls by color for performance
    // Simple depth sorting approach: draw lines based on average Z of endpoints
    
    for (let i = 0; i < this.indices.length; i++) {
      const [idx1, idx2] = this.indices[i];
      const p1 = projectedVertices[idx1];
      const p2 = projectedVertices[idx2];
      
      // Simple culling
      if (p1.z < -CONFIG.fov + 10 || p2.z < -CONFIG.fov + 10) continue;
      
      // Depth color
      const avgZ = (p1.z + p2.z) / 2;
      // Map Z (-200 to 200) to hue/lightness
      // Close = Bright, Far = Dim
      const depthAlpha = Math.max(0.1, Math.min(1, (300 - avgZ) / 500));
      
      // Color shift based on position
      const hue = (CONFIG.baseColor.h + avgZ * 0.2 + this.time * 10) % 360;
      
      ctx.strokeStyle = `hsla(${hue}, ${CONFIG.baseColor.s}%, ${CONFIG.baseColor.l}%, ${depthAlpha})`;
      
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  }
}

// Initialize
window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  if (!canvas) return;

  const game = gcanvas({ canvas, bg: CONFIG.bgColor, fluid: true });
  const gameInstance = game.game;
  
  const flux = new WireframeFlux(gameInstance);

  // Custom render loop
  gameInstance.clear = function() {
    flux.render(this.ctx, this.width, this.height);
  };

  game.on("update", (dt) => {
    flux.update(dt);
  });
  
  // Interaction
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  gameInstance.events.on("mousedown", (e) => {
    isDragging = true;
    lastX = e.x;
    lastY = e.y;
  });

  gameInstance.events.on("mouseup", () => {
    isDragging = false;
  });
  
  gameInstance.events.on("mousemove", (e) => {
    if (isDragging) {
      const dx = (e.x - lastX) * 0.01;
      const dy = (e.y - lastY) * 0.01;
      
      flux.targetRotation.y += dx;
      flux.targetRotation.x += dy;
      
      // Stop auto-rotation while dragging
      flux.autoRotate = false;
      
      lastX = e.x;
      lastY = e.y;
    }
  });

  gameInstance.events.on("mouseup", () => {
    isDragging = false;
    // Resume auto-rotation after a short delay or immediately?
    // Let's resume it with current momentum perhaps, or just standard auto
    setTimeout(() => { flux.autoRotate = true; }, 500);
  });
  
  // Click for glitch intensity
  gameInstance.events.on("click", () => {
    // Add energy on click
    flux.energy = Math.min(flux.energy + 0.4, 1.0);
    CONFIG.baseColor.h = Math.random() * 360;
  });

  game.start();
});

