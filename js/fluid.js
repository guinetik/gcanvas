/**
 * Fluid & Gas Explorer Demo
 * 
 * Advanced fluid simulation demo using FluidSystem with thermal physics.
 * Demonstrates gas mode with heat zones, thermal convection, and temperature coloring.
 * 
 * Features:
 * - Smooth Particle Hydrodynamics for liquid behavior
 * - Gas mode with thermal convection (hot rises, cold sinks)
 * - Temperature-based coloring (blue=cold, red=hot)
 * - Visual heat zone indicators
 * - Mouse interaction (hover to stir, click to push)
 */
import {
  Game,
  FluidSystem,
  FPSCounter,
  Painter,
  Button,
  ToggleButton,
  Stepper,
  Position,
  Rectangle,
  ShapeGOFactory,
  HorizontalLayout,
  VerticalLayout,
  Screen,
} from "/gcanvas.es.min.js";
import { zoneTemperature } from "/gcanvas.es.min.js";
import { Easing } from "/gcanvas.es.min.js";

// Base particle size - all proportional values derive from this
const PARTICLE_SIZE = Math.PI * 10;

const CONFIG = {
  particleSize: PARTICLE_SIZE,
  
  sim: {
    maxParticles: Math.floor(PARTICLE_SIZE * 11),
    gravity: 200,
    damping: 0.98,
    bounce: 0.3,
    maxSpeed: 400,
  },
  fluid: {
    smoothingRadius: PARTICLE_SIZE * 2,
    restDensity: 3.0,
    pressureStiffness: 80,
    nearPressureStiffness: 3,
    viscosity: 0.005,
    maxForce: 5000,
  },
  gas: {
    interactionRadius: PARTICLE_SIZE * 4,
    pressure: 150,
    diffusion: 0.15,
    drag: 0.02,
    turbulence: 50,
    buoyancy: 300,
    sinking: 200,
    repulsion: 300,
  },
  heat: {
    enabled: true,
    heatZone: 0.88,
    coolZone: 0.25,
    rate: 0.03,
    heatMultiplier: 1.5,
    coolMultiplier: 2.0,
    middleMultiplier: 0.005,
    transitionWidth: 0.08,
    neutralTemp: 0.5,
    deadZone: 0.15,
    buoyancy: 300,
    sinking: 200,
  },
  pointer: {
    radius: PARTICLE_SIZE * 6,
    push: 8000,
    pull: 2000,
  },
  visuals: {
    liquid: {
      baseHue: 200,
      hueRange: 40,
      saturation: 75,
      minLight: 50,
      maxLight: 65,
    },
    gas: {
      coldHue: 220,
      hotHue: 0,
      saturation: 85,
      minLight: 45,
      maxLight: 70,
    },
    alpha: 0.9,
  },
  ui: {
    margin: 16,
    width: 130,
    height: 32,
    spacing: 8,
  },
  container: {
    marginX: 80,
    marginY: 150,
    strokeColor: "#22c55e",
    strokeWidth: 2,
  },
};

/**
 * FluidGasGame - SPH-based fluid simulation demo using FluidSystem.
 */
class FluidGasGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#0a0e1a";
    this.enableFluidSize();
    this.pointer = { x: 0, y: 0, down: false };
    this.mode = "liquid";
    this.gravityOn = true;
  }

  init() {
    super.init();
    
    // Initialize Screen for responsive handling
    Screen.init(this);
    
    this.pointer.x = this.width * 0.5;
    this.pointer.y = this.height * 0.5;

    // Calculate container bounds
    this._updateContainerBounds();

    // Create container outline
    const containerShape = new Rectangle({
      width: this.bounds.w,
      height: this.bounds.h,
      stroke: CONFIG.container.strokeColor,
      lineWidth: CONFIG.container.strokeWidth,
      color: null,
      origin: "center",
    });
    this.containerRect = ShapeGOFactory.create(this, containerShape, {
      x: this.bounds.x + this.bounds.w / 2,
      y: this.bounds.y + this.bounds.h / 2,
      originX: 0.5,
      originY: 0.5,
    });
    this.pipeline.add(this.containerRect);

    // Create FluidSystem - handles all physics internally
    this.fluid = new FluidSystem(this, {
      maxParticles: CONFIG.sim.maxParticles,
      particleSize: CONFIG.particleSize,
      bounds: this.bounds,
      physics: "liquid",
      gravity: CONFIG.sim.gravity,
      damping: CONFIG.sim.damping,
      bounce: CONFIG.sim.bounce,
      maxSpeed: CONFIG.sim.maxSpeed,
      fluid: CONFIG.fluid,
      gas: CONFIG.gas,
      heat: CONFIG.heat,
      blendMode: "source-over",
    });

    // Spawn particles
    this.fluid.spawn(CONFIG.sim.maxParticles);
    this.pipeline.add(this.fluid);

    // Build UI controls
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
    
    // Listen for device type changes to rebuild UI
    this.events.on("devicechange", () => this._rebuildUI());
  }

  /**
   * Handle window resize
   */
  _handleResize() {
    this._updateContainerBounds();
    
    if (this.containerRect) {
      this.containerRect.transform
        .position(this.bounds.x + this.bounds.w / 2, this.bounds.y + this.bounds.h / 2)
        .size(this.bounds.w, this.bounds.h);
      
      // Update the shape dimensions too
      if (this.containerRect.shape) {
        this.containerRect.shape.width = this.bounds.w;
        this.containerRect.shape.height = this.bounds.h;
      }
    }
    
    if (this.fluid) {
      this.fluid.setBounds(this.bounds);
    }
    
    if (this.buttonRow) this.buttonRow.markBoundsDirty();
    if (this.stepperRow) this.stepperRow.markBoundsDirty();
  }

  /**
   * Rebuild UI when device type changes (mobile <-> desktop)
   */
  _rebuildUI() {
    // Remove old UI elements
    if (this.buttonRow) {
      this.pipeline.remove(this.buttonRow);
    }
    if (this.stepperRow) {
      this.pipeline.remove(this.stepperRow);
    }
    if (this.fpsCounter) {
      this.pipeline.remove(this.fpsCounter);
    }
    
    // Rebuild UI with new responsive values
    this._buildUI();
    
    // Update container bounds for new device type
    this._updateContainerBounds();
    this._handleResize();
  }

  update(dt) {
    dt = Math.min(dt, 0.033);
    
    // Update physics mode on FluidSystem
    this.fluid.setPhysicsMode(this.mode);
    this.fluid.gravityEnabled = this.gravityOn;

    // Apply pointer forces
    this._pointerForces(this.fluid.particles);

    super.update(dt);

    // Apply demo-specific coloring
    this._applyColors(this.fluid.particles);
  }

  /**
   * Render with optional heat zone visualization
   */
  render() {
    super.render();
    
    if (this.fluid.modeMix > 0.5 && this.bounds) {
      this._drawHeatZones();
    }
  }

  /**
   * Draw visual indicators for thermal zones
   */
  _drawHeatZones() {
    const { heatZone, coolZone } = CONFIG.heat;
    const { x, y, w, h } = this.bounds;
    const ctx = this.ctx;
    
    const coldZoneHeight = coolZone * h;
    const hotZoneStart = heatZone * h;
    const hotZoneHeight = h - hotZoneStart;
    
    const alpha = Math.min(1, (this.fluid.modeMix - 0.5) * 4) * 0.25;
    
    ctx.save();
    
    // Cold zone at top
    const coldGrad = ctx.createLinearGradient(x, y, x, y + coldZoneHeight);
    coldGrad.addColorStop(0, `rgba(100, 150, 255, ${alpha})`);
    coldGrad.addColorStop(1, `rgba(100, 150, 255, 0)`);
    ctx.fillStyle = coldGrad;
    ctx.fillRect(x, y, w, coldZoneHeight);
    
    // Hot zone at bottom
    const hotGrad = ctx.createLinearGradient(x, y + hotZoneStart, x, y + h);
    hotGrad.addColorStop(0, `rgba(255, 100, 50, 0)`);
    hotGrad.addColorStop(1, `rgba(255, 100, 50, ${alpha})`);
    ctx.fillStyle = hotGrad;
    ctx.fillRect(x, y + hotZoneStart, w, hotZoneHeight);
    
    // Zone boundary lines
    ctx.strokeStyle = `rgba(100, 150, 255, ${alpha * 0.8})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x, y + coldZoneHeight);
    ctx.lineTo(x + w, y + coldZoneHeight);
    ctx.stroke();
    
    ctx.strokeStyle = `rgba(255, 100, 50, ${alpha * 0.8})`;
    ctx.beginPath();
    ctx.moveTo(x, y + hotZoneStart);
    ctx.lineTo(x + w, y + hotZoneStart);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.restore();
  }

  _buildUI() {
    const isMobile = Screen.isMobile;
    
    // Responsive sizing
    const margin = Screen.responsive(8, 12, 16);
    const buttonWidth = Screen.responsive(90, 110, 130);
    const buttonHeight = Screen.responsive(28, 30, 32);
    const spacing = Screen.responsive(4, 6, 8);
    const stepperWidth = Screen.responsive(100, 115, 130);
    const stepperHeight = Screen.responsive(40, 43, 46);
    const stepperValueWidth = Screen.responsive(36, 42, 48);
    const stepperButtonSize = Screen.responsive(22, 24, 26);
    const stepperInnerHeight = Screen.responsive(22, 24, 26);

    // Button row - centered on mobile, bottom-left on desktop
    const buttonRow = new HorizontalLayout(this, {
      spacing,
      debug: true,
      debugColor: "red",
      padding: 0,
      origin: "center",
      anchor: isMobile ? Position.BOTTOM_CENTER : Position.BOTTOM_LEFT,
      anchorMargin: margin,
      anchorOffsetY: isMobile ? -(stepperHeight + spacing * 2) : 0,
    });

    this.btnMode = new ToggleButton(this, {
      width: buttonWidth,
      height: buttonHeight,
      text: isMobile ? "Liquid" : "Mode: Liquid",
      origin: "center",
      startToggled: false,
      onToggle: (on) => {
        this.mode = on ? "gas" : "liquid";
        this.btnMode.text = isMobile 
          ? (on ? "Gas" : "Liquid")
          : (on ? "Mode: Gas" : "Mode: Liquid");
      },
    });
    buttonRow.add(this.btnMode);

    this.btnGravity = new ToggleButton(this, {
      width: buttonWidth,
      height: buttonHeight,
      text: isMobile ? "Gravity" : "Gravity: On",
      origin: "center",
      startToggled: true,
      onToggle: (on) => {
        this.gravityOn = on;
        this.btnGravity.text = isMobile
          ? "Gravity"
          : (on ? "Gravity: On" : "Gravity: Off");
      },
    });
    buttonRow.add(this.btnGravity);

    this.btnReset = new Button(this, {
      width: buttonWidth,
      height: buttonHeight,
      text: "Reset",
      origin: "center",
      onClick: () => this.fluid.reset(),
    });
    buttonRow.add(this.btnReset);

    // Stepper row - centered on mobile, above buttons on desktop
    // Account for stepper height (label + controls + gaps)
    const stepperTotalHeight = stepperHeight + 20; // Include label height
    const stepperRow = new HorizontalLayout(this, {
      debug: true,
      debugColor: "blue",
      spacing: spacing + 4,
      padding: 0,
      origin: "center",
      anchor: isMobile ? Position.BOTTOM_CENTER : Position.BOTTOM_LEFT,
      anchorMargin: margin,
      anchorOffsetY: isMobile ? 0 : -(buttonHeight + spacing + stepperTotalHeight / 2 - 10),
    });

    // On mobile, show fewer steppers
    if (!isMobile) {
      this.gravityStep = new Stepper(this, {
        value: CONFIG.sim.gravity,
        min: 0,
        max: 500,
        step: 25,
        label: "Gravity",
        valueWidth: stepperValueWidth,
        buttonSize: stepperButtonSize,
        height: stepperInnerHeight,
        origin: "center",
        onChange: (val) => {
          this.fluid.config.gravity = val;
        },
      });
      stepperRow.add(this.gravityStep);
    }

    this.viscosityStep = new Stepper(this, {
      value: CONFIG.fluid.viscosity * 1000,
      min: 0,
      max: 100,
      step: 5,
      label: "Viscosity",
      valueWidth: stepperValueWidth,
      buttonSize: stepperButtonSize,
      height: stepperInnerHeight,
      origin: "center",
      formatValue: (v) => (v / 1000).toFixed(2),
      onChange: (val) => {
        this.fluid.config.fluid.viscosity = val / 1000;
      },
    });
    stepperRow.add(this.viscosityStep);

    this.pressureStep = new Stepper(this, {
      value: CONFIG.fluid.pressureStiffness,
      min: 10,
      max: 500,
      step: 20,
      label: "Pressure",
      valueWidth: stepperValueWidth,
      buttonSize: stepperButtonSize,
      height: stepperInnerHeight,
      origin: "center",
      onChange: (val) => {
        this.fluid.config.fluid.pressureStiffness = val;
      },
    });
    stepperRow.add(this.pressureStep);

    this.bounceStep = new Stepper(this, {
      value: Math.round(CONFIG.sim.bounce * 100),
      min: 0,
      max: 100,
      step: 5,
      label: "Bounce",
      valueWidth: stepperValueWidth,
      buttonSize: stepperButtonSize,
      height: stepperInnerHeight,
      origin: "center",
      formatValue: (v) => `${v}%`,
      onChange: (val) => {
        this.fluid.config.bounce = val / 100;
      },
    });
    stepperRow.add(this.bounceStep);

    this.pipeline.add(buttonRow);
    this.pipeline.add(stepperRow);
    
    this.buttonRow = buttonRow;
    this.stepperRow = stepperRow;
    
    this.fpsCounter = new FPSCounter(this, { anchor: "bottom-right", origin: "center" });
    this.pipeline.add(this.fpsCounter);
    
    buttonRow.markBoundsDirty();
    stepperRow.markBoundsDirty();
  }

  /**
   * Apply visual coloring based on mode and temperature
   */
  _applyColors(particles) {
    const { liquid, gas, alpha } = CONFIG.visuals;
    const maxSpeed = CONFIG.sim.maxSpeed;
    const containerTop = this.bounds?.y || 0;
    const containerHeight = this.bounds?.h || this.height || 1;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const speedNorm = Math.min(1, speed / maxSpeed);
      
      let hue, saturation, light;
      
      if (this.fluid.modeMix < 0.5) {
        // LIQUID MODE: Blue water
        hue = liquid.baseHue - speedNorm * liquid.hueRange;
        saturation = liquid.saturation;
        light = Easing.lerp(liquid.minLight, liquid.maxLight, 0.3 + speedNorm * 0.5);
      } else {
        // GAS MODE: Temperature-based coloring
        const temp = p.custom.temperature ?? CONFIG.heat.neutralTemp;
        
        // Blue -> Purple -> Magenta -> Red
        if (temp < 0.33) {
          hue = gas.coldHue + (280 - gas.coldHue) * (temp / 0.33);
        } else if (temp < 0.66) {
          hue = 280 + 40 * ((temp - 0.33) / 0.33);
        } else {
          hue = 320 + 40 * ((temp - 0.66) / 0.34);
          if (hue >= 360) hue -= 360;
        }
        saturation = gas.saturation;
        light = Easing.lerp(gas.minLight, gas.maxLight, 0.4 + temp * 0.4);
      }

      const [r, g, b] = Painter.colors.hslToRgb(hue, saturation, light);
      p.color.r = r;
      p.color.g = g;
      p.color.b = b;
      p.color.a = alpha;
    }
  }

  /**
   * Apply pointer interaction forces
   */
  _pointerForces(particles) {
    const { radius, push, pull } = CONFIG.pointer;
    const r2 = radius * radius;
    const mx = this.pointer.x;
    const my = this.pointer.y;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const dx = mx - p.x;
      const dy = my - p.y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 >= r2 || dist2 < 1) continue;
      
      const dist = Math.sqrt(dist2);
      const t = 1 - dist / radius;
      const strength = (this.pointer.down ? -push : pull) * t * t;
      
      // Apply directly to velocity (simpler than accumulating forces)
      const dt = 0.016; // Approximate frame time
      p.vx += (dx / dist) * strength * dt;
      p.vy += (dy / dist) * strength * dt;
    }
  }

  _updateContainerBounds() {
    // Responsive margins - leave more space at bottom for UI on mobile
    const marginX = Screen.responsive(20, 40, CONFIG.container.marginX);
    const marginTop = Screen.responsive(60, 80, CONFIG.container.marginY);
    const marginBottom = Screen.responsive(140, 130, CONFIG.container.marginY); // Extra space for buttons/steppers
    this.bounds = {
      x: marginX,
      y: marginTop,
      w: this.width - marginX * 2,
      h: this.height - marginTop - marginBottom,
    };
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
      this.fluid.reset();
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
