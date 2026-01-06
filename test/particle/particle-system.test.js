import { describe, it, expect, vi, beforeEach } from "vitest";
import { ParticleSystem } from "../../src/particle/particle-system";
import { ParticleEmitter } from "../../src/particle/emitter";
import { Updaters } from "../../src/particle/updaters";
import { Particle } from "../../src/particle/particle";

// Mock the game object
const createMockGame = () => ({
  width: 800,
  height: 600,
});

describe("ParticleSystem", () => {
  let mockGame;

  beforeEach(() => {
    mockGame = createMockGame();
  });

  describe("constructor", () => {
    it("should initialize with default values", () => {
      const system = new ParticleSystem(mockGame);

      expect(system.particles).toEqual([]);
      expect(system.pool).toEqual([]);
      expect(system.maxParticles).toBe(5000);
      expect(system.emitters).toBeInstanceOf(Map);
      expect(system.emitters.size).toBe(0);
      expect(system.camera).toBeNull();
      expect(system.depthSort).toBe(false);
      expect(system.blendMode).toBe("source-over");
      expect(system.worldSpace).toBe(false);
      expect(system.particleCount).toBe(0);
    });

    it("should accept custom options", () => {
      const mockCamera = { project: vi.fn() };
      const system = new ParticleSystem(mockGame, {
        maxParticles: 1000,
        camera: mockCamera,
        depthSort: true,
        blendMode: "screen",
        worldSpace: true,
        updaters: [Updaters.velocity],
      });

      expect(system.maxParticles).toBe(1000);
      expect(system.camera).toBe(mockCamera);
      expect(system.depthSort).toBe(true);
      expect(system.blendMode).toBe("screen");
      expect(system.worldSpace).toBe(true);
      expect(system.updaters).toEqual([Updaters.velocity]);
    });
  });

  describe("emitter management", () => {
    it("should add emitters", () => {
      const system = new ParticleSystem(mockGame);
      const emitter = new ParticleEmitter({ rate: 10 });

      system.addEmitter("fire", emitter);

      expect(system.emitters.has("fire")).toBe(true);
      expect(system.getEmitter("fire")).toBe(emitter);
    });

    it("should remove emitters", () => {
      const system = new ParticleSystem(mockGame);
      const emitter = new ParticleEmitter({ rate: 10 });

      system.addEmitter("fire", emitter);
      system.removeEmitter("fire");

      expect(system.emitters.has("fire")).toBe(false);
    });

    it("should return undefined for non-existent emitter", () => {
      const system = new ParticleSystem(mockGame);

      expect(system.getEmitter("nonexistent")).toBeUndefined();
    });

    it("should support chaining on addEmitter/removeEmitter", () => {
      const system = new ParticleSystem(mockGame);
      const emitter = new ParticleEmitter();

      const result1 = system.addEmitter("test", emitter);
      const result2 = system.removeEmitter("test");

      expect(result1).toBe(system);
      expect(result2).toBe(system);
    });
  });

  describe("object pooling", () => {
    it("should acquire particles from pool when available", () => {
      const system = new ParticleSystem(mockGame);

      // Add particle to pool
      const pooledParticle = new Particle();
      system.pool.push(pooledParticle);

      const acquired = system.acquire();

      expect(acquired).toBe(pooledParticle);
      expect(system.pool.length).toBe(0);
    });

    it("should create new particle when pool is empty", () => {
      const system = new ParticleSystem(mockGame);

      const acquired = system.acquire();

      expect(acquired).toBeInstanceOf(Particle);
    });

    it("should release particles back to pool", () => {
      const system = new ParticleSystem(mockGame);
      const particle = new Particle();
      particle.x = 100;
      particle.y = 200;

      system.release(particle);

      expect(system.pool.length).toBe(1);
      expect(system.pool[0]).toBe(particle);
      // Particle should be reset
      expect(particle.x).toBe(0);
      expect(particle.y).toBe(0);
    });
  });

  describe("emit", () => {
    it("should emit particles using emitter", () => {
      const system = new ParticleSystem(mockGame);
      const emitter = new ParticleEmitter({
        position: { x: 100, y: 200 },
      });

      system.emit(5, emitter);

      expect(system.particles.length).toBe(5);
      // particleCount is updated after update() call
    });

    it("should not exceed maxParticles", () => {
      const system = new ParticleSystem(mockGame, { maxParticles: 3 });
      const emitter = new ParticleEmitter();

      system.emit(10, emitter);

      expect(system.particles.length).toBe(3);
    });
  });

  describe("burst", () => {
    it("should burst spawn with emitter instance", () => {
      const system = new ParticleSystem(mockGame);
      const emitter = new ParticleEmitter();

      system.burst(5, emitter);

      expect(system.particles.length).toBe(5);
    });

    it("should burst spawn with emitter name", () => {
      const system = new ParticleSystem(mockGame);
      const emitter = new ParticleEmitter();
      system.addEmitter("explosion", emitter);

      system.burst(5, "explosion");

      expect(system.particles.length).toBe(5);
    });

    it("should do nothing with invalid emitter name", () => {
      const system = new ParticleSystem(mockGame);

      system.burst(5, "nonexistent");

      expect(system.particles.length).toBe(0);
    });
  });

  describe("update", () => {
    it("should update particles with all updaters", () => {
      const customUpdater = vi.fn();
      const system = new ParticleSystem(mockGame, {
        updaters: [customUpdater],
      });

      const emitter = new ParticleEmitter({ lifetime: { min: 10, max: 10 } });
      system.emit(2, emitter);

      system.update(0.016);

      expect(customUpdater).toHaveBeenCalledTimes(2);
    });

    it("should remove dead particles", () => {
      const system = new ParticleSystem(mockGame, {
        updaters: [Updaters.lifetime],
      });

      const emitter = new ParticleEmitter({
        lifetime: { min: 0.1, max: 0.1 },
      });
      system.emit(3, emitter);

      // Large time step to kill particles
      system.update(1);

      expect(system.particles.length).toBe(0);
    });

    it("should return dead particles to pool", () => {
      const system = new ParticleSystem(mockGame, {
        updaters: [Updaters.lifetime],
      });

      const emitter = new ParticleEmitter({
        lifetime: { min: 0.1, max: 0.1 },
      });
      system.emit(3, emitter);

      system.update(1);

      expect(system.pool.length).toBe(3);
    });

    it("should spawn particles from active emitters", () => {
      const system = new ParticleSystem(mockGame);
      const emitter = new ParticleEmitter({
        rate: 100, // 100 per second
        lifetime: { min: 10, max: 10 },
      });
      system.addEmitter("continuous", emitter);

      system.update(0.1); // 10 particles expected

      expect(system.particles.length).toBe(10);
    });

    it("should not spawn from inactive emitters", () => {
      const system = new ParticleSystem(mockGame);
      const emitter = new ParticleEmitter({
        rate: 100,
        active: false,
      });
      system.addEmitter("disabled", emitter);

      system.update(0.1);

      expect(system.particles.length).toBe(0);
    });
  });

  describe("clear", () => {
    it("should remove all particles", () => {
      const system = new ParticleSystem(mockGame);
      const emitter = new ParticleEmitter();
      system.emit(10, emitter);

      system.clear();

      expect(system.particles.length).toBe(0);
      expect(system.particleCount).toBe(0);
    });

    it("should return particles to pool", () => {
      const system = new ParticleSystem(mockGame);
      const emitter = new ParticleEmitter();
      system.emit(10, emitter);

      system.clear();

      expect(system.pool.length).toBe(10);
    });
  });

  describe("stats", () => {
    it("should track particle count", () => {
      const system = new ParticleSystem(mockGame);
      const emitter = new ParticleEmitter({
        lifetime: { min: 10, max: 10 },
      });

      expect(system.particleCount).toBe(0);

      system.emit(5, emitter);
      system.update(0);

      expect(system.particleCount).toBe(5);
    });

    it("should track pool size", () => {
      const system = new ParticleSystem(mockGame);

      expect(system.poolSize).toBe(0);

      const emitter = new ParticleEmitter({
        lifetime: { min: 0.01, max: 0.01 },
      });
      system.emit(5, emitter);
      system.update(1); // Kill all

      expect(system.poolSize).toBe(5);
    });
  });
});
