/**
 * Lava Lamp - Generative Art Demo
 *
 * Fullscreen metaball lava lamp with realistic heat physics.
 */

import { Game, ImageGo, Painter, ToggleButton, applyAnchor, Position } from "/gcanvas.es.min.js";
import {
  zoneTemperature,
  thermalBuoyancy,
  thermalGravity,
  heatTransfer,
} from "/gcanvas.es.min.js";

// Configuration constants
const CONFIG = {
  // Rendering
  scaleFactor: 2,
  blendMode: "screen",

  // Physics
  gravity: 0.000052,
  buoyancyStrength: 0.00018,
  maxSpeed: 0.00088,
  dampingX: 0.995,
  dampingY: 0.998,

  // Temperature
  tempRate: 0.008,            // base rate for temperature changes
  heatZoneY: 0.85,            // heat zone at bottom
  coolZoneY: 0.15,            // cool zone at top
  heatZoneMultiplier: 2.0,    // fast heating at bottom
  coolZoneMultiplier: 0.8,    // gentle cooling - blobs linger at top
  middleZoneMultiplier: 0.03, // slow transition in middle
  transitionWidth: 0.25,      // wide smooth transition between zones
  heatTransferRate: 0.005,    // faster blob-to-blob transfer (was 0.0022)
  heatTransferRange: 1.8,     // slightly larger transfer range

  // Spawning
  initialSpawnMin: 2,
  initialSpawnRange: 2,
  spawnMin: 3,
  spawnRange: 3,
  spawnOffsetY: 0.01,
  spawnOffsetYRange: 0.01,
  spawnOffsetX: 0.02,
  initialRadius: 0.005,
  targetRadiusMin: 0.04,
  targetRadiusRange: 0.025,
  growthRate: 0.0165,
  growthThreshold: 0.7,
  initialRiseVelocity: -0.00022,
  maxBlobs: 5,
  poolClearThreshold: 0.75,

  // Drift & Chaos
  driftSpeedMin: 0.165,
  driftSpeedRange: 0.165,
  driftAmountMin: 0.0000055,
  driftAmountRange: 0.0000044,
  wobbleForce: 0.000011,
  wobbleZoneTop: 0.2,
  wobbleZoneBottom: 0.7,
  // Repulsion to prevent clustering
  repulsionStrength: 0.00004,   // How hard blobs push each other apart
  repulsionRange: 2.5,          // Multiplier of combined radii for repulsion
  chaosStrength: 0.000008,      // Random perturbation strength
  chaosTempFactor: 1.5,         // Hot blobs are more chaotic

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

  // Lamp on/off
  heatTransitionSpeed: 0.4,   // How fast heat level changes
  coolDownRate: 0.015,        // How fast blobs cool when lamp is off
  poolCoolRate: 0.008,        // How fast the pool cools
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

    // Start with one blob rising
    this.blobs.push({
      x: 0.5,
      y: 0.6,
      vx: 0,
      vy: -0.0002,
      r: 0.05,
      targetR: 0.05,
      temp: 0.8,
    });

    // Metaball threshold
    this.threshold = CONFIG.metaballThreshold;
    this.time = 0;
    this.lastSpawnTime = 0;
    this.spawnInterval =
      CONFIG.initialSpawnMin + Math.random() * CONFIG.initialSpawnRange;

    // Lamp on/off state
    this.lampOn = true;
    this.heatLevel = 1.0;  // Smooth transition 0-1
    this.poolTemp = 1.0;   // Pool temperature (cools when off)

    // Create on/off toggle button
    const btnWidth = 60;
    const btnHeight = 36;
    this.powerButton = new ToggleButton(this, {
      text: "ON",
      width: btnWidth,
      height: btnHeight,
      startToggled: true,
      colorDefaultBg: "#000",
      colorStroke: "#444",
      colorText: "#888",
      colorActiveBg: "#331100",
      colorActiveStroke: "#ff6600",
      colorActiveText: "#ff8833",
      onToggle: (isOn) => {
        this.lampOn = isOn;
        this.powerButton.label.text = isOn ? "ON" : "OFF";
      },
    });
    applyAnchor(this.powerButton, {
      anchor: Position.CENTER_LEFT,
      anchorOffsetX: 20,
    });
    this.pipeline.add(this.powerButton);
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

    // Smooth heat level transition
    const targetHeat = this.lampOn ? 1.0 : 0.0;
    this.heatLevel += (targetHeat - this.heatLevel) * CONFIG.heatTransitionSpeed * dt * 60;
    this.heatLevel = Math.max(0, Math.min(1, this.heatLevel));

    // Pool temperature follows heat level (slower transition)
    if (this.lampOn) {
      this.poolTemp += (1.0 - this.poolTemp) * CONFIG.poolCoolRate * 2 * dt * 60;
    } else {
      this.poolTemp += (0.0 - this.poolTemp) * CONFIG.poolCoolRate * dt * 60;
    }
    this.poolTemp = Math.max(0, Math.min(1, this.poolTemp));

    // Spawn new blobs from pool periodically (only when lamp is on and pool is hot)
    // But only if no blobs are near the pool (to avoid immediate merging)
    if (this.lampOn && this.poolTemp > 0.7 && this.time - this.lastSpawnTime > this.spawnInterval) {
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
    // Thermal zone configuration - modified by lamp state
    const thermalConfig = {
      heatZone: CONFIG.heatZoneY,
      coolZone: CONFIG.coolZoneY,
      rate: CONFIG.tempRate,
      transitionWidth: CONFIG.transitionWidth,  // smooth zone boundaries
      // When lamp is off, heat zone becomes weak/disabled, cool zone stronger
      heatMultiplier: CONFIG.heatZoneMultiplier * this.heatLevel,
      coolMultiplier: CONFIG.coolZoneMultiplier + (1 - this.heatLevel) * 2,
      middleMultiplier: CONFIG.middleZoneMultiplier + (1 - this.heatLevel) * 0.3,
    };

    for (const blob of this.blobs) {
      // Temperature changes based on position (smooth zone transitions)
      blob.temp = zoneTemperature(blob.y, blob.temp, thermalConfig);

      // When lamp is off, all blobs cool down faster
      if (!this.lampOn) {
        blob.temp -= CONFIG.coolDownRate * dt * 60;
        blob.temp = Math.max(0, blob.temp);
      }

      // Buoyancy based on temperature
      blob.vy -= thermalBuoyancy(blob.temp, 0.5, CONFIG.buoyancyStrength);

      // Gravity pulls everything down - heavier blobs sink faster
      blob.vy += thermalGravity(blob.r, CONFIG.targetRadiusMin, CONFIG.gravity);

      // Gradually grow to target size (smooth spawn)
      if (blob.targetR && blob.r < blob.targetR) {
        blob.r += (blob.targetR - blob.r) * CONFIG.growthRate;
        if (blob.growing && blob.r > blob.targetR * CONFIG.growthThreshold) {
          blob.growing = false;
          blob.vy = CONFIG.initialRiseVelocity;
        }
      }

      // Heat transfer and repulsion between nearby blobs
      for (const other of this.blobs) {
        if (other === blob) continue;
        const dx = other.x - blob.x;
        const dy = other.y - blob.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const combinedR = blob.r + other.r;
        const maxDist = combinedR * CONFIG.heatTransferRange;

        // Heat transfer
        blob.temp += heatTransfer(blob.temp, other.temp, dist, maxDist, CONFIG.heatTransferRate);

        // Repulsion force - push blobs apart horizontally to prevent clustering
        const repulsionDist = combinedR * CONFIG.repulsionRange;
        if (dist < repulsionDist && dist > 0.001) {
          // Stronger repulsion when closer, falls off with distance
          const repulsionFactor = 1 - (dist / repulsionDist);
          const repulsion = repulsionFactor * repulsionFactor * CONFIG.repulsionStrength;
          // Normalize direction and apply (mostly horizontal to spread out)
          const invDist = 1 / dist;
          blob.vx -= dx * invDist * repulsion * 1.5;  // Stronger horizontal
          blob.vy -= dy * invDist * repulsion * 0.3;  // Weaker vertical
        }
      }
      blob.temp = Math.max(0, Math.min(1, blob.temp));

      // Chaos - random perturbation, stronger when hot (more fluid)
      const chaosFactor = CONFIG.chaosStrength * (0.3 + blob.temp * CONFIG.chaosTempFactor);
      blob.vx += (Math.random() - 0.5) * chaosFactor;
      blob.vy += (Math.random() - 0.5) * chaosFactor * 0.5;

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
    const invW = 1 / w;
    const invH = 1 / h;

    // Desaturation factor when lamp is off (colors become duller)
    const saturation = 0.4 + this.heatLevel * 0.6;
    // Darkness multiplier - scene gets much darker when off
    const darkness = 0.15 + this.heatLevel * 0.85;

    // Pre-compute pool blob data (r² and weighted temp)
    const poolTemp = this.poolTemp;
    const poolData = this.poolBlobs.map(b => ({
      x: b.x,
      y: b.y,
      rSq: b.r * b.r,
    }));

    // Pre-compute moving blob data once per frame (not per pixel!)
    const blobData = this.blobs.map(blob => {
      const phase = blob.driftPhase || 0;
      const tempWobble = 0.3 + blob.temp * 0.7;
      const wobble1 = Math.sin(this.time * CONFIG.wobble1Speed + phase) *
        CONFIG.wobble1Amount * tempWobble;
      const wobble2 = Math.sin(this.time * CONFIG.wobble2Speed + phase * CONFIG.wobble2PhaseFactor) *
        CONFIG.wobble2Amount * tempWobble;
      const stretch = CONFIG.stretchBase + blob.temp * CONFIG.stretchTempFactor + wobble1;
      const skew = 1.0 + wobble2;
      return {
        x: blob.x,
        y: blob.y,
        rSq: blob.r * blob.r,
        temp: blob.temp,
        stretch,
        skew,
        invStretch: 1 / stretch,
        stretchSkew: stretch * skew,
      };
    });

    // Pre-compute color deltas and thresholds
    const bgDeltaR = this.colors.bgBottom[0] - this.colors.bgTop[0];
    const bgDeltaG = this.colors.bgBottom[1] - this.colors.bgTop[1];
    const bgDeltaB = this.colors.bgBottom[2] - this.colors.bgTop[2];
    const blob1 = this.colors.blob1;
    const blob2 = this.colors.blob2;
    const bgTop = this.colors.bgTop;
    const innerThreshold = this.threshold;
    const outerThreshold = innerThreshold - CONFIG.edgeWidth;
    const invEdgeWidth = 1 / CONFIG.edgeWidth;

    for (let py = 0; py < h; py++) {
      const ny = py * invH;

      // Background gradient with extra glow near pool at bottom
      const poolGlow = ny > CONFIG.poolGlowStart
        ? (ny - CONFIG.poolGlowStart) / (1 - CONFIG.poolGlowStart)
        : 0;
      const glowBoost = poolGlow * poolGlow * CONFIG.poolGlowBoost * this.heatLevel;

      // Background darkens when lamp is off
      const bgR = (bgTop[0] + bgDeltaR * ny + blob1[0] * glowBoost) * darkness;
      const bgG = (bgTop[1] + bgDeltaG * ny + blob1[1] * glowBoost * 0.6) * darkness;
      const bgB = (bgTop[2] + bgDeltaB * ny + blob1[2] * glowBoost * 0.3) * darkness;

      for (let px = 0; px < w; px++) {
        const nx = px * invW;
        const idx = (py * w + px) << 2;  // Bitshift instead of * 4

        // Calculate metaball field from pool + moving blobs
        let sum = 0;
        let avgTemp = 0;

        // Pool blobs
        for (let i = 0; i < poolData.length; i++) {
          const p = poolData[i];
          const dx = p.x - nx;
          const dy = p.y - ny;
          const distSq = dx * dx + dy * dy + 0.0001;
          const influence = p.rSq / distSq;
          sum += influence;
          avgTemp += influence * poolTemp;
        }

        // Moving blobs - using pre-computed stretch/skew
        for (let i = 0; i < blobData.length; i++) {
          const b = blobData[i];
          const dx = b.x - nx;
          const dy = b.y - ny;
          const distSq = dx * dx * b.stretchSkew + dy * dy * b.invStretch + 0.0001;
          const influence = b.rSq / distSq;
          sum += influence;
          avgTemp += influence * b.temp;
        }
        // Early exit for pure background pixels (biggest optimization)
        if (sum < outerThreshold) {
          data[idx] = bgR;
          data[idx + 1] = bgG;
          data[idx + 2] = bgB;
          data[idx + 3] = 255;
          continue;
        }

        if (sum > 0) avgTemp /= sum;

        // Blob color - only calculate when needed
        const t = ny;
        const tempInfluence = avgTemp * this.heatLevel;
        const brightness =
          (CONFIG.brightnessBase + t * CONFIG.brightnessTempFactor) *
          (0.5 + tempInfluence * 0.5) * darkness;

        const colorMix = t * saturation;
        const invColorMix = 1 - colorMix;
        const blobR = (blob1[0] * invColorMix + blob2[0] * colorMix) * brightness;
        const blobG = (blob1[1] * invColorMix + blob2[1] * colorMix) * brightness;
        const blobB = (blob1[2] * invColorMix + blob2[2] * colorMix) * brightness;

        if (sum >= innerThreshold) {
          // Fully inside blob
          const glow = Math.min(
            (sum - innerThreshold) * CONFIG.glowFactor * this.heatLevel,
            CONFIG.glowMax * this.heatLevel,
          );
          data[idx] = Math.min(255, blobR + glow * CONFIG.glowR);
          data[idx + 1] = Math.min(255, blobG + glow * CONFIG.glowG);
          data[idx + 2] = Math.min(255, blobB + glow * CONFIG.glowB);
        } else {
          // Edge zone - blend between blob and background
          const blend = (sum - outerThreshold) * invEdgeWidth;
          const smoothBlend = blend * blend * (3 - 2 * blend);
          data[idx] = bgR + (blobR - bgR) * smoothBlend;
          data[idx + 1] = bgG + (blobG - bgG) * smoothBlend;
          data[idx + 2] = bgB + (blobB - bgB) * smoothBlend;
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
