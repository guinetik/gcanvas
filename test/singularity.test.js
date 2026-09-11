import { describe, expect, it } from "vitest";
import { coreScales, viewScales, advanceDecades, createCorePaths, playbackProgress, playbackDecades, SINGULARITY_CONFIG as CONFIG } from "../demos/js/singularity-model.js";

describe("Singularity scaling illustration", () => {
  it("concentrates with growing speed and decreasing core energy throughout the displayed range", () => {
    let previous = coreScales(0);
    for (let d = 0.1; d <= CONFIG.maxDecades; d += 0.1) {
      const s = coreScales(d);
      expect(Object.values(s).every(Number.isFinite)).toBe(true);
      expect(s.radius).toBeLessThan(previous.radius);
      expect(s.height).toBeLessThan(previous.height);
      expect(s.speed).toBeGreaterThan(previous.speed);
      expect(s.energy).toBeLessThan(previous.energy);
      expect(s.aspect).toBeGreaterThan(previous.aspect);
      expect(s.energy / s.tau ** (0.5 - 3 * CONFIG.h)).toBeCloseTo(1, 12);
      previous = s;
    }
  });

  it("uses the paper's exponents and preserves aspect ratio under uniform magnification", () => {
    const s = coreScales(6), view = viewScales(s);
    expect(s.radius).toBeCloseTo(0.001, 12);
    expect(s.height / 10 ** -2.97).toBeCloseTo(1, 12);
    expect(s.speed / 10 ** 3.03).toBeCloseTo(1, 12);
    expect(view.axial).toBeCloseTo(1, 12);
    expect(view.axial / view.radial).toBeCloseTo(s.aspect, 12);
    expect(viewScales(s, false)).toEqual({ radial: s.radius, axial: s.height, zoom: 1 });
  });

  it("never steps into the singularity and rejects nonfinite input", () => {
    expect(advanceDecades(0, CONFIG.duration)).toBe(CONFIG.maxDecades);
    expect(advanceDecades(11.99, 1000, 2)).toBe(CONFIG.maxDecades);
    expect(advanceDecades(2, -1)).toBe(2);
    expect(advanceDecades(2, 1, 0)).toBe(2);
    expect(coreScales(1000).tau).toBe(1e-12);
    expect(coreScales(-5).tau).toBe(1);
    expect(() => coreScales(NaN)).toThrow(RangeError);
    expect(() => advanceDecades(0, Infinity)).toThrow(RangeError);
  });

  it("preserves the opening art and advances consistently after scrubbing", () => {
    const openingSeconds = CONFIG.duration / 4;
    const opening = advanceDecades(0, openingSeconds);
    expect(coreScales(opening).radius).toBeGreaterThan(0.9);
    let stepped = 0;
    for (let i = 0; i < openingSeconds * 60; i++) stepped = advanceDecades(stepped, 1 / 60);
    expect(stepped).toBeCloseTo(opening, 10);
    expect(advanceDecades(3, 2)).toBeCloseTo(advanceDecades(advanceDecades(3, 1), 1), 10);
    expect(advanceDecades(3, 2, 0.5)).toBeCloseTo(advanceDecades(3, 1), 10);
  });

  it("makes halfway on the slider match halfway through playback with a visible core", () => {
    const halfway = playbackDecades(0.5);
    expect(halfway).toBeCloseTo(advanceDecades(0, CONFIG.duration / 2), 12);
    expect(coreScales(halfway).radius).toBeGreaterThan(0.4);
    for (const progress of [0, 0.01, 0.25, 0.5, 0.8, 1]) {
      expect(playbackProgress(playbackDecades(progress))).toBeCloseTo(progress, 12);
    }
    // Even a small 100px starting radius remains resolvable through 75%.
    expect(coreScales(playbackDecades(0.75)).radius * 100).toBeGreaterThan(1);
    expect(playbackDecades(1)).toBe(CONFIG.maxDecades);
    expect(playbackDecades(-1)).toBe(0);
    expect(playbackDecades(2)).toBe(CONFIG.maxDecades);
    expect(() => playbackDecades(NaN)).toThrow(RangeError);
    expect(() => playbackProgress(Infinity)).toThrow(RangeError);
  });

  it("keeps both schematic branches finite even at the display limit", () => {
    const paths = createCorePaths(), s = coreScales(CONFIG.maxDecades);
    const view = viewScales(s);
    expect(paths.some((p) => p.at(-1).z < 0)).toBe(true);
    expect(paths.some((p) => p.at(-1).z > 0)).toBe(true);
    for (const path of paths) {
      expect(Math.hypot(path.at(-1).x, path.at(-1).y)).toBeLessThan(Math.hypot(path[0].x, path[0].y));
      for (const point of path) {
        expect([point.x * view.radial, point.y * view.radial, point.z * view.axial].every(Number.isFinite)).toBe(true);
      }
    }
  });
});
