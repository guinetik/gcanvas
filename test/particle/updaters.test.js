import { describe, it, expect, vi } from "vitest";
import { Updaters } from "../../src/particle/updaters";
import { Particle } from "../../src/particle/particle";

describe("Updaters", () => {
  describe("velocity", () => {
    it("should apply velocity to position", () => {
      const p = new Particle();
      p.vx = 100;
      p.vy = 200;
      p.vz = 50;

      Updaters.velocity(p, 0.5);

      expect(p.x).toBe(50); // 100 * 0.5
      expect(p.y).toBe(100); // 200 * 0.5
      expect(p.z).toBe(25); // 50 * 0.5
    });
  });

  describe("lifetime", () => {
    it("should increment age", () => {
      const p = new Particle();
      p.lifetime = 2;

      Updaters.lifetime(p, 0.5);

      expect(p.age).toBe(0.5);
      expect(p.alive).toBe(true);
    });

    it("should kill particle when age exceeds lifetime", () => {
      const p = new Particle();
      p.lifetime = 1;
      p.age = 0.5;

      Updaters.lifetime(p, 0.6);

      expect(p.age).toBe(1.1);
      expect(p.alive).toBe(false);
    });

    it("should kill particle exactly at lifetime", () => {
      const p = new Particle();
      p.lifetime = 1;
      p.age = 0;

      Updaters.lifetime(p, 1);

      expect(p.alive).toBe(false);
    });
  });

  describe("gravity", () => {
    it("should apply downward velocity", () => {
      const p = new Particle();
      const gravityUpdater = Updaters.gravity(200);

      gravityUpdater(p, 0.5);

      expect(p.vy).toBe(100); // 200 * 0.5
    });

    it("should use default strength", () => {
      const p = new Particle();
      const gravityUpdater = Updaters.gravity();

      gravityUpdater(p, 1);

      expect(p.vy).toBe(200); // default
    });

    it("should accumulate over time", () => {
      const p = new Particle();
      const gravityUpdater = Updaters.gravity(100);

      gravityUpdater(p, 0.1);
      gravityUpdater(p, 0.1);

      expect(p.vy).toBe(20); // 10 + 10
    });
  });

  describe("rise", () => {
    it("should apply upward velocity", () => {
      const p = new Particle();
      const riseUpdater = Updaters.rise(100);

      riseUpdater(p, 0.5);

      expect(p.vy).toBe(-50); // -100 * 0.5
    });

    it("should use default strength", () => {
      const p = new Particle();
      const riseUpdater = Updaters.rise();

      riseUpdater(p, 1);

      expect(p.vy).toBe(-100);
    });
  });

  describe("damping", () => {
    it("should reduce velocity by factor", () => {
      const p = new Particle();
      p.vx = 100;
      p.vy = 100;
      p.vz = 100;

      const dampingUpdater = Updaters.damping(0.9);
      dampingUpdater(p, 0); // dt not used

      expect(p.vx).toBe(90);
      expect(p.vy).toBe(90);
      expect(p.vz).toBe(90);
    });

    it("should use default factor", () => {
      const p = new Particle();
      p.vx = 100;

      const dampingUpdater = Updaters.damping();
      dampingUpdater(p, 0);

      expect(p.vx).toBe(98); // 100 * 0.98
    });
  });

  describe("fadeOut", () => {
    it("should fade alpha based on progress", () => {
      const p = new Particle();
      p.lifetime = 1;

      // At start
      p.age = 0;
      Updaters.fadeOut(p, 0);
      expect(p.color.a).toBe(1);

      // At 50%
      p.age = 0.5;
      Updaters.fadeOut(p, 0);
      expect(p.color.a).toBe(0.5);

      // At end
      p.age = 1;
      Updaters.fadeOut(p, 0);
      expect(p.color.a).toBe(0);
    });
  });

  describe("fadeInOut", () => {
    it("should fade in then out (peak at 50%)", () => {
      const p = new Particle();
      p.lifetime = 1;

      // At start
      p.age = 0;
      Updaters.fadeInOut(p, 0);
      expect(p.color.a).toBe(0);

      // At 25%
      p.age = 0.25;
      Updaters.fadeInOut(p, 0);
      expect(p.color.a).toBe(0.5);

      // At 50% (peak)
      p.age = 0.5;
      Updaters.fadeInOut(p, 0);
      expect(p.color.a).toBe(1);

      // At 75%
      p.age = 0.75;
      Updaters.fadeInOut(p, 0);
      expect(p.color.a).toBe(0.5);

      // At end
      p.age = 1;
      Updaters.fadeInOut(p, 0);
      expect(p.color.a).toBe(0);
    });
  });

  describe("shrink", () => {
    it("should shrink size over lifetime", () => {
      const p = new Particle();
      p.size = 10;
      p.lifetime = 1;

      const shrinkUpdater = Updaters.shrink(0);

      // At start
      p.age = 0;
      shrinkUpdater(p, 0);
      expect(p.size).toBe(10);

      // At 50%
      p.age = 0.5;
      shrinkUpdater(p, 0);
      expect(p.size).toBe(5);

      // At end
      p.age = 1;
      shrinkUpdater(p, 0);
      expect(p.size).toBe(0);
    });

    it("should respect endScale parameter", () => {
      const p = new Particle();
      p.size = 10;
      p.lifetime = 1;

      const shrinkUpdater = Updaters.shrink(0.5);

      // At end
      p.age = 1;
      shrinkUpdater(p, 0);
      expect(p.size).toBe(5); // 10 * 0.5
    });
  });

  describe("grow", () => {
    it("should grow size over lifetime", () => {
      const p = new Particle();
      p.size = 5;
      p.lifetime = 1;

      const growUpdater = Updaters.grow(3);

      // At start
      p.age = 0;
      growUpdater(p, 0);
      expect(p.size).toBe(5);

      // At 50%
      p.age = 0.5;
      growUpdater(p, 0);
      expect(p.size).toBe(10); // 5 * (1 + 0.5 * (3-1)) = 5 * 2 = 10

      // At end
      p.age = 1;
      growUpdater(p, 0);
      expect(p.size).toBe(15); // 5 * 3
    });
  });

  describe("colorOverLife", () => {
    it("should interpolate color over lifetime", () => {
      const p = new Particle();
      p.lifetime = 1;

      const startColor = { r: 255, g: 0, b: 0 };
      const endColor = { r: 0, g: 255, b: 0 };

      const colorUpdater = Updaters.colorOverLife(startColor, endColor);

      // At start
      p.age = 0;
      colorUpdater(p, 0);
      expect(p.color.r).toBe(255);
      expect(p.color.g).toBe(0);
      expect(p.color.b).toBe(0);

      // At 50%
      p.age = 0.5;
      colorUpdater(p, 0);
      expect(p.color.r).toBe(127);
      expect(p.color.g).toBe(127);
      expect(p.color.b).toBe(0);

      // At end
      p.age = 1;
      colorUpdater(p, 0);
      expect(p.color.r).toBe(0);
      expect(p.color.g).toBe(255);
      expect(p.color.b).toBe(0);
    });
  });

  describe("wobble", () => {
    it("should add random velocity perturbation", () => {
      const p = new Particle();
      p.vx = 0;
      p.vy = 0;

      const mockRandom = vi.spyOn(Math, "random");
      mockRandom.mockReturnValue(1); // Max positive

      const wobbleUpdater = Updaters.wobble(100);
      wobbleUpdater(p, 1);

      // (1 - 0.5) * 100 * 1 = 50
      expect(p.vx).toBe(50);
      expect(p.vy).toBe(50);

      mockRandom.mockRestore();
    });
  });

  describe("bounds", () => {
    it("should bounce particles at boundaries", () => {
      const bounds = { left: 0, right: 100, top: 0, bottom: 100 };
      const boundsUpdater = Updaters.bounds(bounds, 1);

      // Left boundary
      const p1 = new Particle();
      p1.x = -10;
      p1.vx = -50;
      boundsUpdater(p1, 0);
      expect(p1.x).toBe(0);
      expect(p1.vx).toBe(50);

      // Right boundary
      const p2 = new Particle();
      p2.x = 110;
      p2.vx = 50;
      boundsUpdater(p2, 0);
      expect(p2.x).toBe(100);
      expect(p2.vx).toBe(-50);

      // Top boundary
      const p3 = new Particle();
      p3.y = -10;
      p3.vy = -50;
      boundsUpdater(p3, 0);
      expect(p3.y).toBe(0);
      expect(p3.vy).toBe(50);

      // Bottom boundary
      const p4 = new Particle();
      p4.y = 110;
      p4.vy = 50;
      boundsUpdater(p4, 0);
      expect(p4.y).toBe(100);
      expect(p4.vy).toBe(-50);
    });

    it("should apply bounce factor", () => {
      const bounds = { left: 0, right: 100, top: 0, bottom: 100 };
      const boundsUpdater = Updaters.bounds(bounds, 0.5);

      const p = new Particle();
      p.x = -10;
      p.vx = -100;
      boundsUpdater(p, 0);

      expect(p.vx).toBe(50); // 100 * 0.5
    });
  });

  describe("attract", () => {
    it("should accelerate toward target", () => {
      const target = { x: 100, y: 0, z: 0 };
      const attractUpdater = Updaters.attract(target, 100);

      const p = new Particle();
      attractUpdater(p, 1);

      // Should have positive vx (moving toward target)
      expect(p.vx).toBeGreaterThan(0);
    });

    it("should not divide by zero when at target", () => {
      const target = { x: 0, y: 0, z: 0 };
      const attractUpdater = Updaters.attract(target, 100);

      const p = new Particle();
      p.x = 0;
      p.y = 0;
      p.z = 0;

      // Should not throw
      expect(() => attractUpdater(p, 1)).not.toThrow();
    });

    it("should handle 3D attraction", () => {
      const target = { x: 0, y: 0, z: 100 };
      const attractUpdater = Updaters.attract(target, 100);

      const p = new Particle();
      attractUpdater(p, 1);

      expect(p.vz).toBeGreaterThan(0);
    });
  });
});
