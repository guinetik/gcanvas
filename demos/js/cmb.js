/**
 * Cosmic Microwave Background Visualization
 * 
 * A 3D visualization of the Cosmic Microwave Background (CMB) radiation,
 * the oldest light in the universe. Uses WebGL particle rendering and
 * Camera3D for 3D projection with physics-based thermal motion.
 * 
 * The CMB shows tiny temperature fluctuations (anisotropies) that seeded
 * the formation of galaxies. Temperature is ~2.725K with variations of ~0.00001K.
 * 
 * Color mapping: Blue (cold) → White (average) → Red (hot)
 */

import {
  Game,
  ParticleSystem,
  ParticleEmitter,
  Updaters,
  PhysicsUpdaters,
  Camera3D,
  Noise,
  Painter,
} from "../../src/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  // Particle count and distribution
  numParticles: 8000,
  sphereRadius: 300,
  
  // CMB temperature (Kelvin)
  baseTemperature: 2.725,
  temperatureVariation: 0.0001, // ±100 μK
  
  // Visual settings
  particleSize: 3,
  particleSizeVariation: 1.5,
  
  // Camera
  perspective: 800,
  autoRotateSpeed: 0.05,
  
  // Physics
  thermalMotion: 0.5,
  thermalScale: 15,
  sphereRestitution: 0.95,
  
  // Noise for temperature distribution
  noiseScale: 0.008,
  noiseOctaves: 4,
  
  // WebGL
  useWebGL: true,
  webglShape: 'glow',
  webglBlendMode: 'additive',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a random point on a sphere surface
 */
function randomSpherePoint(radius) {
  // Use spherical coordinates for uniform distribution
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  
  return {
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.sin(phi) * Math.sin(theta),
    z: radius * Math.cos(phi),
  };
}

/**
 * Generate CMB temperature using 3D noise
 * Returns normalized value from -1 to 1
 */
function getCMBTemperature(x, y, z) {
  // Use multiple octaves of noise for realistic power spectrum
  let temp = 0;
  let amplitude = 1;
  let frequency = CONFIG.noiseScale;
  
  for (let i = 0; i < CONFIG.noiseOctaves; i++) {
    // 3D noise sampled at position
    temp += Noise.perlin3D(
      x * frequency,
      y * frequency,
      z * frequency
    ) * amplitude;
    
    amplitude *= 0.5;
    frequency *= 2;
  }
  
  // Normalize to -1 to 1
  return temp / (2 - Math.pow(0.5, CONFIG.noiseOctaves - 1));
}

/**
 * Map temperature deviation to color
 * -1 (cold) = Blue
 *  0 (average) = White
 * +1 (hot) = Red
 */
function temperatureToColor(t) {
  // Clamp and scale
  t = Math.max(-1, Math.min(1, t));
  
  // Cold (blue) → Average (white) → Hot (red/yellow)
  let r, g, b;
  
  if (t < 0) {
    // Cold: Blue to White
    const s = 1 + t; // 0 to 1
    r = Math.floor(100 + 155 * s);
    g = Math.floor(150 + 105 * s);
    b = 255;
  } else {
    // Hot: White to Red/Orange
    const s = t; // 0 to 1
    r = 255;
    g = Math.floor(255 - 155 * s);
    b = Math.floor(255 - 200 * s);
  }
  
  return { r, g, b, a: 0.9 };
}

// ─────────────────────────────────────────────────────────────────────────────
// CMB DEMO CLASS
// ─────────────────────────────────────────────────────────────────────────────

class CMBDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000005";
    this.enableFluidSize();
  }

  init() {
    super.init();
    
    // Initialize noise
    Noise.seed(42);
    
    // Create 3D camera with mouse controls
    this.camera = new Camera3D({
      perspective: CONFIG.perspective,
      viewWidth: this.width,
      viewHeight: this.height,
      enableMouseControls: true,
      canvas: this.canvas,
    });
    
    // Initial camera rotation for nice view
    this.camera.rotationX = 0.3;
    this.camera.rotationY = 0.5;
    
    // Create particle system with WebGL rendering
    this.particles = new ParticleSystem(this, {
      maxParticles: CONFIG.numParticles + 100,
      camera: this.camera,
      depthSort: true,
      useWebGL: CONFIG.useWebGL,
      webglShape: CONFIG.webglShape,
      webglBlendMode: CONFIG.webglBlendMode,
      blendMode: "lighter",
      
      // Physics updaters for thermal motion
      updaters: [
        Updaters.velocity,
        PhysicsUpdaters.thermal(() => CONFIG.thermalMotion, CONFIG.thermalScale),
        PhysicsUpdaters.sphereBounds(
          { x: 0, y: 0, z: 0, radius: CONFIG.sphereRadius * 1.1 },
          CONFIG.sphereRestitution
        ),
        Updaters.damping(0.98),
      ],
    });
    
    // Create CMB particles on sphere surface
    this.createCMBParticles();
    
    // Add to pipeline
    this.pipeline.add(this.particles);
    
    // Auto-rotation
    this.autoRotate = true;
    this.time = 0;
  }

  createCMBParticles() {
    for (let i = 0; i < CONFIG.numParticles; i++) {
      // Get particle from pool
      const p = this.particles.acquire();
      if (!p) break;
      
      // Position on sphere surface
      const pos = randomSpherePoint(CONFIG.sphereRadius);
      p.x = pos.x;
      p.y = pos.y;
      p.z = pos.z;
      
      // Small random velocity for thermal motion
      const speed = 2;
      p.vx = (Math.random() - 0.5) * speed;
      p.vy = (Math.random() - 0.5) * speed;
      p.vz = (Math.random() - 0.5) * speed;
      
      // CMB temperature at this position
      const temp = getCMBTemperature(pos.x, pos.y, pos.z);
      p.custom.temperature = temp;
      
      // Color based on temperature
      const color = temperatureToColor(temp);
      p.color.r = color.r;
      p.color.g = color.g;
      p.color.b = color.b;
      p.color.a = color.a;
      
      // Size varies slightly with temperature (hotter = slightly larger)
      p.size = CONFIG.particleSize + (temp * 0.5 + 0.5) * CONFIG.particleSizeVariation;
      
      // Long lifetime (effectively permanent)
      p.lifetime = 999999;
      p.alive = true;
      
      // Store initial position for reference
      p.custom.initialX = pos.x;
      p.custom.initialY = pos.y;
      p.custom.initialZ = pos.z;
    }
  }

  update(dt) {
    super.update(dt);
    
    this.time += dt;
    
    // Auto-rotate camera
    if (this.autoRotate && !this.camera._isDragging) {
      this.camera.rotationY += CONFIG.autoRotateSpeed * dt;
    }
    
    // Update camera
    this.camera.viewWidth = this.width;
    this.camera.viewHeight = this.height;
    this.camera.update(dt);
    
    // Resize WebGL renderer if needed
    if (this.particles.webglRenderer) {
      if (this.particles.webglRenderer.width !== this.width ||
          this.particles.webglRenderer.height !== this.height) {
        this.particles.webglRenderer.resize(this.width, this.height);
      }
    }
  }

  render() {
    super.render();
    
    // Draw info overlay
    this.drawOverlay();
  }

  drawOverlay() {
    const ctx = this.ctx;
    
    // Temperature scale legend
    const legendX = 20;
    const legendY = this.height - 80;
    const legendWidth = 150;
    const legendHeight = 15;
    
    // Draw gradient bar
    const gradient = ctx.createLinearGradient(legendX, legendY, legendX + legendWidth, legendY);
    gradient.addColorStop(0, 'rgb(100, 150, 255)');
    gradient.addColorStop(0.5, 'rgb(255, 255, 255)');
    gradient.addColorStop(1, 'rgb(255, 100, 55)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
    
    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);
    
    // Labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Cold', legendX + 20, legendY + legendHeight + 12);
    ctx.fillText('Hot', legendX + legendWidth - 20, legendY + legendHeight + 12);
    
    // Title
    ctx.textAlign = 'left';
    ctx.fillText('Temperature Anisotropy', legendX, legendY - 5);
    
    // Stats
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '11px monospace';
    const statsY = this.height - 120;
    ctx.fillText(`Particles: ${this.particles.activeCount}`, legendX, statsY);
    ctx.fillText(`T₀ = ${CONFIG.baseTemperature} K`, legendX, statsY - 15);
    ctx.fillText(`δT ≈ ±${(CONFIG.baseTemperature * CONFIG.temperatureVariation * 1e6).toFixed(0)} μK`, legendX, statsY - 30);
  }

  onResize() {
    super.onResize();
    
    if (this.camera) {
      this.camera.viewWidth = this.width;
      this.camera.viewHeight = this.height;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new CMBDemo(canvas);
  demo.start();
});
