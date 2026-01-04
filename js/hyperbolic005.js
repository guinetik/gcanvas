/**
 * Hyperbolic 005 - Fractal Terrain
 *
 * Inspired by hyperbolic space - a Julia set rendered as 3D terrain.
 * The iteration counts become elevation, creating fractal mountains.
 * Click to disturb, watch it settle to equilibrium.
 *
 * Features:
 * - Julia set as heightmap
 * - Animated c parameter morphs the fractal
 * - Click to add energy - more clicks = more chaos
 * - Settles to gentle breathing equilibrium
 * - Drag to rotate
 */

import { gcanvas, Noise, Fractals } from "/gcanvas.es.min.js";

const CONFIG = {
  // Mesh resolution (lower = faster, higher = more detail)
  gridSize: 100,

  // Julia parameters
  maxIterations: 30,
  cReal: -0.7,
  cImag: 0.27015,
  cAnimSpeed: 0.15,
  cAnimRadius: 0.1,

  // Height scaling
  heightScale: 200,
  heightScaleBase: 120,
  heightScaleMax: 350,

  // Noise
  noiseScale: 0.02,
  noiseSpeed: 0.5,
  noiseStrengthBase: 5,
  noiseStrengthMax: 40,

  // View
  fov: 600,
  baseRotationX: 0.8,
  baseRotationY: 0,

  // Colors
  baseHue: 280,
  bgColor: "#000",
};

class Vec3 {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

/**
 * Generate fractal heightmap using library's Fractals class
 */
function generateFractalHeightmap(size, cReal, cImag, maxIter) {
  // Use the library's Julia set generator
  const rawData = Fractals.julia(
    size,
    size,
    maxIter,
    cReal,
    cImag,
    1.0,  // zoom
    0,    // offsetX
    0     // offsetY
  );

  // The library returns iteration counts:
  // - 0 = interior points (never escaped)
  // - 1 to maxIter-1 = escaped after that many iterations

  const data = new Float32Array(size * size);

  for (let i = 0; i < rawData.length; i++) {
    const iter = rawData[i];

    if (iter === 0) {
      // Interior points - these are the "mountains" (highest)
      data[i] = 1.0;
    } else {
      // Escaped points - lower iterations = further from set = valleys
      // Higher iterations = closer to boundary = foothills
      // Use inverse + power curve for dramatic terrain
      const t = iter / maxIter;
      // Invert: high iterations = high terrain (near boundary)
      // Apply power curve for more dramatic relief
      const height = Math.pow(1 - t, 0.5); // sqrt gives more midrange detail
      data[i] = height * 0.9; // Scale to leave room for interior peaks
    }
  }

  return data;
}

class FractalTerrain {
  constructor(game) {
    this.game = game;
    this.time = 0;

    this.vertices = [];
    this.indices = [];
    this.heightData = null;

    this.rotation = { x: CONFIG.baseRotationX, y: 0 };
    this.targetRotation = { x: CONFIG.baseRotationX, y: 0.3 };
    this.autoRotate = true;

    // Energy system
    this.energy = 0;
    this.noiseStrength = CONFIG.noiseStrengthBase;
    this.heightScale = CONFIG.heightScaleBase;

    // Animated c parameter
    this.cPhase = 0;

    this.initMesh();
  }

  initMesh() {
    const size = CONFIG.gridSize;
    const spacing = 900 / size;

    this.vertices = [];
    this.indices = [];

    // Create grid vertices
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const px = (x - size / 2) * spacing;
        const py = (y - size / 2) * spacing;
        this.vertices.push(new Vec3(px, py, 0));

        // Create edges
        if (x < size - 1) {
          const current = y * size + x;
          const right = y * size + x + 1;
          this.indices.push([current, right]);
        }
        if (y < size - 1) {
          const current = y * size + x;
          const down = (y + 1) * size + x;
          this.indices.push([current, down]);
        }
      }
    }

