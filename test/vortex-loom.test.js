import { describe, it, expect } from "vitest";
import { createWeave, loomState, activePulses, pulseAt, pulsePoint, filamentPoint, LOOM_CONFIG } from "../demos/js/nsvortex-model.js";

describe("Navier–Stokes Vortex artwork", () => {
  it("reproduces seeded geometry at a scrubbed time without frame history", () => {
    const weave = createWeave(42), motion = loomState(37).motion;
    const snapshot = seed => createWeave(seed).map(s => filamentPoint(s, 0.4, motion));
    expect(weave).toEqual(createWeave(42));
    expect(snapshot(42)).toEqual(snapshot(42));
    expect(snapshot(43)).not.toEqual(snapshot(42));
    expect(weave.some(s => s.branch < 0)).toBe(true);
    expect(weave.some(s => s.branch > 0)).toBe(true);
  });
  it("has continuous activity, bounded envelopes, and finite geometry throughout the film", () => {
    for (let seconds = 0; seconds <= LOOM_CONFIG.duration; seconds += 0.2) {
      const state = loomState(seconds), pulses = activePulses(state.decades);
      expect(pulses.length).toBeGreaterThan(0);
      expect(pulses.length).toBeLessThanOrEqual(4);
      for (const p of pulses) {
        expect(p.envelope).toBeGreaterThan(0);
        expect(p.envelope).toBeLessThanOrEqual(1);
        expect(Object.values(pulsePoint(p, 1.2, 0.7, state.motion)).every(Number.isFinite)).toBe(true);
      }
    }
    expect(loomState(10000).scales.tau).toBe(1e-12);
    expect(loomState(10000)).toEqual(loomState(LOOM_CONFIG.duration));
    expect(loomState(-10)).toEqual(loomState(0));
    expect(loomState(-10).progress).toBe(0);
    expect(() => loomState(NaN)).toThrow(RangeError);
  });
  it("seeds, amplifies and damps each pulse with increasing radial shear and closed angular seams", () => {
    const birth = 3 * LOOM_CONFIG.spacing - 0.7, life = LOOM_CONFIG.lifetime;
    const early = pulseAt(birth + life * 0.1, 3), peak = pulseAt(birth + life * 0.5, 3);
    const late = pulseAt(birth + life * 0.9, 3);
    expect(pulseAt(birth, 3).envelope).toBe(0);
    expect(pulseAt(birth + life + 0.01, 3).envelope).toBe(0);
    expect(peak.envelope).toBeGreaterThan(early.envelope);
    expect(late.envelope).toBeLessThan(peak.envelope);
    expect(late.shear).toBeGreaterThan(early.shear);
    for (const pulse of [early, peak, late]) {
      const a = pulsePoint(pulse, 0, 0.3, 7), b = pulsePoint(pulse, 2 * Math.PI, 0.3, 7);
      for (const key of ["x", "y", "z"]) expect(a[key]).toBeCloseTo(b[key], 12);
    }
  });
  it("preserves the paper's aspect ratio while the follow camera magnifies contraction", () => {
    const world = loomState(48, false), follow = loomState(48, true);
    expect(follow.view.axial / follow.view.radial).toBeCloseTo(world.scales.aspect, 12);
    expect(follow.view.zoom).toBeGreaterThan(900);
    expect(world.scales.energy).toBeLessThan(loomState(0).scales.energy);
    expect(world.scales.speed).toBeGreaterThan(loomState(0).scales.speed);
  });
});
