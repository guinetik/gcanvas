/**
 * Genuary 2026 - Day 6
 * Prompt: Lights on/off — Make something that changes when you switch on or off the “digital” lights
 *
 * DIGITAL LAVA LAMP
 * Port of the `demos/js/lavalamp.js` idea into the Genuary showcase.
 * Toggle “LIGHTS” to fade heat, glow, and motion in/out.
 */

import {
  Game,
  ImageGo,
  Painter,
  ToggleButton,
  applyAnchor,
  Position,
} from "../../../src/index.js";
import {
  zoneTemperature,
  thermalBuoyancy,
  thermalGravity,
  heatTransfer,
} from "../../../src/math/heat.js";

const CONFIG = {
  render: {
    scaleFactor: 2,
    blendMode: "screen",
  },

  ui: {
    buttonWidth: 96,
    buttonHeight: 34,
    buttonOffsetX: 16,
    buttonOffsetY: 16,
    onLabel: "LIGHTS:ON",
    offLabel: "LIGHTS:OFF",
  },

  // Physics (normalized units)
  physics: {
    gravity: 0.000052,
    buoyancyStrength: 0.00018,
    maxSpeed: 0.00088,
    dampingX: 0.995,
    dampingY: 0.998,

    // Drift & Chaos
    driftSpeedMin: 0.165,
    driftSpeedRange: 0.165,
    driftAmountMin: 0.0000055,
    driftAmountRange: 0.0000044,
    wobbleForce: 0.000011,
    wobbleZoneTop: 0.2,
    wobbleZoneBottom: 0.7,

    // Repulsion to prevent clustering
    repulsionStrength: 0.00004,
    repulsionRange: 2.5,
    chaosStrength: 0.000008,
    chaosTempFactor: 1.5,
  },

  temperature: {
    tempRate: 0.008,
    heatZoneY: 0.85,
    coolZoneY: 0.15,
    heatZoneMultiplier: 2.0,
    coolZoneMultiplier: 0.8,
    middleZoneMultiplier: 0.03,
    transitionWidth: 0.25,
    heatTransferRate: 0.005,
    heatTransferRange: 1.8,
  },

  spawning: {
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
  },

  boundaries: {
    left: 0.1,
    right: 0.9,
    top: -0.1,
    bounce: -0.3,
    removalY: 1.15,
  },

  deformation: {
    stretchBase: 0.75,
    stretchTempFactor: 0.5,
    wobble1Speed: 1.32,
    wobble1Amount: 0.12,
    wobble2Speed: 0.88,
    wobble2PhaseFactor: 1.7,
    wobble2Amount: 0.08,
  },

  metaballs: {
    threshold: 1.0,
    edgeWidth: 0.15,
    poolGlowStart: 0.7,
    poolGlowBoost: 0.4,
    brightnessBase: 0.35,
    brightnessTempFactor: 1.0,
    glowMax: 0.2,
    glowFactor: 0.1,
    glowR: 50,
    glowG: 90,
    glowB: 35,
  },

  lights: {
    heatTransitionSpeed: 0.4, // 0-1 smoothing speed
    coolDownRate: 0.015,
    poolCoolRate: 0.008,
  },

  // Genuary terminal palette (green-ish)
  palette: {
    hue1: 0.33, // green
    hue2: 0.39, // green/cyan
  },
};

/**
 * Clamp a value to [0, 1].
 * @param {number} v
 * @returns {number}
 */
function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

