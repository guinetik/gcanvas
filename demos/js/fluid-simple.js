/**
 * Simplified Fluid Demo using FluidSystem
 *
 * Demonstrates how the FluidSystem class dramatically reduces
 * the boilerplate needed for fluid simulations.
 */
import {
  Game,
  FPSCounter,
  FluidSystem,
  applyAnchor,
  Position,
  Button,
  ToggleButton,
  HorizontalLayout,
  Screen,
} from "../../src/index.js";

const PARTICLE_SIZE = 32;

const CONFIG = {
  particleSize: PARTICLE_SIZE,
  maxParticles: 500,
  gravity: 200,
  container: {
    marginX: 80,
    marginY: 200,
    strokeColor: "#22c55e",
    strokeWidth: 2,
  },
  pointer: {
    radius: PARTICLE_SIZE * 4,
    push: 3000,
    pull: 600,
  },
  ui: {
    margin: 12,
    width: 130,
    height: 32,
    spacing: 6,
  },
};

/**
 * Simplified fluid demo using FluidSystem.
 */
class FluidSimpleDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#0f172a";
    this.enableFluidSize();
    this.pointer = { x: 0, y: 0, down: false };
  }

  init() {
    super.init();
    
    // Initialize Screen for responsive handling
    Screen.init(this);

    // Create container bounds
    this._updateBounds();

    // Create FluidSystem - ALL the physics is handled internally!
    this.fluid = new FluidSystem(this, {
      maxParticles: CONFIG.maxParticles,
      particleSize: CONFIG.particleSize,
      width: this.bounds.w,
      height: this.bounds.h,
      bounds: this.bounds,
      physics: "liquid",
      debug: true,
      debugColor: CONFIG.container.strokeColor,
      gravity: CONFIG.gravity,
      particleColor: { r: 80, g: 180, b: 255, a: 0.9 },
    });

    // Spawn particles
    this.fluid.spawn(CONFIG.maxParticles);

    this.pipeline.add(this.fluid);
    
    // Ensure bounds are set after fluid system is ready
    this.fluid.setBounds(this.bounds);

    // Build UI controls
    this._buildUI();

    // FPS counter
    this.fpsCounter = new FPSCounter(this, { color: "#6af", anchor: "top-right", origin: "center" });
    this.pipeline.add(this.fpsCounter);

    // Mouse interaction
    this._setupInteraction();
    
    // Listen for device type changes to rebuild UI
    this.events.on("devicechange", () => this._rebuildUI());
  }

  /**
   * Build the UI control bar.
   */
  _buildUI() {
    const isMobile = Screen.isMobile;
    
    // Responsive sizing
    const margin = Screen.responsive(8, 10, CONFIG.ui.margin);
    const buttonWidth = Screen.responsive(90, 110, CONFIG.ui.width);
    const buttonHeight = Screen.responsive(28, 30, CONFIG.ui.height);
    const spacing = Screen.responsive(4, 5, CONFIG.ui.spacing);

    // Create horizontal layout for buttons
    this.uiPanel = new HorizontalLayout(this, {
      spacing,
      padding: 0,
      align: "center",
      origin: "center",
      anchor: isMobile ? Position.BOTTOM_CENTER : Position.BOTTOM_LEFT,
      anchorMargin: margin,
    });

    this.btnMode = new ToggleButton(this, {
      width: buttonWidth,
      height: buttonHeight,
      text: isMobile ? "Liquid" : "Mode: Liquid",
      origin: "center",
      startToggled: false,
      onToggle: (on) => {
        this.fluid.setPhysicsMode(on ? "gas" : "liquid");
        this.btnMode.text = isMobile 
          ? (on ? "Gas" : "Liquid")
          : (on ? "Mode: Gas" : "Mode: Liquid");
      },
    });
    this.uiPanel.add(this.btnMode);

    this.btnGravity = new ToggleButton(this, {
      width: buttonWidth,
      height: buttonHeight,
      text: isMobile ? "Gravity" : "Gravity: On",
      origin: "center",
      startToggled: true,
      onToggle: (on) => {
        this.fluid.gravityEnabled = on;
        this.btnGravity.text = isMobile
          ? "Gravity"
          : (on ? "Gravity: On" : "Gravity: Off");
      },
    });
    this.uiPanel.add(this.btnGravity);

    this.btnReset = new Button(this, {
      width: buttonWidth,
      height: buttonHeight,
      text: "Reset",
      origin: "center",
      onClick: () => this.fluid.reset(),
    });
    this.uiPanel.add(this.btnReset);

    this.pipeline.add(this.uiPanel);
  }

  _updateBounds() {
    // Responsive margins - more space at bottom for UI on mobile
    const marginX = Screen.responsive(20, 40, CONFIG.container.marginX);
    const marginTop = Screen.responsive(60, 80, 100);
    const marginBottom = Screen.responsive(100, 90, CONFIG.container.marginY);
    this.bounds = {
      x: marginX,
      y: marginTop,
      w: this.width - marginX * 2,
      h: this.height - marginTop - marginBottom,
    };
  }

  onResize() {
    this._updateBounds();
    if (this.fluid) {
      this.fluid.setBounds(this.bounds);
      // Also update width/height for debug rendering
      this.fluid.width = this.bounds.w;
      this.fluid.height = this.bounds.h;
    }
    if (this.uiPanel) {
      this.uiPanel.markBoundsDirty();
    }
  }

  /**
   * Rebuild UI when device type changes (mobile <-> desktop)
   */
  _rebuildUI() {
    // Remove old UI elements
    if (this.uiPanel) {
      this.pipeline.remove(this.uiPanel);
    }
    if (this.fpsCounter) {
      this.pipeline.remove(this.fpsCounter);
    }
    
    // Rebuild UI with new responsive values
    this._buildUI();
    this.fpsCounter = new FPSCounter(this, { color: "#6af", anchor: "top-right", origin: "center" });
    this.pipeline.add(this.fpsCounter);
    
    // Update container bounds for new device type
    this._updateBounds();
    this.onResize();
  }

  _setupInteraction() {
    // Track pointer position and state
    this.events.on("inputmove", (e) => {
      this.pointer.x = e.x;
      this.pointer.y = e.y;
    });
    this.events.on("inputdown", () => (this.pointer.down = true));
    this.events.on("inputup", () => (this.pointer.down = false));
  }

  /**
   * Apply continuous pointer forces to particles.
   * Push when clicking, gentle pull when hovering.
   * @param {number} dt - Delta time
   */
  _applyPointerForces(dt) {
    const { radius, push, pull } = CONFIG.pointer;
    const r2 = radius * radius;
    const mx = this.pointer.x;
    const my = this.pointer.y;

    for (const p of this.fluid.particles) {
      const dx = mx - p.x;
      const dy = my - p.y;
      const dist2 = dx * dx + dy * dy;

      if (dist2 >= r2 || dist2 < 1) continue;

      const dist = Math.sqrt(dist2);
      const t = 1 - dist / radius;
      const strength = (this.pointer.down ? push : -pull) * t * t;

      p.vx += (dx / dist) * strength * dt;
      p.vy += (dy / dist) * strength * dt;
    }
  }

  update(dt) {
    // Apply pointer forces continuously
    this._applyPointerForces(dt);

    super.update(dt);
    this._colorByVelocity();
  }

  /**
   * Color particles by velocity (Sebastian Lague style).
   */
  _colorByVelocity() {
    const maxSpeed = 300;

    for (const p of this.fluid.particles) {
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const t = Math.min(1, speed / maxSpeed);

      // Blue (slow) -> Cyan -> Green -> Yellow -> Orange (fast)
      const hue = 210 - t * 180;
      const sat = 80;
      const light = 50 + t * 15;

      // Simple HSL to RGB approximation
      const c = ((1 - Math.abs((2 * light) / 100 - 1)) * sat) / 100;
      const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
      const m = light / 100 - c / 2;

      let r, g, b;
      if (hue < 60) {
        r = c; g = x; b = 0;
      } else if (hue < 120) {
        r = x; g = c; b = 0;
      } else if (hue < 180) {
        r = 0; g = c; b = x;
      } else if (hue < 240) {
        r = 0; g = x; b = c;
      } else if (hue < 300) {
        r = x; g = 0; b = c;
      } else {
        r = c; g = 0; b = x;
      }

      p.color.r = Math.round((r + m) * 255);
      p.color.g = Math.round((g + m) * 255);
      p.color.b = Math.round((b + m) * 255);
    }
  }
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new FluidSimpleDemo(canvas);
  demo.start();
});
