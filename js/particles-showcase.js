/**
 * Particle System Showcase
 *
 * Organized display of particle effects in labeled stations:
 * - Fountain (water spray with gravity)
 * - Fire (rising flames with color gradient)
 * - Snow (gentle falling flakes)
 * - Confetti (burst on click)
 */

import {
  Game,
  GameObject,
  Scene3D,
  Rectangle,
  TextShape,
  Painter,
  Camera3D,
  ParticleSystem,
  ParticleEmitter,
  Updaters,
  FPSCounter,
  Position,
} from "/gcanvas.es.min.js";

const CONFIG = {
  backgroundColor: "#0a0a12",
  maxParticles: 20000, // Stress test: 20k particles

  // Station layout
  stationWidth: 200,
  stationHeight: 250,
  stationSpacing: 40,

  // Fountain settings
  fountain: {
    rate: 150, // 4x more
    velocity: { x: 0, y: -350, z: 0 },
    velocitySpread: { x: 40, y: 20, z: 40 },
    lifetime: { min: 2, max: 4 }, // Longer life
    size: { min: 3, max: 6 },
    color: { r: 100, g: 180, b: 255, a: 1 },
  },

  // Fire settings
  fire: {
    rate: 250, // Dense flames
    velocity: { x: 0, y: -60, z: 0 },
    velocitySpread: { x: 15, y: 10, z: 15 },
    lifetime: { min: 1, max: 2 }, // Longer life
    size: { min: 6, max: 12 },
  },

  // Snow settings
  snow: {
    rate: 80, // 5x more
    velocity: { x: 0, y: 40, z: 0 },
    velocitySpread: { x: 10, y: 5, z: 10 },
    lifetime: { min: 4, max: 7 }, // Longer life
    size: { min: 2, max: 4 },
    color: { r: 255, g: 255, b: 255, a: 0.9 },
  },

  // Confetti burst settings
  confetti: {
    velocity: { x: 0, y: -150, z: 0 },
    velocitySpread: { x: 100, y: 60, z: 100 },
    lifetime: { min: 2, max: 4 }, // Longer life
    size: { min: 5, max: 10 },
  },
};

/**
 * Station box GameObject for displaying a particle effect
 */
class ParticleStation extends GameObject {
  constructor(game, x, y, width, height, label) {
    super(game, { x, y, width, height });
    this.z = 0; // For Scene3D projection

    // Background box using Rectangle shape
    this.bg = new Rectangle({
      width,
      height,
      color: "rgba(255, 255, 255, 0.03)",
      stroke: "rgba(255, 255, 255, 0.15)",
      lineWidth: 1,
    });

    // Label using TextShape
    this.labelText = new TextShape(label, {
      y: height / 2 - 15,
      font: "12px monospace",
      color: "#00FF00",
      align: "center",
      baseline: "middle",
    });
  }

  // Get emitter spawn position (center-bottom of station)
  getEmitterPosition() {
    return {
      x: this.x,
      y: this.y + this.height / 2 - 40,
      z: 0,
    };
  }

  // Get center position for confetti
  getCenterPosition() {
    return { x: this.x, y: this.y, z: 0 };
  }

  draw() {
    this.bg.draw();
    this.labelText.draw();
  }
}