    this.regenerateFractal();
  }

  regenerateFractal() {
    // Animate c parameter in a circle
    const cReal = CONFIG.cReal + Math.cos(this.cPhase) * CONFIG.cAnimRadius;
    const cImag = CONFIG.cImag + Math.sin(this.cPhase) * CONFIG.cAnimRadius;

    this.heightData = generateFractalHeightmap(
      CONFIG.gridSize,
      cReal,
      cImag,
      CONFIG.maxIterations
    );
  }

  update(dt) {
    this.time += dt;

    // Animate c parameter slowly
    this.cPhase += dt * CONFIG.cAnimSpeed;
    this.regenerateFractal();

    // Responsive scaling
    const minDim = Math.min(this.game.width, this.game.height);
    this.renderScale = minDim / 800;

    // Smooth rotation
    this.rotation.x += (this.targetRotation.x - this.rotation.x) * 0.08;
    this.rotation.y += (this.targetRotation.y - this.rotation.y) * 0.08;

    if (this.autoRotate) {
      this.targetRotation.y += dt * 0.15;
    }

    // Decay energy
    this.energy *= 0.95;
    if (this.energy < 0.001) this.energy = 0;

    // Interpolate noise and height scale
    const targetNoise = CONFIG.noiseStrengthBase +
      this.energy * (CONFIG.noiseStrengthMax - CONFIG.noiseStrengthBase);
    this.noiseStrength += (targetNoise - this.noiseStrength) * 0.1;

    const targetHeight = CONFIG.heightScaleBase +
      this.energy * (CONFIG.heightScaleMax - CONFIG.heightScaleBase);
    this.heightScale += (targetHeight - this.heightScale) * 0.1;
  }

  render(ctx, width, height) {
    const cx = width / 2;
    const cy = height / 2;
    const size = CONFIG.gridSize;

    ctx.fillStyle = CONFIG.bgColor;
    ctx.fillRect(0, 0, width, height);

    const cosX = Math.cos(this.rotation.x);
    const sinX = Math.sin(this.rotation.x);
    const cosY = Math.cos(this.rotation.y);
    const sinY = Math.sin(this.rotation.y);

    const projected = new Array(this.vertices.length);
    const scale = this.renderScale || 1;
    const t = this.time * CONFIG.noiseSpeed;

    // Transform vertices
    for (let i = 0; i < this.vertices.length; i++) {
      const v = this.vertices[i];
      const h = this.heightData[i];

      // Base height from fractal
      let z = h * this.heightScale;

      // Add noise disturbance
      const noiseVal = Noise.simplex3(
        v.x * CONFIG.noiseScale + t,
        v.y * CONFIG.noiseScale,
        t * 0.5
      );
      z += noiseVal * this.noiseStrength;

      // Rotate Y
      let x1 = v.x * cosY - z * sinY;
      let z1 = z * cosY + v.x * sinY;
      let y1 = v.y;

      // Rotate X
      let y2 = y1 * cosX - z1 * sinX;
      let z2 = z1 * cosX + y1 * sinX;
      let x2 = x1;

      // Scale and project
      const sx = x2 * scale;
      const sy = y2 * scale;
      const sz = z2 * scale;

      const projScale = CONFIG.fov / (CONFIG.fov + sz + 300);
      const px = sx * projScale + cx;
      const py = sy * projScale + cy;

      projected[i] = { x: px, y: py, z: sz, h, scale: projScale };
    }

    // Draw edges
    ctx.lineWidth = 1.5 * scale;

    for (const [i1, i2] of this.indices) {
      const p1 = projected[i1];
      const p2 = projected[i2];

      if (p1.z < -CONFIG.fov + 50 || p2.z < -CONFIG.fov + 50) continue;

      const avgZ = (p1.z + p2.z) / 2;
      const avgH = (p1.h + p2.h) / 2;

      // Depth alpha
      const depthAlpha = Math.max(0.1, Math.min(1, (400 - avgZ) / 600));

      // Color based on height
      const hue = (CONFIG.baseHue + avgH * 120 + this.time * 20) % 360;
      const light = 30 + avgH * 50;

      ctx.strokeStyle = `hsla(${hue}, 90%, ${light}%, ${depthAlpha})`;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  }
}

// Initialize
window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  if (!canvas) return;

  const game = gcanvas({ canvas, bg: CONFIG.bgColor, fluid: true });
  const gameInstance = game.game;

  const terrain = new FractalTerrain(gameInstance);

  gameInstance.clear = function () {
    terrain.render(this.ctx, this.width, this.height);
  };

  game.on("update", (dt) => {
    terrain.update(dt);
  });

  // Interaction
  let isDragging = false;
  let lastX = 0, lastY = 0;

  gameInstance.events.on("mousedown", (e) => {
    isDragging = true;
    lastX = e.x;
    lastY = e.y;
  });

  gameInstance.events.on("mouseup", () => {
    isDragging = false;
    setTimeout(() => { terrain.autoRotate = true; }, 500);
  });

  gameInstance.events.on("mousemove", (e) => {
    if (isDragging) {
      const dx = (e.x - lastX) * 0.01;
      const dy = (e.y - lastY) * 0.01;

      terrain.targetRotation.y += dx;
      terrain.targetRotation.x += dy;
      terrain.autoRotate = false;

      lastX = e.x;
      lastY = e.y;
    }
  });

  gameInstance.events.on("click", () => {
    if (!isDragging) {
      terrain.energy = Math.min(terrain.energy + 0.4, 1.0);
      CONFIG.baseHue = Math.random() * 360;
    }
  });

  game.start();
});
