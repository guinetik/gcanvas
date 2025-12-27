import { describe, it, expect } from "vitest";
import { decayingOrbitalRadius, getTerminalTrajectory } from "../../src/math/orbital";

describe("Orbital Math Utilities", () => {
    describe("decayingOrbitalRadius", () => {
        it("should return the initial radius when t=0", () => {
            const r0 = 100;
            const decay = 0.5;
            const r = decayingOrbitalRadius(r0, decay, 0);
            expect(r).toBe(r0);
        });

        it("should decay the radius over time", () => {
            const r0 = 100;
            const decay = 0.5;
            const r1 = decayingOrbitalRadius(r0, decay, 1);
            const r2 = decayingOrbitalRadius(r0, decay, 2);

            expect(r1).toBeLessThan(r0);
            expect(r2).toBeLessThan(r1);
            expect(r1).toBeCloseTo(100 * Math.exp(-0.5), 5);
        });

        it("should handle zero decay factor", () => {
            const r0 = 100;
            const r = decayingOrbitalRadius(r0, 0, 10);
            expect(r).toBe(r0);
        });
    });

    describe("getTerminalTrajectory", () => {
        it("should return start position at progress=0", () => {
            const start = { x: 100, y: 50, z: 25 };
            const pos = getTerminalTrajectory(start.x, start.y, start.z, 0);
            expect(pos).toEqual(start);
        });

        it("should return origin at progress=1", () => {
            const start = { x: 100, y: 50, z: 25 };
            const pos = getTerminalTrajectory(start.x, start.y, start.z, 1);
            expect(pos).toEqual({ x: 0, y: 0, z: 0 });
        });

        it("should interpolate linearly by default", () => {
            const start = { x: 100, y: 100, z: 100 };
            const pos = getTerminalTrajectory(start.x, start.y, start.z, 0.5);
            expect(pos).toEqual({ x: 50, y: 50, z: 50 });
        });

        it("should apply easing function if provided", () => {
            const start = { x: 100, y: 100, z: 100 };
            const easeInQuad = (t) => t * t;
            const pos = getTerminalTrajectory(start.x, start.y, start.z, 0.5, easeInQuad);
            // 0.5 * 0.5 = 0.25
            // 100 * (1 - 0.25) = 75
            expect(pos.x).toBe(75);
            expect(pos.y).toBe(75);
            expect(pos.z).toBe(75);
        });
    });
});
