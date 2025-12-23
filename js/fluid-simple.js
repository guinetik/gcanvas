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
} from "/gcanvas.es.min.js";

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

    // Build UI controls
    this._buildUI();

    // FPS counter
    this.pipeline.add(
      new FPSCounter(this, { color: "#6af", anchor: "top-right" })
    );

    // Mouse interaction
    this._setupInteraction();
  }

  /**
   * Build the UI control bar.
   */
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
        this.fluid.setPhysicsMode(on ? "gas" : "liquid");
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
        this.fluid.gravityEnabled = on;
        this.btnGravity.text = on ? "Gravity: On" : "Gravity: Off";
      },
    });
    uiPanel.add(this.btnGravity);

    this.btnReset = new Button(this, {
      width,
      height,
      text: "Reset",
      onClick: () => this.fluid.reset(),
    });
    uiPanel.add(this.btnReset);

    this.pipeline.add(uiPanel);
  }

  _updateBounds() {
    const { marginX, marginY } = CONFIG.container;
    this.bounds = {
      x: marginX,
      y: marginY,
      w: this.width - marginX * 2,
      h: this.height - marginY * 2,
    };
  }

  onResize() {
    this._updateBounds();
    if (this.fluid) {
      this.fluid.setBounds(this.bounds);
    }
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
