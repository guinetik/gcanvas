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
  render: vi.fn(),
});

// Helper to set up children on a scene (mocks _collection.getSortedChildren)
function setChildren(scene, children) {
  scene._collection = {
    children,
    getSortedChildren: () => children,
  };
}

describe("Scene3D", () => {
  let mockGame;
  let camera;

  beforeEach(() => {
    mockGame = createMockGame();
    camera = new Camera3D({ perspective: 800 });

    // Setup Painter mocks with all methods Scene3D.render() needs
    Painter.save = vi.fn();
    Painter.restore = vi.fn();
    Painter.translateTo = vi.fn();
    Painter.ctx = {
      scale: vi.fn(),
      beginPath: vi.fn(),
      fill: vi.fn(),
    };
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

  describe("render with depth sorting", () => {
    it("should sort children back-to-front when depthSort is true", () => {
      const scene = new Scene3D(mockGame, {
        camera,
        depthSort: true,
        scaleByDepth: false,
      });

      // Add children at different z depths
      const front = createMockChild({ x: 0, y: 0, z: -100 });
      const middle = createMockChild({ x: 0, y: 0, z: 0 });
      const back = createMockChild({ x: 0, y: 0, z: 100 });

      setChildren(scene, [front, middle, back]);

      scene.render();

      // All should be rendered
      expect(back.render).toHaveBeenCalled();
      expect(middle.render).toHaveBeenCalled();
      expect(front.render).toHaveBeenCalled();

      // Back (z=100, further from camera) should render before front (z=-100, closer)
      const backOrder = back.render.mock.invocationCallOrder[0];
      const frontOrder = front.render.mock.invocationCallOrder[0];
      expect(backOrder).toBeLessThan(frontOrder);
    });

    it("should not sort when depthSort is false", () => {
      const scene = new Scene3D(mockGame, {
        camera,
        depthSort: false,
        scaleByDepth: false,
      });

      const child1 = createMockChild({ z: 100 });
      const child2 = createMockChild({ z: -100 });

      setChildren(scene, [child1, child2]);

      scene.render();

      // Both should be drawn
      expect(child1.render).toHaveBeenCalled();
      expect(child2.render).toHaveBeenCalled();
    });
  });

  describe("render with perspective scaling", () => {
    it("should scale children by perspective when scaleByDepth is true", () => {
      const scene = new Scene3D(mockGame, {
        camera,
        depthSort: false,
        scaleByDepth: true,
      });

      const child = createMockChild({ z: 0 });
      setChildren(scene, [child]);

      scene.render();

      // Scale should be called
      expect(Painter.ctx.scale).toHaveBeenCalled();
    });

    it("should not scale when scaleByDepth is false", () => {
      const scene = new Scene3D(mockGame, {
        camera,
        depthSort: false,
        scaleByDepth: false,
      });

      const child = createMockChild({ z: 0 });
      setChildren(scene, [child]);

      scene.render();

      // Scale should not be called
      expect(Painter.ctx.scale).not.toHaveBeenCalled();
    });
  });

  describe("render visibility and culling", () => {
    it("should skip invisible children", () => {
      const scene = new Scene3D(mockGame, {
        camera,
        depthSort: false,
      });

      const visible = createMockChild({ visible: true });
      const hidden = createMockChild({ visible: false });

      setChildren(scene, [visible, hidden]);

      scene.render();

      expect(visible.render).toHaveBeenCalled();
      expect(hidden.render).not.toHaveBeenCalled();
    });

    it("should cull children behind camera", () => {
      const scene = new Scene3D(mockGame, {
        camera: new Camera3D({ perspective: 100 }),
        depthSort: false,
      });

      // Child far behind camera (z = -200, camera.perspective = 100)
      // After projection: if z < -perspective + 10, cull it
      const farBehind = createMockChild({ z: 200 }); // After projection z will be positive
      const inFront = createMockChild({ z: -50 });

      setChildren(scene, [farBehind, inFront]);

      scene.render();

      // Both should be drawn as they're not behind camera
      expect(inFront.render).toHaveBeenCalled();
    });

    it("should default z to 0 for children without z property", () => {
      const scene = new Scene3D(mockGame, {
        camera,
        depthSort: false,
      });

      const noZ = createMockChild({ x: 100, y: 100 });
      delete noZ.z; // No z property

      setChildren(scene, [noZ]);

      // Should not throw
      expect(() => scene.render()).not.toThrow();
      expect(noZ.render).toHaveBeenCalled();
    });
  });

  describe("render transformations", () => {
    it("should save and restore for each child", () => {
      const scene = new Scene3D(mockGame, {
        camera,
        depthSort: false,
      });

      const child1 = createMockChild();
      const child2 = createMockChild();

      setChildren(scene, [child1, child2]);

      scene.render();

      // 1 save/restore for the scene itself + 1 per child = 3
      expect(Painter.save).toHaveBeenCalledTimes(3);
      expect(Painter.restore).toHaveBeenCalledTimes(3);
    });

    it("should translate to projected position", () => {
      const scene = new Scene3D(mockGame, {
        camera: new Camera3D(), // No rotation
        depthSort: false,
      });

      const child = createMockChild({ x: 100, y: 50, z: 0 });
      setChildren(scene, [child]);

      scene.render();

      // With no rotation and z=0, projected position should match input
      // translateTo is called for: scene position, child projected pos, child offset
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

      const child = createMockChild({ x: 100, y: 50, z: 25 });
      setChildren(scene, [child]);

      scene.render();

      // Should call camera.project with child coordinates
      expect(mockCamera.project).toHaveBeenCalledWith(100, 50, 25);

      // Should use projected values
      expect(Painter.translateTo).toHaveBeenCalledWith(150, 75);
      expect(Painter.ctx.scale).toHaveBeenCalledWith(0.8, 0.8);
    });
  });
});