class Day06DigitalLightsDemo extends Game {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000";
  }

  init() {
    super.init();
    Painter.init(this.ctx);

    this.container = this.canvas.parentElement;
    if (this.container) {
      this.enableFluidSize(this.container);
    }

    this.time = 0;
    this.lastSpawnTime = 0;
    this.spawnInterval =
      CONFIG.spawning.initialSpawnMin +
      Math.random() * CONFIG.spawning.initialSpawnRange;

    // Lights state
    this.lampOn = true;
    this.heatLevel = 1.0; // Smooth transition 0-1
    this.poolTemp = 1.0; // Pool temperature

    // Render buffers (ImageData + ImageGo)
    this.handleResize();

    // Colors
    this.shuffleColors();

    // Pool blobs (mostly off-screen at bottom)
    this.poolBlobs = [
      { x: 0.2, y: 1.02, r: 0.06 },
      { x: 0.35, y: 1.0, r: 0.065 },
      { x: 0.5, y: 1.02, r: 0.07 },
      { x: 0.65, y: 1.0, r: 0.065 },
      { x: 0.8, y: 1.02, r: 0.06 },
    ];

    // Moving blobs
    this.blobs = [
      {
        x: 0.5,
        y: 0.6,
        vx: 0,
        vy: -0.0002,
        r: 0.05,
        targetR: 0.05,
        temp: 0.8,
      },
    ];

    // Lights toggle button
    this.powerButton = new ToggleButton(this, {
      text: CONFIG.ui.onLabel,
      width: CONFIG.ui.buttonWidth,
      height: CONFIG.ui.buttonHeight,
      startToggled: true,
      colorDefaultBg: "#000",
      colorStroke: "#1a1a1a",
      colorText: "#aaffaa",
      colorActiveBg: "rgba(0, 255, 0, 0.05)",
      colorActiveStroke: "#0f0",
      colorActiveText: "#0f0",
      onToggle: (isOn) => {
        this.lampOn = isOn;
        this.powerButton.label.text = isOn
          ? CONFIG.ui.onLabel
          : CONFIG.ui.offLabel;
      },
    });

    applyAnchor(this.powerButton, {
      anchor: Position.TOP_LEFT,
      anchorOffsetX: CONFIG.ui.buttonOffsetX,
      anchorOffsetY: CONFIG.ui.buttonOffsetY,
    });

    this.pipeline.add(this.lavaImage);
    this.pipeline.add(this.powerButton);
  }

  /**
   * Recreate internal render buffer to match the current canvas size.
   */
  handleResize() {
    this._lastCanvasW = this.width;
    this._lastCanvasH = this.height;

    this.renderWidth = Math.max(
      1,
      Math.floor(this.width / CONFIG.render.scaleFactor),
    );
    this.renderHeight = Math.max(
      1,
      Math.floor(this.height / CONFIG.render.scaleFactor),
    );

    this.imageData = Painter.img.createImageData(
      this.renderWidth,
      this.renderHeight,
    );

    if (!this.lavaImage) {
      this.lavaImage = new ImageGo(this, this.imageData, {
        x: 0,
        y: 0,
        width: this.width,
        height: this.height,
        anchor: "top-left",
      });
    } else {
      this.lavaImage.shape.bitmap = this.imageData;
      this.lavaImage.width = this.width;
      this.lavaImage.height = this.height;
    }
  }

  shuffleColors() {
    // Stable “terminal green” palette with slight variation
    const hue1 = CONFIG.palette.hue1;
    const hue2 = CONFIG.palette.hue2;

    this.colors = {
      blob1: this.hslToRgb(hue1, 0.95, 0.55),
      blob2: this.hslToRgb(hue2, 0.9, 0.5),
      bgTop: this.hslToRgb(hue1, 0.5, 0.04),
      bgBottom: this.hslToRgb(hue2, 0.55, 0.08),
    };
  }

  /**
   * Convert HSL (0..1) to RGB array (0..255 ints).
   * @param {number} h
   * @param {number} s
   * @param {number} l
   * @returns {[number, number, number]}
   */
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

    // Handle container resize (ResizeObserver updates canvas size asynchronously)
    if (this.width !== this._lastCanvasW || this.height !== this._lastCanvasH) {
      this.handleResize();
    }

    // Smooth heat level transition (0..1)
    const targetHeat = this.lampOn ? 1.0 : 0.0;
    this.heatLevel +=
      (targetHeat - this.heatLevel) *
      CONFIG.lights.heatTransitionSpeed *
      dt *
      60;
    this.heatLevel = clamp01(this.heatLevel);

    // Pool temperature follows heat level (slower transition)
    if (this.lampOn) {
      this.poolTemp +=
        (1.0 - this.poolTemp) * CONFIG.lights.poolCoolRate * 2 * dt * 60;
    } else {
      this.poolTemp +=
        (0.0 - this.poolTemp) * CONFIG.lights.poolCoolRate * dt * 60;
    }
    this.poolTemp = clamp01(this.poolTemp);

    // Spawn new blobs from pool periodically (only when lamp is on and pool is hot)
    if (
      this.lampOn &&
      this.poolTemp > 0.7 &&
      this.time - this.lastSpawnTime > this.spawnInterval
    ) {
      const poolClear = !this.blobs.some(
        (b) => b.y > CONFIG.spawning.poolClearThreshold && !b.growing,
      );
      if (poolClear) {
        this.spawnBlob();
        this.lastSpawnTime = this.time;
        this.spawnInterval =
          CONFIG.spawning.spawnMin + Math.random() * CONFIG.spawning.spawnRange;
      }
    }

    this.updateBlobs(dt);
    this.renderLava();
    
    // IMPORTANT: ImageShape caches ImageData into an internal buffer canvas.
    // Mutating `this.imageData.data` does NOT automatically refresh the buffer,
    // so we must re-assign the bitmap to trigger `putImageData()` each frame.
    this.lavaImage.shape.bitmap = this.imageData;

    // Ensure ImageGo is sized to the canvas display
    this.lavaImage.x = 0;
    this.lavaImage.y = 0;
    this.lavaImage.width = this.width;
    this.lavaImage.height = this.height;
  }

  render() {
    // Background
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Additive glow
    this.ctx.globalCompositeOperation = CONFIG.render.blendMode;
    this.pipeline.render();
    this.ctx.globalCompositeOperation = "source-over";
  }

  spawnBlob() {
    const poolBlob =
      this.poolBlobs[Math.floor(Math.random() * this.poolBlobs.length)];

    this.blobs.push({
      x: poolBlob.x + (Math.random() - 0.5) * CONFIG.spawning.spawnOffsetX,
      y:
        poolBlob.y +
        CONFIG.spawning.spawnOffsetY +
        Math.random() * CONFIG.spawning.spawnOffsetYRange,
      vx: 0,
      vy: 0,
      r: CONFIG.spawning.initialRadius,
      targetR:
        CONFIG.spawning.targetRadiusMin +
        Math.random() * CONFIG.spawning.targetRadiusRange,
      temp: 1.0,
      growing: true,
    });

    if (this.blobs.length > CONFIG.spawning.maxBlobs) {
      this.blobs.shift();
    }
  }

  updateBlobs(dt) {
    const thermalConfig = {
      heatZone: CONFIG.temperature.heatZoneY,
      coolZone: CONFIG.temperature.coolZoneY,
      rate: CONFIG.temperature.tempRate,
      transitionWidth: CONFIG.temperature.transitionWidth,
      heatMultiplier: CONFIG.temperature.heatZoneMultiplier * this.heatLevel,
      coolMultiplier:
        CONFIG.temperature.coolZoneMultiplier + (1 - this.heatLevel) * 2,
      middleMultiplier:
        CONFIG.temperature.middleZoneMultiplier + (1 - this.heatLevel) * 0.3,
    };

    for (const blob of this.blobs) {
      // Temperature changes based on position (smooth zone transitions)
      blob.temp = zoneTemperature(blob.y, blob.temp, thermalConfig);

      // When lamp is off, all blobs cool down faster
      if (!this.lampOn) {
        blob.temp -= CONFIG.lights.coolDownRate * dt * 60;
        blob.temp = Math.max(0, blob.temp);
      }

      // Buoyancy based on temperature (hot rises)
      blob.vy -= thermalBuoyancy(blob.temp, 0.5, CONFIG.physics.buoyancyStrength);

      // Gravity pulls everything down - larger blobs sink faster
      blob.vy += thermalGravity(blob.r, CONFIG.spawning.targetRadiusMin, CONFIG.physics.gravity);

      // Gradually grow to target size (smooth spawn)
      if (blob.targetR && blob.r < blob.targetR) {
        blob.r += (blob.targetR - blob.r) * CONFIG.spawning.growthRate;
        if (
          blob.growing &&
          blob.r > blob.targetR * CONFIG.spawning.growthThreshold
        ) {
          blob.growing = false;
          blob.vy = CONFIG.spawning.initialRiseVelocity;
        }
      }

      // Heat transfer and repulsion between nearby blobs
      for (const other of this.blobs) {
        if (other === blob) continue;
        const dx = other.x - blob.x;
        const dy = other.y - blob.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const combinedR = blob.r + other.r;
        const maxDist = combinedR * CONFIG.temperature.heatTransferRange;

        // Heat transfer
        blob.temp += heatTransfer(
          blob.temp,
          other.temp,
          dist,
          maxDist,
          CONFIG.temperature.heatTransferRate,
        );

        // Repulsion force - push blobs apart
        const repulsionDist = combinedR * CONFIG.physics.repulsionRange;
        if (dist < repulsionDist && dist > 0.001) {
          const repulsionFactor = 1 - dist / repulsionDist;
          const repulsion =
            repulsionFactor *
            repulsionFactor *
            CONFIG.physics.repulsionStrength;
          const invDist = 1 / dist;
          blob.vx -= dx * invDist * repulsion * 1.5;
          blob.vy -= dy * invDist * repulsion * 0.3;
        }
      }
      blob.temp = clamp01(blob.temp);

      // Chaos - random perturbation, stronger when hot
      const chaosFactor =
        CONFIG.physics.chaosStrength * (0.3 + blob.temp * CONFIG.physics.chaosTempFactor);
      blob.vx += (Math.random() - 0.5) * chaosFactor;
      blob.vy += (Math.random() - 0.5) * chaosFactor * 0.5;

      // Damping
      blob.vx *= CONFIG.physics.dampingX;
      blob.vy *= CONFIG.physics.dampingY;

      // Organic horizontal drift using sine waves (unique per blob)
      if (!blob.driftPhase) blob.driftPhase = Math.random() * Math.PI * 2;
      if (!blob.driftSpeed)
        blob.driftSpeed =
          CONFIG.physics.driftSpeedMin + Math.random() * CONFIG.physics.driftSpeedRange;
      if (!blob.driftAmount)
        blob.driftAmount =
          CONFIG.physics.driftAmountMin + Math.random() * CONFIG.physics.driftAmountRange;

      const drift =
        Math.sin(this.time * blob.driftSpeed + blob.driftPhase) * blob.driftAmount;
      blob.vx += drift;

      // Subtle extra wobble when near top or bottom
      if (
        blob.y < CONFIG.physics.wobbleZoneTop ||
        blob.y > CONFIG.physics.wobbleZoneBottom
      ) {
        blob.vx += (Math.random() - 0.5) * CONFIG.physics.wobbleForce;
      }

      // Apply velocity
      blob.x += blob.vx;
      blob.y += blob.vy;

      // Soft boundaries
      if (blob.x < CONFIG.boundaries.left) {
        blob.x = CONFIG.boundaries.left;
        blob.vx *= CONFIG.boundaries.bounce;
      }
      if (blob.x > CONFIG.boundaries.right) {
        blob.x = CONFIG.boundaries.right;
        blob.vx *= CONFIG.boundaries.bounce;
      }
      if (blob.y < CONFIG.boundaries.top) {
        blob.y = CONFIG.boundaries.top;
        blob.vy *= CONFIG.boundaries.bounce;
        blob.temp = 0;
      }
      if (blob.y > CONFIG.boundaries.removalY && blob.vy > 0 && !blob.growing) {
        blob.removeMe = true;
      }

      // Speed limit
      const speed = Math.sqrt(blob.vx * blob.vx + blob.vy * blob.vy);
      if (speed > CONFIG.physics.maxSpeed) {
        blob.vx = (blob.vx / speed) * CONFIG.physics.maxSpeed;
        blob.vy = (blob.vy / speed) * CONFIG.physics.maxSpeed;
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

    // Desaturation factor when lights are off (colors become duller)
    const saturation = 0.4 + this.heatLevel * 0.6;
    // Darkness multiplier - scene gets much darker when off
    const darkness = 0.12 + this.heatLevel * 0.88;

    // Pre-compute pool blob data (r² and weighted temp)
    const poolTemp = this.poolTemp;
    const poolData = this.poolBlobs.map((b) => ({
      x: b.x,
      y: b.y,
      rSq: b.r * b.r,
    }));

    // Pre-compute moving blob data once per frame (not per pixel!)
    const blobData = this.blobs.map((blob) => {
      const phase = blob.driftPhase || 0;
      const tempWobble = 0.3 + blob.temp * 0.7;
      const wobble1 =
        Math.sin(this.time * CONFIG.deformation.wobble1Speed + phase) *
        CONFIG.deformation.wobble1Amount *
        tempWobble;
      const wobble2 =
        Math.sin(
          this.time * CONFIG.deformation.wobble2Speed +
            phase * CONFIG.deformation.wobble2PhaseFactor,
        ) *
        CONFIG.deformation.wobble2Amount *
        tempWobble;
      const stretch = CONFIG.deformation.stretchBase + blob.temp * CONFIG.deformation.stretchTempFactor + wobble1;
      const skew = 1.0 + wobble2;
      return {
        x: blob.x,
        y: blob.y,
        rSq: blob.r * blob.r,
        temp: blob.temp,
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
    const innerThreshold = CONFIG.metaballs.threshold;
    const outerThreshold = innerThreshold - CONFIG.metaballs.edgeWidth;
    const invEdgeWidth = 1 / CONFIG.metaballs.edgeWidth;

    for (let py = 0; py < h; py++) {
      const ny = py * invH;

      // Background gradient with extra glow near pool at bottom
      const poolGlow =
        ny > CONFIG.metaballs.poolGlowStart
          ? (ny - CONFIG.metaballs.poolGlowStart) /
            (1 - CONFIG.metaballs.poolGlowStart)
          : 0;
      const glowBoost =
        poolGlow * poolGlow * CONFIG.metaballs.poolGlowBoost * this.heatLevel;

      const bgR =
        (bgTop[0] + bgDeltaR * ny + blob1[0] * glowBoost) * darkness;
      const bgG =
        (bgTop[1] + bgDeltaG * ny + blob1[1] * glowBoost * 0.6) * darkness;
      const bgB =
        (bgTop[2] + bgDeltaB * ny + blob1[2] * glowBoost * 0.3) * darkness;

      for (let px = 0; px < w; px++) {
        const nx = px * invW;
        const idx = (py * w + px) << 2;

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

        // Moving blobs
        for (let i = 0; i < blobData.length; i++) {
          const b = blobData[i];
          const dx = b.x - nx;
          const dy = b.y - ny;
          const distSq =
            dx * dx * b.stretchSkew + dy * dy * b.invStretch + 0.0001;
          const influence = b.rSq / distSq;
          sum += influence;
          avgTemp += influence * b.temp;
        }

        // Early exit for pure background pixels
        if (sum < outerThreshold) {
          data[idx] = bgR;
          data[idx + 1] = bgG;
          data[idx + 2] = bgB;
          data[idx + 3] = 255;
          continue;
        }

        if (sum > 0) avgTemp /= sum;

        // Blob color
        const t = ny;
        const tempInfluence = avgTemp * this.heatLevel;
        const brightness =
          (CONFIG.metaballs.brightnessBase +
            t * CONFIG.metaballs.brightnessTempFactor) *
          (0.5 + tempInfluence * 0.5) *
          darkness;

        const colorMix = t * saturation;
        const invColorMix = 1 - colorMix;
        const blobR = (blob1[0] * invColorMix + blob2[0] * colorMix) * brightness;
        const blobG = (blob1[1] * invColorMix + blob2[1] * colorMix) * brightness;
        const blobB = (blob1[2] * invColorMix + blob2[2] * colorMix) * brightness;

        if (sum >= innerThreshold) {
          // Fully inside blob
          const glow = Math.min(
            (sum - innerThreshold) * CONFIG.metaballs.glowFactor * this.heatLevel,
            CONFIG.metaballs.glowMax * this.heatLevel,
          );
          data[idx] = Math.min(255, blobR + glow * CONFIG.metaballs.glowR);
          data[idx + 1] = Math.min(255, blobG + glow * CONFIG.metaballs.glowG);
          data[idx + 2] = Math.min(255, blobB + glow * CONFIG.metaballs.glowB);
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

/**
 * Mount Day 06 into the provided canvas.
 * @param {HTMLCanvasElement} canvas
 * @returns {{ stop: () => void, game: Day06DigitalLightsDemo }}
 */
export default function day06(canvas) {
  const game = new Day06DigitalLightsDemo(canvas);
  game.start();
  return { stop: () => game.stop(), game };
}


