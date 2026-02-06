/**
 * FluidSystem - High-level fluid simulation built on ParticleSystem.
 *
 * Integrates SPH physics, collision detection, and boundary handling
 * into a cohesive, configurable fluid simulation system.
 *
 * @example
 * // Create a liquid simulation
 * const fluid = new FluidSystem(game, {
 *   maxParticles: 500,
 *   particleSize: 20,
 *   bounds: { x: 50, y: 50, w: 700, h: 500 },
 *   physics: 'liquid',
 * });
 * fluid.spawn(300);
 * game.pipeline.add(fluid);
 *
 * @example
 * // Create a gas simulation with heat zones
 * const gas = new FluidSystem(game, {
 *   maxParticles: 200,
 *   particleSize: 15,
 *   physics: 'gas',
 *   gravity: 50,
 *   enableHeat: true,
 * });
 *
 * @module game/systems/FluidSystem
 */

import { ParticleSystem } from "../../particle/index.js";
import { ParticleEmitter } from "../../particle/index.js";
import { Updaters } from "../../particle/index.js";
import { Collision } from "../../collision/index.js";
import { computeFluidForces, computeGasForces, blendForces } from "../../math/fluid.js";
import { zoneTemperature } from "../../math/heat.js";
import { Easing } from "../../motion/easing.js";

/**
 * Default configuration for FluidSystem.
 * @type {Object}
 */
const DEFAULT_CONFIG = {
  // Particle settings
  maxParticles: 500,
  particleSize: 20,
  particleColor: { r: 100, g: 180, b: 255, a: 0.9 },

  // Physics mode: 'liquid', 'gas', or 'blend'
  physics: "liquid",

  // Simulation parameters
  gravity: 200,
  damping: 0.98,
  bounce: 0.3,
  maxSpeed: 400,

  // SPH fluid parameters
  fluid: {
    smoothingRadius: null, // Defaults to particleSize * 2
    restDensity: 3.0,
    pressureStiffness: 80,
    nearPressureStiffness: 3,
    viscosity: 0.005,
    maxForce: 5000,
  },

  // Gas parameters
  gas: {
    interactionRadius: null, // Defaults to particleSize * 4
    pressure: 150,           // Strong repulsion to spread out
    diffusion: 0.15,
    drag: 0.02,
    turbulence: 50,
    buoyancy: 300,           // Base buoyancy (used when heat disabled)
    sinking: 200,            // Cold particle sinking force
    repulsion: 300,          // Extra repulsion to prevent clumping
  },

  // Heat zone parameters (for thermal convection in gas mode)
  heat: {
    enabled: false,          // Opt-in, auto-enabled in gas mode
    heatZone: 0.88,          // Bottom 12% is hot (thermal vent)
    coolZone: 0.25,          // Top 25% is cold (ceiling)
    rate: 0.03,              // Temperature change rate
    heatMultiplier: 1.5,     // Heating strength
    coolMultiplier: 2.0,     // Cooling strength
    middleMultiplier: 0.005, // Almost no change in middle
    transitionWidth: 0.08,   // Zone boundary sharpness
    neutralTemp: 0.5,        // Neutral temperature
    deadZone: 0.15,          // No thermal force within this range of neutral
    buoyancy: 300,           // Thermal buoyancy force (hot rises)
    sinking: 200,            // Thermal sinking force (cold falls)
  },

  // Collision settings
  collision: {
    enabled: true,
    strength: 5000,
  },

  // Boundary settings
  boundary: {
    enabled: true,
    strength: 4000,
    radius: null, // Defaults to particleSize * 0.8
  },

  // Window shake (bottle effect) settings
  shake: {
    enabled: true,           // Enable window motion detection
    sensitivity: 2.0,        // Force multiplier (higher = more responsive)
    maxForce: 2500,          // Cap on shake force
    damping: 0.8,            // How quickly shake effect fades (lower = longer effect)
  },

  // Rendering
  blendMode: "source-over",
};

/**
 * FluidSystem class for fluid dynamics simulation.
 * @extends ParticleSystem
 */
