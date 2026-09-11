/**
 * Normalized leading-core scales from OpenAI, Finite Time Blowup for
 * Navier–Stokes (September 2026), §2.1, p.4:
 * https://cdn.openai.com/pdf/32d9f210-8b73-45e0-91bc-82a30aef8a9a/navier-stokes.pdf
 *
 * The paper gives asymptotic comparability, not equalities or a complete
 * time history. We set prefactors to one and choose an illustrative admissible
 * h. This is a scaling illustration, not the constructed PDE solution.
 */
export const SINGULARITY_CONFIG = {
  h: 0.005,
  maxDecades: 12,
  duration: 20,
  playbackEase: 4,
  strands: 40,
  samples: 160,
  turns: 4,
  radialFloor: 0.16,
  radialDecay: 3.2,
  axialSeed: 0.025,
  axialExtent: 1.25,
};

export function coreScales(decades) {
  if (!Number.isFinite(decades)) throw new RangeError("Time coordinate must be finite");
  const d = Math.max(0, Math.min(SINGULARITY_CONFIG.maxDecades, decades));
  const { h } = SINGULARITY_CONFIG;
  const tau = 10 ** -d;
  const radius = tau ** 0.5;
  const height = tau ** (0.5 - h);
  const speed = tau ** (-0.5 - h);
  const volume = radius * radius * height;
  return { decades: d, tau, radius, height, speed, volume,
    energy: speed * speed * volume, aspect: height / radius };
}

/** Shared presentation clock for both playback and the timeline thumb. */
export function playbackProgress(decades) {
  if (!Number.isFinite(decades)) throw new RangeError("Time coordinate must be finite");
  const { maxDecades, playbackEase } = SINGULARITY_CONFIG;
  return (Math.max(0, Math.min(maxDecades, decades)) / maxDecades) ** (1 / playbackEase);
}

export function playbackDecades(progress) {
  if (!Number.isFinite(progress)) throw new RangeError("Playback progress must be finite");
  const { maxDecades, playbackEase } = SINGULARITY_CONFIG;
  return maxDecades * Math.max(0, Math.min(1, progress)) ** playbackEase;
}

/** Ease into the logarithmic clock so the opening vortex remains visible.
 * Inverting the easing keeps scrubbing and changes in playback rate continuous.
 * Never integrate through T, and never subtract tau from 1 for rendering.
 */
export function advanceDecades(decades, dt, rate = 1) {
  if (![decades, dt, rate].every(Number.isFinite)) throw new RangeError("Playback inputs must be finite");
  const { maxDecades, duration } = SINGULARITY_CONFIG;
  const current = Math.max(0, Math.min(maxDecades, decades));
  if (dt <= 0 || rate <= 0) return current;
  return playbackDecades(playbackProgress(current) + dt * rate / duration);
}

/** Decorative inward spirals with two axial branches. These are neither
 * integrated pathlines nor a numerical approximation of the proof's profiles.
 */
export function createCorePaths(count = SINGULARITY_CONFIG.strands, samples = SINGULARITY_CONFIG.samples) {
  const c = SINGULARITY_CONFIG;
  return Array.from({ length: count }, (_, strand) => {
    const phase = strand * Math.PI * (3 - Math.sqrt(5));
    const branch = strand % 2 ? -1 : 1;
    return Array.from({ length: samples }, (_, i) => {
      const s = i / (samples - 1);
      const r = c.radialFloor + (1 - c.radialFloor) * Math.exp(-c.radialDecay * s);
      const angle = phase + 2 * Math.PI * c.turns * s;
      return { x: r * Math.cos(angle), y: r * Math.sin(angle),
        z: branch * (c.axialSeed + c.axialExtent * s * s), s };
    });
  });
}

/** Uniform magnification preserves the relative axial/radial contraction. */
export function viewScales(scales, magnify = true) {
  const zoom = magnify ? 1 / scales.height : 1;
  return { radial: scales.radius * zoom, axial: scales.height * zoom, zoom };
}
