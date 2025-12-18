/**
 * Lava Lamp - Generative Art Demo
 *
 * Fullscreen metaball lava lamp with realistic heat physics.
 */

import { Game, ImageGo, Painter } from "/gcanvas.es.min.js";

class LavaLampDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000";
    this.enableFluidSize();
  }

  init() {
    super.init();

    // Render resolution - proportional to screen, divided for performance
    const scaleFactor = 2; // Divide screen size by this
    this.renderWidth = Math.floor(this.width / scaleFactor);
    this.renderHeight = Math.floor(this.height / scaleFactor);

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
    this.threshold = 1.0;
    this.time = 0;
    this.lastSpawnTime = 0;
    this.spawnInterval = 7 + Math.random() * 5.5; // Spawn every 7-12.5 seconds

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
      const poolClear = !this.blobs.some((b) => b.y > 0.75 && !b.growing);
      if (poolClear) {
        this.spawnBlob();
        this.lastSpawnTime = this.time;
        this.spawnInterval = 9 + Math.random() * 7; // Next spawn in 9-16 seconds
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
    this.ctx.globalCompositeOperation = "screen"; // or 'screen', 'overlay', 'soft-light'
    this.pipeline.render();
    this.ctx.globalCompositeOperation = "source-over"; // Reset to default
  }

  spawnBlob() {
    // Release a blob from the pool - start deep inside the pool
    const poolBlob =
      this.poolBlobs[Math.floor(Math.random() * this.poolBlobs.length)];
    this.blobs.push({
      x: poolBlob.x + (Math.random() - 0.5) * 0.02, // Tight to pool center
      y: poolBlob.y + 0.04 + Math.random() * 0.02, // Start deeper in the pool
      vx: 0,
      vy: 0, // No velocity until it grows
      r: 0.005, // Start very tiny
      targetR: 0.04 + Math.random() * 0.025, // Grow to this size
      temp: 1.0, // Start very hot (from pool)
      growing: true, // Flag to track spawn phase
    });

    // Limit max blobs - allow more for interactions
    if (this.blobs.length > 10) {
      this.blobs.shift(); // Remove oldest
    }
  }

  updateBlobs(dt) {
    for (const blob of this.blobs) {
      // Temperature changes based on position
      // Bottom (y=1) = hot, Top (y=0) = cold
      const targetTemp = blob.y; // y=1 (bottom) -> hot, y=0 (top) -> cold

      // Slowly adjust temperature toward target
      const tempRate = 0.005;
      if (blob.y > 0.92) {
        // In the heat zone at bottom - warm up faster
        blob.temp += (1.0 - blob.temp) * tempRate * 1.5;
      } else if (blob.y < 0.2) {
        // In the cool zone at very top - cool down faster
        blob.temp += (0.0 - blob.temp) * tempRate * 1.5;
      } else {
        // Middle - very gradual change, stay warm longer
        blob.temp += (targetTemp - blob.temp) * tempRate * 0.15;
      }
      blob.temp = Math.max(0, Math.min(1, blob.temp));

      // Buoyancy based on temperature
      // Hot (temp > 0.5) = rises (negative vy)
      // Cold (temp < 0.5) = sinks (positive vy)
      const buoyancy = (blob.temp - 0.5) * 0.00006;
      blob.vy -= buoyancy;

      // Gravity pulls everything down slightly
      blob.vy += 0.000006;

      // Gradually grow to target size (smooth spawn)
      if (blob.targetR && blob.r < blob.targetR) {
        blob.r += (blob.targetR - blob.r) * 0.015;
        // Only start moving once grown enough
        if (blob.growing && blob.r > blob.targetR * 0.7) {
          blob.growing = false;
          blob.vy = -0.0002; // Start rising
        }
      }

      // Heat transfer between nearby blobs
      for (const other of this.blobs) {
        if (other === blob) continue;
        const dx = other.x - blob.x;
        const dy = other.y - blob.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const touchDist = blob.r + other.r;

        // If blobs are close/overlapping, transfer heat
        if (dist < touchDist * 1.5) {
          const heatDiff = other.temp - blob.temp;
          const transfer = heatDiff * 0.002; // Gradual transfer
          blob.temp += transfer;
        }
      }

      // Damping
      blob.vx *= 0.995;
      blob.vy *= 0.998;

      // Organic horizontal drift using sine waves (unique per blob)
      if (!blob.driftPhase) blob.driftPhase = Math.random() * Math.PI * 2;
      if (!blob.driftSpeed) blob.driftSpeed = 0.15 + Math.random() * 0.15;
      if (!blob.driftAmount)
        blob.driftAmount = 0.000005 + Math.random() * 0.000004;

      const drift =
        Math.sin(this.time * blob.driftSpeed + blob.driftPhase) *
        blob.driftAmount;
      blob.vx += drift;

      // Subtle extra wobble when near top or bottom
      if (blob.y < 0.2 || blob.y > 0.7) {
        blob.vx += (Math.random() - 0.5) * 0.00001;
      }

      // Apply velocity
      blob.x += blob.vx;
      blob.y += blob.vy;

      // Soft boundaries - allow going off top of screen
      if (blob.x < 0.1) {
        blob.x = 0.1;
        blob.vx *= -0.3;
      }
      if (blob.x > 0.9) {
        blob.x = 0.9;
        blob.vx *= -0.3;
      }
      // Allow blobs to go slightly off-screen at top before bouncing
      if (blob.y < -0.1) {
        blob.y = -0.1;
        blob.vy *= -0.3;
        blob.temp = 0; // Very cold at top
      }
      if (blob.y > 1.02 && blob.vy > 0) {
        // Mark blob for removal - it's fully merged back into the pool
        blob.removeMe = true;
      }

      // Speed limit - keep it slow and languid
      const maxSpeed = 0.0008;
      const speed = Math.sqrt(blob.vx * blob.vx + blob.vy * blob.vy);
      if (speed > maxSpeed) {
        blob.vx = (blob.vx / speed) * maxSpeed;
        blob.vy = (blob.vy / speed) * maxSpeed;
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
      const poolGlow = ny > 0.7 ? (ny - 0.7) / 0.3 : 0; // 0 to 1 near bottom
      const glowBoost = poolGlow * poolGlow * 0.4; // Quadratic falloff, up to 40% brighter

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
          const wobble1 = Math.sin(this.time * 1.2 + phase) * 0.12;
          const wobble2 = Math.sin(this.time * 0.8 + phase * 1.7) * 0.08;

          // Hot blobs stretch vertically, cold blobs squish horizontally
          // Plus continuous wobble for organic movement
          const stretch = 0.75 + blob.temp * 0.5 + wobble1;
          const skew = 1.0 + wobble2; // Subtle asymmetric distortion

          const distSq = dx * dx * stretch * skew + (dy * dy) / stretch;
          const influence = (blob.r * blob.r) / (distSq + 0.0001);
          sum += influence;
          avgTemp += influence * blob.temp;
        }
        if (sum > 0) avgTemp /= sum;

        // Blob color based on temperature
        // Hot = much brighter, Cold = darker
        const t = avgTemp;
        const brightness = 0.35 + t * 1.0; // 0.35 to 1.35 based on temp
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
        const edgeWidth = 0.15; // Width of the soft edge
        const innerThreshold = this.threshold;
        const outerThreshold = this.threshold - edgeWidth;

        if (sum >= innerThreshold) {
          // Fully inside blob
          const glow = Math.min((sum - innerThreshold) * 0.1, 0.2);
          data[idx] = Math.min(255, blobR + glow * 50);
          data[idx + 1] = Math.min(255, blobG + glow * 35);
          data[idx + 2] = Math.min(255, blobB + glow * 25);
        } else if (sum >= outerThreshold) {
          // Edge zone - blend between blob and background
          const blend = (sum - outerThreshold) / edgeWidth; // 0 to 1
          const smoothBlend = blend * blend * (3 - 2 * blend); // Smoothstep
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
