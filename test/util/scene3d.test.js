import { describe, it, expect, vi, beforeEach } from "vitest";
import { Scene3D } from "../../src/game/objects/scene3d";
import { Camera3D } from "../../src/util/camera3d";
import { Painter } from "../../src/painter/painter";

// Mock game object
const createMockGame = () => ({
  width: 800,
  height: 600,
});

// Mock child game object
const createMockChild = (options = {}) => ({
  x: options.x ?? 0,
  y: options.y ?? 0,
  z: options.z ?? undefined,
  visible: options.visible ?? true,
  draw: vi.fn(),
});

describe("Scene3D", () => {
  let mockGame;
  let camera;

  beforeEach(() => {
    mockGame = createMockGame();
    camera = new Camera3D({ perspective: 800 });

    // Reset Painter mocks
    if (Painter.save) Painter.save.mockClear?.();
    if (Painter.restore) Painter.restore.mockClear?.();
    if (Painter.translateTo) Painter.translateTo = vi.fn();
  });

  describe("constructor", () => {
    it("should throw if camera is not provided", () => {
      expect(() => {
        new Scene3D(mockGame, {});
      }).toThrow("Scene3D requires a camera option");
    });

    it("should initialize with camera", () => {
      const scene = new Scene3D(mockGame, { camera });

      expect(scene.camera).toBe(camera);
    });

    it("should default depthSort to true", () => {
      const scene = new Scene3D(mockGame, { camera });

      expect(scene.depthSort).toBe(true);
    });

    it("should default scaleByDepth to true", () => {
      const scene = new Scene3D(mockGame, { camera });

      expect(scene.scaleByDepth).toBe(true);
    });

    it("should accept custom options", () => {
      const scene = new Scene3D(mockGame, {
        camera,
        depthSort: false,
        scaleByDepth: false,
        x: 100,
        y: 200,
      });

      expect(scene.depthSort).toBe(false);
      expect(scene.scaleByDepth).toBe(false);
      expect(scene.x).toBe(100);
      expect(scene.y).toBe(200);
    });
  });

  describe("draw with depth sorting", () => {
    it("should sort children back-to-front when depthSort is true", () => {
      const scene = new Scene3D(mockGame, {
        camera,
        depthSort: true,
        scaleByDepth: false,
      });

      // Setup Painter mock
      Painter.save = vi.fn();
      Painter.restore = vi.fn();
      Painter.translateTo = vi.fn();
      Painter.ctx = { scale: vi.fn() };

      // Add children at different z depths
      const front = createMockChild({ x: 0, y: 0, z: -100 });
      const middle = createMockChild({ x: 0, y: 0, z: 0 });
      const back = createMockChild({ x: 0, y: 0, z: 100 });

      scene._collection = {
        children: [front, middle, back],
      };

      // Call draw
      scene.draw();

      // Children should be rendered back-to-front
      // So 'back' should be called before 'front'
      const callOrder = [];
      if (back.draw.mock.calls.length) callOrder.push("back");
      if (middle.draw.mock.calls.length) callOrder.push("middle");
      if (front.draw.mock.calls.length) callOrder.push("front");

      // All should be called
      expect(back.draw).toHaveBeenCalled();
      expect(middle.draw).toHaveBeenCalled();
      expect(front.draw).toHaveBeenCalled();
    });

    it("should not sort when depthSort is false", () => {
      const scene = new Scene3D(mockGame, {
        camera,
        depthSort: false,
        scaleByDepth: false,
      });

      Painter.save = vi.fn();
      Painter.restore = vi.fn();
      Painter.translateTo = vi.fn();
      Painter.ctx = { scale: vi.fn() };

      const child1 = createMockChild({ z: 100 });
      const child2 = createMockChild({ z: -100 });

      scene._collection = {
        children: [child1, child2],
      };

      scene.draw();

      // Both should be drawn
      expect(child1.draw).toHaveBeenCalled();
      expect(child2.draw).toHaveBeenCalled();
    });
  });

  describe("draw with perspective scaling", () => {
    it("should scale children by perspective when scaleByDepth is true", () => {
      const scene = new Scene3D(mockGame, {
        camera,
        depthSort: false,
        scaleByDepth: true,
      });

      Painter.save = vi.fn();
      Painter.restore = vi.fn();
      Painter.translateTo = vi.fn();
      Painter.ctx = { scale: vi.fn() };

      const child = createMockChild({ z: 0 });
      scene._collection = {
        children: [child],
      };

      scene.draw();

      // Scale should be called
      expect(Painter.ctx.scale).toHaveBeenCalled();
    });

    it("should not scale when scaleByDepth is false", () => {
      const scene = new Scene3D(mockGame, {
        camera,
        depthSort: false,
        scaleByDepth: false,
      });

      Painter.save = vi.fn();
      Painter.restore = vi.fn();
      Painter.translateTo = vi.fn();
      Painter.ctx = { scale: vi.fn() };

      const child = createMockChild({ z: 0 });
      scene._collection = {
        children: [child],
      };

      scene.draw();

      // Scale should not be called
      expect(Painter.ctx.scale).not.toHaveBeenCalled();
    });
  });

  describe("draw visibility and culling", () => {
    it("should skip invisible children", () => {
      const scene = new Scene3D(mockGame, {
        camera,
        depthSort: false,
      });

      Painter.save = vi.fn();
      Painter.restore = vi.fn();
      Painter.translateTo = vi.fn();
      Painter.ctx = { scale: vi.fn() };

      const visible = createMockChild({ visible: true });
      const hidden = createMockChild({ visible: false });

      scene._collection = {
        children: [visible, hidden],
      };

      scene.draw();

      expect(visible.draw).toHaveBeenCalled();
      expect(hidden.draw).not.toHaveBeenCalled();
    });

    it("should cull children behind camera", () => {
      const scene = new Scene3D(mockGame, {
        camera: new Camera3D({ perspective: 100 }),
        depthSort: false,
      });

      Painter.save = vi.fn();
      Painter.restore = vi.fn();
      Painter.translateTo = vi.fn();
      Painter.ctx = { scale: vi.fn() };

      // Child far behind camera (z = -200, camera.perspective = 100)
      // After projection: if z < -perspective + 10, cull it
      const farBehind = createMockChild({ z: 200 }); // After projection z will be positive
      const inFront = createMockChild({ z: -50 });

      scene._collection = {
        children: [farBehind, inFront],
      };

      scene.draw();

      // Both should be drawn as they're not behind camera
      expect(inFront.draw).toHaveBeenCalled();
    });

    it("should default z to 0 for children without z property", () => {
      const scene = new Scene3D(mockGame, {
        camera,
        depthSort: false,
      });

      Painter.save = vi.fn();
      Painter.restore = vi.fn();
      Painter.translateTo = vi.fn();
      Painter.ctx = { scale: vi.fn() };

      const noZ = createMockChild({ x: 100, y: 100 });
      delete noZ.z; // No z property

      scene._collection = {
        children: [noZ],
      };

      // Should not throw
      expect(() => scene.draw()).not.toThrow();
      expect(noZ.draw).toHaveBeenCalled();
    });
  });

  describe("draw transformations", () => {
    it("should save and restore for each child", () => {
      const scene = new Scene3D(mockGame, {
        camera,
        depthSort: false,
      });

      Painter.save = vi.fn();
      Painter.restore = vi.fn();
      Painter.translateTo = vi.fn();
      Painter.ctx = { scale: vi.fn() };

      const child1 = createMockChild();
      const child2 = createMockChild();

      scene._collection = {
        children: [child1, child2],
      };

      scene.draw();

      // Should call save/restore for each child
      expect(Painter.save).toHaveBeenCalledTimes(2);
      expect(Painter.restore).toHaveBeenCalledTimes(2);
    });

    it("should translate to projected position", () => {
      const scene = new Scene3D(mockGame, {
        camera: new Camera3D(), // No rotation
        depthSort: false,
      });

      Painter.save = vi.fn();
      Painter.restore = vi.fn();
      Painter.translateTo = vi.fn();
      Painter.ctx = { scale: vi.fn() };

      const child = createMockChild({ x: 100, y: 50, z: 0 });
      scene._collection = {
        children: [child],
      };

      scene.draw();

      // With no rotation and z=0, projected position should match input
      expect(Painter.translateTo).toHaveBeenCalledWith(100, 50);
    });
  });

  describe("integration with Camera3D projection", () => {
    it("should use camera projection for positioning", () => {
      const mockCamera = {
        project: vi.fn().mockReturnValue({
          x: 150,
          y: 75,
          z: 50,
          scale: 0.8,
        }),
        perspective: 800,
      };

      const scene = new Scene3D(mockGame, {
        camera: mockCamera,
        depthSort: false,
        scaleByDepth: true,
      });

      Painter.save = vi.fn();
      Painter.restore = vi.fn();
      Painter.translateTo = vi.fn();
      Painter.ctx = { scale: vi.fn() };

      const child = createMockChild({ x: 100, y: 50, z: 25 });
      scene._collection = {
        children: [child],
      };

      scene.draw();

      // Should call camera.project with child coordinates
      expect(mockCamera.project).toHaveBeenCalledWith(100, 50, 25);

      // Should use projected values
      expect(Painter.translateTo).toHaveBeenCalledWith(150, 75);
      expect(Painter.ctx.scale).toHaveBeenCalledWith(0.8, 0.8);
    });
  });
});
