import { describe, it, expect } from "vitest";
import { FluidVortexModel, FLUID_CONFIG } from "../demos/js/fluid-vortex-model.js";

describe("fluid vortex experiment", () => {
  it("keeps particles finite and contained through sustained stirring in every mode", () => {
    for (const mode of ["whirlpool", "twins", "free"]) {
      const model = new FluidVortexModel(120);
      model.mode = mode;
      model.reset();
      model.viscosity = 0.15;
      model.drive = 3;
      Object.assign(model.brush, { down: true, x: 0.3, y: -0.2 });
      for (let i = 0; i < 360; i++) {
        model.brush.vx = 3; model.brush.vy = -3;
        model.step(FLUID_CONFIG.step);
      }
      for (const p of model.particles) {
        expect(Object.values(p).every(Number.isFinite)).toBe(true);
        expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(FLUID_CONFIG.boundary + 1e-9);
        expect(Math.hypot(p.vx, p.vy)).toBeLessThanOrEqual(FLUID_CONFIG.maxSpeed + 1e-9);
      }
    }
  });

  it("retains a disturbance after releasing the brush", () => {
    const a = new FluidVortexModel(120), b = new FluidVortexModel(120);
    Object.assign(b.brush, { down: true, x: 0.4, y: 0, vx: 2 });
    for (let i = 0; i < 60; i++) { a.step(FLUID_CONFIG.step); b.step(FLUID_CONFIG.step); }
    b.brush.down = false;
    for (let i = 0; i < 60; i++) { a.step(FLUID_CONFIG.step); b.step(FLUID_CONFIG.step); }
    const displacement = a.particles.reduce((sum, p, i) => sum + Math.hypot(p.x - b.particles[i].x, p.y - b.particles[i].y), 0) / a.count;
    expect(displacement).toBeGreaterThan(0.01);
  });

  it("uses viscosity to change particle motion and advances consistently across frame rates", () => {
    const a = new FluidVortexModel(80), b = new FluidVortexModel(80), viscous = new FluidVortexModel(80);
    a.viscosity = b.viscosity = 0;
    viscous.viscosity = 0.15;
    for (let i = 0; i < 60; i++) { a.advance(1 / 60); viscous.advance(1 / 60); }
    for (let i = 0; i < 120; i++) b.advance(1 / 120);
    expect(a.particles).toEqual(b.particles);
    expect(a.particles.some((p, i) => Math.hypot(p.vx - viscous.particles[i].vx, p.vy - viscous.particles[i].vy) > 0.01)).toBe(true);
  });
});
