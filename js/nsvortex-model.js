import { coreScales, viewScales } from "./singularity-model.js";

// The paper supplies the core exponents; all filament geometry, pulse timing,
// envelopes and visual tempo below are an artistic construction, not PDE data.
export const LOOM_CONFIG = {
  duration: 20, decades: 12, spacing: 0.6, lifetime: 1.5,
  strands: 64, samples: 112, tracks: 12, ringSamples: 160,
  turns: 2.8, coreRadius: 0.17, pulseRadius: 1.03,
  crescendoStart: 0.3,
};
const TAU = Math.PI * 2;

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let n = Math.imul(state ^ state >>> 15, state | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}

export function createWeave(seed, count = LOOM_CONFIG.strands) {
  const random = seededRandom(seed);
  return Array.from({ length: count }, (_, i) => ({
    phase: TAU * i / count + random() * 0.12,
    branch: i % 2 ? 1 : -1,
    radius: 0.9 + random() * 0.2,
    twist: LOOM_CONFIG.turns + random() * 0.6,
    offset: random(),
  }));
}

export function loomState(seconds, follow = true) {
  if (!Number.isFinite(seconds)) throw new RangeError("Time must be finite");
  const progress = Math.max(0, Math.min(1, seconds / LOOM_CONFIG.duration));
  const decades = progress * LOOM_CONFIG.decades;
  const scales = coreScales(decades);
  // Logarithmic display time stretches the approach to T into a finite film.
  // Integral of a gently accelerating artistic tempo, independent of frame rate.
  const displayTime = progress * LOOM_CONFIG.duration;
  const motion = 0.7 * displayTime + 0.012 * displayTime * displayTime;
  // A presentation envelope, independent of the paper's core scales. Deriving it
  // from the timeline keeps scrubbing and replay independent of frame history.
  const approach = follow ? Math.max(0, (progress - LOOM_CONFIG.crescendoStart) / (1 - LOOM_CONFIG.crescendoStart)) : 0;
  const crescendo = approach * approach * (3 - 2 * approach);
  const surge = approach ** 3;
  return { progress, decades, scales, view: viewScales(scales, follow), motion, crescendo, surge };
}

export function filamentPoint(strand, s, motion) {
  const radius = strand.radius * (LOOM_CONFIG.coreRadius +
    (1 - LOOM_CONFIG.coreRadius) * Math.exp(-4 * s));
  const angle = strand.phase + TAU * strand.twist * s + motion * (0.25 + s * 0.3);
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle),
    z: strand.branch * (0.015 + 1.3 * s * s) };
}

/** Decorative buckling and corrugation; the fixed-scale references bypass this. */
export function unstablePoint(point, motion, intensity) {
  if (intensity === 0) return point;
  const { x, y, z } = point, theta = Math.atan2(y, x), phase = motion * 0.6;
  const twist = 0.18 * intensity * Math.sin(z * 11 + phase);
  const ripple = 1 + 0.09 * intensity * Math.sin(z * 24 - phase * 2 + theta * 3);
  const c = Math.cos(twist), s = Math.sin(twist);
  return {
    x: (x * c - y * s) * ripple + 0.12 * intensity * Math.sin(z * 6 + phase * 1.5),
    y: (x * s + y * c) * ripple + 0.08 * intensity * Math.cos(z * 8 - phase),
    z: z + 0.035 * intensity * Math.sin(theta * 4 + z * 16 + phase * 2),
  };
}

export function pulseAt(decades, generation) {
  // Offset gives the opening frame an already growing ring. Each envelope has
  // compact temporal support; new generations have shorter physical scales.
  const birth = generation * LOOM_CONFIG.spacing - 0.7;
  const age = (decades - birth) / LOOM_CONFIG.lifetime;
  const active = age > 0 && age < 1;
  const envelope = active ? Math.sin(Math.PI * age) ** 3 : 0;
  return { generation, age, envelope, family: generation % 2,
    modes: 8 + 2 * generation, shear: 3 + 28 * Math.max(0, age) ** 2 };
}

export function activePulses(decades) {
  const last = Math.floor((decades + 0.7) / LOOM_CONFIG.spacing);
  const pulses = [];
  for (let i = Math.max(0, last - 3); i <= last; i++) {
    const pulse = pulseAt(decades, i);
    if (pulse.envelope > 0) pulses.push(pulse);
  }
  return pulses;
}

export function pulsePoint(pulse, theta, track, motion) {
  const band = track * 2 - 1;
  // Integer angular modes keep the ring seamless. Increasing radial phase
  // gradient illustrates shearing into shorter radial wavelengths.
  const wave = pulse.modes * theta + pulse.shear * band - motion * 1.2;
  const ripple = Math.sin(wave) * pulse.envelope;
  const radius = LOOM_CONFIG.pulseRadius + band * 0.16 + ripple * 0.07;
  const side = pulse.family ? -1 : 1;
  return { x: radius * Math.cos(theta), y: radius * Math.sin(theta),
    z: side * (0.12 + 0.23 * Math.sin(pulse.generation * 2.4)) +
      band * 0.1 + ripple * (pulse.family ? 0.17 : 0.06) };
}
