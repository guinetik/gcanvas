/**
 * Hyperbolic 003 - Hyperbolic Fabric
 *
 * Inspired by hyperbolic space - a ruffled disk that mimics crochet
 * hyperbolic plane models. Click to disturb, watch it settle.
 *
 * Features:
 * - Ruffled disk with exponential edge folding
 * - Click to add energy - more clicks = more chaos
 * - Settles to gentle wave equilibrium
 * - Drag to rotate, auto-rotates when idle
 */

import { gcanvas, Noise } from "../../src/index.js";

// Configuration
const CONFIG = {
  // Geometry
  radius: 700,    // Much larger
  rings: 40,
  slices: 80,
  
  // Hyperbolic settings
  waves: 8,
  amplitudeBase: 80,    // Calm equilibrium
  amplitudeMax: 250,    // Max when energized
  exponent: 1.8,

  // Noise
  noiseScale: 0.005,
  noiseSpeed: 0.4,
  noiseStrengthBase: 10,
  noiseStrengthMax: 60,
  
  // Projection
  fov: 800,
  
  // Colors
  baseColor: { h: 320, s: 100, l: 60 }, // Magenta/Pink
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
class HyperbolicFabric {
  constructor(game) {
    this.game = game;
    this.width = game.width;
    this.height = game.height;
    
    this.vertices = [];
    this.indices = [];
    
    // Animation
    this.time = 0;
    this.rotation = { x: 0.4, y: 0 };
    this.targetRotation = { x: 0.6, y: 0.2 };
    this.autoRotate = true;
    
    // Interaction state - energy decays toward equilibrium
    this.energy = 0;
    this.amplitude = CONFIG.amplitudeBase;
    this.noiseStrength = CONFIG.noiseStrengthBase;
    
    this.initMesh();
  }

  initMesh() {
    this.vertices = [];
    this.indices = [];
    
    // Generate Polar Grid
    for (let i = 0; i <= CONFIG.rings; i++) {
      const rRatio = i / CONFIG.rings;
      const r = rRatio * CONFIG.radius;
      
      for (let j = 0; j < CONFIG.slices; j++) {
        const thetaRatio = j / CONFIG.slices;
        const theta = thetaRatio * Math.PI * 2;
        
        // Base flat disk position
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        const z = 0;
        
        this.vertices.push(new Vec3(x, y, z));
        
        // Indices (Quads)
        if (i < CONFIG.rings) {
          const current = i * CONFIG.slices + j;
          const nextRing = (i + 1) * CONFIG.slices + j;
          
          // Connect to next point in ring (wrapping)
          const nextSlice = i * CONFIG.slices + ((j + 1) % CONFIG.slices);
          const nextRingNextSlice = (i + 1) * CONFIG.slices + ((j + 1) % CONFIG.slices);
          
          // Radial line
          this.indices.push([current, nextRing]);
          
          // Angular line (ring)
          this.indices.push([current, nextSlice]);
          
          // Optional: Diagonal for triangulation look?
          // this.indices.push([current, nextRingNextSlice]);
        }
      }
    }
  }

  update(dt) {
    this.time += dt;
    
    // Update dimensions
    this.width = this.game.width;
    this.height = this.game.height;

    // Responsive scaling
    const minDim = Math.min(this.width, this.height);
    this.renderScale = minDim / 900;

    // Smooth rotation
    this.rotation.x += (this.targetRotation.x - this.rotation.x) * 0.1;
    this.rotation.y += (this.targetRotation.y - this.rotation.y) * 0.1;
    
    if (this.autoRotate) {
      this.targetRotation.y += dt * 0.1;
      this.targetRotation.x = this.targetRotation.x + Math.sin(this.time * 0.5) * 0.002;
    }

    // Decay energy smoothly toward 0
    this.energy *= 0.95;
    if (this.energy < 0.001) this.energy = 0;

    // Interpolate amplitude and noise toward equilibrium
    const targetAmp = CONFIG.amplitudeBase + this.energy * (CONFIG.amplitudeMax - CONFIG.amplitudeBase);
    this.amplitude += (targetAmp - this.amplitude) * 0.1;

    const targetNoise = CONFIG.noiseStrengthBase + this.energy * (CONFIG.noiseStrengthMax - CONFIG.noiseStrengthBase);
    this.noiseStrength += (targetNoise - this.noiseStrength) * 0.1;
  }

  render(ctx, width, height) {
    const cx = width / 2;
    const cy = height / 2;
    
    ctx.fillStyle = CONFIG.bgColor;
    ctx.fillRect(0, 0, width, height);
    
    const cosX = Math.cos(this.rotation.x);
    const sinX = Math.sin(this.rotation.x);
    const cosY = Math.cos(this.rotation.y);
    const sinY = Math.sin(this.rotation.y);
    
    const projectedVertices = new Array(this.vertices.length);
    const scaleFactor = this.renderScale || 1;
    
    // Transform Loop
    for (let i = 0; i < this.vertices.length; i++) {
      const v = this.vertices[i];
      
      // Calculate derived polar coords
      const r = Math.sqrt(v.x*v.x + v.y*v.y);
      const theta = Math.atan2(v.y, v.x);
      const rRatio = r / CONFIG.radius;
      
      // 1. Hyperbolic Deformation (The "Crochet" Effect)
      // Height increases exponentially with radius, oscillating by angle
      const wavePhase = theta * CONFIG.waves; 
      // Add a radial movement to create flow (waves travel outwards)
      const twistPhase = wavePhase + (rRatio * 10.0 - this.time * 3.0); 
      
      const zBase = Math.pow(rRatio, CONFIG.exponent) * this.amplitude * Math.sin(twistPhase);
      
      // 2. Noise Detail
      const nX = v.x * CONFIG.noiseScale;
      const nY = v.y * CONFIG.noiseScale;
      const t = this.time * CONFIG.noiseSpeed;
      const noiseVal = Noise.simplex3(nX + t, nY + t, zBase * 0.01);
      
      // Apply deformations
      const dz = zBase + noiseVal * this.noiseStrength * rRatio; // Noise stronger at edges
      
      // Position
      let dx = v.x;
      let dy = v.y;
      let dz_final = dz;
      
      // 3. Rotation
      let x1 = dx * cosY - dz_final * sinY;
      let z1 = dz_final * cosY + dx * sinY;
      let y1 = dy;
      
      let y2 = y1 * cosX - z1 * sinX;
      let z2 = z1 * cosX + y1 * sinX;
      let x2 = x1;
      
      // 4. Projection
      const sx = x2 * scaleFactor;
      const sy = y2 * scaleFactor;
      const sz = z2 * scaleFactor;
      
      const scale = CONFIG.fov / (CONFIG.fov + sz + 400); 
      const px = sx * scale + cx;
      const py = sy * scale + cy;
      
      projectedVertices[i] = { 
        x: px, 
        y: py, 
        z: sz, 
        scale: scale,
        rRatio: rRatio // Store for coloring
      };
    }
    
    // Draw Edges
    const lineWidth = 1.5 * scaleFactor;
    ctx.lineWidth = lineWidth;
    
    for (let i = 0; i < this.indices.length; i++) {
      const [idx1, idx2] = this.indices[i];
      const p1 = projectedVertices[idx1];
      const p2 = projectedVertices[idx2];
      
      // Culling
      if (p1.z < -CONFIG.fov + 10 || p2.z < -CONFIG.fov + 10) continue;
      
      const avgZ = (p1.z + p2.z) / 2;
      const avgR = (p1.rRatio + p2.rRatio) / 2;
      
      // Depth fading
      const depthAlpha = Math.max(0.1, Math.min(1, (500 - avgZ) / 700));
      
      // Color:
      // Inner = Darker/Purple, Outer = Brighter/Pink
      // Modulate Hue by radius
      const hue = (CONFIG.baseColor.h + avgR * 40) % 360;
      const light = 30 + avgR * 40; // Brighter at edges
      
      ctx.strokeStyle = `hsla(${hue}, ${CONFIG.baseColor.s}%, ${light}%, ${depthAlpha})`;
      
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
  
  const fabric = new HyperbolicFabric(gameInstance);

  // Loop
  gameInstance.clear = function() {
    fabric.render(this.ctx, this.width, this.height);
  };

  game.on("update", (dt) => {
    fabric.update(dt);
  });
  
  // Interaction
  let isDragging = false;
  let lastX = 0, lastY = 0;

  gameInstance.events.on("mousedown", (e) => {
    isDragging = true;
    lastX = e.x;
    lastY = e.y;
  });

  gameInstance.events.on("mouseup", () => {
    isDragging = false;
    setTimeout(() => { fabric.autoRotate = true; }, 500);
  });
  
  gameInstance.events.on("mousemove", (e) => {
    if (isDragging) {
      const dx = (e.x - lastX) * 0.01;
      const dy = (e.y - lastY) * 0.01;
      
      fabric.targetRotation.y += dx;
      fabric.targetRotation.x += dy;
      fabric.autoRotate = false;
      
      lastX = e.x;
      lastY = e.y;
    }
  });
  
  gameInstance.events.on("click", () => {
    if(!isDragging) {
        // Add energy on click
        fabric.energy = Math.min(fabric.energy + 0.4, 1.0);
        CONFIG.baseColor.h = Math.random() * 360;
    }
  });

  game.start();
});

