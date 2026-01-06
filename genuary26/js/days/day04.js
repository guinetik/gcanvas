/**
 * Genuary 2026 - Day 4
 * Prompt: "Lowres"
 *
 * STREET ART WALL
 * An infinite scrolling street scene with pixelated pattern murals.
 * Everything scrolls: wall patterns, lamp posts, sidewalk slabs.
 * Camera returns to default after mouse release.
 */

import { Game, Camera3D, Patterns, Painter, Fractals } from '../../../src/index.js';

const CONFIG = {
  // Camera
  perspective: 600,        // Medium perspective
  defaultTiltX: 0.095,      // Positive = look DOWN at ground to see sidewalk
  defaultTiltY: 0,

  // Wall geometry - wall stops before top, leaving sky visible
  wallHeight: 320,         // Short wall - lamp posts rise above it
  wallY: 250,              // Match sidewalkY so wall meets ground
  wallZ: 350,

  // Sky
  starCount: 80,
  moonSize: 40,

  // Ground level
  sidewalkY: 250,
  curbHeight: 25,
  gutterWidth: 40,

  // Z positions - sidewalk needs LARGE Z range to be visible
  streetNearZ: 50,         // Street closest to camera
  gutterZ: 120,            // Gutter
  sidewalkZ: 180,          // Sidewalk from 180 to 350 = 170 units (BIG)

  // Pattern sections
  sectionWidth: 500,
  patternScale: 3,

  // Scrolling
  scrollSpeed: 120,

  // Lamp posts - spacing between them
  lampSpacing: 1000,
  lampHeight: 450,          // Taller than wall

  // Sidewalk slabs
  slabWidth: 150,
  slabDepth: 50,           // Smaller depth for thinner sidewalk

  // Colors - MUCH brighter ground for visibility
  wallColor: '#1a1a1a',
  sidewalkColor: '#3a3a3a',    // Visible gray sidewalk
  curbColor: '#555',           // Lighter curb edge
  gutterColor: '#222',         // Dark gutter channel
  streetColor: '#2a2a2a',      // Visible street
  slabLineColor: '#555',       // Visible slab grid
  hue: 135,
};

class StreetArtDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = '#000';
  }

  init() {
    super.init();
    Painter.init(this.ctx);

    // Camera with auto-return
    this.camera = new Camera3D({
      perspective: CONFIG.perspective,
      rotationX: CONFIG.defaultTiltX,
      rotationY: CONFIG.defaultTiltY,
      sensitivity: 0.003,
      inertia: false,
      clampX: true,
      minRotationX: 0.0,         // Don't look up past horizon
      maxRotationX: 0.5,         // Allow looking down at ground
    });
    this.camera.enableMouseControl(this.canvas);

    // Track if we need to return camera
    this.cameraReturning = false;
    this._setupCameraReturn();

    // State
    this.time = 0;
    this.scrollOffset = 0;

    // Generate stars (fixed positions)
    this.stars = [];
    for (let i = 0; i < CONFIG.starCount; i++) {
      this.stars.push({
        x: Math.random(),           // 0-1 normalized
        y: Math.random() * 0.3,     // Top 30% of screen
        size: Math.random() * 2 + 1,
        twinkle: Math.random() * Math.PI * 2,
      });
    }

    // Generate patterns
    this.patternTiles = this._generatePatterns();
    this.patternImages = [];
    this._createPatternCanvases();
  }

  _setupCameraReturn() {
    // Override mouseup to trigger return
    this.canvas.addEventListener('mouseup', () => {
      this.cameraReturning = true;
    });
    this.canvas.addEventListener('mouseleave', () => {
      this.cameraReturning = true;
    });
    this.canvas.addEventListener('mousedown', () => {
      this.cameraReturning = false;
    });
  }

  _generatePatterns() {
    const size = 32;
    const green = [0, 255, 100, 255];
    const brightGreen = [100, 255, 150, 255];
    const darkGreen = [0, 200, 80, 255];
    const bg = [20, 20, 20, 255];

    return [
      {
        data: Patterns.checkerboard(size, size, {
          cellSize: 8,
          color1: bg,
          color2: green,
        }),
        size,
      },
      {
        data: Patterns.solidGrid(size, size, {
          spacing: 8,
          background: bg,
          foreground: brightGreen,
        }),
        size,
      },
      {
        data: Patterns.stripes(size, size, {
          spacing: 6,
          thickness: 3,
          background: bg,
          foreground: green,
        }),
        size,
      },
      {
        data: Patterns.mesh(size, size, {
          spacing: 8,
          lineWidth: 2,
          background: bg,
          foreground: darkGreen,
        }),
        size,
      },
      {
        data: Patterns.dotPattern(size, size, {
          dotSize: 4,
          spacing: 8,
          dotColor: brightGreen,
          background: bg,
        }),
        size,
      },
      {
        data: Patterns.cross(size, size, {
          size: 10,
          thickness: 3,
          spacing: 16,
          background: bg,
          foreground: green,
        }),
        size,
      },
    ];
  }

  async _createPatternCanvases() {
    const scale = CONFIG.patternScale;

    for (const pattern of this.patternTiles) {
      try {
        const bitmap = await Painter.img.createImageBitmapFromPixels(
          pattern.data,
          pattern.size,
          pattern.size
        );

        const canvas = document.createElement('canvas');
        canvas.width = pattern.size * scale;
        canvas.height = pattern.size * scale;
        const pctx = canvas.getContext('2d');
        pctx.imageSmoothingEnabled = false;
        pctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

        const canvasPattern = this.ctx.createPattern(canvas, 'repeat');
        this.patternImages.push(canvasPattern);
      } catch (e) {
        this.patternImages.push(null);
      }
    }
  }

  update(dt) {
    super.update(dt);
    this.time += dt;
    this.scrollOffset += CONFIG.scrollSpeed * dt;

    // Auto-return camera to default position
    if (this.cameraReturning && !this.camera._isDragging) {
      const returnSpeed = 3 * dt;
      this.camera.rotationX += (CONFIG.defaultTiltX - this.camera.rotationX) * returnSpeed;
      this.camera.rotationY += (CONFIG.defaultTiltY - this.camera.rotationY) * returnSpeed;

      // Stop returning when close enough
      if (Math.abs(this.camera.rotationX - CONFIG.defaultTiltX) < 0.001 &&
          Math.abs(this.camera.rotationY - CONFIG.defaultTiltY) < 0.001) {
        this.camera.rotationX = CONFIG.defaultTiltX;
        this.camera.rotationY = CONFIG.defaultTiltY;
        this.cameraReturning = false;
      }
    }

    // Manually clamp horizontal rotation (Camera3D doesn't have clampY)
    const maxRotY = 0.25;
    this.camera.rotationY = Math.max(-maxRotY, Math.min(maxRotY, this.camera.rotationY));

    this.camera.update(dt);
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;

    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // Draw scene
    this._renderSky(ctx, w, h);
    this._renderWall(ctx, cx, cy);
    this._renderPatternSections(ctx, cx, cy);
    this._renderSidewalk(ctx, cx, cy, w, h);
    this._renderLampPosts(ctx, cx, cy);
    this._renderVignette(ctx, w, h);
  }

  _renderSky(ctx, w, h) {
    // Parallax offset based on camera rotation
    const parallaxX = -this.camera.rotationY * w * 0.5;
    const parallaxY = -this.camera.rotationX * h * 0.3;

    // Stars
    for (const star of this.stars) {
      const twinkle = Math.sin(this.time * 3 + star.twinkle) * 0.5 + 0.5;
      const alpha = 0.3 + twinkle * 0.7;
      const sx = star.x * w + parallaxX;
      const sy = star.y * h + parallaxY;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Moon
    const moonX = w * 0.8 + parallaxX;
    const moonY = h * 0.12 + parallaxY;
    const moonR = CONFIG.moonSize;

    // Moon glow
    const glow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonR * 3);
    glow.addColorStop(0, 'rgba(200, 220, 255, 0.3)');
    glow.addColorStop(0.5, 'rgba(150, 180, 220, 0.1)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR * 3, 0, Math.PI * 2);
    ctx.fill();

    // Moon body
    ctx.fillStyle = '#e8e8f0';
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();
  }

  _renderWall(ctx, cx, cy) {
    const wallLeft = -2000;
    const wallRight = 2000;
    const wallTop = CONFIG.wallY - CONFIG.wallHeight;
    const wallBottom = CONFIG.wallY;
    const wallZ = CONFIG.wallZ;

    const tl = this.camera.project(wallLeft, wallTop, wallZ);
    const tr = this.camera.project(wallRight, wallTop, wallZ);
    const br = this.camera.project(wallRight, wallBottom, wallZ);
    const bl = this.camera.project(wallLeft, wallBottom, wallZ);

    ctx.beginPath();
    ctx.moveTo(cx + tl.x, cy + tl.y);
    ctx.lineTo(cx + tr.x, cy + tr.y);
    ctx.lineTo(cx + br.x, cy + br.y);
    ctx.lineTo(cx + bl.x, cy + bl.y);
    ctx.closePath();
    ctx.fillStyle = CONFIG.wallColor;
    ctx.fill();
  }

  _renderPatternSections(ctx, cx, cy) {
    const sectionWidth = CONFIG.sectionWidth;
    const numPatterns = this.patternImages.length;
    if (numPatterns === 0) return;

    const wallTop = CONFIG.wallY - CONFIG.wallHeight;
    const wallBottom = CONFIG.wallY;
    const wallZ = CONFIG.wallZ - 1;

    // Calculate visible sections based on scroll
    const startSection = Math.floor(this.scrollOffset / sectionWidth) - 2;
    const visibleSections = 8;

    for (let i = 0; i < visibleSections; i++) {
      const sectionIndex = startSection + i;
      const patternIndex = ((sectionIndex % numPatterns) + numPatterns) % numPatterns;
      const pattern = this.patternImages[patternIndex];

      // World X position (scrolls with scene)
      const worldLeft = sectionIndex * sectionWidth - this.scrollOffset;
      const worldRight = worldLeft + sectionWidth;

      const tl = this.camera.project(worldLeft, wallTop, wallZ);
      const tr = this.camera.project(worldRight, wallTop, wallZ);
      const br = this.camera.project(worldRight, wallBottom, wallZ);
      const bl = this.camera.project(worldLeft, wallBottom, wallZ);

      // Skip if off screen
      const minX = Math.min(tl.x, bl.x);
      const maxX = Math.max(tr.x, br.x);
      if (cx + maxX < -50 || cx + minX > this.width + 50) continue;

      ctx.beginPath();
      ctx.moveTo(cx + tl.x, cy + tl.y);
      ctx.lineTo(cx + tr.x, cy + tr.y);
      ctx.lineTo(cx + br.x, cy + br.y);
      ctx.lineTo(cx + bl.x, cy + bl.y);
      ctx.closePath();

      if (pattern) {
        // Translate pattern to move WITH the section (not stay fixed)
        const offsetX = cx + bl.x;
        const offsetY = cy + tl.y;
        pattern.setTransform(new DOMMatrix().translate(offsetX, offsetY));
        ctx.fillStyle = pattern;
      } else {
        ctx.fillStyle = `hsl(${CONFIG.hue}, 70%, ${15 + (patternIndex * 8) % 25}%)`;
      }
      ctx.fill();

      // Section divider
      ctx.strokeStyle = `hsla(${CONFIG.hue}, 100%, 50%, 0.2)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + tl.x, cy + tl.y);
      ctx.lineTo(cx + bl.x, cy + bl.y);
      ctx.stroke();
    }
  }

  _renderSidewalk(ctx, cx, cy, w, h) {
    const sidewalkY = CONFIG.sidewalkY;
    const streetY = sidewalkY + CONFIG.curbHeight;  // Street is LOWER (higher Y)
    const wallZ = CONFIG.wallZ;
    const sidewalkZ = CONFIG.sidewalkZ;
    const gutterZ = CONFIG.gutterZ;
    const streetNearZ = CONFIG.streetNearZ;

    // === STREET (big dark area, lowest level) ===
    const streetFL = this.camera.project(-2000, streetY, streetNearZ);
    const streetFR = this.camera.project(2000, streetY, streetNearZ);
    const streetBL = this.camera.project(-2000, streetY, gutterZ);
    const streetBR = this.camera.project(2000, streetY, gutterZ);

    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, h);
    ctx.lineTo(cx + streetBR.x, cy + streetBR.y);
    ctx.lineTo(cx + streetBL.x, cy + streetBL.y);
    ctx.closePath();
    ctx.fillStyle = CONFIG.streetColor;
    ctx.fill();

    // === GUTTER (narrow dark channel) ===
    const gutterFL = this.camera.project(-2000, streetY, gutterZ);
    const gutterFR = this.camera.project(2000, streetY, gutterZ);
    const gutterBL = this.camera.project(-2000, streetY, sidewalkZ);
    const gutterBR = this.camera.project(2000, streetY, sidewalkZ);

    ctx.beginPath();
    ctx.moveTo(cx + gutterFL.x, cy + gutterFL.y);
    ctx.lineTo(cx + gutterFR.x, cy + gutterFR.y);
    ctx.lineTo(cx + gutterBR.x, cy + gutterBR.y);
    ctx.lineTo(cx + gutterBL.x, cy + gutterBL.y);
    ctx.closePath();
    ctx.fillStyle = CONFIG.gutterColor;
    ctx.fill();

    // === CURB FACE (3D vertical face showing the step) ===
    const curbTopL = this.camera.project(-2000, sidewalkY, sidewalkZ);
    const curbTopR = this.camera.project(2000, sidewalkY, sidewalkZ);
    const curbBotL = this.camera.project(-2000, streetY, sidewalkZ);
    const curbBotR = this.camera.project(2000, streetY, sidewalkZ);

    ctx.beginPath();
    ctx.moveTo(cx + curbTopL.x, cy + curbTopL.y);
    ctx.lineTo(cx + curbTopR.x, cy + curbTopR.y);
    ctx.lineTo(cx + curbBotR.x, cy + curbBotR.y);
    ctx.lineTo(cx + curbBotL.x, cy + curbBotL.y);
    ctx.closePath();
    ctx.fillStyle = '#333';
    ctx.fill();

    // Curb edge highlight
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + curbTopL.x, cy + curbTopL.y);
    ctx.lineTo(cx + curbTopR.x, cy + curbTopR.y);
    ctx.stroke();

    // === SIDEWALK (thin strip against wall, highest level) ===
    const swFL = this.camera.project(-2000, sidewalkY, sidewalkZ);
    const swFR = this.camera.project(2000, sidewalkY, sidewalkZ);
    const swBL = this.camera.project(-2000, sidewalkY, wallZ);
    const swBR = this.camera.project(2000, sidewalkY, wallZ);

    ctx.beginPath();
    ctx.moveTo(cx + swFL.x, cy + swFL.y);
    ctx.lineTo(cx + swFR.x, cy + swFR.y);
    ctx.lineTo(cx + swBR.x, cy + swBR.y);
    ctx.lineTo(cx + swBL.x, cy + swBL.y);
    ctx.closePath();
    ctx.fillStyle = CONFIG.sidewalkColor;
    ctx.fill();

    // === SIDEWALK SLAB GRID ===
    const slabW = CONFIG.slabWidth;
    const slabD = CONFIG.slabDepth;

    // Horizontal slab lines (depth)
    ctx.strokeStyle = CONFIG.slabLineColor;
    ctx.lineWidth = 2;
    for (let z = sidewalkZ; z < wallZ; z += slabD) {
      const left = this.camera.project(-2000, sidewalkY, z);
      const right = this.camera.project(2000, sidewalkY, z);
      ctx.beginPath();
      ctx.moveTo(cx + left.x, cy + left.y);
      ctx.lineTo(cx + right.x, cy + right.y);
      ctx.stroke();
    }

    // Vertical slab lines (SCROLL with scene)
    const startX = Math.floor((this.scrollOffset - 1000) / slabW) * slabW;
    for (let wx = startX; wx < this.scrollOffset + 1000; wx += slabW) {
      const worldX = wx - this.scrollOffset;
      const near = this.camera.project(worldX, sidewalkY, sidewalkZ);
      const far = this.camera.project(worldX, sidewalkY, wallZ);
      ctx.beginPath();
      ctx.moveTo(cx + near.x, cy + near.y);
      ctx.lineTo(cx + far.x, cy + far.y);
      ctx.stroke();
    }
  }

  _renderLampPosts(ctx, cx, cy) {
    const spacing = CONFIG.lampSpacing;
    const groundY = CONFIG.sidewalkY;
    const lampZ = (CONFIG.sidewalkZ + CONFIG.wallZ) / 2;  // Middle of sidewalk

    // Calculate which lamp posts are visible (wider range)
    const startLamp = Math.floor((this.scrollOffset - 1200) / spacing);
    const endLamp = Math.ceil((this.scrollOffset + 1200) / spacing);

    for (let i = startLamp; i <= endLamp; i++) {
      // World X position (scrolls with scene)
      const worldX = i * spacing - this.scrollOffset + 100;

      // Skip if way off screen (use projected coords)
      const testProj = this.camera.project(worldX, groundY, lampZ);
      if (Math.abs(testProj.x) > this.width) continue;

      const base = this.camera.project(worldX, groundY, lampZ);
      const top = this.camera.project(worldX, groundY - CONFIG.lampHeight, lampZ);

      // Pole
      ctx.strokeStyle = '#444';
      ctx.lineWidth = Math.max(2, 5 * base.scale);
      ctx.beginPath();
      ctx.moveTo(cx + base.x, cy + base.y);
      ctx.lineTo(cx + top.x, cy + top.y);
      ctx.stroke();

      // Arm extending toward street (lower Z)
      const armZ = lampZ - 50;
      const armEnd = this.camera.project(worldX, groundY - CONFIG.lampHeight + 20, armZ);
      ctx.lineWidth = Math.max(1, 3 * base.scale);
      ctx.beginPath();
      ctx.moveTo(cx + top.x, cy + top.y);
      ctx.lineTo(cx + armEnd.x, cy + armEnd.y);
      ctx.stroke();

      // Light glow
      const lightPos = this.camera.project(worldX, groundY - CONFIG.lampHeight + 35, armZ);
      const glowSize = 60 * lightPos.scale;

      const glow = ctx.createRadialGradient(
        cx + lightPos.x, cy + lightPos.y, 0,
        cx + lightPos.x, cy + lightPos.y, glowSize
      );
      glow.addColorStop(0, `hsla(${CONFIG.hue}, 100%, 70%, 0.8)`);
      glow.addColorStop(0.4, `hsla(${CONFIG.hue}, 100%, 50%, 0.3)`);
      glow.addColorStop(1, 'transparent');

      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx + lightPos.x, cy + lightPos.y, glowSize, 0, Math.PI * 2);
      ctx.fill();

      // Light pool on ground
      const poolLeft = this.camera.project(worldX - 80, groundY, armZ + 20);
      const poolRight = this.camera.project(worldX + 80, groundY, armZ + 20);

      ctx.fillStyle = `hsla(${CONFIG.hue}, 70%, 40%, 0.15)`;
      ctx.beginPath();
      ctx.ellipse(
        cx + lightPos.x,
        cy + poolLeft.y,
        Math.abs(poolRight.x - poolLeft.x) / 2,
        30 * lightPos.scale,
        0, 0, Math.PI * 2
      );
      ctx.fill();
    }
  }

  _renderVignette(ctx, w, h) {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, h * 0.4, w / 2, h / 2, h);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  stop() {
    super.stop();
    if (this.camera) {
      this.camera.disableMouseControl();
    }
  }
}

export default function day04(canvas) {
  const game = new StreetArtDemo(canvas);
  game.start();
  return {
    stop: () => game.stop(),
    game
  };
}
