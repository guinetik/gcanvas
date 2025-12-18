/**
 * Lava Lamp - Generative Art Demo
 *
 * Fullscreen metaball lava lamp with realistic heat physics.
 */

import { Game, ImageGo, Painter } from "/gcanvas.es.min.js";

// Configuration constants
const CONFIG = {
  // Rendering
  scaleFactor: 3,
  blendMode: "screen",

  // Physics
  gravity: 0.000052,
  buoyancyStrength: 0.00018,
  maxSpeed: 0.00088,
  dampingX: 0.995,
  dampingY: 0.998,

  // Temperature
  tempRate: 0.0055,
  heatZoneY: 0.92,
  coolZoneY: 0.2,
  heatZoneMultiplier: 1.5,
  coolZoneMultiplier: 1.5,
  middleZoneMultiplier: 0.05,
  heatTransferRate: 0.0022,
  heatTransferRange: 1.5,

  // Spawning
  initialSpawnMin: 1,
  initialSpawnRange: 1.5,
  spawnMin: 1.5,
  spawnRange: 2,
  spawnOffsetY: 0.01,
  spawnOffsetYRange: 0.01,
  spawnOffsetX: 0.02,
  initialRadius: 0.005,
  targetRadiusMin: 0.04,
  targetRadiusRange: 0.025,
  growthRate: 0.0165,
  growthThreshold: 0.7,
  initialRiseVelocity: -0.00022,
  maxBlobs: 10,
  poolClearThreshold: 0.75,

  // Drift
  driftSpeedMin: 0.165,
  driftSpeedRange: 0.165,
  driftAmountMin: 0.0000055,
  driftAmountRange: 0.0000044,
  wobbleForce: 0.000011,
  wobbleZoneTop: 0.2,
  wobbleZoneBottom: 0.7,

  // Boundaries
  boundaryLeft: 0.1,
  boundaryRight: 0.9,
  boundaryTop: -0.1,
  boundaryBounce: -0.3,
  removalY: 1.15,

  // Deformation
  stretchBase: 0.75,
  stretchTempFactor: 0.5,
  wobble1Speed: 1.32,
  wobble1Amount: 0.12,
  wobble2Speed: 0.88,
  wobble2PhaseFactor: 1.7,
  wobble2Amount: 0.08,

  // Rendering
  metaballThreshold: 1.0,
  edgeWidth: 0.15,
  poolGlowStart: 0.7,
  poolGlowBoost: 0.4,
  brightnessBase: 0.35,
  brightnessTempFactor: 1.0,
  glowMax: 0.2,
  glowFactor: 0.1,
  glowR: 50,
  glowG: 35,
  glowB: 25,
};

class LavaLampDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000";
    this.enableFluidSize();
  }

  init() {
    super.init();

    // Render resolution - proportional to screen, divided for performance
    this.renderWidth = Math.floor(this.width / CONFIG.scaleFactor);
    this.renderHeight = Math.floor(this.height / CONFIG.scaleFactor);

    // Create ImageData for rendering
    this.imageData = Painter.img.createImageData(
      this.renderWidth,
      this.renderHeight,
    );

    // Create ImageGo to display
    this.lavaImage = new ImageGo(this, this.imageData, {
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
      anchor: "top-left",
    });
    this.pipeline.add(this.lavaImage);

    // Generate random color palette
    const hue1 = Math.random();
    const hue2 = (hue1 + 0.1 + Math.random() * 0.15) % 1.0;

    this.colors = {
      blob1: this.hslToRgb(hue1, 0.9, 0.55),
      blob2: this.hslToRgb(hue2, 0.85, 0.5),
      bgTop: this.hslToRgb(hue1, 0.4, 0.05),
      bgBottom: this.hslToRgb(hue2, 0.5, 0.12),
    };

    // Pool blobs - wider pool at very bottom (partially off-screen)
    this.poolBlobs = [
      { x: 0.2, y: 1.02, r: 0.06 },
      { x: 0.35, y: 1.0, r: 0.065 },
      { x: 0.5, y: 1.02, r: 0.07 },
      { x: 0.65, y: 1.0, r: 0.065 },
      { x: 0.8, y: 1.02, r: 0.06 },
    ];

    // Rising/falling blobs - these move around
    this.blobs = [];

    // Start with a few blobs at different stages
    this.blobs.push({
      x: 0.45,
      y: 0.5,
      vx: 0,
      vy: -0.0003,
      r: 0.055,
      targetR: 0.055,
      temp: 0.75,
    });
    this.blobs.push({
      x: 0.55,
      y: 0.25,
      vx: 0,
      vy: -0.0002,
      r: 0.05,
      targetR: 0.05,
      temp: 0.5, // Cooling, about to turn around
    });
    this.blobs.push({
      x: 0.5,
      y: 0.4,
      vx: 0,
      vy: 0.00025,
      r: 0.045,
      targetR: 0.045,
      temp: 0.3, // Cold, sinking
    });

    // Metaball threshold
    this.threshold = CONFIG.metaballThreshold;
    this.time = 0;
    this.lastSpawnTime = 0;
    this.spawnInterval =
      CONFIG.initialSpawnMin + Math.random() * CONFIG.initialSpawnRange;

    // Re-shuffle colors on click/touch
    this.canvas.addEventListener("click", () => this.shuffleColors());
    this.canvas.addEventListener("touchstart", () => this.shuffleColors());
  }

  shuffleColors() {
    const hue1 = Math.random();
    const hue2 = (hue1 + 0.1 + Math.random() * 0.15) % 1.0;

    this.colors = {
      blob1: this.hslToRgb(hue1, 0.9, 0.55),
      blob2: this.hslToRgb(hue2, 0.85, 0.5),
      bgTop: this.hslToRgb(hue1, 0.4, 0.05),
      bgBottom: this.hslToRgb(hue2, 0.5, 0.12),
    };
  }

  hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
    const m = l - c / 2;
    let r, g, b;

    if (h < 1 / 6) [r, g, b] = [c, x, 0];
    else if (h < 2 / 6) [r, g, b] = [x, c, 0];
    else if (h < 3 / 6) [r, g, b] = [0, c, x];
    else if (h < 4 / 6) [r, g, b] = [0, x, c];
    else if (h < 5 / 6) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    return [
      Math.floor((r + m) * 255),
      Math.floor((g + m) * 255),
      Math.floor((b + m) * 255),
    ];
  }

  update(dt) {
    super.update(dt);
    this.time += dt;

    // Spawn new blobs from pool periodically
    // But only if no blobs are near the pool (to avoid immediate merging)
    if (this.time - this.lastSpawnTime > this.spawnInterval) {
      const poolClear = !this.blobs.some(
        (b) => b.y > CONFIG.poolClearThreshold && !b.growing,
      );
      if (poolClear) {
        this.spawnBlob();
        this.lastSpawnTime = this.time;
        this.spawnInterval =
          CONFIG.spawnMin + Math.random() * CONFIG.spawnRange;
      }
    }

    this.updateBlobs(dt);
    this.renderLava();

    // Update display
    this.lavaImage.shape.bitmap = this.imageData;
    this.lavaImage.x = 0;
    this.lavaImage.y = 0;
    this.lavaImage.width = this.width;
    this.lavaImage.height = this.height;
  }

  render() {
    // Clear with background
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw lava with blend mode
    this.ctx.globalCompositeOperation = CONFIG.blendMode;
    this.pipeline.render();
    this.ctx.globalCompositeOperation = "source-over";
  }

  spawnBlob() {
    // Release a blob from the pool - start deep inside the pool
    const poolBlob =
      this.poolBlobs[Math.floor(Math.random() * this.poolBlobs.length)];
    this.blobs.push({
      x: poolBlob.x + (Math.random() - 0.5) * CONFIG.spawnOffsetX,
      y:
        poolBlob.y +
        CONFIG.spawnOffsetY +
        Math.random() * CONFIG.spawnOffsetYRange,
      vx: 0,
      vy: 0,
      r: CONFIG.initialRadius,
      targetR:
        CONFIG.targetRadiusMin + Math.random() * CONFIG.targetRadiusRange,
      temp: 1.0,
      growing: true,
    });

    // Limit max blobs
    if (this.blobs.length > CONFIG.maxBlobs) {
      this.blobs.shift();
    }
  }

  updateBlobs(dt) {
    for (const blob of this.blobs) {
      // Temperature changes based on position
      const targetTemp = blob.y;

      // Slowly adjust temperature toward target
      if (blob.y > CONFIG.heatZoneY) {
        blob.temp +=
          (1.0 - blob.temp) * CONFIG.tempRate * CONFIG.heatZoneMultiplier;
      } else if (blob.y < CONFIG.coolZoneY) {
        blob.temp +=
          (0.0 - blob.temp) * CONFIG.tempRate * CONFIG.coolZoneMultiplier;
      } else {
        blob.temp +=
          (targetTemp - blob.temp) *
          CONFIG.tempRate *
          CONFIG.middleZoneMultiplier;
      }
      blob.temp = Math.max(0, Math.min(1, blob.temp));

      // Buoyancy based on temperature
      const buoyancy = (blob.temp - 0.5) * CONFIG.buoyancyStrength;
      blob.vy -= buoyancy;

      // Gravity pulls everything down - heavier blobs sink faster
      const weight = blob.r / CONFIG.targetRadiusMin; // Larger blobs = more weight
      blob.vy += CONFIG.gravity * weight;

      // Gradually grow to target size (smooth spawn)
      if (blob.targetR && blob.r < blob.targetR) {
        blob.r += (blob.targetR - blob.r) * CONFIG.growthRate;
        if (blob.growing && blob.r > blob.targetR * CONFIG.growthThreshold) {
          blob.growing = false;
          blob.vy = CONFIG.initialRiseVelocity;
        }
      }

      // Heat transfer between nearby blobs
      for (const other of this.blobs) {
        if (other === blob) continue;
        const dx = other.x - blob.x;
        const dy = other.y - blob.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const touchDist = blob.r + other.r;

        if (dist < touchDist * CONFIG.heatTransferRange) {
          const heatDiff = other.temp - blob.temp;
          const transfer = heatDiff * CONFIG.heatTransferRate;
          blob.temp += transfer;
        }
      }

      // Damping
      blob.vx *= CONFIG.dampingX;
      blob.vy *= CONFIG.dampingY;

      // Organic horizontal drift using sine waves (unique per blob)
      if (!blob.driftPhase) blob.driftPhase = Math.random() * Math.PI * 2;
      if (!blob.driftSpeed)
        blob.driftSpeed =
          CONFIG.driftSpeedMin + Math.random() * CONFIG.driftSpeedRange;
      if (!blob.driftAmount)
        blob.driftAmount =
          CONFIG.driftAmountMin + Math.random() * CONFIG.driftAmountRange;

      const drift =
        Math.sin(this.time * blob.driftSpeed + blob.driftPhase) *
        blob.driftAmount;
      blob.vx += drift;

      // Subtle extra wobble when near top or bottom
      if (blob.y < CONFIG.wobbleZoneTop || blob.y > CONFIG.wobbleZoneBottom) {
        blob.vx += (Math.random() - 0.5) * CONFIG.wobbleForce;
      }

      // Apply velocity
      blob.x += blob.vx;
      blob.y += blob.vy;

      // Soft boundaries
      if (blob.x < CONFIG.boundaryLeft) {
        blob.x = CONFIG.boundaryLeft;
        blob.vx *= CONFIG.boundaryBounce;
      }
      if (blob.x > CONFIG.boundaryRight) {
        blob.x = CONFIG.boundaryRight;
        blob.vx *= CONFIG.boundaryBounce;
      }
      if (blob.y < CONFIG.boundaryTop) {
        blob.y = CONFIG.boundaryTop;
        blob.vy *= CONFIG.boundaryBounce;
        blob.temp = 0;
      }
      if (blob.y > CONFIG.removalY && blob.vy > 0 && !blob.growing) {
        blob.removeMe = true;
      }

      // Speed limit
      const speed = Math.sqrt(blob.vx * blob.vx + blob.vy * blob.vy);
      if (speed > CONFIG.maxSpeed) {
        blob.vx = (blob.vx / speed) * CONFIG.maxSpeed;
        blob.vy = (blob.vy / speed) * CONFIG.maxSpeed;
      }
    }

    // Remove blobs that merged back into the pool
    this.blobs = this.blobs.filter((b) => !b.removeMe);
  }

  renderLava() {
    const data = this.imageData.data;
    const w = this.renderWidth;
    const h = this.renderHeight;

    for (let py = 0; py < h; py++) {
      const ny = py / h;

      // Background gradient with extra glow near pool at bottom
      const poolGlow =
        ny > CONFIG.poolGlowStart
          ? (ny - CONFIG.poolGlowStart) / (1 - CONFIG.poolGlowStart)
          : 0;
      const glowBoost = poolGlow * poolGlow * CONFIG.poolGlowBoost;

      const bgR =
        this.colors.bgTop[0] +
        (this.colors.bgBottom[0] - this.colors.bgTop[0]) * ny +
        this.colors.blob1[0] * glowBoost;
      const bgG =
        this.colors.bgTop[1] +
        (this.colors.bgBottom[1] - this.colors.bgTop[1]) * ny +
        this.colors.blob1[1] * glowBoost * 0.6;
      const bgB =
        this.colors.bgTop[2] +
        (this.colors.bgBottom[2] - this.colors.bgTop[2]) * ny +
        this.colors.blob1[2] * glowBoost * 0.3;

      for (let px = 0; px < w; px++) {
        const nx = px / w;
        const idx = (py * w + px) * 4;

        // Calculate metaball field from pool + moving blobs
        let sum = 0;
        let avgTemp = 0;

        // Pool blobs (always hot, temp = 1)
        for (const blob of this.poolBlobs) {
          const dx = blob.x - nx;
          const dy = blob.y - ny;
          const distSq = dx * dx + dy * dy;
          const influence = (blob.r * blob.r) / (distSq + 0.0001);
          sum += influence;
          avgTemp += influence * 1.0; // Pool is always hot
        }

        // Moving blobs - with temperature and time-based deformation
        for (const blob of this.blobs) {
          const dx = blob.x - nx;
          const dy = blob.y - ny;

          // Organic wobble - each blob pulses uniquely over time
          const phase = blob.driftPhase || 0;
          const wobble1 =
            Math.sin(this.time * CONFIG.wobble1Speed + phase) *
            CONFIG.wobble1Amount;
          const wobble2 =
            Math.sin(
              this.time * CONFIG.wobble2Speed +
                phase * CONFIG.wobble2PhaseFactor,
            ) * CONFIG.wobble2Amount;

          // Hot blobs stretch vertically, cold blobs squish horizontally
          const stretch =
            CONFIG.stretchBase + blob.temp * CONFIG.stretchTempFactor + wobble1;
          const skew = 1.0 + wobble2;

          const distSq = dx * dx * stretch * skew + (dy * dy) / stretch;
          const influence = (blob.r * blob.r) / (distSq + 0.0001);
          sum += influence;
          avgTemp += influence * blob.temp;
        }
        if (sum > 0) avgTemp /= sum;

        // Blob color based on y position (bottom = hot/bright, top = cool/dim)
        const t = ny; // ny=1 at bottom (hot), ny=0 at top (cool)
        const brightness =
          CONFIG.brightnessBase + t * CONFIG.brightnessTempFactor;
        const blobR =
          (this.colors.blob1[0] * (1 - t) + this.colors.blob2[0] * t) *
          brightness;
        const blobG =
          (this.colors.blob1[1] * (1 - t) + this.colors.blob2[1] * t) *
          brightness;
        const blobB =
          (this.colors.blob1[2] * (1 - t) + this.colors.blob2[2] * t) *
          brightness;

        // Anti-aliasing: smooth blend at edges
        const innerThreshold = this.threshold;
        const outerThreshold = this.threshold - CONFIG.edgeWidth;

        if (sum >= innerThreshold) {
          // Fully inside blob
          const glow = Math.min(
            (sum - innerThreshold) * CONFIG.glowFactor,
            CONFIG.glowMax,
          );
          data[idx] = Math.min(255, blobR + glow * CONFIG.glowR);
          data[idx + 1] = Math.min(255, blobG + glow * CONFIG.glowG);
          data[idx + 2] = Math.min(255, blobB + glow * CONFIG.glowB);
        } else if (sum >= outerThreshold) {
          // Edge zone - blend between blob and background
          const blend = (sum - outerThreshold) / CONFIG.edgeWidth;
          const smoothBlend = blend * blend * (3 - 2 * blend);
          data[idx] = bgR + (blobR - bgR) * smoothBlend;
          data[idx + 1] = bgG + (blobG - bgG) * smoothBlend;
          data[idx + 2] = bgB + (blobB - bgB) * smoothBlend;
        } else {
          // Background
          data[idx] = bgR;
          data[idx + 1] = bgG;
          data[idx + 2] = bgB;
        }
        data[idx + 3] = 255;
      }
    }
  }
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new LavaLampDemo(canvas);
  demo.start();
});
