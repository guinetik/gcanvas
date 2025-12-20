import { describe, it, expect } from "vitest";
import { Particle } from "../../src/particle/particle";

describe("Particle", () => {
  describe("constructor", () => {
    it("should initialize with default values", () => {
      const p = new Particle();

      // Position
      expect(p.x).toBe(0);
      expect(p.y).toBe(0);
      expect(p.z).toBe(0);

      // Velocity
      expect(p.vx).toBe(0);
      expect(p.vy).toBe(0);
      expect(p.vz).toBe(0);

      // Appearance
      expect(p.size).toBe(1);
      expect(p.color).toEqual({ r: 255, g: 255, b: 255, a: 1 });
      expect(p.shape).toBe("circle");

      // Lifecycle
      expect(p.age).toBe(0);
      expect(p.lifetime).toBe(1);
      expect(p.alive).toBe(true);

      // Custom data
      expect(p.custom).toEqual({});
    });
  });

  describe("reset", () => {
    it("should reset all properties to defaults", () => {
      const p = new Particle();

      // Modify all properties
      p.x = 100;
      p.y = 200;
      p.z = 300;
      p.vx = 10;
      p.vy = 20;
      p.vz = 30;
      p.size = 5;
      p.color = { r: 100, g: 50, b: 25, a: 0.5 };
      p.shape = "square";
      p.age = 2;
      p.lifetime = 5;
      p.alive = false;
      p.custom.foo = "bar";

      // Reset
      p.reset();

      // Verify defaults
      expect(p.x).toBe(0);
      expect(p.y).toBe(0);
      expect(p.z).toBe(0);
      expect(p.vx).toBe(0);
      expect(p.vy).toBe(0);
      expect(p.vz).toBe(0);
      expect(p.size).toBe(1);
      expect(p.color).toEqual({ r: 255, g: 255, b: 255, a: 1 });
      expect(p.shape).toBe("circle");
      expect(p.age).toBe(0);
      expect(p.lifetime).toBe(1);
      expect(p.alive).toBe(true);
      expect(p.custom).toEqual({});
    });

    it("should clear custom data", () => {
      const p = new Particle();
      p.custom.key1 = "value1";
      p.custom.key2 = "value2";

      p.reset();

      expect(Object.keys(p.custom).length).toBe(0);
    });
  });

  describe("progress", () => {
    it("should calculate progress as age/lifetime", () => {
      const p = new Particle();
      p.lifetime = 4;
      p.age = 1;

      expect(p.progress).toBe(0.25);
    });

    it("should return 0 at birth", () => {
      const p = new Particle();
      p.lifetime = 2;
      p.age = 0;

      expect(p.progress).toBe(0);
    });

    it("should return 1 at death", () => {
      const p = new Particle();
      p.lifetime = 2;
      p.age = 2;

      expect(p.progress).toBe(1);
    });

    it("should handle zero lifetime", () => {
      const p = new Particle();
      p.lifetime = 0;
      p.age = 0;

      expect(p.progress).toBe(1);
    });
  });
});
