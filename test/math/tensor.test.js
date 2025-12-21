import { describe, it, expect } from "vitest";
import { Tensor } from "../../src/math/tensor";

describe("Tensor class", () => {
    describe("Basic Operations", () => {
        it("should create a tensor from components", () => {
            const components = [
                [1, 2],
                [3, 4],
            ];
            const t = new Tensor(components);
            expect(t.get(0, 0)).toBe(1);
            expect(t.get(1, 1)).toBe(4);
            expect(t.dimension).toBe(2);
        });

        it("should be immutable", () => {
            const components = [[1, 2], [3, 4]];
            const t1 = new Tensor(components);
            const t2 = t1.set(0, 0, 9);

            expect(t1.get(0, 0)).toBe(1);
            expect(t2.get(0, 0)).toBe(9);
            expect(t1).not.toBe(t2);
        });

        it("should add two tensors", () => {
            const t1 = new Tensor([[1, 0], [0, 1]]);
            const t2 = new Tensor([[1, 2], [3, 4]]);
            const sum = t1.add(t2);
            expect(sum.get(0, 1)).toBe(2);
            expect(sum.get(1, 1)).toBe(5);
        });

        it("should scale a tensor", () => {
            const t = new Tensor([[1, 2], [3, 4]]);
            const scaled = t.scale(2);
            expect(scaled.get(0, 0)).toBe(2);
            expect(scaled.get(1, 1)).toBe(8);
        });
    });

    describe("Inversion & Determinant (Diagonal Optimizations)", () => {
        it("should compute inverse of a diagonal tensor (fast path)", () => {
            const t = Tensor.diagonal([-1, 0.5, 2, 4]);
            const inv = t.inverse();
            expect(inv.get(0, 0)).toBe(-1);
            expect(inv.get(1, 1)).toBe(2);
            expect(inv.get(2, 2)).toBe(0.5);
            expect(inv.get(3, 3)).toBe(0.25);
        });

        it("should compute determinant of a diagonal matrix (fast path)", () => {
            const t = Tensor.diagonal([-1, 1, 1, 1]);
            expect(t.determinant()).toBe(-1);
        });

        it("should compute inverse of a non-diagonal matrix (Gaussian elimination)", () => {
            const t = new Tensor([
                [1, 2],
                [3, 4]
            ]);
            const inv = t.inverse();
            // det = 1*4 - 2*3 = -2
            // inv = (-1/2) * [4, -2; -3, 1] = [-2, 1; 1.5, -0.5]
            expect(inv.get(0, 0)).toBeCloseTo(-2, 10);
            expect(inv.get(0, 1)).toBeCloseTo(1, 10);
            expect(inv.get(1, 0)).toBeCloseTo(1.5, 10);
            expect(inv.get(1, 1)).toBeCloseTo(-0.5, 10);
        });
    });

    describe("GR Metrics", () => {
        it("should create Schwarzschild metric", () => {
            const g = Tensor.schwarzschild(10, 2);
            expect(g.name).toBe("Schwarzschild");
            // factor = 1 - 2/10 = 0.8
            expect(g.get(0, 0)).toBe(-0.8);
            expect(g.get(1, 1)).toBeCloseTo(1 / 0.8, 5);
        });

        it("should create contravariant Schwarzschild metric directly", () => {
            const gInv = Tensor.schwarzschildContravariant(10, 2);
            expect(gInv.get(0, 0)).toBeCloseTo(-1 / 0.8, 5);
            expect(gInv.get(1, 1)).toBe(0.8);
        });

        it("should match numerical inverse for Kerr metric", () => {
            const r = 10, theta = Math.PI / 4, M = 1, a = 0.6;
            const g = Tensor.kerr(r, theta, M, a);
            const gInvNumerical = g.inverse();
            const gInvAnalytical = Tensor.kerrContravariant(r, theta, M, a);

            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    expect(gInvAnalytical.get(i, j)).toBeCloseTo(gInvNumerical.get(i, j), 8);
                }
            }
        });

        it("should compute analytical Christoffel symbols for Schwarzschild", () => {
            const r = 10, rs = 2, theta = Math.PI / 2;
            const pos = [0, r, theta, 0];
            pos._rs = rs;

            const gamma = Tensor.christoffel((p) => Tensor.schwarzschild(p[1], rs, p[2]), pos);

            // factor = 0.8
            // Gamma^t_tr = rs / (2r^2 * factor) = 2 / (200 * 0.8) = 2 / 160 = 0.0125
            expect(gamma[0][0][1]).toBeCloseTo(0.0125, 8);
            expect(gamma[0][1][0]).toBeCloseTo(0.0125, 8);
        });
    });
});
