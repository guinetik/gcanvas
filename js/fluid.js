import {
  Game,
  ParticleSystem,
  ParticleEmitter,
  Updaters,
  FPSCounter,
  Painter,
  Button,
  ToggleButton,
  applyAnchor,
  Position,
  Rectangle,
  ShapeGOFactory,
  HorizontalLayout,
  Collision,
} from "/gcanvas.es.min.js";
import {
  computeFluidForces,
  computeGasForces,
  computeThermalBuoyancy,
  blendForces,
} from "/gcanvas.es.min.js";
import { zoneTemperature } from "/gcanvas.es.min.js";
import { Easing } from "/gcanvas.es.min.js";

// Base particle size - all proportional values derive from this
const PARTICLE_SIZE = Math.PI * 10;

const CONFIG = {
  particleSize: PARTICLE_SIZE,
  
  sim: {
    maxParticles: Math.floor(PARTICLE_SIZE * 10),
    smoothingRadius: PARTICLE_SIZE * 2,      // 2x particle size for SPH interaction
    gravity: 200,
    damping: 0.98,
    bounce: 0.3,
    maxSpeed: 400,
    modeLerp: 5,
  },
  fluid: {
    restDensity: 3.0,
    pressureStiffness: 80,
    nearPressureStiffness: 3,
    viscosity: 0.005,
    maxForce: 5000,
  },
  gas: {
    interactionRadius: PARTICLE_SIZE * 2,    // 2x particle size
    pressure: 8,
    diffusion: 0.1,
    drag: 0.05,
    turbulence: 15,
    buoyancy: 150,
  },
  heat: {
    heatZone: 0.85,
    coolZone: 0.2,
    rate: 0.015,
    heatMultiplier: 1.8,
    coolMultiplier: 1.5,
    middleMultiplier: 0.15,
    transitionWidth: 0.2,
    neutralTemp: 0.5,
  },
  pointer: {
    radius: PARTICLE_SIZE * 4,               // 4x particle size
    push: 3000,
    pull: 600,
  },
  visuals: {
    baseHue: 210,
    hueRange: 120,
    minLight: 45,
    maxLight: 65,
    saturation: 80,
    alpha: 0.9,
  },
  ui: {
    margin: 12,
    width: 130,
    height: 32,
    spacing: 6,
  },
  container: {
    marginX: 80,
    marginY: 150,
    strokeColor: "#22c55e",
    strokeWidth: 2,
    cornerRadius: 8,
  },
};

/**
 * FluidGasGame - SPH-based fluid simulation demo
 * 
 * Features:
 * - Smooth Particle Hydrodynamics for liquid behavior
 * - Gas mode with buoyancy and turbulence
 * - Temperature-based coloring
 * - Mouse interaction (hover to stir, click to push)
 */
class FluidGasGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#0a0e1a";
    this.enableFluidSize();
    this.pointer = { x: 0, y: 0, down: false };
    this.mode = "liquid";
    this.modeMix = 0;
    this.gravityOn = true;
  }

  init() {
    super.init();
    this.pointer.x = this.width * 0.5;
    this.pointer.y = this.height * 0.5;

    // Calculate container bounds
    this._updateContainerBounds();

    // Create container outline (rendered behind particles)
    const containerShape = new Rectangle({
      width: this.bounds.w,
      height: this.bounds.h,
      stroke: CONFIG.container.strokeColor,
      lineWidth: CONFIG.container.strokeWidth,
      color: null,
    });
    this.containerRect = ShapeGOFactory.create(this, containerShape, {
      x: this.bounds.x + this.bounds.w / 2,
      y: this.bounds.y + this.bounds.h / 2,
    });
    this.pipeline.add(this.containerRect);

    // Create particle system - NO additive blending (causes white wash)
    this.system = new ParticleSystem(this, {
      maxParticles: CONFIG.sim.maxParticles,
      blendMode: "source-over",  // Normal blending for proper colors
      updaters: [Updaters.velocity, Updaters.lifetime],
    });

    // Spawn particles in a compact block within the container
    const spawnWidth = Math.min(this.bounds.w * 0.8, 400);
    const spawnHeight = Math.min(this.bounds.h * 0.5, 250);
    
    const emitter = new ParticleEmitter({
      rate: 0,
      position: { x: this.bounds.x + this.bounds.w / 2, y: this.bounds.y + this.bounds.h * 0.6 },
      spread: { x: spawnWidth, y: spawnHeight },
      velocity: { x: 0, y: 0 },
      velocitySpread: { x: 5, y: 5 },
      size: { min: CONFIG.particleSize, max: CONFIG.particleSize + 2 },
      lifetime: { min: 99999, max: 99999 },
      color: { r: 100, g: 180, b: 255, a: CONFIG.visuals.alpha },
      shape: "circle",
    });

    this.system.addEmitter("fluid", emitter);
    this.system.burst(CONFIG.sim.maxParticles, "fluid");
    this._initializeParticles(this.system.particles);

    this.pipeline.add(this.system);
    this._buildUI();

    // Input events
    this.events.on("inputmove", (e) => {
      this.pointer.x = e.x;
      this.pointer.y = e.y;
    });
    this.events.on("inputdown", () => (this.pointer.down = true));
    this.events.on("inputup", () => (this.pointer.down = false));
    window.addEventListener("keydown", (e) => this._handleKey(e));

    // Handle resize
    this.onResize = () => this._handleResize();
  }

  /**
   * Handle window resize - update container bounds
   */
  _handleResize() {
    this._updateContainerBounds();
    
    // Update container rect position and size using Transform API
    if (this.containerRect) {
      this.containerRect.transform
        .position(this.bounds.x + this.bounds.w / 2, this.bounds.y + this.bounds.h / 2)
        .size(this.bounds.w, this.bounds.h);
    }
  }

  update(dt) {
    // Clamp dt to prevent physics explosion on tab switch
    dt = Math.min(dt, 0.033);
    
    this.modeMix = Easing.lerp(
      this.modeMix,
      this.mode === "gas" ? 1 : 0,
      dt * CONFIG.sim.modeLerp,
    );

    const particles = this.system.particles;
    if (!particles.length) {
      super.update(dt);
      return;
    }

    // Update colors based on temperature/velocity
    this._applyColors(particles);

    // Compute forces based on mode (using dual-density SPH)
    const fluid = computeFluidForces(particles, {
      kernel: { smoothingRadius: CONFIG.sim.smoothingRadius },
      fluid: {
        restDensity: CONFIG.fluid.restDensity,
        pressureStiffness: CONFIG.fluid.pressureStiffness,
        nearPressureStiffness: CONFIG.fluid.nearPressureStiffness,
        viscosity: CONFIG.fluid.viscosity,
        maxForce: CONFIG.fluid.maxForce,
      },
    });

    // Debug: log force magnitudes every 60 frames
    if (!this._debugCounter) this._debugCounter = 0;
    this._debugCounter++;
    if (this._debugCounter % 60 === 0) {
      let maxForce = 0;
      let avgForce = 0;
      let maxFy = 0;
      for (const f of fluid.forces) {
        const mag = Math.sqrt(f.x * f.x + f.y * f.y);
        avgForce += mag;
        if (mag > maxForce) maxForce = mag;
        if (Math.abs(f.y) > Math.abs(maxFy)) maxFy = f.y;
      }
      avgForce /= fluid.forces.length;
      
      // Check Y spread of particles
      let minY = Infinity, maxY = -Infinity;
      for (const p of particles) {
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      const ySpread = maxY - minY;
      
      console.log(`Forces: avg=${avgForce.toFixed(1)}, maxFy=${maxFy.toFixed(1)}, ySpread=${ySpread.toFixed(1)}, density[0]=${fluid.densities[0].toFixed(2)}`);
    }

    let forces;
    if (this.modeMix < 0.01) {
      // Pure liquid mode - skip gas computation for performance
      forces = fluid.forces;
    } else {
      const gas = computeGasForces(particles, {
        gas: {
          interactionRadius: CONFIG.gas.interactionRadius,
          pressure: CONFIG.gas.pressure,
          diffusion: CONFIG.gas.diffusion,
          drag: CONFIG.gas.drag,
          turbulence: CONFIG.gas.turbulence,
          buoyancy: CONFIG.gas.buoyancy,
          neutralTemperature: CONFIG.heat.neutralTemp,
        },
      });
      forces = blendForces(fluid.forces, gas.forces, this.modeMix);
    }

    // Add buoyancy if in gas mode
    if (this.modeMix > 0.1) {
      const buoyancy = computeThermalBuoyancy(particles, {
        gas: {
          buoyancy: CONFIG.gas.buoyancy * this.modeMix,
          neutralTemperature: CONFIG.heat.neutralTemp,
        },
      });
      this._accumulate(forces, buoyancy);
    }

    this._pointerForces(forces);
    this._applyCollisionForces(forces, particles);  // Direct particle-particle repulsion
    this._applyBoundaryForces(forces, particles);   // Push particles away from walls
    this._applyForces(particles, forces, dt);

    super.update(dt);
    this._clampBounds(particles);
  }

  _buildUI() {
    const { margin, width, height, spacing } = CONFIG.ui;

    // Create horizontal layout for buttons, anchored to bottom left
    const uiPanel = new HorizontalLayout(this, {
      width: width * 3 + spacing * 2,
      height: height,
      spacing,
      padding: 0,
      align: "center",
    });
    applyAnchor(uiPanel, {
      anchor: Position.BOTTOM_LEFT,
      anchorMargin: margin,
    });

    this.btnMode = new ToggleButton(this, {
      width,
      height,
      text: "Mode: Liquid",
      startToggled: false,
      onToggle: (on) => {
        this.mode = on ? "gas" : "liquid";
        this.btnMode.text = on ? "Mode: Gas" : "Mode: Liquid";
      },
    });
    uiPanel.add(this.btnMode);

    this.btnGravity = new ToggleButton(this, {
      width,
      height,
      text: "Gravity: On",
      startToggled: true,
      onToggle: (on) => {
        this.gravityOn = on;
        this.btnGravity.text = on ? "Gravity: On" : "Gravity: Off";
      },
    });
    uiPanel.add(this.btnGravity);

    this.btnReset = new Button(this, {
      width,
      height,
      text: "Reset",
      onClick: () => this._resetParticles(),
    });
    uiPanel.add(this.btnReset);

    this.pipeline.add(uiPanel);

    // FPS counter
    this.pipeline.add(new FPSCounter(this, { color: "#6af", anchor: "top-right" }));
  }

  /**
   * Apply visual coloring to particles based on mode.
   * Liquid mode: color by velocity (fast=warm, slow=cool) like Sebastian's example
   * Gas mode: color by temperature zones (position-based heat)
   * @param {Array} particles - Particle array
   */
  _applyColors(particles) {
    const { baseHue, hueRange, minLight, maxLight, saturation, alpha } = CONFIG.visuals;
    const maxSpeed = CONFIG.sim.maxSpeed;
    const h = this.height || 1;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const speedNorm = Math.min(1, speed / maxSpeed);
      
      let colorValue;
      
      if (this.modeMix < 0.5) {
        // LIQUID MODE: Color by velocity (Sebastian's approach)
        // Slow = blue (210°), Fast = orange/red (30°)
        colorValue = speedNorm;
      } else {
        // GAS MODE: Color by temperature zones + velocity
        const tCurrent = p.custom.temperature ?? CONFIG.heat.neutralTemp;
        const normalized = Math.min(1, Math.max(0, p.y / h));
        let tNext = zoneTemperature(normalized, tCurrent, CONFIG.heat);
        tNext = Math.min(1, Math.max(0, tNext + speedNorm * 0.2));
        p.custom.temperature = tNext;
        colorValue = tNext;
      }

      // Hue: blue (210) -> cyan (180) -> green (120) -> yellow (60) -> orange (30)
      const hue = baseHue - colorValue * hueRange;
      const light = Easing.lerp(minLight, maxLight, 0.3 + colorValue * 0.5);
      const [r, g, b] = Painter.colors.hslToRgb(hue, saturation, light);
      p.color.r = r;
      p.color.g = g;
      p.color.b = b;
      p.color.a = alpha;
    }
  }

  _applyForces(particles, forces, dt) {
    const g = CONFIG.sim.gravity;
    const damping = CONFIG.sim.damping;
    const maxSpeed = CONFIG.sim.maxSpeed;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const f = forces[i];
      const mass = p.custom.mass || 1;
      
      p.vx += (f.x / mass) * dt;
      p.vy += (f.y / mass + (this.gravityOn ? g : 0)) * dt;

      p.vx *= damping;
      p.vy *= damping;

      const speed2 = p.vx * p.vx + p.vy * p.vy;
      if (speed2 > maxSpeed * maxSpeed) {
        const inv = maxSpeed / Math.sqrt(speed2);
        p.vx *= inv;
        p.vy *= inv;
      }
    }
  }

  _pointerForces(forces) {
    const radius = CONFIG.pointer.radius;
    const r2 = radius * radius;
    const push = CONFIG.pointer.push;
    const pull = CONFIG.pointer.pull;
    const mx = this.pointer.x;
    const my = this.pointer.y;
    const particles = this.system.particles;

    for (let i = 0; i < forces.length; i++) {
      const p = particles[i];
      const dx = mx - p.x;
      const dy = my - p.y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 >= r2 || dist2 < 1) continue;
      
      const dist = Math.sqrt(dist2);
      const t = 1 - dist / radius;
      const strength = (this.pointer.down ? push : -pull) * t * t;
      forces[i].x += (dx / dist) * strength;
      forces[i].y += (dy / dist) * strength;
    }
  }

  _accumulate(target, addition) {
    const n = Math.min(target.length, addition.length);
    for (let i = 0; i < n; i++) {
      target[i].x += addition[i].x;
      target[i].y += addition[i].y;
    }
  }

  /**
   * Update container bounds based on current screen size
   */
  _updateContainerBounds() {
    const { marginX, marginY } = CONFIG.container;
    this.bounds = {
      x: marginX,
      y: marginY,
      w: this.width - marginX * 2,
      h: this.height - marginY * 2,
    };
  }

  /**
   * Apply particle-particle collision separation using the Collision module.
   * @param {Array} forces - Force array to accumulate into
   * @param {Array} particles - Particle array
   */
  _applyCollisionForces(forces, particles) {
    Collision.applyCircleSeparation(particles, forces, {
      strength: 5000,
      useSizeAsRadius: true,
    });
  }

  /**
   * Apply boundary repulsion forces to prevent particles from piling at walls.
   * @param {Array} forces - Force array to accumulate into
   * @param {Array} particles - Particle array
   */
  _applyBoundaryForces(forces, particles) {
    const { x, y, w, h } = this.bounds;
    const boundaryRadius = CONFIG.particleSize * 0.8;  // Just slightly larger than particle
    const boundaryStrength = 4000;
    
    const left = x;
    const right = x + w;
    const top = y;
    const bottom = y + h;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const radius = p.size * 0.5;
      
      const distLeft = p.x - radius - left;
      const distRight = right - p.x - radius;
      const distTop = p.y - radius - top;
      const distBottom = bottom - p.y - radius;
      
      if (distLeft < boundaryRadius) {
        const t = Math.max(0, 1 - distLeft / boundaryRadius);
        forces[i].x += boundaryStrength * t * t;
      }
      
      if (distRight < boundaryRadius) {
        const t = Math.max(0, 1 - distRight / boundaryRadius);
        forces[i].x -= boundaryStrength * t * t;
      }
      
      if (distTop < boundaryRadius) {
        const t = Math.max(0, 1 - distTop / boundaryRadius);
        forces[i].y += boundaryStrength * t * t;
      }
      
      if (distBottom < boundaryRadius) {
        const t = Math.max(0, 1 - distBottom / boundaryRadius);
        forces[i].y -= boundaryStrength * t * t;
      }
    }
  }

  _clampBounds(particles) {
    const { x, y, w, h } = this.bounds;
    const bounce = CONFIG.sim.bounce;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const radius = p.size * 0.5;  // Account for particle radius
      
      const left = x + radius;
      const right = x + w - radius;
      const top = y + radius;
      const bottom = y + h - radius;

      if (p.x < left) {
        p.x = left;
        p.vx = Math.abs(p.vx) * bounce;
      } else if (p.x > right) {
        p.x = right;
        p.vx = -Math.abs(p.vx) * bounce;
      }

      if (p.y < top) {
        p.y = top;
        p.vy = Math.abs(p.vy) * bounce;
      } else if (p.y > bottom) {
        p.y = bottom;
        p.vy = -Math.abs(p.vy) * bounce;
      }
    }
  }

  _initializeParticles(particles) {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.custom.mass = 1;
      p.custom.temperature = 0.4 + Math.random() * 0.2;
      p.vx = (Math.random() - 0.5) * 20;
      p.vy = (Math.random() - 0.5) * 20;
      p.size = CONFIG.particleSize + Math.random() * 2;
      p.shape = "circle";
    }
  }

  /**
   * Reset all particles to initial spawn area within container
   */
  _resetParticles() {
    const particles = this.system.particles;
    const cx = this.bounds.x + this.bounds.w / 2;
    const cy = this.bounds.y + this.bounds.h * 0.6;
    const spawnWidth = Math.min(this.bounds.w * 0.8, 400);
    const spawnHeight = Math.min(this.bounds.h * 0.5, 250);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x = cx + (Math.random() - 0.5) * spawnWidth;
      p.y = cy + (Math.random() - 0.5) * spawnHeight;
      p.vx = (Math.random() - 0.5) * 20;
      p.vy = (Math.random() - 0.5) * 20;
      p.custom.temperature = 0.4 + Math.random() * 0.2;
    }
  }

  _handleKey(e) {
    if (e.key === "1") {
      this.mode = "liquid";
      this.btnMode.toggle(false);
      this.btnMode.text = "Mode: Liquid";
    } else if (e.key === "2") {
      this.mode = "gas";
      this.btnMode.toggle(true);
      this.btnMode.text = "Mode: Gas";
    } else if (e.key === " ") {
      e.preventDefault();
      const newMode = this.mode === "liquid" ? "gas" : "liquid";
      this.mode = newMode;
      this.btnMode.toggle(newMode === "gas");
      this.btnMode.text = newMode === "gas" ? "Mode: Gas" : "Mode: Liquid";
    } else if (e.key === "r" || e.key === "R") {
      this._resetParticles();
    } else if (e.key === "g" || e.key === "G") {
      this.gravityOn = !this.gravityOn;
      this.btnGravity.toggle(this.gravityOn);
      this.btnGravity.text = this.gravityOn ? "Gravity: On" : "Gravity: Off";
    }
  }
}

export { FluidGasGame };

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const game = new FluidGasGame(canvas);
  game.start();
});
