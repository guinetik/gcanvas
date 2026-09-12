const DEFAULTS = { nx: 128, ny: 80, viscosity: 0.00002, iterations: 40, relaxation: 1.8, fade: 0.16 };
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/**
 * Planar incompressible flow on a staggered (MAC) grid. World height is one;
 * square cells have size 1/ny. x points right, y down. Solid, free-slip walls.
 * Semi-Lagrangian velocity transport, implicit viscosity, iterative pressure
 * projection, bounded corrected dye transport. Finite-iteration graphics solver.
 * Dye is passive RGB concentration; no SPH, prescribed velocity field or particles.
 */
export class FluidGrid2D {
  constructor(options = {}) {
    const c = { ...DEFAULTS, ...options };
    if (![c.nx, c.ny].every(n => Number.isInteger(n) && n >= 8 && n <= 512) ||
        !Number.isInteger(c.iterations) || c.iterations < 1 ||
        !Number.isFinite(c.viscosity) || c.viscosity < 0 ||
        !Number.isFinite(c.fade) || c.fade < 0 || !(c.relaxation > 0 && c.relaxation < 2)) {
      throw new RangeError('Invalid fluid grid configuration');
    }
    Object.assign(this, c);
    this.stride = this.nx + 1;
    this.size = this.stride * (this.ny + 1);
    this.h = 1 / this.ny;
    this.width = this.nx * this.h;
    for (const name of ['u', 'v', 'u0', 'v0', 'scratch', 'pressure', 'forward', 'backward']) this[name] = new Float32Array(this.size);
    this.dye = Array.from({ length: 3 }, () => new Float32Array(this.size));
    this.dyePath = [new Float32Array(this.size), new Float32Array(this.size)];
    this.reversePath = [new Float32Array(this.size), new Float32Array(this.size)];
    this.time = 0;
  }

  clear() {
    for (const a of [this.u, this.v, this.pressure, ...this.dye]) a.fill(0);
    this.time = 0;
  }

  // Bilinear sampling in index coordinates; component extents exclude unused padding.
  sample(a, x, y, xmax = this.nx - 1, ymax = this.ny - 1) {
    x = clamp(x, 0, xmax); y = clamp(y, 0, ymax);
    const i = Math.min(Math.floor(x), xmax - 1), j = Math.min(Math.floor(y), ymax - 1);
    const fx = x - i, fy = y - j, k = i + this.stride * j;
    return (1 - fy) * ((1 - fx) * a[k] + fx * a[k + 1]) +
      fy * ((1 - fx) * a[k + this.stride] + fx * a[k + this.stride + 1]);
  }

  velocity(x, y) {
    return [this.sample(this.u, x / this.h, y / this.h - 0.5, this.nx, this.ny - 1),
      this.sample(this.v, x / this.h - 0.5, y / this.h, this.nx - 1, this.ny)];
  }

  boundaries() {
    for (let j = 0; j < this.ny; j++) this.u[j * this.stride] = this.u[this.nx + j * this.stride] = 0;
    for (let i = 0; i < this.nx; i++) this.v[i] = this.v[i + this.ny * this.stride] = 0;
  }

  /** Local velocity impulse and dye deposit, in world coordinates. */
  splat(x, y, dx, dy, radius, color, amount = 1, spin = 0) {
    if (![x, y, dx, dy, radius, amount, spin, ...color].every(Number.isFinite) || radius <= 0 || color.length !== 3) return;
    const s = this.stride, h = this.h, r2 = radius * radius;
    const imin = Math.max(0, Math.floor((x - radius) / h) - 1), imax = Math.min(this.nx, Math.ceil((x + radius) / h) + 1);
    const jmin = Math.max(0, Math.floor((y - radius) / h) - 1), jmax = Math.min(this.ny, Math.ceil((y + radius) / h) + 1);
    const weight = (xx, yy) => Math.pow(Math.max(0, 1 - (xx * xx + yy * yy) / r2), 3);
    for (let j = jmin; j <= jmax; j++) for (let i = imin; i <= imax; i++) {
      const k = i + j * s, xx = (i + 0.5) * h - x, yy = (j + 0.5) * h - y;
      if (i > 0 && i < this.nx && j < this.ny) this.u[k] += weight(xx - h / 2, yy) * (dx - spin * yy / radius);
      if (j > 0 && j < this.ny && i < this.nx) this.v[k] += weight(xx, yy - h / 2) * (dy + spin * xx / radius);
      if (i < this.nx && j < this.ny) for (let c = 0; c < 3; c++) {
        this.dye[c][k] = Math.max(0, this.dye[c][k] + color[c] * amount * weight(xx, yy));
      }
    }
  }