class ParticlesShowcase extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = CONFIG.backgroundColor;
    this.enableFluidSize();
  }

  init() {
    super.init();

    // Setup Camera3D (subtle rotation for depth)
    this.camera = new Camera3D({
      rotationX: 0.2,
      rotationY: 0,
      perspective: 800,
      autoRotate: false,
    });
    this.camera.enableMouseControl(this.canvas);

    // Create stations layout
    this.createStations();

    // Create particle system with Camera3D
    this.particles = new ParticleSystem(this, {
      camera: this.camera,
      depthSort: true,
      maxParticles: CONFIG.maxParticles,
      blendMode: "screen",
      updaters: [
        Updaters.velocity,
        Updaters.lifetime,
        Updaters.gravity(120),
        Updaters.fadeOut,
        this.fireColorUpdater.bind(this),
        Updaters.shrink(0.2),
      ],
    });

    // Create emitters for each station
    this.createEmitters();

    this.pipeline.add(this.particles);

    // Confetti emitter (for bursts, not continuous)
    this.confettiEmitter = new ParticleEmitter({
      position: { x: 0, y: 0, z: 0 },
      velocity: CONFIG.confetti.velocity,
      velocitySpread: CONFIG.confetti.velocitySpread,
      lifetime: CONFIG.confetti.lifetime,
      size: CONFIG.confetti.size,
      color: { r: 255, g: 255, b: 0, a: 1 },
      rate: 0,
      shape: "triangle",
    });

    // Track emitter state
    this.emittersActive = true;

    // Click to burst confetti
    this.canvas.addEventListener("click", (e) => this.handleClick(e));

    // Space to toggle emitters
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        this.toggleEmitters();
      }
    });

    // FPS counter anchored to bottom right
    this.fpsCounter = new FPSCounter(this, {
      anchor: Position.BOTTOM_RIGHT,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
      color: "#0f0",
    });
    this.pipeline.add(this.fpsCounter);
  }

  createStations() {
    const { stationWidth, stationHeight, stationSpacing } = CONFIG;
    const labels = ["Fountain", "Fire", "Snow", "Confetti"];
    const totalWidth =
      labels.length * stationWidth + (labels.length - 1) * stationSpacing;
    const startX = -totalWidth / 2 + stationWidth / 2;

    // Create Scene3D to hold stations with camera projection
    this.stationScene = new Scene3D(this, {
      x: this.width / 2,
      y: this.height / 2,
      camera: this.camera,
      depthSort: false, // Stations are all at z=0
      scaleByDepth: true,
    });

    this.stations = labels.map((label, i) => {
      const x = startX + i * (stationWidth + stationSpacing);
      const station = new ParticleStation(
        this,
        x,
        0,
        stationWidth,
        stationHeight,
        label,
      );
      this.stationScene.add(station);
      return station;
    });

    // Add to pipeline (will render before particles)
    this.pipeline.add(this.stationScene);
  }

  createEmitters() {
    const { stationHeight, stationWidth } = CONFIG;
    const bottomY = stationHeight / 2 - 10; // Near bottom edge
    const topY = -stationHeight / 2 + 10; // Near top edge

    // Fountain (station 0) - bottom of station, shoots up
    const fountainStation = this.stations[0];
    this.particles.addEmitter(
      "fountain",
      new ParticleEmitter({
        position: { x: fountainStation.x, y: bottomY + 20, z: 0 },
        spread: { x: 5, y: 0, z: 5 },
        velocity: CONFIG.fountain.velocity,
        velocitySpread: CONFIG.fountain.velocitySpread,
        lifetime: CONFIG.fountain.lifetime,
        size: CONFIG.fountain.size,
        color: CONFIG.fountain.color,
        rate: CONFIG.fountain.rate,
        shape: "circle",
      }),
    );

    // Fire (station 1) - bottom of station, flames rise up
    const fireStation = this.stations[1];
    this.particles.addEmitter(
      "fire",
      new ParticleEmitter({
        position: { x: fireStation.x, y: bottomY, z: 0 },
        spread: { x: 60, y: 0, z: 30 },
        velocity: CONFIG.fire.velocity,
        velocitySpread: { x: 40, y: 15, z: 40 },
        lifetime: CONFIG.fire.lifetime,
        size: CONFIG.fire.size,
        color: { r: 255, g: 120, b: 40, a: 1 },
        rate: CONFIG.fire.rate,
        shape: "square",
      }),
    );

    // Snow (station 2) - top of station, falls down
    const snowStation = this.stations[2];
    this.particles.addEmitter(
      "snow",
      new ParticleEmitter({
        position: { x: snowStation.x, y: topY - 10, z: 0 },
        spread: { x: stationWidth * 0.4, y: 0, z: 30 },
        velocity: CONFIG.snow.velocity,
        velocitySpread: CONFIG.snow.velocitySpread,
        lifetime: CONFIG.snow.lifetime,
        size: CONFIG.snow.size,
        color: CONFIG.snow.color,
        rate: CONFIG.snow.rate,
        shape: "circle",
      }),
    );
  }

  fireColorUpdater(p, dt) {
    // Only apply to fire particles (squares)
    if (p.shape !== "square") return;

    const t = p.progress;
    // Orange -> Red -> Dark
    p.color.r = Math.floor(255 * (1 - t * 0.2));
    p.color.g = Math.floor(120 * (1 - t * 0.9));
    p.color.b = Math.floor(40 * (1 - t));
  }

  handleClick(e) {
    // Confetti always spawns at its station center
    const confettiStation = this.stations[3];
    const pos = confettiStation.getCenterPosition();

    this.confettiEmitter.position.x = pos.x;
    this.confettiEmitter.position.y = pos.y;
    this.confettiEmitter.position.z = pos.z;

    // Randomize confetti colors
    const colors = [
      { r: 255, g: 80, b: 80 },
      { r: 80, g: 255, b: 80 },
      { r: 80, g: 80, b: 255 },
      { r: 255, g: 255, b: 80 },
      { r: 255, g: 80, b: 255 },
      { r: 80, g: 255, b: 255 },
    ];

    // Burst with random colors
    for (let i = 0; i < 40; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.confettiEmitter.color = { ...color, a: 1 };
      this.particles.burst(1, this.confettiEmitter);
    }
  }

  toggleEmitters() {
    this.emittersActive = !this.emittersActive;

    for (const emitter of this.particles.emitters.values()) {
      emitter.active = this.emittersActive;
    }
  }

  update(dt) {
    super.update(dt);
    this.camera.update(dt);

    // Keep stationScene centered on resize
    this.stationScene.x = this.width / 2;
    this.stationScene.y = this.height / 2;
  }

  render() {
    super.render();
    // Stations are rendered by Scene3D through the pipeline
    // Draw HUD on top
    this.drawHUD();
  }

  drawHUD() {
    Painter.useCtx((ctx) => {
      ctx.font = "11px monospace";
      ctx.textAlign = "left";

      // Particle count
      ctx.fillStyle = "#666";
      ctx.fillText(
        `Particles: ${this.particles.particleCount} / ${CONFIG.maxParticles}`,
        15,
        this.height - 45,
      );
      ctx.fillText(`Pool: ${this.particles.poolSize}`, 15, this.height - 30);

      // Emitter status
      ctx.fillStyle = this.emittersActive ? "#8a8" : "#a88";
      ctx.fillText(
        `Emitters: ${this.emittersActive ? "ON" : "OFF"} (Space)`,
        15,
        this.height - 15,
      );

      // Instructions (bottom center)
      ctx.textAlign = "center";
      ctx.fillStyle = "#444";
      ctx.fillText(
        "click to burst confetti  |  drag to orbit",
        this.width / 2,
        this.height - 15,
      );
    });
  }
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new ParticlesShowcase(canvas);
  demo.start();
});
