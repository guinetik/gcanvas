import { computeFluidForces } from "/gcanvas.es.min.js";

export const FLUID_CONFIG = {
  count: 360, mobileCount: 200, step: 1 / 120, maxSteps: 6,
  seedRadius: 0.92, boundary: 1.1, smoothingRadius: 0.16,
  pressure: 0.018, nearPressure: 0.0005, viscosity: 0.035,
  maxForce: 35, maxSpeed: 3, drag: 0.12, core: 0.22,
  circulation: 0.45, drive: 1, brushRadius: 0.3, brushStrength: 5,
  brushSpin: 8, brushDecay: 10, boundaryBounce: 1.4,
};

/** SPH particles in a circular vessel. All positions are simulation coordinates.
 * The vortex is an external stirring force, not a prescribed particle path.
 */
export class FluidVortexModel {
  constructor(count = FLUID_CONFIG.count) {
    this.count = count;
    this.drive = FLUID_CONFIG.drive;
    this.viscosity = FLUID_CONFIG.viscosity;
    this.mode = "whirlpool";
    this.brush = { down: false, x: 0, y: 0, vx: 0, vy: 0, radius: FLUID_CONFIG.brushRadius };
    this.reset();
  }

  targetVelocity(x, y) {
    const centers = this.mode === "twins" ? [[-0.38, 0, 1], [0.38, 0, -1]] : [[0, 0, 1]];
    let vx = 0, vy = 0, ax = 0, ay = 0;
    for (const [cx, cy, direction] of centers) {
      const dx = x - cx, dy = y - cy;
      const r2 = dx * dx + dy * dy;
      const omega = FLUID_CONFIG.circulation * direction *
        (r2 < 1e-9 ? 1 / FLUID_CONFIG.core ** 2 : -Math.expm1(-r2 / FLUID_CONFIG.core ** 2) / r2);
      vx -= dy * omega;
      vy += dx * omega;
      // Supply the inward acceleration needed to sustain circular motion.
      ax -= dx * omega * omega;
      ay -= dy * omega * omega;
    }
    return { x: vx, y: vy, ax, ay };
  }

  reset() {
    this.time = 0;
    this.accumulator = 0;
    this.brush.down = false;
    this.particles = Array.from({ length: this.count }, (_, i) => {
      const angle = i * 2.399963229728653;
      const radius = FLUID_CONFIG.seedRadius * Math.sqrt((i + 0.5) / this.count);
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      const v = this.targetVelocity(x, y);
      return { x, y, vx: v.x, vy: v.y };
    });
  }

  advance(dt, onStep) {
    this.accumulator += Math.min(Math.max(0, dt), FLUID_CONFIG.step * FLUID_CONFIG.maxSteps);
    while (this.accumulator >= FLUID_CONFIG.step) {
      this.step(FLUID_CONFIG.step);
      this.accumulator -= FLUID_CONFIG.step;
      onStep?.();
    }
  }

  step(dt) {
    const cfg = FLUID_CONFIG;
    const { forces } = computeFluidForces(this.particles, {
      kernel: { smoothingRadius: cfg.smoothingRadius },
      fluid: {
        restDensity: this.count / (Math.PI * cfg.seedRadius ** 2),
        pressureStiffness: cfg.pressure, nearPressureStiffness: cfg.nearPressure,
        viscosity: this.viscosity, maxForce: cfg.maxForce,
      },
    });
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i], f = forces[i];
      const target = this.targetVelocity(p.x, p.y);
      const drive = this.mode === "free" ? 0 : this.drive;
      f.x += (target.ax + target.x - p.vx) * drive;
      f.y += (target.ay + target.y - p.vy) * drive;
      if (this.brush.down) {
        const dx = p.x - this.brush.x, dy = p.y - this.brush.y;
        const r2 = dx * dx + dy * dy;
        const weight = Math.exp(-r2 / (this.brush.radius ** 2));
        f.x += (this.brush.vx - dy * cfg.brushSpin) * weight * cfg.brushStrength;
        f.y += (this.brush.vy + dx * cfg.brushSpin) * weight * cfg.brushStrength;
      }
      p.vx = (p.vx + f.x * dt) * Math.exp(-cfg.drag * dt);
      p.vy = (p.vy + f.y * dt) * Math.exp(-cfg.drag * dt);
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > cfg.maxSpeed) { p.vx *= cfg.maxSpeed / speed; p.vy *= cfg.maxSpeed / speed; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const radius = Math.hypot(p.x, p.y);
      if (radius > cfg.boundary) {
        const nx = p.x / radius, ny = p.y / radius;
        p.x = nx * cfg.boundary; p.y = ny * cfg.boundary;
        const outward = Math.max(0, p.vx * nx + p.vy * ny);
        p.vx -= outward * nx * cfg.boundaryBounce; p.vy -= outward * ny * cfg.boundaryBounce;
      }
    }
    this.brush.vx *= Math.exp(-cfg.brushDecay * dt);
    this.brush.vy *= Math.exp(-cfg.brushDecay * dt);
    this.time += dt;
  }
}