  /** In-place SOR pressure projection; each face is shared by adjacent cells. */
  project(dt = 1) {
    const { nx, ny, stride: s, u, v } = this;
    this.boundaries(); this.pressure.fill(0);
    for (let sweep = 0; sweep < this.iterations; sweep++) {
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const k = i + j * s, left = i > 0, right = i < nx - 1, top = j > 0, bottom = j < ny - 1;
        const d = u[k + 1] - u[k] + v[k + s] - v[k];
        const correction = -this.relaxation * d / (left + right + top + bottom);
        if (left) u[k] -= correction;
        if (right) u[k + 1] += correction;
        if (top) v[k] -= correction;
        if (bottom) v[k + s] += correction;
        this.pressure[k] += correction * this.h / dt;
      }
    }
  }

  divergenceRMS() {
    let sum = 0;
    for (let j = 0; j < this.ny; j++) for (let i = 0; i < this.nx; i++) {
      const k = i + j * this.stride;
      const d = (this.u[k + 1] - this.u[k] + this.v[k + this.stride] - this.v[k]) / this.h;
      sum += d * d;
    }
    return Math.sqrt(sum / (this.nx * this.ny));
  }

  diffuse(a, xmax, ymax, dt) {
    const alpha = this.viscosity * dt / (this.h * this.h);
    if (alpha === 0) return;
    this.scratch.set(a);
    for (let sweep = 0; sweep < 12; sweep++) {
      for (let j = 0; j <= ymax; j++) for (let i = 0; i <= xmax; i++) {
        // Normal face velocities stay zero. Tangential velocities use free slip.
        if ((xmax === this.nx && (i === 0 || i === xmax)) || (ymax === this.ny && (j === 0 || j === ymax))) continue;
        const k = i + j * this.stride;
        const neighbors = (i > 0) + (i < xmax) + (j > 0) + (j < ymax);
        const sum = (i > 0 ? a[k - 1] : 0) + (i < xmax ? a[k + 1] : 0) +
          (j > 0 ? a[k - this.stride] : 0) + (j < ymax ? a[k + this.stride] : 0);
        a[k] = (this.scratch[k] + alpha * sum) / (1 + alpha * neighbors);
      }
    }
  }

  advect(input, output, dt, ox, oy, xmax, ymax, corrected = false, path = null, writePath = false) {
    const { h, u0, v0, nx, ny, stride: s } = this;
    const scale = dt / h;
    for (let j = 0; j <= ymax; j++) for (let i = 0; i <= xmax; i++) {
      const k = i + j * s;
      let bx, by;
      if (path && !writePath) { bx = path[0][k]; by = path[1][k]; }
      else {
        const x = i + ox, y = j + oy;
        const ux = this.sample(u0, x, y - 0.5, nx, ny - 1), vy = this.sample(v0, x - 0.5, y, nx - 1, ny);
        const mx = x - 0.5 * scale * ux, my = y - 0.5 * scale * vy;
        bx = x - scale * this.sample(u0, mx, my - 0.5, nx, ny - 1) - ox;
        by = y - scale * this.sample(v0, mx - 0.5, my, nx - 1, ny) - oy;
        if (path) { path[0][k] = bx; path[1][k] = by; }
      }
      let value = this.sample(input, bx, by, xmax, ymax);
      if (corrected) {
        value += 0.5 * (input[k] - this.backward[k]);
        const ix = Math.min(Math.floor(clamp(bx, 0, xmax)), xmax - 1);
        const iy = Math.min(Math.floor(clamp(by, 0, ymax)), ymax - 1), q = ix + iy * s;
        value = clamp(value, Math.min(input[q], input[q + 1], input[q + s], input[q + s + 1]),
          Math.max(input[q], input[q + 1], input[q + s], input[q + s + 1]));
      }
      output[k] = value;
    }
  }

  step(dt, transportDye = true) {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.05) throw new RangeError('Fluid step must be in (0, 0.05] seconds');
    this.u0.set(this.u); this.v0.set(this.v);
    this.advect(this.u0, this.u, dt, 0, 0.5, this.nx, this.ny - 1);
    this.advect(this.v0, this.v, dt, 0.5, 0, this.nx - 1, this.ny);
    this.boundaries();
    this.diffuse(this.u, this.nx, this.ny - 1, dt);
    this.diffuse(this.v, this.nx - 1, this.ny, dt);
    this.project(dt);
    if (!transportDye) { this.time += dt; return; }
    this.u0.set(this.u); this.v0.set(this.v);
    const fade = Math.exp(-this.fade * dt);
    for (let c = 0; c < 3; c++) {
      const a = this.dye[c];
      // All passive colors share the same trajectories for this velocity state.
      this.advect(a, this.forward, dt, 0.5, 0.5, this.nx - 1, this.ny - 1, false, this.dyePath, c === 0);
      this.advect(this.forward, this.backward, -dt, 0.5, 0.5, this.nx - 1, this.ny - 1, false, this.reversePath, c === 0);
      this.advect(a, this.forward, dt, 0.5, 0.5, this.nx - 1, this.ny - 1, true, this.dyePath);
      for (let k = 0; k < this.size; k++) a[k] = this.forward[k] * fade;
    }
    this.time += dt;
  }
}