export class FluidSystem extends ParticleSystem {
  /**
   * Create a new FluidSystem.
   * @param {Game} game - The game instance
   * @param {Object} [options={}] - Configuration options
   * @param {number} [options.maxParticles=500] - Maximum number of particles
   * @param {number} [options.particleSize=20] - Base particle size
   * @param {Object} [options.bounds] - Containment bounds { x, y, w, h }
   * @param {string} [options.physics='liquid'] - Physics mode: 'liquid', 'gas', 'blend'
   * @param {number} [options.gravity=200] - Gravity strength
   * @param {boolean} [options.gravityEnabled=true] - Whether gravity is active
   */
  constructor(game, options = {}) {
    const config = FluidSystem._mergeConfig(options);

    // Compute center position for debug rendering (Renderable draws centered)
    const boundsX = options.bounds?.x ?? 0;
    const boundsY = options.bounds?.y ?? 0;
    const boundsW = options.width ?? options.bounds?.w ?? 0;
    const boundsH = options.height ?? options.bounds?.h ?? 0;

    // Initialize parent ParticleSystem with all relevant options
    super(game, {
      maxParticles: config.maxParticles,
      blendMode: config.blendMode,
      updaters: [Updaters.velocity, Updaters.lifetime],
      // Position at CENTER of bounds (debug drawing is centered)
      x: options.x ?? (boundsX + boundsW / 2),
      y: options.y ?? (boundsY + boundsH / 2),
      width: boundsW,
      height: boundsH,
      originX: 0.5,
      originY: 0.5,
      debug: options.debug ?? false,
      debugColor: options.debugColor ?? "#0f0",
    });

    /** @type {Object} Merged configuration */
    this.config = config;

    /** @type {Object|null} Containment bounds { x, y, w, h } */
    this.bounds = options.bounds || null;

    /** @type {boolean} Whether gravity is active */
    this.gravityEnabled = options.gravityEnabled ?? true;

    /** @type {number} Current blend factor for physics modes (0=liquid, 1=gas) */
    this.modeMix = config.physics === "gas" ? 1.0 : 0.0;

    /** @type {number} Target mode for smooth lerping */
    this._targetMode = this.modeMix;

    /** @type {number} Mode transition speed */
    this._modeLerpSpeed = 5;

    /** @type {Array<{x: number, y: number}>} Force accumulator */
    this._forces = [];

    // Window shake tracking (bottle effect)
    this._shake = {
      lastX: window.screenX,
      lastY: window.screenY,
      velocityX: 0,
      velocityY: 0,
      forceX: 0,
      forceY: 0,
    };

    // Create default emitter for spawning
    this._createEmitter();
  }

  /**
   * Merge user options with defaults, computing derived values.
   * @private
   * @param {Object} options - User options
   * @returns {Object} Merged configuration
   */
  static _mergeConfig(options) {
    const config = { ...DEFAULT_CONFIG, ...options };
    const size = config.particleSize;

    // Compute derived values
    config.fluid = { ...DEFAULT_CONFIG.fluid, ...options.fluid };
    config.gas = { ...DEFAULT_CONFIG.gas, ...options.gas };
    config.heat = { ...DEFAULT_CONFIG.heat, ...options.heat };
    config.collision = { ...DEFAULT_CONFIG.collision, ...options.collision };
    config.boundary = { ...DEFAULT_CONFIG.boundary, ...options.boundary };
    config.shake = { ...DEFAULT_CONFIG.shake, ...options.shake };

    // Set defaults based on particle size
    if (config.fluid.smoothingRadius === null) {
      config.fluid.smoothingRadius = size * 2;
    }
    if (config.gas.interactionRadius === null) {
      config.gas.interactionRadius = size * 4;
    }
    if (config.boundary.radius === null) {
      config.boundary.radius = size * 0.8;
    }

    return config;
  }

  /**
   * Create the default particle emitter.
   * @private
   */
  _createEmitter() {
    const { particleSize, particleColor } = this.config;

    const emitter = new ParticleEmitter({
      rate: 0, // Manual spawning only
      position: { x: 0, y: 0 },
      spread: { x: 100, y: 100 },
      velocity: { x: 0, y: 0 },
      velocitySpread: { x: 10, y: 10 },
      size: { min: particleSize, max: particleSize + 2 },
      lifetime: { min: 99999, max: 99999 },
      color: particleColor,
      shape: "circle",
    });

    this.addEmitter("fluid", emitter);
  }

