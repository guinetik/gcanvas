import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Camera3D } from "../../src/util/camera3d";

describe("Camera3D", () => {
  describe("constructor", () => {
    it("should initialize with default values", () => {
      const camera = new Camera3D();

      expect(camera.rotationX).toBe(0);
      expect(camera.rotationY).toBe(0);
      expect(camera.rotationZ).toBe(0);
      expect(camera.perspective).toBe(800);
      expect(camera.sensitivity).toBe(0.005);
      expect(camera.minRotationX).toBe(-1.5);
      expect(camera.maxRotationX).toBe(1.5);
      expect(camera.clampX).toBe(true);
      expect(camera.autoRotate).toBe(false);
      expect(camera.autoRotateSpeed).toBe(0.5);
      expect(camera.autoRotateAxis).toBe("y");
    });

    it("should accept custom options", () => {
      const camera = new Camera3D({
        rotationX: 0.5,
        rotationY: -0.3,
        rotationZ: 0.1,
        perspective: 1200,
        sensitivity: 0.01,
        minRotationX: -1.0,
        maxRotationX: 1.0,
        clampX: false,
        autoRotate: true,
        autoRotateSpeed: 1.0,
        autoRotateAxis: "x",
      });

      expect(camera.rotationX).toBe(0.5);
      expect(camera.rotationY).toBe(-0.3);
      expect(camera.rotationZ).toBe(0.1);
      expect(camera.perspective).toBe(1200);
      expect(camera.sensitivity).toBe(0.01);
      expect(camera.minRotationX).toBe(-1.0);
      expect(camera.maxRotationX).toBe(1.0);
      expect(camera.clampX).toBe(false);
      expect(camera.autoRotate).toBe(true);
      expect(camera.autoRotateSpeed).toBe(1.0);
      expect(camera.autoRotateAxis).toBe("x");
    });

    it("should store initial rotation for reset", () => {
      const camera = new Camera3D({
        rotationX: 0.5,
        rotationY: 0.3,
        rotationZ: 0.1,
      });

      expect(camera._initialRotationX).toBe(0.5);
      expect(camera._initialRotationY).toBe(0.3);
      expect(camera._initialRotationZ).toBe(0.1);
    });
  });

  describe("project", () => {
    it("should project origin to origin with no rotation", () => {
      const camera = new Camera3D();
      const result = camera.project(0, 0, 0);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(0);
      expect(result.scale).toBe(1);
    });

    it("should apply perspective scaling", () => {
      const camera = new Camera3D({ perspective: 800 });

      // Point at z=400 (halfway to perspective)
      const result = camera.project(0, 0, 400);

      // scale = 800 / (800 + 400) = 800 / 1200 = 0.667
      expect(result.scale).toBeCloseTo(0.667, 2);
    });

    it("should project point closer when z is negative", () => {
      const camera = new Camera3D({ perspective: 800 });

      // Point at z=-400 (in front)
      const result = camera.project(100, 0, -400);

      // scale = 800 / (800 - 400) = 800 / 400 = 2
      expect(result.scale).toBe(2);
      expect(result.x).toBe(200); // 100 * 2
    });

    it("should apply Y rotation", () => {
      const camera = new Camera3D({
        rotationY: Math.PI / 2, // 90 degrees
      });

      // Point at x=100 should now be at z after rotation
      const result = camera.project(100, 0, 0);

      // After 90 degree Y rotation: x1 = x*cos - z*sin = 100*0 - 0*1 = 0
      // z1 = x*sin + z*cos = 100*1 + 0*0 = 100
      expect(result.x).toBeCloseTo(0, 5);
    });

    it("should apply X rotation", () => {
      const camera = new Camera3D({
        rotationX: Math.PI / 2, // 90 degrees
      });

      // Point at y=100 should rotate to z
      const result = camera.project(0, 100, 0);

      // After 90 degree X rotation: y1 = y*cos - z*sin = 100*0 - 0*1 = 0
      expect(result.y).toBeCloseTo(0, 5);
    });

    it("should apply Z rotation (roll)", () => {
      const camera = new Camera3D({
        rotationZ: Math.PI / 2, // 90 degrees
      });

      // Point at x=100 should rotate to y
      const result = camera.project(100, 0, 0);

      // After 90 degree Z rotation: x = x*cos - y*sin = 100*0 - 0*1 = 0
      // y = x*sin + y*cos = 100*1 + 0*0 = 100
      expect(result.x).toBeCloseTo(0, 5);
      expect(result.y).toBeCloseTo(100, 5);
    });

    it("should return depth for sorting", () => {
      const camera = new Camera3D();

      const front = camera.project(0, 0, -100);
      const back = camera.project(0, 0, 100);

      expect(front.z).toBeLessThan(back.z);
    });
  });

  describe("projectAll", () => {
    it("should project multiple points", () => {
      const camera = new Camera3D();
      const points = [
        { x: 100, y: 0, z: 0 },
        { x: 0, y: 100, z: 0 },
        { x: 0, y: 0, z: 100 },
      ];

      const results = camera.projectAll(points);

      expect(results.length).toBe(3);
      expect(results[0]).toHaveProperty("x");
      expect(results[0]).toHaveProperty("y");
      expect(results[0]).toHaveProperty("z");
      expect(results[0]).toHaveProperty("scale");
    });
  });

  describe("update", () => {
    it("should auto-rotate when enabled", () => {
      const camera = new Camera3D({
        autoRotate: true,
        autoRotateSpeed: 1.0,
        autoRotateAxis: "y",
      });

      camera.update(0.5);

      expect(camera.rotationY).toBe(0.5);
    });

    it("should auto-rotate on different axes", () => {
      const cameraX = new Camera3D({
        autoRotate: true,
        autoRotateSpeed: 1.0,
        autoRotateAxis: "x",
      });

      const cameraZ = new Camera3D({
        autoRotate: true,
        autoRotateSpeed: 1.0,
        autoRotateAxis: "z",
      });

      cameraX.update(1);
      cameraZ.update(1);

      expect(cameraX.rotationX).toBe(1);
      expect(cameraZ.rotationZ).toBe(1);
    });

    it("should not auto-rotate when disabled", () => {
      const camera = new Camera3D({
        autoRotate: false,
        autoRotateSpeed: 1.0,
      });

      camera.update(1);

      expect(camera.rotationY).toBe(0);
    });

    it("should not auto-rotate while dragging", () => {
      const camera = new Camera3D({
        autoRotate: true,
        autoRotateSpeed: 1.0,
      });

      camera._isDragging = true;
      camera.update(1);

      expect(camera.rotationY).toBe(0);
    });
  });

  describe("setRotation", () => {
    it("should set rotation values", () => {
      const camera = new Camera3D();

      camera.setRotation(0.5, 0.3, 0.1);

      expect(camera.rotationX).toBe(0.5);
      expect(camera.rotationY).toBe(0.3);
      expect(camera.rotationZ).toBe(0.1);
    });

    it("should default z to 0", () => {
      const camera = new Camera3D({ rotationZ: 1 });

      camera.setRotation(0.5, 0.3);

      expect(camera.rotationZ).toBe(0);
    });

    it("should return this for chaining", () => {
      const camera = new Camera3D();
      const result = camera.setRotation(0.5, 0.3);

      expect(result).toBe(camera);
    });
  });

  describe("rotate", () => {
    it("should add to current rotation", () => {
      const camera = new Camera3D({
        rotationX: 0.1,
        rotationY: 0.2,
        rotationZ: 0.3,
      });

      camera.rotate(0.1, 0.1, 0.1);

      expect(camera.rotationX).toBeCloseTo(0.2);
      expect(camera.rotationY).toBeCloseTo(0.3);
      expect(camera.rotationZ).toBeCloseTo(0.4);
    });

    it("should clamp X rotation when enabled", () => {
      const camera = new Camera3D({
        clampX: true,
        minRotationX: -1.0,
        maxRotationX: 1.0,
      });

      camera.rotate(2.0, 0, 0);

      expect(camera.rotationX).toBe(1.0);
    });

    it("should not clamp X when disabled", () => {
      const camera = new Camera3D({
        clampX: false,
      });

      camera.rotate(3.0, 0, 0);

      expect(camera.rotationX).toBe(3.0);
    });

    it("should return this for chaining", () => {
      const camera = new Camera3D();
      const result = camera.rotate(0.1, 0.1);

      expect(result).toBe(camera);
    });
  });

  describe("reset", () => {
    it("should reset to initial rotation", () => {
      const camera = new Camera3D({
        rotationX: 0.5,
        rotationY: 0.3,
        rotationZ: 0.1,
      });

      camera.rotationX = 1.0;
      camera.rotationY = 1.0;
      camera.rotationZ = 1.0;

      camera.reset();

      expect(camera.rotationX).toBe(0.5);
      expect(camera.rotationY).toBe(0.3);
      expect(camera.rotationZ).toBe(0.1);
    });

    it("should return this for chaining", () => {
      const camera = new Camera3D();
      const result = camera.reset();

      expect(result).toBe(camera);
    });
  });

  describe("lookAt", () => {
    it("should set rotation to face a point", () => {
      const camera = new Camera3D();

      camera.lookAt(0, 0, 100);

      // Looking straight ahead (positive Z)
      expect(camera.rotationY).toBeCloseTo(0, 5);
      expect(camera.rotationX).toBeCloseTo(0, 5);
    });

    it("should return this for chaining", () => {
      const camera = new Camera3D();
      const result = camera.lookAt(0, 0, 100);

      expect(result).toBe(camera);
    });
  });

  describe("isDragging", () => {
    it("should return dragging state", () => {
      const camera = new Camera3D();

      expect(camera.isDragging()).toBe(false);

      camera._isDragging = true;

      expect(camera.isDragging()).toBe(true);
    });
  });

  describe("mouse control", () => {
    let mockCanvas;

    beforeEach(() => {
      mockCanvas = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    });

    it("should enable mouse control", () => {
      const camera = new Camera3D();

      camera.enableMouseControl(mockCanvas);

      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        "mousedown",
        expect.any(Function),
      );
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        "mousemove",
        expect.any(Function),
      );
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        "mouseup",
        expect.any(Function),
      );
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        "mouseleave",
        expect.any(Function),
      );
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        "touchstart",
        expect.any(Function),
      );
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        "dblclick",
        expect.any(Function),
      );
    });

    it("should disable mouse control", () => {
      const camera = new Camera3D();
      camera.enableMouseControl(mockCanvas);

      camera.disableMouseControl();

      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith(
        "mousedown",
        expect.any(Function),
      );
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith(
        "mousemove",
        expect.any(Function),
      );
    });

    it("should return this for chaining", () => {
      const camera = new Camera3D();

      expect(camera.enableMouseControl(mockCanvas)).toBe(camera);
      expect(camera.disableMouseControl()).toBe(camera);
    });

    it("should disable previous control when enabling new", () => {
      const camera = new Camera3D();
      const mockCanvas2 = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      camera.enableMouseControl(mockCanvas);
      camera.enableMouseControl(mockCanvas2);

      expect(mockCanvas.removeEventListener).toHaveBeenCalled();
      expect(mockCanvas2.addEventListener).toHaveBeenCalled();
    });
  });
});
