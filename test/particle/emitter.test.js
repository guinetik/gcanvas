import { describe, it, expect, vi, beforeEach } from "vitest";
import { ParticleEmitter } from "../../src/particle/emitter";
import { Particle } from "../../src/particle/particle";

describe("ParticleEmitter", () => {
  describe("constructor", () => {
    it("should initialize with default values", () => {
      const emitter = new ParticleEmitter();

      expect(emitter.rate).toBe(10);
      expect(emitter.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(emitter.spread).toEqual({ x: 0, y: 0, z: 0 });
      expect(emitter.velocity).toEqual({ x: 0, y: 0, z: 0 });
      expect(emitter.velocitySpread).toEqual({ x: 0, y: 0, z: 0 });
      expect(emitter.lifetime).toEqual({ min: 1, max: 2 });
      expect(emitter.size).toEqual({ min: 1, max: 1 });
      expect(emitter.color).toEqual({ r: 255, g: 255, b: 255, a: 1 });
      expect(emitter.shape).toBe("circle");
      expect(emitter.active).toBe(true);
    });

    it("should accept custom options", () => {
      const emitter = new ParticleEmitter({
        rate: 50,
        position: { x: 100, y: 200 },
        velocity: { y: -100 },
        lifetime: { min: 0.5, max: 1.5 },
        size: { min: 2, max: 5 },
        color: { r: 255, g: 0, b: 0, a: 0.8 },
        shape: "square",
        active: false,
      });

      expect(emitter.rate).toBe(50);
      expect(emitter.position).toEqual({ x: 100, y: 200, z: 0 });
      expect(emitter.velocity).toEqual({ x: 0, y: -100, z: 0 });
      expect(emitter.lifetime).toEqual({ min: 0.5, max: 1.5 });
      expect(emitter.size).toEqual({ min: 2, max: 5 });
      expect(emitter.color).toEqual({ r: 255, g: 0, b: 0, a: 0.8 });
      expect(emitter.shape).toBe("square");
      expect(emitter.active).toBe(false);
    });
  });

  describe("emit", () => {
    it("should initialize particle with emitter settings", () => {
      const emitter = new ParticleEmitter({
        position: { x: 100, y: 200, z: 50 },
        velocity: { x: 10, y: -20, z: 5 },
        lifetime: { min: 2, max: 2 },
        size: { min: 3, max: 3 },
        color: { r: 128, g: 64, b: 32, a: 0.5 },
        shape: "triangle",
      });

      const p = new Particle();
      emitter.emit(p);

      expect(p.x).toBe(100);
      expect(p.y).toBe(200);
      expect(p.z).toBe(50);
      expect(p.vx).toBe(10);
      expect(p.vy).toBe(-20);
      expect(p.vz).toBe(5);
      expect(p.lifetime).toBe(2);
      expect(p.size).toBe(3);
      expect(p.color).toEqual({ r: 128, g: 64, b: 32, a: 0.5 });
      expect(p.shape).toBe("triangle");
      expect(p.age).toBe(0);
      expect(p.alive).toBe(true);
    });

    it("should apply position spread", () => {
      const emitter = new ParticleEmitter({
        position: { x: 0, y: 0, z: 0 },
        spread: { x: 100, y: 100, z: 100 },
      });

      // Mock Math.random to return predictable values
      const mockRandom = vi.spyOn(Math, "random");
      mockRandom.mockReturnValue(0.5); // Mid-point = 0 spread

      const p = new Particle();
      emitter.emit(p);

      // With Math.random() = 0.5, spread = (0.5 - 0.5) * 2 * spread = 0
      expect(p.x).toBe(0);
      expect(p.y).toBe(0);
      expect(p.z).toBe(0);

      mockRandom.mockRestore();
    });

    it("should apply velocity spread", () => {
      const emitter = new ParticleEmitter({
        velocity: { x: 100 },
        velocitySpread: { x: 50 },
      });

      const mockRandom = vi.spyOn(Math, "random");
      mockRandom.mockReturnValue(0); // (0 - 0.5) * 2 * 50 = -50

      const p = new Particle();
      emitter.emit(p);

      expect(p.vx).toBe(50); // 100 + (-50)

      mockRandom.mockRestore();
    });

    it("should randomize lifetime within range", () => {
      const emitter = new ParticleEmitter({
        lifetime: { min: 1, max: 3 },
      });

      const mockRandom = vi.spyOn(Math, "random");
      mockRandom.mockReturnValue(0.5);

      const p = new Particle();
      emitter.emit(p);

      expect(p.lifetime).toBe(2); // 1 + 0.5 * (3 - 1)

      mockRandom.mockRestore();
    });

    it("should randomize size within range", () => {
      const emitter = new ParticleEmitter({
        size: { min: 2, max: 10 },
      });

      const mockRandom = vi.spyOn(Math, "random");
      mockRandom.mockReturnValue(0.25);

      const p = new Particle();
      emitter.emit(p);

      expect(p.size).toBe(4); // 2 + 0.25 * (10 - 2)

      mockRandom.mockRestore();
    });
  });

  describe("update", () => {
    it("should return 0 when inactive", () => {
      const emitter = new ParticleEmitter({ rate: 100, active: false });

      expect(emitter.update(1)).toBe(0);
    });

    it("should return 0 when rate is 0", () => {
      const emitter = new ParticleEmitter({ rate: 0 });

      expect(emitter.update(1)).toBe(0);
    });

    it("should emit particles based on rate", () => {
      const emitter = new ParticleEmitter({ rate: 10 }); // 10 particles/second

      // 0.2 seconds should spawn 2 particles
      const count = emitter.update(0.2);

      expect(count).toBe(2);
    });

    it("should accumulate time between frames", () => {
      const emitter = new ParticleEmitter({ rate: 10 }); // interval = 0.1s

      // First frame: 0.05s (not enough for a particle)
      expect(emitter.update(0.05)).toBe(0);

      // Second frame: 0.05s more (total 0.1s = 1 particle)
      expect(emitter.update(0.05)).toBe(1);
    });

    it("should handle high frame rates correctly", () => {
      const emitter = new ParticleEmitter({ rate: 60 });

      // One frame at 60fps = ~0.0167s
      // At 60 particles/second, interval = 0.0167s, so 1 particle per frame
      let total = 0;
      for (let i = 0; i < 60; i++) {
        total += emitter.update(1 / 60);
      }

      expect(total).toBe(60);
    });
  });

  describe("reset", () => {
    it("should reset the emission timer", () => {
      const emitter = new ParticleEmitter({ rate: 10 });

      // Accumulate some time
      emitter.update(0.05);
      expect(emitter._timer).toBeGreaterThan(0);

      // Reset
      emitter.reset();

      expect(emitter._timer).toBe(0);
    });
  });
});