  /**
   * Spawn particles at a position or within bounds.
   * @param {number} count - Number of particles to spawn
   * @param {Object} [options={}] - Spawn options
   * @param {number} [options.x] - Center X (defaults to bounds center)
   * @param {number} [options.y] - Center Y (defaults to bounds center)
   * @param {number} [options.spreadX] - Horizontal spread
   * @param {number} [options.spreadY] - Vertical spread
   */
  spawn(count, options = {}) {
    const emitter = this.emitters.get("fluid");
    if (!emitter) return;

    // Default to bounds center if available
    let x = options.x;
    let y = options.y;
    let spreadX = options.spreadX ?? 100;
    let spreadY = options.spreadY ?? 100;

    if (this.bounds && x === undefined) {
      x = this.bounds.x + this.bounds.w / 2;
      y = this.bounds.y + this.bounds.h * 0.6;
      spreadX = Math.min(this.bounds.w * 0.8, 400);
      spreadY = Math.min(this.bounds.h * 0.5, 250);
    }

    // Update emitter
    emitter.position.x = x ?? this.game.width / 2;
    emitter.position.y = y ?? this.game.height / 2;
    emitter.spread.x = spreadX;
    emitter.spread.y = spreadY;

    // Spawn particles
    this.burst(count, "fluid");

    // Initialize custom properties
    for (const p of this.particles) {
      if (!p.custom.initialized) {
        p.custom.initialized = true;
        p.custom.mass = 1;
        p.custom.temperature = 0.5;
        p.vx = (Math.random() - 0.5) * 20;
        p.vy = (Math.random() - 0.5) * 20;
      }
    }
  }

  /**
   * Set containment bounds.
   * @param {Object} bounds - Bounds { x, y, w, h }
   */
  setBounds(bounds) {
    this.bounds = bounds;
    // Update position and size for debug rendering
    this.x = bounds.x + bounds.w / 2;
    this.y = bounds.y + bounds.h / 2;
    this.width = bounds.w;
    this.height = bounds.h;
  }

  /**
   * Update the fluid simulation.
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    // Clamp dt to prevent physics explosion on tab switch
    dt = Math.min(dt, 0.033);

    // Smooth mode transition (lerp toward target)
    this.modeMix = Easing.lerp(
      this.modeMix,
      this._targetMode,
      dt * this._modeLerpSpeed
    );

    const particles = this.particles;
    if (particles.length === 0) {
      super.update(dt);
      return;
    }

    // Ensure force array is sized correctly
    this._ensureForceArray(particles.length);

    // Reset forces
    this._resetForces();

    // Compute physics forces based on mode
    this._computePhysicsForces(particles);

    // In gas mode, apply additional forces
    if (this.modeMix > 0.5) {
      // Update temperatures based on position in heat zones
      if (this.config.heat.enabled || this.modeMix > 0.95) {
        this._updateTemperatures(particles);
        this._applyThermalForces(particles);
      }

      // Apply gas repulsion to prevent clumping
      if (this.modeMix > 0.95) {
        this._applyGasRepulsion(particles);
      }
    }

    // Apply collision separation
    if (this.config.collision.enabled) {
      Collision.applyCircleSeparation(particles, this._forces, {
        strength: this.config.collision.strength,
        useSizeAsRadius: true,
      });
    }

    // Apply boundary forces
    if (this.bounds && this.config.boundary.enabled) {
      this._applyBoundaryForces(particles);
    }

    // Apply window shake forces (bottle effect)
    if (this.config.shake.enabled) {
      this._updateShakeForces(dt);
      this._applyShakeForces();
    }

    // Integrate forces into velocities
    this._integrateForces(particles, dt);

    // Update particle system (applies velocities to positions)
    super.update(dt);

    // Clamp to bounds
    if (this.bounds) {
      this._clampBounds(particles);
    }
  }

  /**
   * Ensure force array has correct size.
   * @private
   * @param {number} count - Required size
   */
  _ensureForceArray(count) {
    while (this._forces.length < count) {
      this._forces.push({ x: 0, y: 0 });
    }
  }

