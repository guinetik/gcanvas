import { burgersPreset, lambOseenPreset, interactingRingsPreset } from '../../src/index.js';

export const DEFAULTS = {
  nr: 32, R: 1, Z: 1, nu: 0.01, preset: 'driven', stepsPerFrame: 4,
  physics: { alpha: 0.5, C: 1, t0: 1, ringRadius: 0.5, radialWidth: 0.22,
    axialWidth: 0.23, separation: 0.7, swirlStrength: 2, meridionalStrength: 0.002 },
  drive: { strength: 3, period: 2.4 },
  presentation: { mode: 'gamma', contrast: 0, vectors: true, plain: false, sliceZ: 0.35 },
  sampling: { profileMs: 250, uiMs: 150, history: 600, minCoreCells: 6 },
};

/** Merge nested demo options without changing the exported defaults. */
export function deepMerge(base, options = {}) {
  return Object.fromEntries(Object.keys({ ...base, ...options }).map(key => [key,
    base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])
      ? deepMerge(base[key], options[key] ?? {}) : options[key] ?? base[key]]));
}

export function makeExperiment(config) {
  const { nu, R, Z, physics: p } = config;
  if (config.preset === 'burgers') return burgersPreset({ nu, alpha: p.alpha, C: p.C });
  if (config.preset === 'oseen') return lambOseenPreset({ nu, C: p.C, t0: p.t0 });
  const rings = interactingRingsPreset({ nu, R, Z, ...p });
  if (config.preset === 'rings') return rings;
  if (config.preset !== 'driven') throw new RangeError('Unknown lab preset');
  const source = createVortexDrive(config);
  return { ...rings, source, init(solver, time = 0) {
    if (solver.nu !== nu || solver.boundary !== rings.boundary || solver.source !== source || solver.grid.R !== R || solver.grid.Z !== Z)
      throw new Error('Driven preset requires matching boundaries and forcing');
    return solver.initialize({ ...rings.initial, phiGuess: rings.initial.phi, time });
  } };
}

/** Prescribed azimuthal body force f_theta = r S_a; no direct chi source.
 * Two smooth, compact torque regions reverse out of phase and drift slowly.
 * Sampled at physical RK stage times, never animation/wall-clock time.
 * This is a driven single-fluid experiment, not a buoyant lava-lamp model.
 */
export function createVortexDrive({ R, Z, physics: p, drive }) {
  if (!Number.isFinite(drive.strength) || drive.strength < 0 || !Number.isFinite(drive.period) || drive.period <= 0)
    throw new RangeError('Invalid vortex drive');
  const radialDrift = Math.min(p.radialWidth * 0.35, (p.ringRadius - p.radialWidth) / 2, (R - p.ringRadius - p.radialWidth) / 2);
  const axialDrift = Math.min(p.axialWidth * 0.3, (Z - p.separation / 2 - p.axialWidth) / 2);
  const bump = q => Math.abs(q) < 1 ? Math.exp(1 - 1 / (1 - q * q)) : 0;
  // Cache the time-dependent coefficients: the solver samples every grid cell
  // at the same stage time, so trigonometry is needed only once per stage.
  let stageTime, centers;
  return (r, z, time) => {
    if (time !== stageTime) {
      const phase = 2 * Math.PI * time / drive.period;
      centers = [0, 1].map(i => ({
        r: p.ringRadius + radialDrift * Math.sin(phase / Math.SQRT2 + i * Math.PI),
        z: (i ? -1 : 1) * p.separation / 2 + axialDrift * Math.sin(phase / 2 + i * Math.PI / 2),
        strength: (i ? -1 : 1) * drive.strength * Math.cos(phase + i * Math.PI / 2),
      }));
      stageTime = time;
    }
    let a = 0;
    for (const c of centers) a += c.strength * bump((r - c.r) / p.radialWidth) * bump((z - c.z) / p.axialWidth);
    return { a, chi: 0 };
  };
}

/** Fit omega_z = A exp(-r² / width²) on a single positive vortex profile.
 * Excludes near-zero tails. Unavailable for rings or a non-Gaussian profile.
 */
export function gaussianWidth(profile, grid) {
  if (!profile) return null;
  const peak = Math.max(...Array.from({ length: grid.nr }, (_, i) => profile.values[4 * i + 1]));
  if (!(peak > 0)) return null;
  const points = [];
  for (let i = 1; i < grid.nr - 1; i++) {
    const value = profile.values[4 * i + 1] / peak;
    if (value > 0.1 && value < 0.95) points.push([grid.rc(i) ** 2, Math.log(value)]);
  }
  if (points.length < 4) return null;
  const mx = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const my = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  const xx = points.reduce((sum, p) => sum + (p[0] - mx) ** 2, 0);
  if (!(xx > 0)) return null;
  const slope = points.reduce((sum, p) => sum + (p[0] - mx) * (p[1] - my), 0) / xx;
  if (!(slope < 0)) return null;
  const residual = Math.sqrt(points.reduce((sum, p) => sum + (p[1] - my - slope * (p[0] - mx)) ** 2, 0) / points.length);
  return residual < 0.1 ? { width: Math.sqrt(-1 / slope), residual } : null;
}

export const format = value => Number.isFinite(value) ? (value === 0 ? '0' : value.toExponential(2)) : '—';
