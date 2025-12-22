/**
 * Lava Lamp - Generative Art Demo
 *
 * Fullscreen metaball lava lamp with realistic heat physics.
 */

import { Game, ImageGo, Painter, ToggleButton, applyAnchor, Position } from "../../src/index.js";
import {
  zoneTemperature,
  thermalBuoyancy,
  thermalGravity,
  heatTransfer,
} from "../../src/math/heat.js";

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

      // Heat transfer between nearby blobs
      for (const other of this.blobs) {
        if (other === blob) continue;
        const dx = other.x - blob.x;
        const dy = other.y - blob.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = (blob.r + other.r) * CONFIG.heatTransferRange;

        blob.temp += heatTransfer(blob.temp, other.temp, dist, maxDist, CONFIG.heatTransferRate);
      }
      blob.temp = Math.max(0, Math.min(1, blob.temp));

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

    // Desaturation factor when lamp is off (colors become duller)
    const saturation = 0.4 + this.heatLevel * 0.6;
    // Darkness multiplier - scene gets much darker when off
    const darkness = 0.15 + this.heatLevel * 0.85;

    for (let py = 0; py < h; py++) {
      const ny = py / h;

      // Background gradient with extra glow near pool at bottom
      // Glow fades when lamp is off
      const poolGlow =
        ny > CONFIG.poolGlowStart
          ? (ny - CONFIG.poolGlowStart) / (1 - CONFIG.poolGlowStart)
          : 0;
      const glowBoost = poolGlow * poolGlow * CONFIG.poolGlowBoost * this.heatLevel;

      // Background darkens when lamp is off
      const bgR = (
        this.colors.bgTop[0] +
        (this.colors.bgBottom[0] - this.colors.bgTop[0]) * ny +
        this.colors.blob1[0] * glowBoost
      ) * darkness;
      const bgG = (
        this.colors.bgTop[1] +
        (this.colors.bgBottom[1] - this.colors.bgTop[1]) * ny +
        this.colors.blob1[1] * glowBoost * 0.6
      ) * darkness;
      const bgB = (
        this.colors.bgTop[2] +
        (this.colors.bgBottom[2] - this.colors.bgTop[2]) * ny +
        this.colors.blob1[2] * glowBoost * 0.3
      ) * darkness;

      for (let px = 0; px < w; px++) {
        const nx = px / w;
        const idx = (py * w + px) * 4;

        // Calculate metaball field from pool + moving blobs
        let sum = 0;
        let avgTemp = 0;

        // Pool blobs (temperature based on lamp state)
        for (const blob of this.poolBlobs) {
          const dx = blob.x - nx;
          const dy = blob.y - ny;
          const distSq = dx * dx + dy * dy;
          const influence = (blob.r * blob.r) / (distSq + 0.0001);
          sum += influence;
          avgTemp += influence * this.poolTemp;  // Pool cools when lamp is off
        }

        // Moving blobs - with temperature and time-based deformation
        for (const blob of this.blobs) {
          const dx = blob.x - nx;
          const dy = blob.y - ny;

          // Organic wobble - each blob pulses uniquely over time
          // Hot blobs wobble more (fluid), cold blobs wobble less (solidifying)
          const phase = blob.driftPhase || 0;
          const tempWobble = 0.3 + blob.temp * 0.7;  // 30% wobble when cold, 100% when hot
          const wobble1 =
            Math.sin(this.time * CONFIG.wobble1Speed + phase) *
            CONFIG.wobble1Amount * tempWobble;
          const wobble2 =
            Math.sin(
              this.time * CONFIG.wobble2Speed +
                phase * CONFIG.wobble2PhaseFactor,
            ) * CONFIG.wobble2Amount * tempWobble;

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

        // Blob color based on y position and temperature
        // When lamp is off, colors shift cooler/duller and darker
        const t = ny; // ny=1 at bottom (hot), ny=0 at top (cool)
        const tempInfluence = avgTemp * this.heatLevel;  // Temperature affects brightness
        const brightness =
          (CONFIG.brightnessBase + t * CONFIG.brightnessTempFactor) *
          (0.5 + tempInfluence * 0.5) * darkness;  // Dimmer when cool and when off

        // Mix colors - shift toward blob1 (cooler) when lamp is off
        const colorMix = t * saturation;
        const blobR =
          (this.colors.blob1[0] * (1 - colorMix) + this.colors.blob2[0] * colorMix) *
          brightness;
        const blobG =
          (this.colors.blob1[1] * (1 - colorMix) + this.colors.blob2[1] * colorMix) *
          brightness;
        const blobB =
          (this.colors.blob1[2] * (1 - colorMix) + this.colors.blob2[2] * colorMix) *
          brightness;

        // Anti-aliasing: smooth blend at edges
        const innerThreshold = this.threshold;
        const outerThreshold = this.threshold - CONFIG.edgeWidth;

        if (sum >= innerThreshold) {
          // Fully inside blob - glow reduced when lamp is off
          const glow = Math.min(
            (sum - innerThreshold) * CONFIG.glowFactor * this.heatLevel,
            CONFIG.glowMax * this.heatLevel,
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
