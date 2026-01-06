/**
 * Genuary 2026 - Day 5
 * Prompt: "Write 'Genuary'. Avoid using a font."
 *
 * RIPPLE TEXT - Pluribus Style
 * Concentric ripples emanate from G like a pebble dropped in water.
 * As each ripple reaches a letter position, that letter blooms from center.
 * Ripples persist as background, letters form on top.
 */

import { Game, Camera3D, Painter, ParticleSystem, ParticleEmitter, Updaters, Noise, Easing } from '../../../src/index.js';

const CONFIG = {
  // Font-based text (smooth curves)
  fontSize: 140,
  fontFamily: 'Franklin Gothic Medium',
  fontWeight: 'bold',

  // Fingerprint contour pattern (curved lines following letter shapes)
  fingerprintEnabled: true,
  fingerprintSpacing: 6,        // distance between contour lines (pixels)
  fingerprintThickness: 0.55,   // 0-1, line thickness
  fingerprintCurve: 0.4,        // how much lines curve (0 = circles, higher = more spiral)

  // Particles
  maxParticles: 18000,
  particleSize: { min: 1.6, max: 2.2 },
  sampleStep: 2,  // denser for fingerprint detail

  // Dash rendering (for letter particles - horizontal ridges)
  dashLength: 4.0,
  dashWidth: 0.8,

  // Concentric ripples from G (like pebble drop)
  rippleCount: 20,              // number of concentric rings
  rippleBaseRadius: 50,         // innermost ring radius
  rippleSpacing: 70,            // distance between rings
  rippleParticlesBase: 30,      // particles in innermost ring
  rippleParticlesGrowth: 3,     // extra particles per ring
  rippleSpeed: 0.4,             // orbit speed
  rippleSpawnDelay: 0.15,       // delay between each ring appearing
  rippleEccentricity: 0.6,      // ellipse shape (1 = circle)

  // Flag wave effect (subtle)
  flagWaveSpeed: 0.8,           // how fast the wave travels
  flagWaveAmplitude: 10,        // how much vertical displacement
  flagWaveFrequency: 0.004,     // wave frequency across X
  flagWaveSecondary: 0.2,       // secondary wave strength

  // Animation
  spawnDuration: 2.0,       // how long each particle takes to fully form
  letterStagger: 0.9,       // seconds between each letter STARTING (overlap)
  gDelay: 0.3,              // when G starts forming (seconds)
  driftDuration: 8.0,       // how long the leftward drift takes
  breatheAmount: 0.8,
  breatheSpeed: 1.2,

  // G Pulse effect - continuous heartbeat
  pulsePeriod: 1.8,         // slower heartbeat (seconds per beat)
  pulseStrength: 6,         // very subtle scatter distance
  shockwaveSpeed: 300,      // ripple expansion speed (px/sec)
  shockwaveStrength: 12,    // very subtle orbital push

  // Camera
  perspective: 800,
  sensitivity: 0.003,

  // Mouse
  mouseRadius: 180,
  mousePush: 800,
};

// 5x7 pixel font
// Font bitmap will be created at runtime for smooth curves

/**
 * Custom particle system that renders letter particles as oriented dashes
 */
class DashParticleSystem extends ParticleSystem {
  drawParticle(ctx, p, x, y, scale) {
    const a = p.color?.a ?? 1;
    const size = p.size * scale;
    if (size < 0.3 || a <= 0) return;

    // Use dash rendering for letter particles
    if (p.custom?.isLetter && p.custom?.angle !== undefined) {
      const { r, g, b } = p.color;
      const angle = p.custom.angle;
      const glow = p.custom.glow || 0;

      // dashScale: 0 = small dot, 1 = full dash
      const dashScale = p.custom.dashScale ?? 1;

      // Morph from circle (when dashScale=0) to dash (when dashScale=1)
      const minLen = size * 0.5;  // dot size when scale=0
      const maxLen = size * CONFIG.dashLength;
      const dashLen = minLen + (maxLen - minLen) * dashScale;

      const minW = size * 0.8;  // thicker when dot
      const maxW = size * CONFIG.dashWidth;
      const dashW = minW + (maxW - minW) * dashScale;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.lineCap = 'round';

      // Base stroke
      ctx.strokeStyle = `rgba(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)},${a})`;
      ctx.lineWidth = Math.max(0.5, dashW);
      ctx.beginPath();
      ctx.moveTo(-dashLen / 2, 0);
      ctx.lineTo(dashLen / 2, 0);
      ctx.stroke();

      // Glow effect on hover (only if significant)
      if (glow > 0.15) {
        ctx.strokeStyle = `rgba(255,255,255,${a * 0.4 * glow})`;
        ctx.lineWidth = dashW * 2;
        ctx.stroke();
      }

      ctx.restore();
    } else {
      // Default circle rendering for orbital particles
      super.drawParticle(ctx, p, x, y, scale);
    }
  }
}

class RippleTextDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = '#000';
  }

  init() {
    super.init();
    Painter.init(this.ctx);

    this.time = 0;
    this.mouseX = -9999;
    this.mouseY = -9999;

    // Pulse state - continuous heartbeat starting when G forms
    this.pulseStartTime = CONFIG.gDelay + CONFIG.spawnDuration; // when G finishes forming
    this.lastPulseBeat = 0;
    this.shockwaves = []; // track multiple expanding shockwaves

    Noise.seed(42);

    // Camera
    this.camera = new Camera3D({
      perspective: CONFIG.perspective,
      rotationX: 0,
      rotationY: 0,
      sensitivity: CONFIG.sensitivity,
      inertia: true,
      friction: 0.95,
      clampX: false,
    });
    this.camera.enableMouseControl(this.canvas);

    // Calculate text bounds - G is at letterCenters[0]
    this.textBounds = this.calculateTextBounds('GENUARY');

    // Orbit origin is always at G's position (relative to text)
    this.orbitOrigin = {
      x: this.textBounds.letterCenters[0].x,
      y: this.textBounds.letterCenters[0].y,
    };

    // Global offset: everything starts centered (offset cancels G's position)
    // then drifts to 0 so text ends up in final centered position
    this.globalOffset = {
      x: -this.orbitOrigin.x,  // starts positive to center G
      y: -this.orbitOrigin.y,
    };

    // Pre-calculate letter target positions
    this.targetPositions = this.calculateTargetPositions('GENUARY');

    // Custom updaters
    const rippleMotion = this.createRippleUpdater();
    const spawnAnimation = this.createSpawnUpdater();
    const breatheMotion = this.createBreatheUpdater();
    const mouseInteraction = this.createMouseUpdater();
    const pulseEffect = this.createPulseUpdater();

    // ParticleSystem with custom dash rendering
    this.particles = new DashParticleSystem(this, {
      camera: this.camera,
      depthSort: true,
      maxParticles: CONFIG.maxParticles,
      blendMode: 'screen',
      updaters: [
        rippleMotion,
        spawnAnimation,
        breatheMotion,
        mouseInteraction,
        pulseEffect,
        Updaters.velocity,
        Updaters.damping(0.94),
      ],
    });

    const emitter = new ParticleEmitter({
      rate: 0,
      lifetime: { min: 999, max: 999 },
      size: CONFIG.particleSize,
      color: { r: 200, g: 200, b: 200, a: 0.8 },
    });
    this.particles.addEmitter('text', emitter);

    // Spawn particles
    this.spawnLetterParticles();
    this.spawnRippleParticles();

    this.pipeline.add(this.particles);

    console.log(`[Day5] GENUARY: ${this.targetPositions.length} letter + ${this.particles.particleCount - this.targetPositions.length} ripple particles`);

    // Mouse tracking
    this._onMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    };
    this._onMouseLeave = () => {
      this.mouseX = -9999;
      this.mouseY = -9999;
    };
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mouseleave', this._onMouseLeave);
  }

  calculateTextBounds(text) {
    // Create off-screen canvas to render text
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    // Set up larger canvas first, then set font
    const estimatedWidth = text.length * CONFIG.fontSize * 0.7;
    const canvasHeight = CONFIG.fontSize * 1.5;
    const padding = 30;

    tempCanvas.width = estimatedWidth + padding * 2;
    tempCanvas.height = canvasHeight + padding * 2;

    // Clear and set font AFTER canvas is sized
    tempCtx.fillStyle = '#000';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Set font
    const fontString = `${CONFIG.fontWeight} ${CONFIG.fontSize}px ${CONFIG.fontFamily}`;
    tempCtx.font = fontString;

    // Measure actual text width
    const metrics = tempCtx.measureText(text);
    const textWidth = metrics.width;

    // Re-size canvas to exact dimensions needed
    tempCanvas.width = textWidth + padding * 2;
    tempCanvas.height = canvasHeight + padding * 2;

    // Must re-set everything after resize (canvas reset)
    tempCtx.fillStyle = '#000';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.font = fontString;
    tempCtx.fillStyle = '#fff';
    tempCtx.textBaseline = 'top';

    // Draw text - position at padding from left, and vertically centered
    const textY = (tempCanvas.height - CONFIG.fontSize) / 2;
    tempCtx.fillText(text, padding, textY);

    // Get pixel data
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

    // Calculate letter centers
    const letterCenters = [];
    let currentX = padding;
    for (const char of text) {
      const charWidth = tempCtx.measureText(char).width;
      letterCenters.push({
        x: currentX + charWidth / 2 - tempCanvas.width / 2,
        y: 0,
        width: charWidth
      });
      currentX += charWidth;
    }

    // Store for use in calculateTargetPositions
    this.fontBitmap = {
      imageData,
      width: tempCanvas.width,
      height: tempCanvas.height,
      offsetX: -tempCanvas.width / 2,
      offsetY: -tempCanvas.height / 2
    };

    return { letterCenters };
  }

  calculateTargetPositions(text) {
    const positions = [];
    const { imageData, width, height, offsetX, offsetY } = this.fontBitmap;
    const { letterCenters } = this.textBounds;
    const step = CONFIG.sampleStep;

    // Sample the font bitmap
    for (let py = 0; py < height; py += step) {
      for (let px = 0; px < width; px += step) {
        // IMPORTANT: Floor to integers for imageData indexing
        const ipx = Math.floor(px);
        const ipy = Math.floor(py);
        const idx = (ipy * width + ipx) * 4;
        const pixelValue = imageData.data[idx];  // R channel (white = text)

        if (pixelValue > 128) {
          // This pixel is part of the text
          const wx = px + offsetX;
          const wy = py + offsetY;

          // Determine which letter this pixel belongs to
          let letterIndex = 0;
          let letterCenterX = letterCenters[0].x;
          let letterCenterY = 0;

          for (let i = 0; i < letterCenters.length; i++) {
            const lc = letterCenters[i];
            if (wx >= lc.x - lc.width / 2 && wx < lc.x + lc.width / 2) {
              letterIndex = i;
              letterCenterX = lc.x;
              letterCenterY = lc.y;
              break;
            }
            // Default to closest letter
            if (i === letterCenters.length - 1 || wx < letterCenters[i + 1].x - letterCenters[i + 1].width / 2) {
              letterIndex = i;
              letterCenterX = lc.x;
              letterCenterY = lc.y;
            }
          }

          const noiseVal = Noise.simplex2(wx * 0.015, wy * 0.005);

          // Fingerprint contour pattern - curved lines from letter center
          let includeParticle = true;
          if (CONFIG.fingerprintEnabled) {
            // Distance and angle from letter center
            const dx = wx - letterCenterX;
            const dy = wy - letterCenterY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            // Create curved contours: distance + angle creates spiral effect
            // Add noise for organic fingerprint feel
            const contourVal = dist + angle * CONFIG.fingerprintCurve * 15 + noiseVal * 3;
            const wave = Math.sin(contourVal * (Math.PI * 2 / CONFIG.fingerprintSpacing));

            includeParticle = Math.abs(wave) < CONFIG.fingerprintThickness;
          }

          if (includeParticle) {
            const z = noiseVal * 8;
            const brightness = 0.75 + Math.random() * 0.25;

            // Orient dashes along the contour lines (perpendicular to radius)
            const dx = wx - letterCenterX;
            const dy = wy - letterCenterY;
            const tangentAngle = Math.atan2(dy, dx) + Math.PI / 2 + noiseVal * 0.2;

            positions.push({
              x: wx, y: wy, z: z,
              brightness: brightness,
              phase: (wx + wy) * 0.02,
              angle: tangentAngle,
              letterIndex: letterIndex,
              letterCenterX: letterCenterX,
              letterCenterY: letterCenterY,
            });
          }
        }
      }
    }

    return positions;
  }

  spawnLetterParticles() {
    const emitter = this.particles.getEmitter('text');
    const originX = this.orbitOrigin.x;
    const originY = this.orbitOrigin.y;

    for (const target of this.targetPositions) {
      const p = this.particles.acquire();
      emitter.emit(p);

      // Calculate angle from orbit origin to this particle's target
      const dx = target.x - originX;
      const dy = target.y - originY;
      const angleToTarget = Math.atan2(dy, dx);
      const distFromOrigin = Math.sqrt(dx * dx + (dy / CONFIG.rippleEccentricity) ** 2);

      // Find which orbital ring this particle will come from
      const ringRadius = Math.max(CONFIG.rippleBaseRadius, distFromOrigin * 0.8);

      // Start position: one ring further out (x+1) so they travel inward
      const startAngle = angleToTarget + (Math.random() - 0.5) * 0.5;
      const startRadius = ringRadius + CONFIG.rippleSpacing + (Math.random() - 0.5) * 20;

      p.x = originX + Math.cos(startAngle) * startRadius;
      p.y = originY + Math.sin(startAngle) * startRadius * CONFIG.rippleEccentricity;
      p.z = (Math.random() - 0.5) * 10;

      p.custom.targetX = target.x;
      p.custom.targetY = target.y;
      p.custom.targetZ = target.z;
      p.custom.letterCenterX = target.letterCenterX;
      p.custom.letterCenterY = target.letterCenterY;
      p.custom.phase = target.phase;
      p.custom.brightness = target.brightness;
      p.custom.baseBrightness = target.brightness;
      p.custom.isLetter = true;
      p.custom.letterIndex = target.letterIndex;
      p.custom.glow = 0;

      // Store target angle and starting angle (pointing from origin toward target)
      p.custom.targetAngle = target.angle;
      p.custom.startAngle = angleToTarget + (Math.random() - 0.5) * 0.3;
      p.custom.angle = p.custom.startAngle;

      // Store target size for dash morphing
      p.custom.targetDashScale = 1.0;
      p.custom.dashScale = 0.0;  // starts as dot, grows to full dash

      // Timing: letters spawn in sync with G's heartbeat
      // G (index 0) starts at gDelay, each subsequent letter spawns on next beat
      const letterDelay = CONFIG.gDelay + target.letterIndex * CONFIG.pulsePeriod;

      // Small random spread within each letter so they don't all appear at once
      const particleSpread = Math.random() * 0.3;

      p.custom.spawnDelay = letterDelay + particleSpread;
      p.custom.spawnProgress = 0;

      // Start bright white
      p.color.r = 255;
      p.color.g = 255;
      p.color.b = 255;
      p.color.a = 0;

      p.custom.targetSize = CONFIG.particleSize.min + Math.random() * (CONFIG.particleSize.max - CONFIG.particleSize.min);
      p.size = 2.0;

      this.particles.particles.push(p);
    }
  }

  spawnRippleParticles() {
    const emitter = this.particles.getEmitter('text');
    const originX = this.orbitOrigin.x;
    const originY = this.orbitOrigin.y;

    // Create concentric rings emanating from G
    for (let ring = 0; ring < CONFIG.rippleCount; ring++) {
      const radius = CONFIG.rippleBaseRadius + ring * CONFIG.rippleSpacing;
      const particleCount = CONFIG.rippleParticlesBase + ring * CONFIG.rippleParticlesGrowth;

      for (let i = 0; i < particleCount; i++) {
        const p = this.particles.acquire();
        emitter.emit(p);

        const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.1;

        // Elliptical ripples
        const rx = radius;
        const ry = radius * CONFIG.rippleEccentricity;

        // Start at ring position (already expanded)
        p.x = originX + Math.cos(angle) * rx;
        p.y = originY + Math.sin(angle) * ry;
        p.z = (Math.random() - 0.5) * 10;

        p.custom.isLetter = false;
        p.custom.isRipple = true;
        p.custom.originX = originX;
        p.custom.originY = originY;
        p.custom.ringRadius = radius;
        p.custom.rx = rx;
        p.custom.ry = ry;
        p.custom.angle = angle;
        p.custom.ringIndex = ring;
        p.custom.orbitDirection = 1;

        // Rings appear sequentially from center outward
        p.custom.spawnDelay = ring * CONFIG.rippleSpawnDelay;
        p.custom.spawnProgress = 0;

        const brightness = 0.5 + Math.random() * 0.4;
        p.custom.brightness = brightness;

        const gray = Math.floor(180 + brightness * 60);
        p.color.r = gray;
        p.color.g = gray;
        p.color.b = gray;
        p.color.a = 0;

        p.size = 1.8 + Math.random() * 0.6;

        this.particles.particles.push(p);
      }
    }
  }

  createRippleUpdater() {
    return (p, dt, system) => {
      if (!p.custom.isRipple) return;

      // Wait for spawn delay (rings appear from center outward)
      if (this.time < p.custom.spawnDelay) {
        p.color.a = 0;
        return;
      }

      // Fade in
      if (p.custom.spawnProgress < 1) {
        p.custom.spawnProgress = Math.min(1, (p.custom.spawnProgress || 0) + dt * 2);
        p.color.a = p.custom.spawnProgress * (0.6 + p.custom.brightness * 0.3);
      }

      // Slowly orbit around the origin
      p.custom.angle += CONFIG.rippleSpeed * p.custom.orbitDirection * dt / (1 + p.custom.ringIndex * 0.05);

      // Calculate base position on ellipse
      const baseX = p.custom.originX + Math.cos(p.custom.angle) * p.custom.rx;
      const baseY = p.custom.originY + Math.sin(p.custom.angle) * p.custom.ry;

      // Flag wave effect with unpredictable wind using noise
      const flagAnchor = -500;
      const distFromAnchor = Math.max(0, baseX - flagAnchor);
      const waveStrength = Math.min(1, distFromAnchor / 800);

      // Noise-based wind variation - makes it unpredictable
      const windNoise = Noise.simplex3(baseX * 0.002, baseY * 0.002, this.time * 0.4);
      const gustNoise = Noise.simplex2(this.time * 0.8, p.custom.ringIndex * 0.3);
      const windVariation = 1 + windNoise * 0.5 + gustNoise * 0.3;

      // Primary wave with noise variation
      const wave1 = Math.sin(
        this.time * CONFIG.flagWaveSpeed * windVariation +
        baseX * CONFIG.flagWaveFrequency
      ) * CONFIG.flagWaveAmplitude * waveStrength;

      // Secondary wave (higher frequency)
      const wave2 = Math.sin(
        this.time * CONFIG.flagWaveSpeed * 1.7 +
        baseX * CONFIG.flagWaveFrequency * 2.3 +
        windNoise * 2
      ) * CONFIG.flagWaveAmplitude * CONFIG.flagWaveSecondary * waveStrength;

      // Tertiary turbulence - subtle random gusts
      const turbulence = Noise.simplex3(
        baseX * 0.008,
        baseY * 0.008,
        this.time * 0.8
      ) * 3 * waveStrength;

      // Apply flag distortion
      const targetX = baseX + turbulence * 0.15;
      const targetY = baseY + wave1 + wave2 + turbulence * 0.5;

      // Smooth movement to target
      p.x += (targetX - p.x) * 0.12;
      p.y += (targetY - p.y) * 0.12;
    };
  }

  createSpawnUpdater() {
    return (p, dt, system) => {
      if (!p.custom.isLetter) return;

      const timeSinceSpawn = this.time - p.custom.spawnDelay;

      if (timeSinceSpawn < 0) {
        p.color.a = 0;
        return;
      }

      // Store initial position on first frame
      if (p.custom.startX === undefined) {
        p.custom.startX = p.x;
        p.custom.startY = p.y;
        p.custom.startZ = p.z;
      }

      if (p.custom.spawnProgress >= 1) return;

      // Animate from orbital start position to target
      p.custom.spawnProgress = Math.min(1, (p.custom.spawnProgress || 0) + dt / CONFIG.spawnDuration);

      const t = this.easeOutQuad(p.custom.spawnProgress);

      // Lerp from orbital start to final position
      p.x = p.custom.startX + (p.custom.targetX - p.custom.startX) * t;
      p.y = p.custom.startY + (p.custom.targetY - p.custom.startY) * t;
      p.z = p.custom.startZ + ((p.custom.targetZ || 0) - p.custom.startZ) * t;

      // Tween angle from starting (pointing from origin) to target (fingerprint contour)
      p.custom.angle = p.custom.startAngle + (p.custom.targetAngle - p.custom.startAngle) * t;

      // Tween dash scale: 0 = dot, 1 = full dash
      p.custom.dashScale = t;

      // Size: start small, grow to target
      const startSize = 1.0;
      const endSize = p.custom.targetSize || CONFIG.particleSize.min;
      p.size = startSize + (endSize - startSize) * t;

      // Fade in and settle to final brightness
      p.color.a = p.custom.brightness * Math.min(1, t * 1.5);

      // Color: start white, transition to final gray
      const finalGray = Math.floor(180 + p.custom.brightness * 75);
      const gray = Math.floor(255 - (255 - finalGray) * t);
      p.color.r = gray;
      p.color.g = gray;
      p.color.b = gray;
    };
  }

  easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
  }

  createBreatheUpdater() {
    return (p, dt, system) => {
      if (!p.custom.isLetter || p.custom.spawnProgress < 1) return;

      const phase = p.custom.phase || 0;
      const breathe = Math.sin(this.time * CONFIG.breatheSpeed + phase) * CONFIG.breatheAmount;

      const baseX = p.custom.targetX + breathe;
      const baseY = p.custom.targetY + breathe * 0.5;

      // Direct lerp back to position (no spring/overshoot)
      const mousePush = p.custom.mousePush || 0;
      const returnSpeed = 0.15 * (1 - mousePush * 0.7);

      p.x += (baseX - p.x) * returnSpeed;
      p.y += (baseY - p.y) * returnSpeed;

      // Kill velocity to prevent spring effect
      p.vx *= 0.8;
      p.vy *= 0.8;

      // Subtle angle drift
      const angleDrift = Noise.simplex3(p.x * 0.01, p.y * 0.01, this.time * 0.3) * 0.08;
      p.custom.angle += angleDrift * dt;
    };
  }

  createMouseUpdater() {
    return (p, dt, system) => {
      if (this.mouseX < 0) {
        p.custom.mousePush = 0;
        return;
      }

      const proj = this.camera.project(p.x, p.y, p.z);
      const screenX = this.width / 2 + proj.x;
      const screenY = this.height / 2 + proj.y;

      const mdx = screenX - this.mouseX;
      const mdy = screenY - this.mouseY;
      const mouseDist = Math.sqrt(mdx * mdx + mdy * mdy);

      if (mouseDist < CONFIG.mouseRadius && mouseDist > 1) {
        // Quadratic falloff for punchier close-range repulsion
        const t = 1 - mouseDist / CONFIG.mouseRadius;
        const force = t * t * CONFIG.mousePush;

        // Apply force directly to position for immediate response
        const pushX = (mdx / mouseDist) * force * dt;
        const pushY = (mdy / mouseDist) * force * dt;
        p.x += pushX;
        p.y += pushY;
        p.vx += pushX * 0.5;
        p.vy += pushY * 0.5;

        // Track push strength so breathe updater can back off
        p.custom.mousePush = t;

        // Brighten and glow on hover
        if (p.custom.isLetter) {
          p.custom.brightness = Math.min(1, p.custom.baseBrightness + 0.4);
          p.custom.glow = Math.min(1, (p.custom.glow || 0) + dt * 6);
        }
      } else {
        p.custom.mousePush = Math.max(0, (p.custom.mousePush || 0) - dt * 8);

        if (p.custom.isLetter && p.custom.spawnProgress >= 1) {
          p.custom.brightness = p.custom.baseBrightness;
          p.custom.glow = Math.max(0, (p.custom.glow || 0) - dt * 4);
        }
      }

      // Update color based on brightness
      if (p.custom.isLetter) {
        const gray = Math.floor(180 + p.custom.brightness * 75);
        p.color.r = gray;
        p.color.g = gray;
        p.color.b = gray;
      }
    };
  }

  createPulseUpdater() {
    return (p, dt, system) => {
      // Only active after G starts forming
      if (this.time < CONFIG.gDelay) return;

      // Calculate pulse phase (asymmetric with easing: slow ease-in expand, fast ease-out contract)
      const timeSinceStart = this.time - CONFIG.gDelay;
      const pulsePhase = (timeSinceStart % CONFIG.pulsePeriod) / CONFIG.pulsePeriod;
      // Asymmetric wave: 70% expand, 30% contract
      const expandRatio = 0.7;
      let pulseIntensity;
      if (pulsePhase < expandRatio) {
        // Ease-in expand: slow start, accelerate
        const t = pulsePhase / expandRatio;
        pulseIntensity = Easing.easeInCubic(t);
      } else {
        // Ease-out contract: fast start, decelerate
        const t = (pulsePhase - expandRatio) / (1 - expandRatio);
        pulseIntensity = 1 - Easing.easeOutQuad(t);
      }

      // G letter particles: subtle heartbeat scatter
      if (p.custom.isLetter && p.custom.letterIndex === 0) {
        if (p.custom.spawnProgress < 1) return;

        const dx = p.custom.targetX - this.orbitOrigin.x;
        const dy = p.custom.targetY - this.orbitOrigin.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Subtle push outward on beat
        const pushStrength = CONFIG.pulseStrength * pulseIntensity;
        const targetX = p.custom.targetX + (dx / dist) * pushStrength;
        const targetY = p.custom.targetY + (dy / dist) * pushStrength;

        // Smooth movement to pulse position
        p.x += (targetX - p.x) * 0.15;
        p.y += (targetY - p.y) * 0.15;

        // Subtle brightness pulse
        const brightBoost = pulseIntensity * 30;
        p.color.r = Math.min(255, 180 + p.custom.brightness * 75 + brightBoost);
        p.color.g = Math.min(255, 180 + p.custom.brightness * 75 + brightBoost);
        p.color.b = Math.min(255, 180 + p.custom.brightness * 75 + brightBoost);
      }

      // Orbital particles: react to shockwaves
      if (p.custom.isRipple) {
        const dx = p.x - this.orbitOrigin.x;
        const dy = p.y - this.orbitOrigin.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Check all active shockwaves
        for (const wave of this.shockwaves) {
          const shockwaveDist = Math.abs(dist - wave.radius);
          const shockwaveWidth = 60;

          if (shockwaveDist < shockwaveWidth) {
            const proximity = 1 - (shockwaveDist / shockwaveWidth);
            const age = (this.time - wave.startTime) / CONFIG.pulsePeriod;
            const decay = Math.max(0, 1 - age);
            const pushStrength = CONFIG.shockwaveStrength * proximity * decay * dt;

            p.x += (dx / dist) * pushStrength;
            p.y += (dy / dist) * pushStrength;

            // Brief brightness boost
            p.color.a = Math.min(1, (p.color.a || 0.6) + 0.15 * proximity * decay);
          }
        }
      }
    };
  }

  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  stop() {
    super.stop();
    if (this.camera) this.camera.disableMouseControl();
    if (this._onMouseMove) {
      this.canvas.removeEventListener('mousemove', this._onMouseMove);
    }
    if (this._onMouseLeave) {
      this.canvas.removeEventListener('mouseleave', this._onMouseLeave);
    }
  }

  update(dt) {
    super.update(dt);
    this.time += dt;
    this.camera.update(dt);

    // Animate global offset: starts at (-orbitOrigin.x, -orbitOrigin.y) to center G
    // Eases to (0, 0) so text ends up centered
    const driftProgress = Math.min(1, this.time / CONFIG.driftDuration);
    const t = this.easeInOutQuad(driftProgress);

    const startOffsetX = -this.orbitOrigin.x;
    const startOffsetY = -this.orbitOrigin.y;
    this.globalOffset.x = startOffsetX * (1 - t);
    this.globalOffset.y = startOffsetY * (1 - t);

    // Heartbeat pulse - spawn shockwave on each beat
    if (this.time >= CONFIG.gDelay) {
      const timeSinceStart = this.time - CONFIG.gDelay;
      const currentBeat = Math.floor(timeSinceStart / CONFIG.pulsePeriod);

      // Spawn new shockwave on each beat
      if (currentBeat > this.lastPulseBeat) {
        this.lastPulseBeat = currentBeat;
        this.shockwaves.push({
          startTime: this.time,
          radius: 0
        });
      }

      // Expand all shockwaves and remove old ones
      this.shockwaves = this.shockwaves.filter(wave => {
        wave.radius = (this.time - wave.startTime) * CONFIG.shockwaveSpeed;
        // Keep waves that haven't expanded too far
        return wave.radius < 1500;
      });
    }
  }

  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  render() {
    // Higher alpha = shorter trails (0.6 for minimal trails)
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Apply global offset (drift from center to final position)
    this.ctx.save();
    this.ctx.translate(this.globalOffset.x, this.globalOffset.y);
    this.pipeline.render(this.ctx);
    this.ctx.restore();
  }
}

export default function day05(canvas) {
  const game = new RippleTextDemo(canvas);
  game.start();
  return { stop: () => game.stop(), game };
}
