import { describe, expect, it } from 'vitest';
import { FluidGrid2D } from '../src/math/fluid-grid.js';

describe('planar MAC fluid', () => {
  it('projects a local impulse and keeps normal wall velocity zero', () => {
    const f = new FluidGrid2D({ nx: 40, ny: 32, iterations: 100 });
    f.splat(0.55, 0.45, 1, -0.7, 0.22, [1, 0, 0]);
    const before = f.divergenceRMS();
    f.project();
    expect(f.divergenceRMS()).toBeLessThan(before * 0.01);
    for (let j = 0; j < f.ny; j++) { expect(f.u[j * f.stride]).toBe(0); expect(f.u[f.nx + j * f.stride]).toBe(0); }
    for (let i = 0; i < f.nx; i++) { expect(f.v[i]).toBe(0); expect(f.v[i + f.ny * f.stride]).toBe(0); }
  });

  it('transports dye with velocity and bounds corrected interpolation', () => {
    const f = new FluidGrid2D({ nx: 48, ny: 32, fade: 0 });
    f.splat(0.55, 0.5, 0, 0, 0.16, [1, 0.5, 0]);
    const a = f.dye[0], before = a.slice(), dt = 0.04;
    f.u0.fill(0.8);
    f.advect(a, f.forward, dt, 0.5, 0.5, f.nx - 1, f.ny - 1);
    f.advect(f.forward, f.backward, -dt, 0.5, 0.5, f.nx - 1, f.ny - 1);
    f.advect(a, f.forward, dt, 0.5, 0.5, f.nx - 1, f.ny - 1, true);
    const center = arr => {
      let sum = 0, mass = 0;
      for (let j = 0; j < f.ny; j++) for (let i = 0; i < f.nx; i++) { const v = arr[i + j * f.stride]; sum += v * (i + 0.5) * f.h; mass += v; }
      return sum / mass;
    };
    expect(center(f.forward) - center(before)).toBeCloseTo(0.8 * dt, 2);
    expect(Math.min(...f.forward)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...f.forward)).toBeLessThanOrEqual(Math.max(...before));
  });

  it('stays finite under sustained forcing, mixes color and clears exactly', () => {
    const f = new FluidGrid2D({ nx: 32, ny: 24 });
    for (let n = 0; n < 180; n++) {
      const t = n / 60;
      f.splat(0.65 + 0.2 * Math.cos(t), 0.5 + 0.15 * Math.sin(t), 0.03, -0.02, 0.15, [1, 0.3, 0], 0.05, 0.04);
      f.step(1 / 60);
    }
    expect([...f.u, ...f.v, ...f.dye.flatMap(a => [...a])].every(Number.isFinite)).toBe(true);
    expect(f.divergenceRMS()).toBeLessThan(0.05);
    expect(f.dye[0].filter(v => v > 0.02).length).toBeGreaterThan(40);
    f.clear(); expect(f.time).toBe(0); expect(f.u.some(Boolean)).toBe(false); expect(f.dye[0].some(Boolean)).toBe(false);
  });

  it('dissipates an unforced vortex and leaves a resting container at rest', () => {
    const f = new FluidGrid2D({ nx: 32, ny: 32, viscosity: 0.001 });
    f.step(1 / 60); expect(f.u.some(Boolean)).toBe(false);
    f.splat(0.5, 0.5, 0, 0, 0.3, [1, 0, 0], 1, 2); f.project();
    const energy = () => f.u.reduce((sum, u, i) => sum + u * u + f.v[i] * f.v[i], 0);
    const initial = energy();
    for (let i = 0; i < 60; i++) f.step(1 / 60);
    expect(energy()).toBeLessThan(initial * 0.9);
    expect(energy()).toBeGreaterThan(0);
  });

  it('rejects invalid geometry and time increments', () => {
    expect(() => new FluidGrid2D({ nx: NaN })).toThrow();
    const f = new FluidGrid2D();
    for (const dt of [0, -1, Infinity, NaN, 1]) expect(() => f.step(dt)).toThrow();
  });

  it('allows external dye transport without changing velocity evolution', () => {
    const a = new FluidGrid2D({nx: 32, ny: 24}), b = new FluidGrid2D({nx: 32, ny: 24});
    for (const f of [a,b]) f.splat(.6,.5,.4,-.3,.2,[1,.5,0],1,.5);
    const originalDye = b.dye[0].slice();
    a.step(1/60); b.step(1/60, false);
    expect(b.time).toBe(a.time); expect(b.u).toEqual(a.u); expect(b.v).toEqual(a.v);
    expect(b.dye[0]).toEqual(originalDye); expect(a.dye[0]).not.toEqual(originalDye);
  });
});