  /**
   * Reset all forces to zero.
   * @private
   */
  _resetForces() {
    for (let i = 0; i < this._forces.length; i++) {
      this._forces[i].x = 0;
      this._forces[i].y = 0;
    }
  }

  /**
   * Compute physics forces based on current mode.
   * @private
   * @param {Array} particles - Particle array
   */
  _computePhysicsForces(particles) {
    const { fluid, gas } = this.config;

    if (this.modeMix < 0.01) {
      // Pure liquid mode
      const result = computeFluidForces(particles, {
        kernel: { smoothingRadius: fluid.smoothingRadius },
        fluid: {
          restDensity: fluid.restDensity,
          pressureStiffness: fluid.pressureStiffness,
          nearPressureStiffness: fluid.nearPressureStiffness,
          viscosity: fluid.viscosity,
          maxForce: fluid.maxForce,
        },
      });
      this._accumulateForces(result.forces);
    } else if (this.modeMix > 0.95) {
      // Pure gas mode - skip fluid forces entirely
      const result = computeGasForces(particles, {
        gas: {
          interactionRadius: gas.interactionRadius,
          pressure: gas.pressure,
          diffusion: gas.diffusion,
          drag: gas.drag,
          turbulence: gas.turbulence,
          buoyancy: gas.buoyancy,
        },
      });
      this._accumulateForces(result.forces);
    } else {
      // Blended mode (transition)
      const liquidResult = computeFluidForces(particles, {
        kernel: { smoothingRadius: fluid.smoothingRadius },
        fluid,
      });
      const gasResult = computeGasForces(particles, { gas });
      const blended = blendForces(
        liquidResult.forces,
        gasResult.forces,
        this.modeMix
      );
      this._accumulateForces(blended);
    }
  }

  /**
   * Accumulate computed forces into force array.
   * @private
   * @param {Array} forces - Forces to add
   */
  _accumulateForces(forces) {
    const n = Math.min(forces.length, this._forces.length);
    for (let i = 0; i < n; i++) {
      this._forces[i].x += forces[i].x;
      this._forces[i].y += forces[i].y;
    }
  }

