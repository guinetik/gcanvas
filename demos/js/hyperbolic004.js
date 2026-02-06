/**
 * Hyperbolic 004 - Dini's Vortex
 *
 * Inspired by hyperbolic space - Dini's Surface, a twisted pseudosphere
 * of constant negative curvature. Click to disturb, watch it settle.
 *
 * Features:
 * - Dini's Surface (hyperbolic vortex)
 * - Click to add energy - more clicks = more chaos
 * - Settles to gentle pulsing equilibrium
 * - Drag to rotate, auto-rotates when idle
 */

import { gcanvas, Noise } from "../../src/index.js";

// Configuration
const CONFIG = {
  // Geometry
  scale: 180,     // Much larger
  uTurns: 4,
  uSegments: 180,
  vSegments: 40,
  b: 0.15,
  
  // Noise
  noiseScale: 0.008,
  noiseSpeed: 0.5,
  noiseStrengthBase: 8,
  noiseStrengthMax: 70,
  
  // Projection
  fov: 700,
  
  // Colors
  baseColor: { h: 45, s: 100, l: 60 }, // Gold/Orange/Yellow
  bgColor: "#000000", // Pure black
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
class DiniVortex {
  constructor(game) {
    this.game = game;
    this.width = game.width;
    this.height = game.height;
    
    this.vertices = [];
    this.indices = [];
    
    // Animation
    this.time = 0;
    this.rotation = { x: 0.2, y: 0 };
    this.targetRotation = { x: 0.2, y: 0.5 };
    this.autoRotate = true;

    // Interaction state - energy decays toward equilibrium
    this.energy = 0;
    this.noiseStrength = CONFIG.noiseStrengthBase;

    this.initMesh();
  }

  initMesh() {
    this.vertices = [];
    this.indices = [];
    
    // Dini's Surface Equations:
    // x = a * cos(u) * sin(v)
    // y = a * sin(u) * sin(v)
    // z = a * (cos(v) + ln(tan(v/2))) + b*u
    
    // Constraints:
    // u: 0 to 4PI (or more for spiraling)
    // v: 0.1 to PI (profile curve)
    
    const a = CONFIG.scale;
    const b = CONFIG.b * CONFIG.scale; // Scale the pitch too
    
    const uMax = CONFIG.uTurns * Math.PI * 2;
    
    for (let i = 0; i < CONFIG.uSegments; i++) {
      const uRatio = i / (CONFIG.uSegments - 1);
      const u = uRatio * uMax;
      
      for (let j = 0; j < CONFIG.vSegments; j++) {
        const vRatio = j / (CONFIG.vSegments - 1);
        // v must avoid 0 (singularity for ln(tan(0)))
        // Range from small epsilon to just under PI/2 (asymptote) or up to 2 (curl back)
        // Standard Dini profile usually 0.1 to 2.0
        const v = 0.05 + vRatio * 1.8;
        
        const sinV = Math.sin(v);
        const cosV = Math.cos(v);
        const tanHalfV = Math.tan(v / 2);
        
        const x = a * Math.cos(u) * sinV;
        const y = a * Math.sin(u) * sinV;
        
        // Handle singularity gracefully
        let term2 = 0;
        if (tanHalfV > 0) {
            term2 = Math.log(tanHalfV);
        }
        
        const z = a * (cosV + term2) + b * u;
        
        // Center the spiral vertically
        // Approximation: z ranges roughly from a*2 to -infinity?
        // Let's shift it down by half the spiral height
        const zShift = z - (b * uMax * 0.5);
        
        this.vertices.push(new Vec3(x, y, zShift));
        
        // Indices (Grid)
        if (i < CONFIG.uSegments - 1 && j < CONFIG.vSegments - 1) {
          const current = i * CONFIG.vSegments + j;
          const right = (i + 1) * CONFIG.vSegments + j;
          const down = i * CONFIG.vSegments + (j + 1);
          const diag = (i + 1) * CONFIG.vSegments + (j + 1);
          
          // Wireframe style: grid lines
          this.indices.push([current, right]);
          this.indices.push([current, down]);
          
          // Optional: Add diagonals for triangulation density
          // this.indices.push([current, diag]);
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
    this.renderScale = minDim / 600; // Adjusted baseline for larger appearance

    // Smooth rotation
    this.rotation.x += (this.targetRotation.x - this.rotation.x) * 0.1;
    this.rotation.y += (this.targetRotation.y - this.rotation.y) * 0.1;
    
    if (this.autoRotate) {
      this.targetRotation.y += dt * 0.2;
      this.targetRotation.x = 0.2 + Math.sin(this.time * 0.3) * 0.1;
    }

    // Decay energy smoothly toward 0
    this.energy *= 0.95;
    if (this.energy < 0.001) this.energy = 0;

    // Interpolate noise strength toward equilibrium
    const targetStrength = CONFIG.noiseStrengthBase + this.energy * (CONFIG.noiseStrengthMax - CONFIG.noiseStrengthBase);
    this.noiseStrength += (targetStrength - this.noiseStrength) * 0.1;
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
      
      // Calculate derived polar coords for effect
      const r = Math.sqrt(v.x*v.x + v.y*v.y);
      const angle = Math.atan2(v.y, v.x);
      
      // 1. Noise Deformation
      // Flow along the spiral (u direction, roughly Z and Angle)
      const t = this.time * CONFIG.noiseSpeed;
      
      // We want the noise to flow "up" the spiral
      const flow = v.z * 0.01 - t;
      
      const nX = v.x * CONFIG.noiseScale;
      const nY = v.y * CONFIG.noiseScale;
      const nZ = v.z * CONFIG.noiseScale;
      
      const noiseVal = Noise.simplex3(nX + Math.cos(t), nY + Math.sin(t), nZ + flow);
      
      // Pulse effect
      const pulse = 1.0 + Math.sin(t * 2 + v.z * 0.02) * 0.1;
      
      // Apply deformations
      // Expand/contract radially
      const dr = noiseVal * this.noiseStrength;
      
      let dx = v.x + (v.x / (r+0.1)) * dr;
      let dy = v.y + (v.y / (r+0.1)) * dr;
      let dz = v.z * pulse;
      
      // 2. Rotation
      let x1 = dx * cosY - dz * sinY;
      let z1 = dz * cosY + dx * sinY;
      let y1 = dy;
      
      let y2 = y1 * cosX - z1 * sinX;
      let z2 = z1 * cosX + y1 * sinX;
      let x2 = x1;
      
      // 3. Projection
      const s = this.renderScale || 1;
      const sx = x2 * s;
      const sy = y2 * s;
      const sz = z2 * s;
      
      const scale = CONFIG.fov / (CONFIG.fov + sz + 400); 
      const px = sx * scale + cx;
      const py = sy * scale + cy;
      
      projectedVertices[i] = { 
        x: px, 
        y: py, 
        z: sz, 
        scale: scale,
        origZ: v.z // Store original Z for gradient coloring
      };
    }
    
    // Draw Edges
    const lineWidth = 1.5 * (this.renderScale || 1);
    ctx.lineWidth = lineWidth;
    
    // Batch stroke? No, color changes per segment
    for (let i = 0; i < this.indices.length; i++) {
      const [idx1, idx2] = this.indices[i];
      const p1 = projectedVertices[idx1];
      const p2 = projectedVertices[idx2];
      
      // Culling
      if (p1.z < -CONFIG.fov + 10 || p2.z < -CONFIG.fov + 10) continue;
      
      const avgZ = (p1.z + p2.z) / 2;
      const avgOrigZ = (p1.origZ + p2.origZ) / 2;
      
      // Depth fading
      const depthAlpha = Math.max(0.1, Math.min(1, (600 - avgZ) / 800));
      
      // Color Gradient along the spiral height
      // Map origZ (-height/2 to height/2) to Hue
      // Height is roughly scale * b * uMax = 60 * 0.15 * 8PI ~= 226
      const heightRange = 300;
      const normalizedH = (avgOrigZ + heightRange/2) / heightRange;
      
      // Gold to Red to Purple
      const hue = (CONFIG.baseColor.h + normalizedH * 60) % 360;
      const light = 40 + normalizedH * 40; // Brighter at top
      
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
  
  const vortex = new DiniVortex(gameInstance);

  // Loop
  gameInstance.clear = function() {
    vortex.render(this.ctx, this.width, this.height);
  };

  game.on("update", (dt) => {
    vortex.update(dt);
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
    setTimeout(() => { vortex.autoRotate = true; }, 500);
  });
  
  gameInstance.events.on("mousemove", (e) => {
    if (isDragging) {
      const dx = (e.x - lastX) * 0.01;
      const dy = (e.y - lastY) * 0.01;
      
      vortex.targetRotation.y += dx;
      vortex.targetRotation.x += dy;
      vortex.autoRotate = false;
      
      lastX = e.x;
      lastY = e.y;
    }
  });
  
  gameInstance.events.on("click", () => {
    if(!isDragging) {
        // Add energy on click
        vortex.energy = Math.min(vortex.energy + 0.4, 1.0);
        CONFIG.baseColor.h = Math.random() * 360;
    }
  });

  game.start();
});

