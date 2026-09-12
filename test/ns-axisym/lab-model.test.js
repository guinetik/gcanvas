import { describe, it, expect, vi } from 'vitest';
vi.mock('../../src/index.js', async () => import('../../src/math/ns-axisym/presets.js'));
import { gaussianWidth, makeExperiment, deepMerge, DEFAULTS, createVortexDrive } from '../../demos/js/ns-lab-model.js';
import { createGrid } from '../../src/math/ns-axisym/grid.js';

const grid = createGrid({ nr: 64, nz: 128, R: 1, Z: 1 });
function profile(fn) {
  const values = new Float32Array(grid.nr * 4);
  for (let i = 0; i < grid.nr; i++) values[4 * i + 1] = fn(grid.rc(i));
  return { values };
}

describe('lab core-width instrument', () => {
  it('recovers Gaussian vorticity width independently of amplitude', () => {
    for (const width of [0.12, 0.3, 0.5]) for (const amplitude of [0.01, 10]) {
      const fit = gaussianWidth(profile(r => amplitude * Math.exp(-r * r / (width * width))), grid);
      expect(fit.width).toBeCloseTo(width, 6); expect(fit.residual).toBeLessThan(1e-6);
    }
  });
  it('declines zero, flat, inverted, and unresolved profiles', () => {
    for (const fn of [() => 0, () => 1, () => -1, r => Math.exp(-r * r / 1e-5)])
      expect(gaussianWidth(profile(fn), grid)).toBeNull();
  });
  it('declines a strongly non-Gaussian multi-peak radial profile', () => {
    const fit = gaussianWidth(profile(r => Math.exp(-(((r - 0.25) / 0.05) ** 2)) + Math.exp(-(((r - 0.65) / 0.06) ** 2))), grid);
    expect(fit).toBeNull();
  });
  it('keeps the analytic preset viscosity consistent with its reset configuration', () => {
    for (const preset of ['burgers', 'oseen', 'rings', 'driven']) {
      const config = deepMerge(DEFAULTS, { nu: 0.002, preset });
      const experiment = makeExperiment(config);
      expect(experiment.nu).toBe(config.nu);
      expect(experiment.boundary.kind).toBe(['rings', 'driven'].includes(preset) ? 'no-slip-thom' : 'analytic-extension');
    }
    expect(DEFAULTS.nu).toBe(0.01);
  });
});

describe('driven vortex experiment', () => {
  it('defaults to a driven run while preserving an explicitly unforced decay preset', () => {
    expect(DEFAULTS.preset).toBe('driven');
    expect(makeExperiment(DEFAULTS).source).toBeTypeOf('function');
    expect(makeExperiment(deepMerge(DEFAULTS, { preset: 'rings' })).source).toBeUndefined();
  });
  it('applies finite bounded torque away from all walls and the axis', () => {
    const force = createVortexDrive(DEFAULTS), { R, Z, drive } = DEFAULTS;
    for (let t = 0; t < 12; t += 0.17) {
      for (let r = 0; r <= R; r += 0.1) for (let z = -Z; z <= Z; z += 0.1) {
        const s = force(r, z, t);
        expect(Number.isFinite(s.a)).toBe(true);
        expect(Math.abs(s.a)).toBeLessThanOrEqual(drive.strength);
        expect(s.chi).toBe(0);
      }
      for (const [r, z] of [[0, 0.35], [R, 0.35], [0.5, -Z], [0.5, Z]]) expect(force(r, z, t).a).toBe(0);
    }
  });
  it('reverses torque with simulation time and returns identical values when a stage is retried', () => {
    const force = createVortexDrive(DEFAULTS);
    const initial = force(0.5, 0.35, 0);
    expect(initial.a).toBeGreaterThan(0);
    expect(force(0.5, 0.35, DEFAULTS.drive.period / 2).a).toBeLessThan(0);
    expect(force(0.5, 0.35, 0)).toEqual(initial);
    const off = createVortexDrive(deepMerge(DEFAULTS, { drive: { strength: 0 } }));
    expect(off(0.5, 0.35, 0)).toEqual({ a: 0, chi: 0 });
  });
  it('initializes with the forcing attached and rejects mismatched solver setup', () => {
    const experiment = makeExperiment(DEFAULTS);
    const solver = { nu: DEFAULTS.nu, grid, boundary: experiment.boundary, source: experiment.source, initialize: vi.fn(() => 'initialized') };
    expect(experiment.init(solver)).toBe('initialized');
    expect(solver.initialize.mock.calls[0][0].a(0.5, 0.35)).toBeGreaterThan(0);
    solver.source = null;
    expect(() => experiment.init(solver)).toThrow('matching');
    expect(() => createVortexDrive(deepMerge(DEFAULTS, { drive: { period: 0 } }))).toThrow(RangeError);
  });
});
