import { describe, it, expect } from "vitest";
import {
  getOrionPos,
  getMoonPos,
  getOrionVelocity,
  getPhase,
  getMoonOrbitPoints,
  buildTrajectoryCurve,
  getTrajProgress,
  dist3d,
  formatElapsed,
  TRAJ_START_DAY,
  TLI_DAY,
  MISSION_DAYS,
  EARTH_RADIUS_KM,
  MOON_RADIUS_KM,
} from "../../demos/js/artemis2.data.js";

describe("Artemis II Data Module", () => {
  describe("getOrionPos()", () => {
    it("returns an object with x, y, z", () => {
      const pos = getOrionPos(TLI_DAY);
      expect(pos).toHaveProperty("x");
      expect(pos).toHaveProperty("y");
      expect(pos).toHaveProperty("z");
    });

    it("Orion starts near Earth at early mission time", () => {
      const pos = getOrionPos(0.2);
      const dist = Math.hypot(pos.x, pos.y, pos.z);
      // Should be in low-Earth orbit / early phase, < 100,000 km
      expect(dist).toBeLessThan(100000);
    });

    it("Orion reaches lunar distance during flyby (day ~6)", () => {
      const pos = getOrionPos(6);
      const dist = Math.hypot(pos.x, pos.y, pos.z);
      // Should be near Moon's orbital distance (~300,000-400,000 km)
      expect(dist).toBeGreaterThan(250000);
    });

    it("Orion returns near Earth at end of mission", () => {
      const pos = getOrionPos(MISSION_DAYS - 0.1);
      const dist = Math.hypot(pos.x, pos.y, pos.z);
      expect(dist).toBeLessThan(150000);
    });
  });

  describe("getMoonPos()", () => {
    it("Moon is near its expected orbital distance", () => {
      for (let day = 1; day <= 9; day++) {
        const pos = getMoonPos(day);
        const dist = Math.hypot(pos.x, pos.y, pos.z);
        expect(dist).toBeGreaterThan(340000);
        expect(dist).toBeLessThan(410000);
      }
    });
  });

  describe("getOrionVelocity()", () => {
    it("returns positive velocity", () => {
      const v = getOrionVelocity(3);
      expect(v).toBeGreaterThan(0);
    });

    it("velocity is in reasonable range (0.5-12 km/s)", () => {
      for (let day = TLI_DAY + 0.5; day < MISSION_DAYS - 0.5; day += 1) {
        const v = getOrionVelocity(day);
        expect(v).toBeGreaterThan(0.5);
        expect(v).toBeLessThan(12);
      }
    });
  });

  describe("getPhase()", () => {
    it("returns correct phases at key times", () => {
      expect(getPhase(0.5)).toBe("Earth Orbit");
      expect(getPhase(1.2)).toBe("Translunar Injection");
      expect(getPhase(3)).toBe("Translunar Coast");
      expect(getPhase(5)).toBe("Lunar Flyby");
      expect(getPhase(7)).toBe("Return Transit");
      expect(getPhase(9.8)).toBe("Re-entry");
      expect(getPhase(10.5)).toBe("Mission Complete");
    });
  });

  describe("getMoonOrbitPoints()", () => {
    it("returns an array of points", () => {
      const pts = getMoonOrbitPoints();
      expect(pts.length).toBe(329);
      expect(pts[0]).toHaveProperty("x");
      expect(pts[0]).toHaveProperty("y");
      expect(pts[0]).toHaveProperty("z");
    });
  });

  describe("buildTrajectoryCurve()", () => {
    it("returns a dense array of points (post-TLI)", () => {
      const curve = buildTrajectoryCurve();
      // 41 launch spiral + (107 - 1) * 10 subdivisions + 1 final = 2131
      expect(curve.length).toBe(2131);
    });
  });

  describe("getTrajProgress()", () => {
    it("returns 0 at trajectory start", () => {
      expect(getTrajProgress(TRAJ_START_DAY, 2131)).toBe(0);
    });

    it("returns max near end of mission", () => {
      const idx = getTrajProgress(MISSION_DAYS, 2131);
      expect(idx).toBe(2130);
    });
  });

  describe("dist3d()", () => {
    it("calculates distance correctly", () => {
      const d = dist3d({ x: 3, y: 4, z: 0 }, { x: 0, y: 0, z: 0 });
      expect(d).toBeCloseTo(5, 5);
    });
  });

  describe("formatElapsed()", () => {
    it("formats seconds correctly", () => {
      expect(formatElapsed(0)).toBe("T+00:00:00:00");
      expect(formatElapsed(90061)).toBe("T+01:01:01:01");
      expect(formatElapsed(864000)).toBe("T+10:00:00:00");
    });
  });
});