  /**
   * Apply boundary repulsion forces.
   * @private
   * @param {Array} particles - Particle array
   */
  _applyBoundaryForces(particles) {
    const { x, y, w, h } = this.bounds;
    const { radius, strength } = this.config.boundary;

    const left = x;
    const right = x + w;
    const top = y;
    const bottom = y + h;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const r = p.size * 0.5;

      const distLeft = p.x - r - left;
      const distRight = right - p.x - r;
      const distTop = p.y - r - top;
      const distBottom = bottom - p.y - r;

      if (distLeft < radius) {
        const t = Math.max(0, 1 - distLeft / radius);
        this._forces[i].x += strength * t * t;
      }

      if (distRight < radius) {
        const t = Math.max(0, 1 - distRight / radius);
        this._forces[i].x -= strength * t * t;
      }

      if (distTop < radius) {
        const t = Math.max(0, 1 - distTop / radius);
        this._forces[i].y += strength * t * t;
      }

      if (distBottom < radius) {
        const t = Math.max(0, 1 - distBottom / radius);
        this._forces[i].y -= strength * t * t;
      }
    }
  }

  /**
   * Update particle temperatures based on position in heat zones.
   * Uses zoneTemperature from heat.js for smooth zone transitions.
   * @private
   * @param {Array} particles - Particle array
   */
  _updateTemperatures(particles) {
    if (!this.bounds) return;

    const { heat } = this.config;
    const containerTop = this.bounds.y;
    const containerHeight = this.bounds.h;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const tCurrent = p.custom.temperature ?? heat.neutralTemp;
      
      // Normalize position: 0 = top, 1 = bottom
      const normalized = Math.min(1, Math.max(0, 
        (p.y - containerTop) / containerHeight
      ));
      
      // Calculate new temperature using zone-based heating/cooling
      const tNext = zoneTemperature(normalized, tCurrent, heat);
      p.custom.temperature = Math.min(1, Math.max(0, tNext));
    }
  }

  /**
   * Apply thermal convection forces based on particle temperature.
   * Hot particles rise, cold particles sink, with a dead zone for stability.
   * @private
   * @param {Array} particles - Particle array
   */
  _applyThermalForces(particles) {
    const { heat } = this.config;
    const neutral = heat.neutralTemp;
    const deadZone = heat.deadZone;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const temp = p.custom.temperature ?? neutral;
      const tempDelta = temp - neutral;
      
      // Only apply force if outside dead zone
      if (Math.abs(tempDelta) > deadZone) {
        let thermalForce = 0;
        
        if (tempDelta > 0) {
          // Buoyancy: hot rises (negative = up)
          const excess = tempDelta - deadZone;
          thermalForce = -excess * heat.buoyancy * 2;
        } else {
          // Sinking: cold falls (positive = down)
          const excess = -tempDelta - deadZone;
          thermalForce = excess * heat.sinking * 2;
        }
        
        this._forces[i].y += thermalForce;
      }
    }
  }

  /**
   * Apply extra repulsion between gas particles to prevent clumping.
   * Uses cubic falloff for strong close-range repulsion.
   * @private
   * @param {Array} particles - Particle array
   */
  _applyGasRepulsion(particles) {
    const { gas } = this.config;
    const radius = gas.interactionRadius;
    const r2 = radius * radius;
    const strength = gas.repulsion || 200;
    const n = particles.length;

    for (let i = 0; i < n; i++) {
      const pi = particles[i];
      for (let j = i + 1; j < n; j++) {
        const pj = particles[j];
        const dx = pi.x - pj.x;
        const dy = pi.y - pj.y;
        const dist2 = dx * dx + dy * dy;

        if (dist2 >= r2 || dist2 < 1) continue;

        const dist = Math.sqrt(dist2);
        const t = 1 - dist / radius;
        const force = strength * t * t * t; // Cubic falloff

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        this._forces[i].x += fx;
        this._forces[i].y += fy;
        this._forces[j].x -= fx;
        this._forces[j].y -= fy;
      }
    }
  }

  /**
   * Track window movement and calculate shake forces.
   * Creates a "bottle shaking" effect when the browser window is moved rapidly.
   * @private
   * @param {number} dt - Delta time
   */
  _updateShakeForces(dt) {
    const { shake } = this.config;
    if (!shake.enabled) return;

    const currentX = window.screenX;
    const currentY = window.screenY;

    // Calculate window velocity (pixels per second)
    const dx = currentX - this._shake.lastX;
    const dy = currentY - this._shake.lastY;
    
    // Only calculate velocity if dt is reasonable (avoid spikes on tab switch)
    if (dt > 0 && dt < 0.1) {
      this._shake.velocityX = dx / dt;
      this._shake.velocityY = dy / dt;
    }

    // Store current position for next frame
    this._shake.lastX = currentX;
    this._shake.lastY = currentY;

    // Apply inertia: particles resist window movement
    // When window moves right, particles feel a force to the left (and vice versa)
    const targetForceX = -this._shake.velocityX * shake.sensitivity;
    const targetForceY = -this._shake.velocityY * shake.sensitivity;

    // Smooth the force application with damping
    this._shake.forceX = Easing.lerp(this._shake.forceX, targetForceX, 1 - shake.damping);
    this._shake.forceY = Easing.lerp(this._shake.forceY, targetForceY, 1 - shake.damping);

    // Clamp to max force
    const forceMag = Math.sqrt(
      this._shake.forceX * this._shake.forceX + 
      this._shake.forceY * this._shake.forceY
    );
    if (forceMag > shake.maxForce) {
      const scale = shake.maxForce / forceMag;
      this._shake.forceX *= scale;
      this._shake.forceY *= scale;
    }
  }

  /**
   * Apply shake forces to all particles.
   * @private
   */
  _applyShakeForces() {
    const fx = this._shake.forceX;
    const fy = this._shake.forceY;

    // Skip if force is negligible
    if (Math.abs(fx) < 1 && Math.abs(fy) < 1) return;

    for (let i = 0; i < this._forces.length; i++) {
      this._forces[i].x += fx;
      this._forces[i].y += fy;
    }
  }

  /**
   * Integrate forces into particle velocities.
   * In gas mode, temperature affects mass (hot=light, cold=heavy).
   * @private
   * @param {Array} particles - Particle array
   * @param {number} dt - Delta time
   */
  _integrateForces(particles, dt) {
    const { gravity, damping, maxSpeed, heat } = this.config;
    const maxSpeed2 = maxSpeed * maxSpeed;
    
    // Gas mode uses less damping (floatier)
    const gasDamping = 0.995;
    const effectiveDamping = Easing.lerp(damping, gasDamping, this.modeMix);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const f = this._forces[i];
      const baseMass = p.custom.mass || 1;
      
      let mass, effectiveGravity;
      
      if (this.modeMix > 0.5) {
        // GAS MODE: Temperature affects density/mass
        // Hot gas is lighter, cold gas is heavier
        const temp = p.custom.temperature ?? heat.neutralTemp;
        
        // Mass: 1.5x at cold (temp=0), 0.3x at hot (temp=1)
        mass = baseMass * Easing.lerp(1.5, 0.3, temp);
        
        // Gravity affects cold particles more
        effectiveGravity = this.gravityEnabled 
          ? gravity * Easing.lerp(1.2, 0.6, temp) 
          : 0;
      } else {
        // LIQUID MODE: Uniform density
        mass = baseMass;
        effectiveGravity = this.gravityEnabled ? gravity : 0;
      }

      // Apply forces
      p.vx += (f.x / mass) * dt;
      p.vy += (f.y / mass + effectiveGravity) * dt;

      // Apply damping
      p.vx *= effectiveDamping;
      p.vy *= effectiveDamping;

      // Clamp speed
      const speed2 = p.vx * p.vx + p.vy * p.vy;
      if (speed2 > maxSpeed2) {
        const inv = maxSpeed / Math.sqrt(speed2);
        p.vx *= inv;
        p.vy *= inv;
      }
    }
  }

  /**
   * Clamp particles to bounds with bounce.
   * @private
   * @param {Array} particles - Particle array
   */
  _clampBounds(particles) {
    const { x, y, w, h } = this.bounds;
    const { bounce } = this.config;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const r = p.size * 0.5;

      const left = x + r;
      const right = x + w - r;
      const top = y + r;
      const bottom = y + h - r;

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

  /**
   * Reset all particles to initial spawn state.
   */
  reset() {
    const count = this.particles.length;
    this.particles.length = 0;
    this._forces.length = 0;
    this.spawn(count);
  }

  /**
   * Toggle gravity on/off.
   * @returns {boolean} New gravity state
   */
  toggleGravity() {
    this.gravityEnabled = !this.gravityEnabled;
    return this.gravityEnabled;
  }

  /**
   * Set physics mode with smooth transition.
   * @param {string|number} mode - 'liquid', 'gas', or a number 0-1 for blend
   * @param {boolean} [instant=false] - If true, snap immediately without lerping
   */
  setPhysicsMode(mode, instant = false) {
    let target;
    if (mode === "liquid") {
      target = 0;
    } else if (mode === "gas") {
      target = 1;
    } else if (typeof mode === "number") {
      target = Math.max(0, Math.min(1, mode));
    } else {
      return;
    }

    this._targetMode = target;
    
    if (instant) {
      this.modeMix = target;
    }
  }

  /**
   * Get the current physics mode as a string.
   * @returns {string} 'liquid', 'gas', or 'blending'
   */
  getPhysicsMode() {
    if (this.modeMix < 0.01) return "liquid";
    if (this.modeMix > 0.99) return "gas";
    return "blending";
  }

  /**
   * Check if heat physics is currently active.
   * @returns {boolean} True if heat physics is enabled
   */
  isHeatEnabled() {
    return this.config.heat.enabled || this.modeMix > 0.5;
  }
}

