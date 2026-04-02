import { describe, it, expect, beforeAll } from "vitest";
import { computeTrajectory, readFrame, interpolateState } from "../../demos/js/artemis2.physics.js";

describe("Artemis II Physics", () => {
  let traj;
  beforeAll(() => { traj = computeTrajectory(); });

  describe("computeTrajectory()", () => {
    it("returns correct frame count", () => {
      expect(traj.count).toBe(28800);
    });

    it("returns a Float64Array of correct size", () => {
      expect(traj.frames).toBeInstanceOf(Float64Array);
      expect(traj.frames.length).toBe(28800 * 9);
    });

    it("phase timestamps are in ascending order", () => {
      const { phaseTimestamps: p } = traj;
      expect(p.TRANS_LUNAR).toBe(0);
      expect(p.LUNAR_FLYBY).toBeGreaterThan(p.TRANS_LUNAR);
      expect(p.FREE_RETURN).toBeGreaterThan(p.LUNAR_FLYBY);
      expect(p.REENTRY).toBeGreaterThan(p.FREE_RETURN);
    });

    it("Orion returns to Earth (distance < 15,000 km) by end of simulation", () => {
      const last = readFrame(traj.frames, traj.count - 1);
      const dist = Math.hypot(last.orion.x, last.orion.y, last.orion.z);
      expect(dist).toBeLessThan(15000);
    });

    it("Moon stays near its expected orbital radius throughout", () => {
      for (let i = 0; i < 10; i++) {
        const fi = Math.floor((i / 10) * traj.count);
        const f = readFrame(traj.frames, fi);
        const dist = Math.hypot(f.moon.x, f.moon.y, f.moon.z);
        expect(dist).toBeGreaterThan(340000);
        expect(dist).toBeLessThan(430000);
      }
    });
  });

  describe("readFrame()", () => {
    it("frame 0 has Moon at initial position", () => {
      const f = readFrame(traj.frames, 0);
      expect(f.moon.x).toBe(384400);
      expect(f.moon.y).toBeCloseTo(0, 1);
    });

    it("frame 0 has Orion at initial position", () => {
      const f = readFrame(traj.frames, 0);
      expect(f.orion.x).toBeCloseTo(6556, 0);
    });

    it("frame 0 has Orion velocity matching INIT", () => {
      const f = readFrame(traj.frames, 0);
      // vx = 10.8 * cos(25°) ≈ 9.788, vy = 10.8 * sin(25°) ≈ 4.562
      expect(f.orion.vx).toBeCloseTo(9.79, 1);
      expect(f.orion.vy).toBeGreaterThan(4);
    });
  });

  describe("interpolateState()", () => {
    it("at t=0 matches frame 0", () => {
      const s = interpolateState(traj.frames, 0, traj.dt);
      const f = readFrame(traj.frames, 0);
      expect(s.orion.x).toBeCloseTo(f.orion.x, 3);
    });

    it("at t between frames interpolates position", () => {
      const f0 = readFrame(traj.frames, 0);
      const f1 = readFrame(traj.frames, 1);
      const s = interpolateState(traj.frames, traj.dt * 0.5, traj.dt);
      const expected = (f0.orion.x + f1.orion.x) / 2;
      expect(s.orion.x).toBeCloseTo(expected, 3);
    });

    it("at last valid time does not extrapolate", () => {
      const lastT = (traj.count - 1) * traj.dt;
      const s = interpolateState(traj.frames, lastT, traj.dt);
      const f = readFrame(traj.frames, traj.count - 1);
      expect(s.orion.x).toBeCloseTo(f.orion.x, 1);
    });
  });
});
