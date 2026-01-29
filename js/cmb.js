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
  Updaters,
  PhysicsUpdaters,
  Camera3D,
  Noise,
  Painter,
  Gesture,
  Tweenetik,
  Easing,
  Screen,
  applyParticleHeatTransfer,
} from "/gcanvas.es.min.js";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get responsive configuration based on screen size
 */
function getResponsiveConfig() {
  // Sphere radius based on smaller screen dimension (fills ~80% of screen)
  const minDim = Screen.minDimension();
  const sphereRadius = minDim * 0.4;
  
  // Particle count scales with screen area (more particles = denser CMB)
  // Mobile: ~1500, Tablet: ~2500, Desktop: ~4000
  const numParticles = Screen.responsive(1500, 2500, 4000);
  
  return { sphereRadius, numParticles };
}

const CONFIG = {
  // Particle count and distribution (set dynamically in init)
  numParticles: 3000,  // default, overridden by getResponsiveConfig()
  sphereRadius: 400,   // default, overridden by getResponsiveConfig()
  
  // CMB temperature (Kelvin)
  baseTemperature: 2.725,
  temperatureVariation: 0.0001, // ±100 μK
  
  // Visual settings
  particleSize: 3,
  particleSizeVariation: 2,
  
  // Camera
  perspective: 600,
  autoRotateSpeed: 0.1,
  cameraDistance: 0,
  
  // Zoom (position scaling - fly into the CMB)
  minZoom: 0.5,         // zoomed out
  maxZoom: 4.0,         // zoomed in (inside the sphere)
  zoomSmoothing: 0.12,  // interpolation speed
  
  // Big Bang animation
  bigBang: {
    enabled: true,
    initialZoom: 0.05,      // start tiny
    targetZoom: 1.0,        // expand to full size
    zoomDuration: 1.5,      // seconds to expand (faster)
    spawnDelay: 0.0001,     // delay between particle spawns (ultra fast burst)
    explosionForce: 800,    // outward velocity (stronger)
    flashDuration: 0.3,     // white flash duration (quicker fade)
    flashHoldTime: 0.05,    // hold at full white (shorter)
  },
  
  // Physics - thermal motion
  thermalMotion: 0.2,
  thermalScale: 5,
  sphereRestitution: 0.98,
  
  // Heat transfer between particles (disabled for performance)
  heatTransferEnabled: false,
  heatTransferRate: 0.005,
  heatTransferDistance: 30,
  
  // Noise for temperature distribution
  noiseScale: 0.015,
  noiseOctaves: 3,
  
  // Rendering
  useWebGL: false,
  blendMode: "screen",
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
 * Returns normalized value from 0 to 1 (for heat.js compatibility)
 */
function getCMBTemperature(x, y, z) {
  // Use multiple octaves of noise for realistic power spectrum
  let temp = 0;
  let amplitude = 1;
  let frequency = CONFIG.noiseScale;
  let maxValue = 0;
  
  for (let i = 0; i < CONFIG.noiseOctaves; i++) {
    // 3D noise sampled at position
    temp += Noise.perlin3(
      x * frequency,
      y * frequency,
      z * frequency
    ) * amplitude;
    
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  
  // Normalize to 0 to 1
  return (temp / maxValue + 1) * 0.5;
}

/**
 * Map temperature (0-1) to color
 * Planck CMB palette (based on actual satellite imagery):
 * 0 (cold) = Deep Blue
 * 0.5 = Light tan/cream (neutral)
 * 1 (hot) = Deep Orange/Red-Orange
 */
function temperatureToColor(t) {
  // Clamp
  t = Math.max(0, Math.min(1, t));
  
  let r, g, b;
  
  if (t < 0.35) {
    // Cold: Deep Blue to Light Blue
    const s = t / 0.35; // 0 to 1
    r = Math.floor(30 + 100 * s);    // 30 → 130
    g = Math.floor(80 + 120 * s);    // 80 → 200
    b = Math.floor(200 + 55 * s);    // 200 → 255
  } else if (t < 0.65) {
    // Middle: Light Blue to Light Tan/Cream (neutral zone)
    const s = (t - 0.35) / 0.3; // 0 to 1
    r = Math.floor(130 + 100 * s);   // 130 → 230
    g = Math.floor(200 - 10 * s);    // 200 → 190
    b = Math.floor(255 - 120 * s);   // 255 → 135
  } else {
    // Hot: Tan to Deep Orange
    const s = (t - 0.65) / 0.35; // 0 to 1
    r = Math.floor(230 + 25 * s);    // 230 → 255
    g = Math.floor(190 - 110 * s);   // 190 → 80
    b = Math.floor(135 - 135 * s);   // 135 → 0
  }
  
  return { r, g, b, a: 0.95 };
}

/**
 * Update particle color based on temperature
 */
function updateParticleColor(p) {
  const color = temperatureToColor(p.custom.temperature);
  p.color.r = color.r;
  p.color.g = color.g;
  p.color.b = color.b;
  p.color.a = color.a;
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM UPDATER - Color from temperature
// ─────────────────────────────────────────────────────────────────────────────

const colorFromTemperature = (p, dt) => {
  if (!p.alive || p.custom.temperature === undefined) return;
  updateParticleColor(p);
};

// ─────────────────────────────────────────────────────────────────────────────
// CMB DEMO CLASS
// ─────────────────────────────────────────────────────────────────────────────

class CMBDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000008";
    this.enableFluidSize();
  }

  init() {
    super.init();
    
    // Initialize Screen for responsive sizing
    Screen.init(this);
    
    // Apply responsive configuration
    const responsive = getResponsiveConfig();
    CONFIG.sphereRadius = responsive.sphereRadius;
    CONFIG.numParticles = responsive.numParticles;
    
    console.log(`Screen: ${Screen.width}x${Screen.height} | ${Screen.isMobile ? 'Mobile' : Screen.isTablet ? 'Tablet' : 'Desktop'}`);
    console.log(`CMB Config: radius=${CONFIG.sphereRadius.toFixed(0)}, particles=${CONFIG.numParticles}`);
    
    // Initialize noise
    Noise.seed(42);
    
    // Create 3D camera (unclamped for full rotation)
    this.camera = new Camera3D({
      perspective: CONFIG.perspective,
      viewWidth: this.width,
      viewHeight: this.height,
      inertia: true,
      friction: 0.95,
      clampX: false,
    });
    
    // Enable mouse/touch controls for rotation
    this.camera.enableMouseControl(this.canvas);
    
    // Big Bang state
    const bb = CONFIG.bigBang;
    this.bigBangActive = bb.enabled;
    this.flashOpacity = bb.enabled ? 1.0 : 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    
    // Zoom state - start tiny for Big Bang
    this.zoom = bb.enabled ? bb.initialZoom : 1.0;
    this.targetZoom = bb.enabled ? bb.initialZoom : 1.0;
    
    // Animate zoom expansion for Big Bang
    if (bb.enabled) {
      // Flash fade out after hold time
      setTimeout(() => {
        Tweenetik.to(this, { flashOpacity: 0 }, bb.flashDuration, Easing.easeOutQuad);
      }, bb.flashHoldTime * 1000);
      
      // Zoom expansion
      Tweenetik.to(this, { targetZoom: bb.targetZoom }, bb.zoomDuration, Easing.easeOutCubic);
    }
    
    // Gesture handler for zoom (wheel + pinch)
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        // delta > 0 = zoom in, delta < 0 = zoom out
        const factor = delta > 0 ? 1.15 : 0.87;
        this.targetZoom = Math.max(
          CONFIG.minZoom,
          Math.min(CONFIG.maxZoom, this.targetZoom * factor)
        );
      },
    });
    
    // Initial camera rotation for nice view
    this.camera.rotationX = 0.2;
    this.camera.rotationY = 0;
    this.camera.z = CONFIG.cameraDistance;
    
    // Zoom attract updater - particles attracted to their target positions scaled by zoom
    const zoomAttract = (p, dt) => {
      if (!p.alive) return;
      const zoom = this.zoom;
      const strength = 6 * dt;
      const damping = 0.94;
      
      // Attract to scaled target position
      const dx = p.custom.targetX * zoom - p.x;
      const dy = p.custom.targetY * zoom - p.y;
      const dz = p.custom.targetZ * zoom - p.z;
      
      p.vx = (p.vx + dx * strength) * damping;
      p.vy = (p.vy + dy * strength) * damping;
      p.vz = (p.vz + dz * strength) * damping;
      
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
    };
    
    // Create particle system
    this.particles = new ParticleSystem(this, {
      maxParticles: CONFIG.numParticles + 100,
      camera: this.camera,
      depthSort: true,
      useWebGL: CONFIG.useWebGL,
      blendMode: CONFIG.blendMode,
      
      // Updaters for particle behavior
      updaters: [
        zoomAttract,
        PhysicsUpdaters.thermal(() => CONFIG.thermalMotion, CONFIG.thermalScale),
        colorFromTemperature,
      ],
    });
    
    // Add to pipeline
    this.pipeline.add(this.particles);
    
    // Auto-rotation
    this.autoRotate = true;
    this.time = 0;
    
    // Create CMB particles - Big Bang spawns from center with delay
    if (CONFIG.bigBang.enabled) {
      this.prepareBigBangParticles();
    } else {
      this.createCMBParticles();
    }
    
    console.log(`CMB Demo initialized`);
  }

  /**
   * Prepare particles for Big Bang - queue them for staggered spawn
   */
  prepareBigBangParticles() {
    for (let i = 0; i < CONFIG.numParticles; i++) {
      // Calculate target position on sphere
      const pos = randomSpherePoint(CONFIG.sphereRadius);
      const temp = getCMBTemperature(pos.x, pos.y, pos.z);
      
      // Queue particle data for staggered spawning
      this.spawnQueue.push({
        targetX: pos.x,
        targetY: pos.y,
        targetZ: pos.z,
        temperature: temp,
        spawnTime: i * CONFIG.bigBang.spawnDelay,
      });
    }
    console.log(`Big Bang: ${this.spawnQueue.length} particles queued`);
  }
  
  /**
   * Spawn a single Big Bang particle from center
   */
  spawnBigBangParticle(data) {
    if (this.particles.particles.length >= this.particles.maxParticles) return;
    
    const p = this.particles.acquire();
    const bb = CONFIG.bigBang;
    
    // Target position on sphere surface
    p.custom.targetX = data.targetX;
    p.custom.targetY = data.targetY;
    p.custom.targetZ = data.targetZ;
    p.custom.temperature = data.temperature;
    
    // Start at center (the singularity)
    p.x = 0;
    p.y = 0;
    p.z = 0;
    
    // Explosion velocity - outward toward target
    const dist = Math.sqrt(data.targetX ** 2 + data.targetY ** 2 + data.targetZ ** 2);
    const nx = data.targetX / dist;
    const ny = data.targetY / dist;
    const nz = data.targetZ / dist;
    
    // Random variation in explosion force
    const force = bb.explosionForce * (0.8 + Math.random() * 0.4);
    p.vx = nx * force;
    p.vy = ny * force;
    p.vz = nz * force;
    
    // Color from temperature
    updateParticleColor(p);
    
    // Size
    p.size = CONFIG.particleSize + data.temperature * CONFIG.particleSizeVariation;
    p.shape = "circle";
    
    // Lifecycle
    p.lifetime = 999999;
    p.age = 0;
    p.alive = true;
    
    this.particles.particles.push(p);
  }

  /**
   * Create CMB particles instantly (non-Big Bang mode)
   */
  createCMBParticles() {
    for (let i = 0; i < CONFIG.numParticles; i++) {
      // Check if we've hit max
      if (this.particles.particles.length >= this.particles.maxParticles) {
        console.warn(`Hit max particles at ${i}`);
        break;
      }
      
      // Get particle from pool
      const p = this.particles.acquire();
      
      // Position on sphere surface (store as target for zoom)
      const pos = randomSpherePoint(CONFIG.sphereRadius);
      p.custom.targetX = pos.x;
      p.custom.targetY = pos.y;
      p.custom.targetZ = pos.z;
      
      // Initial position matches target
      p.x = pos.x;
      p.y = pos.y;
      p.z = pos.z;
      
      // Start with zero velocity (attract will handle motion)
      p.vx = 0;
      p.vy = 0;
      p.vz = 0;
      
      // CMB temperature at this position (0-1 range)
      const temp = getCMBTemperature(pos.x, pos.y, pos.z);
      p.custom.temperature = temp;
      
      // Initial color based on temperature
      updateParticleColor(p);
      
      // Size varies slightly with temperature (hotter = slightly larger)
      p.size = CONFIG.particleSize + temp * CONFIG.particleSizeVariation;
      
      // Shape
      p.shape = "circle";
      
      // Long lifetime (effectively permanent)
      p.lifetime = 999999;
      p.age = 0;
      p.alive = true;
      
      // Add to active particles array
      this.particles.particles.push(p);
    }
  }

  update(dt) {
    super.update(dt);
    
    this.time += dt;
    
    // Update tweens (Big Bang animations)
    Tweenetik.updateAll(dt);
    
    // Big Bang particle spawning
    if (this.spawnQueue.length > 0) {
      this.spawnTimer += dt;
      
      // Spawn all particles whose time has come
      while (this.spawnQueue.length > 0 && this.spawnQueue[0].spawnTime <= this.spawnTimer) {
        this.spawnBigBangParticle(this.spawnQueue.shift());
      }
    }
    
    // Smooth zoom interpolation (fly into the CMB)
    this.zoom += (this.targetZoom - this.zoom) * CONFIG.zoomSmoothing;
    
    // Auto-rotate camera when not being dragged
    if (this.autoRotate && !this.camera.isDragging()) {
      this.camera.rotationY += CONFIG.autoRotateSpeed * dt;
    }
    
    // Update camera dimensions
    this.camera.viewWidth = this.width;
    this.camera.viewHeight = this.height;
    this.camera.update(dt);
    
    // Apply heat transfer between nearby particles (from heat.js)
    if (CONFIG.heatTransferEnabled) {
      applyParticleHeatTransfer(this.particles.particles, {
        maxDistance: CONFIG.heatTransferDistance,
        rate: CONFIG.heatTransferRate,
        falloff: 1,
        temperatureKey: 'temperature',
        filter: (p) => p.alive,
      });
    }
  }

  render() {
    super.render();
    
    // Draw Big Bang flash overlay
    if (this.flashOpacity > 0.01) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashOpacity})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
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
    
    // Draw gradient bar (matches temperatureToColor - Planck CMB palette)
    const gradient = ctx.createLinearGradient(legendX, legendY, legendX + legendWidth, legendY);
    gradient.addColorStop(0, 'rgb(30, 80, 200)');      // Deep blue
    gradient.addColorStop(0.35, 'rgb(130, 200, 255)'); // Light blue
    gradient.addColorStop(0.5, 'rgb(230, 190, 135)');  // Light tan/cream
    gradient.addColorStop(1, 'rgb(255, 80, 0)');       // Deep orange
    
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
    ctx.fillText(`Particles: ${this.particles.particleCount}`, legendX, statsY);
    ctx.fillText(`T₀ = ${CONFIG.baseTemperature} K`, legendX, statsY - 15);
    ctx.fillText(`δT ≈ ±${(CONFIG.baseTemperature * CONFIG.temperatureVariation * 1e6).toFixed(0)} μK`, legendX, statsY - 30);
    
    // Zoom level
    ctx.fillText(`Zoom: ${this.zoom.toFixed(1)}x`, legendX, statsY - 45);
    
    // Controls hint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '10px monospace';
    ctx.fillText('Drag to rotate • Scroll to zoom', legendX, this.height - 15);
  }
  
  stop() {
    super.stop();
    if (this.gesture) {
      this.gesture.destroy();
    }
    if (this.particles) {
      this.particles.destroy();
    }
  }

  onResize() {
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
