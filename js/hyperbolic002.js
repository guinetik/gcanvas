/**
 * Hyperbolic 002 - Mobius Flow
 *
 * Inspired by hyperbolic space - a twisted ribbon (lemniscate) that
 * breathes with noise. Click to disturb, watch it settle to equilibrium.
 *
 * Features:
 * - Lemniscate ribbon with twist deformation
 * - Click to add energy - more clicks = more chaos
 * - Settles to subtle vibration equilibrium
 * - Drag to rotate, auto-rotates when idle
 */

import { gcanvas, Noise } from "/gcanvas.es.min.js";

// Configuration
const CONFIG = {
  // Mobius geometry
  radius: 350,    // Increased from 300
  width: 140,     // Increased from 120
  uSegments: 140, // Increased detail
  vSegments: 24,  // Increased detail
  
  // Noise settings
  noiseScale: 0.008,
  noiseSpeed: 0.8,
  noiseStrengthBase: 10,
  noiseStrengthMax: 100,
  
  // Projection
  fov: 700,
  
  // Colors
  baseColor: { h: 190, s: 100, l: 60 }, // Cyan/Blue
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
class MobiusFlow {
  constructor(game) {
    this.game = game;
    this.width = game.width;
    this.height = game.height;
    
    // Mesh data
    this.vertices = [];
    this.indices = [];
    
    // Animation state
    this.time = 0;
    this.rotation = { x: 0, y: 0 };
    this.targetRotation = { x: 0.4, y: 0.2 };
    this.autoRotate = true;
    
    // Interaction state - energy decays toward equilibrium
    this.energy = 0;
    this.noiseStrength = CONFIG.noiseStrengthBase;
    
    this.initMesh();
  }

  initMesh() {
    this.vertices = [];
    this.indices = [];
    
    // Generate Lemniscate (Infinity Symbol) Ribbon vertices
    // Parametric equations for a 3D ribbon following a lemniscate curve
    
    // Lemniscate of Bernoulli path:
    // x = a * cos(t) / (1 + sin^2(t))
    // y = a * sin(t) * cos(t) / (1 + sin^2(t))
    // z = 0 (base curve is flat, but we'll twist the ribbon around it)
    
    // Ribbon construction:
    // P(t) = curve point
    // T(t) = tangent vector
    // N(t) = normal vector (perpendicular to tangent and "up")
    // B(t) = binormal (cross product)
    
    for (let i = 0; i < CONFIG.uSegments; i++) {
      // u goes from 0 to 2PI
      const u = (i / CONFIG.uSegments) * Math.PI * 2;
      
      // Calculate curve point
      const scale = CONFIG.radius;
      const denom = 1 + Math.sin(u) * Math.sin(u);
      
      const cx = scale * Math.cos(u) / denom;
      const cy = scale * Math.sin(u) * Math.cos(u) / denom;
      const cz = 0; // Base curve is flat
      
      // Calculate tangent (derivative) approximately or analytically
      // Let's use simple finite difference for tangent
      const uNext = u + 0.01;
      const denomNext = 1 + Math.sin(uNext) * Math.sin(uNext);
      const cxNext = scale * Math.cos(uNext) / denomNext;
      const cyNext = scale * Math.sin(uNext) * Math.cos(uNext) / denomNext;
      const czNext = 0;
      
      // Tangent vector
      let tx = cxNext - cx;
      let ty = cyNext - cy;
      let tz = czNext - cz;
      
      // Normalize tangent
      const tLen = Math.sqrt(tx*tx + ty*ty + tz*tz);
      tx /= tLen; ty /= tLen; tz /= tLen;
      
      // Define a "Binormal" vector roughly perpendicular to tangent and Z-up
      // Up vector (0, 0, 1)
      // B = T x Up
      let bx = ty * 1 - tz * 0;
      let by = tz * 0 - tx * 1;
      let bz = tx * 0 - ty * 0; // Will be non-zero if we had 3D path
      
      // Since path is 2D (z=0), Binormal is just (-ty, tx, 0)
      
      // Twist factor! Rotate the "Normal" around the Tangent as we go along
      // Full twist: u goes 0->2PI, twist goes 0->2PI (or PI for mobius-like)
      const twist = u; // Full 360 twist over the length
      
      // Rotate the binormal vector around the tangent vector? 
      // Actually simpler: Just define the ribbon cross section vector
      // Start with vector perpendicular to curve in XY plane (normal 2D)
      // Then rotate it around the Tangent to get 3D ribbon
      
      // Normal 2D vector (perpendicular to tangent in XY)
      let nx = -ty;
      let ny = tx;
      let nz = 0;
      
      // Apply twist rotation around the Tangent axis?
      // Or just rotate around the curve itself?
      // Let's rotate the normal vector [nx, ny, nz] around [tx, ty, tz] by 'twist'
      
      // Rodrigues rotation formula for vector v around k by theta:
      // v_rot = v cos(th) + (k x v) sin(th) + k(k.v)(1-cos(th))
      // Here v = normal, k = tangent
      // Since k.v = 0 (orthogonal), term 3 is 0.
      // v_rot = n * cos(twist) + (t x n) * sin(twist)
      
      // Cross product (t x n) is roughly the Z axis (0,0,1) direction
      const cx_n = ty*nz - tz*ny;
      const cy_n = tz*nx - tx*nz;
      const cz_n = tx*ny - ty*nx;
      
      const cosTwist = Math.cos(twist);
      const sinTwist = Math.sin(twist);
      
      const rx = nx * cosTwist + cx_n * sinTwist;
      const ry = ny * cosTwist + cy_n * sinTwist;
      const rz = nz * cosTwist + cz_n * sinTwist;
      
      // Ribbon width vector
      const wx = rx * CONFIG.width;
      const wy = ry * CONFIG.width;
      const wz = rz * CONFIG.width;
      
      for (let j = 0; j < CONFIG.vSegments; j++) {
        // v goes from -0.5 to 0.5
        const v = (j / (CONFIG.vSegments - 1)) - 0.5;
        
        const x = cx + wx * v;
        const y = cy + wy * v;
        const z = cz + wz * v;
        
        this.vertices.push(new Vec3(x, y, z));
        
        // Indices generation (Grid logic)
        if (i < CONFIG.uSegments - 1) {
            const current = i * CONFIG.vSegments + j;
            const right = (i + 1) * CONFIG.vSegments + j;
            const down = i * CONFIG.vSegments + (j + 1);

            this.indices.push([current, right]);
            if (j < CONFIG.vSegments - 1) {
                this.indices.push([current, down]);
            }
        } else {
            // Close loop
            const current = i * CONFIG.vSegments + j;
            const right = 0 * CONFIG.vSegments + j; // Connect back to start
            
             this.indices.push([current, right]);
             if (j < CONFIG.vSegments - 1) {
                const down = i * CONFIG.vSegments + (j + 1);
                this.indices.push([current, down]);
            }
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
    
    // Auto rotate
    if (this.autoRotate) {
      this.targetRotation.y += dt * 0.3;
      this.targetRotation.x += dt * 0.15;
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
    
    const cosX = Math.cos(this.rotation.x);
    const sinX = Math.sin(this.rotation.x);
    const cosY = Math.cos(this.rotation.y);
    const sinY = Math.sin(this.rotation.y);
    
    // Transform and project
    const projectedVertices = new Array(this.vertices.length);
    
    for (let i = 0; i < this.vertices.length; i++) {
      const v = this.vertices[i];
      
      // 1. Noise Displacement
      const nX = v.x * CONFIG.noiseScale;
      const nY = v.y * CONFIG.noiseScale;
      const nZ = v.z * CONFIG.noiseScale;
      const t = this.time * CONFIG.noiseSpeed;
      
      // Use 4D noise approximation (using 3D with moving slice)
      const noiseVal = Noise.simplex3(nX + t, nY + t*0.5, nZ);
      const displacement = noiseVal * this.noiseStrength;
      
      // Deform
      let dx = v.x + displacement * (v.x / CONFIG.radius);
      let dy = v.y + displacement * (v.y / CONFIG.radius);
      let dz = v.z + displacement * 0.5; // Less Z deformation
      
      // 2. Rotate
      let x1 = dx * cosY - dz * sinY;
      let z1 = dz * cosY + dx * sinY;
      let y1 = dy;
      
      let y2 = y1 * cosX - z1 * sinX;
      let z2 = z1 * cosX + y1 * sinX;
      let x2 = x1;
      
      // 3. Project
      // Apply renderScale to coordinates BEFORE projection
      // This scales the world-space object proportional to screen size
      const s = this.renderScale || 1;
      const sx = x2 * s;
      const sy = y2 * s;
      const sz = z2 * s;
      
      const scale = CONFIG.fov / (CONFIG.fov + sz + 300); 
      const px = sx * scale + cx;
      const py = sy * scale + cy;
      
      projectedVertices[i] = { x: px, y: py, z: sz, scale: scale };
    }
    
    // Draw edges
    // Scale line width with screen size too
    const lineWidth = 1.5 * (this.renderScale || 1);
    ctx.lineWidth = lineWidth;
    
    for (let i = 0; i < this.indices.length; i++) {
      const [idx1, idx2] = this.indices[i];
      const p1 = projectedVertices[idx1];
      const p2 = projectedVertices[idx2];
      
      // Culling
      if (p1.z < -CONFIG.fov + 10 || p2.z < -CONFIG.fov + 10) continue;
      
      const avgZ = (p1.z + p2.z) / 2;
      
      // Depth color mapping
      // Map Z to opacity and lightness
      const depthAlpha = Math.max(0.15, Math.min(1, (400 - avgZ) / 600));
      
      // Color shift
      // Base cyan, shift towards purple/blue at depth
      const hue = (CONFIG.baseColor.h + avgZ * 0.1) % 360;
      
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
  
  const mobius = new MobiusFlow(gameInstance);

  // Custom render loop
  gameInstance.clear = function() {
    mobius.render(this.ctx, this.width, this.height);
  };

  game.on("update", (dt) => {
    mobius.update(dt);
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
    setTimeout(() => { mobius.autoRotate = true; }, 500);
  });
  
  gameInstance.events.on("mousemove", (e) => {
    if (isDragging) {
      const dx = (e.x - lastX) * 0.01;
      const dy = (e.y - lastY) * 0.01;
      
      mobius.targetRotation.y += dx;
      mobius.targetRotation.x += dy;
      mobius.autoRotate = false;
      
      lastX = e.x;
      lastY = e.y;
    }
  });
  
  // Click to change color/noise
  gameInstance.events.on("click", () => {
    if(!isDragging) {
        CONFIG.baseColor.h = Math.random() * 360;
        // Add energy
        mobius.energy = Math.min(mobius.energy + 0.4, 1.0);
    }
  });

  game.start();
});

