import { describe, it, expect, vi, beforeEach } from "vitest";
import { Geometry2d } from "../../src/shapes/geometry.js";
import { Transformable } from "../../src/shapes/transformable.js";
import { Rectangle } from "../../src/shapes/rect.js";
import { Circle } from "../../src/shapes/circle.js";
import { Position } from "../../src/util/position.js";
import { ORIGIN_MAP } from "../../src/shapes/euclidian.js";

/**
 * Coordinate System Tests (v2.0 - Origin-Based)
 * =============================================
 *
 * GCanvas v2.0 uses an origin-based coordinate system:
 * - x, y properties refer to the ORIGIN POINT of an object
 * - originX, originY control where the origin is (0-1 normalized)
 * - Default origin is (0, 0) = top-left, matching canvas API convention
 * - Shapes draw at (0, 0) in local coordinates
 * - Rotation/scale happens around the origin point
 *
 * This matches Adobe Flash's registration point model and is more intuitive
 * for developers familiar with canvas, CSS, or DOM positioning.
 */

describe("Coordinate System v2.0 - Origin-Based", () => {
  describe("Origin Properties", () => {
    it("has originX and originY properties defaulting to 0 (top-left)", () => {
      const geom = new Geometry2d({ x: 100, y: 100, width: 80, height: 40 });

      expect(geom.originX).toBe(0);
      expect(geom.originY).toBe(0);
    });

    it("accepts origin shorthand using Position constants", () => {
      const geom = new Geometry2d({
        x: 100, y: 100,
        width: 80, height: 40,
        origin: Position.CENTER
      });

      expect(geom.originX).toBe(0.5);
      expect(geom.originY).toBe(0.5);
    });

    it("accepts explicit originX and originY values", () => {
      const geom = new Geometry2d({
        x: 100, y: 100,
        width: 80, height: 40,
        originX: 0.25,
        originY: 0.75
      });

      expect(geom.originX).toBe(0.25);
      expect(geom.originY).toBe(0.75);
    });

    it("origin getter returns matching Position constant", () => {
      const geom = new Geometry2d({
        x: 100, y: 100,
        width: 80, height: 40,
        origin: Position.BOTTOM_RIGHT
      });

      expect(geom.origin).toBe(Position.BOTTOM_RIGHT);
    });

    it("origin getter returns undefined for non-standard origins", () => {
      const geom = new Geometry2d({
        x: 100, y: 100,
        width: 80, height: 40,
        originX: 0.33,
        originY: 0.66
      });

      expect(geom.origin).toBeUndefined();
    });
  });

  describe("Position Storage with Default Origin (Top-Left)", () => {
    it("x, y refers to top-left when origin is (0, 0)", () => {
      const geom = new Geometry2d({ x: 100, y: 100, width: 80, height: 40 });

      // With top-left origin, x, y IS the top-left position
      expect(geom.x).toBe(100);
      expect(geom.y).toBe(100);
    });

    it("getLocalPosition returns x, y directly for top-left origin", () => {
      const geom = new Geometry2d({ x: 100, y: 100, width: 80, height: 40 });
      const local = geom.getLocalPosition();

      // No offset needed - x, y is already top-left
      expect(local.x).toBe(100);
      expect(local.y).toBe(100);
    });

    it("getTopLeft returns the top-left corner", () => {
      const geom = new Geometry2d({ x: 100, y: 100, width: 80, height: 40 });
      const topLeft = geom.getTopLeft();

      expect(topLeft.x).toBe(100);
      expect(topLeft.y).toBe(100);
    });

    it("getCenter returns the center of the object", () => {
      const geom = new Geometry2d({ x: 100, y: 100, width: 80, height: 40 });
      const center = geom.getCenter();

      // Center = topLeft + (width/2, height/2)
      expect(center.x).toBe(140);
      expect(center.y).toBe(120);
    });
  });

  describe("Position Storage with Center Origin", () => {
    it("x, y refers to center when origin is (0.5, 0.5)", () => {
      const geom = new Geometry2d({
        x: 100, y: 100,
        width: 80, height: 40,
        origin: Position.CENTER
      });

      expect(geom.x).toBe(100);
      expect(geom.y).toBe(100);
    });

    it("getLocalPosition returns top-left offset from center", () => {
      const geom = new Geometry2d({
        x: 100, y: 100,
        width: 80, height: 40,
        origin: Position.CENTER
      });
      const local = geom.getLocalPosition();

      // Top-left = center - (width/2, height/2)
      expect(local.x).toBe(60);
      expect(local.y).toBe(80);
    });

    it("getTopLeft returns top-left offset from center origin", () => {
      const geom = new Geometry2d({
        x: 100, y: 100,
        width: 80, height: 40,
        origin: Position.CENTER
      });
      const topLeft = geom.getTopLeft();

      expect(topLeft.x).toBe(60);
      expect(topLeft.y).toBe(80);
    });

    it("getCenter returns x, y for center origin", () => {
      const geom = new Geometry2d({
        x: 100, y: 100,
        width: 80, height: 40,
        origin: Position.CENTER
      });
      const center = geom.getCenter();

      expect(center.x).toBe(100);
      expect(center.y).toBe(100);
    });
  });

  describe("setTopLeft and setCenter", () => {
    it("setTopLeft sets x, y directly for top-left origin", () => {
      const geom = new Geometry2d({ width: 80, height: 40 });
      geom.setTopLeft(100, 100);

      expect(geom.x).toBe(100);
      expect(geom.y).toBe(100);
    });

    it("setTopLeft adjusts position for center origin", () => {
      const geom = new Geometry2d({
        width: 80, height: 40,
        origin: Position.CENTER
      });
      geom.setTopLeft(100, 100);

      // For center origin, x = topLeft + width/2
      expect(geom.x).toBe(140);
      expect(geom.y).toBe(120);
    });

    it("setCenter adjusts position for top-left origin", () => {
      const geom = new Geometry2d({ width: 80, height: 40 });
      geom.setCenter(100, 100);

      // For top-left origin, x = center - width/2
      expect(geom.x).toBe(60);
      expect(geom.y).toBe(80);
    });

    it("setCenter sets x, y directly for center origin", () => {
      const geom = new Geometry2d({
        width: 80, height: 40,
        origin: Position.CENTER
      });
      geom.setCenter(100, 100);

      expect(geom.x).toBe(100);
      expect(geom.y).toBe(100);
    });
  });

  describe("Bounds Calculation", () => {
    it("Geometry2d.calculateBounds returns position with x, y", () => {
      const geom = new Geometry2d({ x: 100, y: 100, width: 80, height: 40 });
      const bounds = geom.calculateBounds();

      expect(bounds).toEqual({
        x: 100,
        y: 100,
        width: 80,
        height: 40,
      });
    });

    it("Transformable.calculateBounds returns top-left based bounds", () => {
      const shape = new Transformable({ x: 100, y: 100, width: 80, height: 40, rotation: 0 });
      const bounds = shape.calculateBounds();

      // No rotation - bounds match position
      expect(bounds.x).toBe(100);
      expect(bounds.y).toBe(100);
      expect(bounds.width).toBe(80);
      expect(bounds.height).toBe(40);
    });

    it("Transformable.calculateBounds handles 45-degree rotation around top-left", () => {
      const shape = new Transformable({ x: 100, y: 100, width: 80, height: 40, rotation: 0 });
      shape.rotation = 45;

      const bounds = shape.calculateBounds();

      // Rotated bounding box should be larger
      expect(bounds.width).toBeGreaterThan(80);
      expect(bounds.height).toBeGreaterThan(40);

      // Top-left corner (the pivot) should be at approximately (100, 100)
      // But the bounding box extends in all directions from the rotated shape
    });

    it("Transformable with center origin rotates around center", () => {
      const shape = new Transformable({
        x: 100, y: 100,
        width: 80, height: 40,
        rotation: 0,
        origin: Position.CENTER
      });
      shape.rotation = 45;

      const bounds = shape.calculateBounds();

      // With center origin, the center of the rotated bounds should be near (100, 100)
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      expect(centerX).toBeCloseTo(100, 1);
      expect(centerY).toBeCloseTo(100, 1);
    });

    it("Transformable.calculateBounds scales bounds correctly", () => {
      const shape = new Transformable({ x: 100, y: 100, width: 80, height: 40, rotation: 0 });
      shape._scaleX = 2;
      shape._scaleY = 2;
      shape.markBoundsDirty();

      const bounds = shape.calculateBounds();

      // Dimensions should be scaled
      expect(bounds.width).toBe(160);
      expect(bounds.height).toBe(80);
    });
  });

  describe("Parent-Child Coordinate Relationships", () => {
    it("child getLocalPosition is relative to parent", () => {
      const parent = new Geometry2d({ x: 200, y: 200, width: 100, height: 100 });
      const child = new Geometry2d({ x: 250, y: 230, width: 40, height: 20 });
      child.parent = parent;

      const local = child.getLocalPosition();

      // Local position = child.x - parent.x (no center offset for top-left origin)
      expect(local.x).toBe(50);
      expect(local.y).toBe(30);
    });

    it("child without parent has local = world position", () => {
      const child = new Geometry2d({ x: 100, y: 100, width: 40, height: 20 });

      const local = child.getLocalPosition();

      // No parent, local IS world position for top-left origin
      expect(local.x).toBe(100);
      expect(local.y).toBe(100);
    });
  });

  describe("Edge Cases", () => {
    it("zero-sized object has origin at x, y", () => {
      const geom = new Geometry2d({ x: 100, y: 100, width: 0, height: 0 });

      expect(geom.x).toBe(100);
      expect(geom.y).toBe(100);

      const local = geom.getLocalPosition();
      expect(local.x).toBe(100);
      expect(local.y).toBe(100);
    });

    it("negative positions work correctly", () => {
      const geom = new Geometry2d({ x: -100, y: -100, width: 80, height: 40 });

      const local = geom.getLocalPosition();
      expect(local.x).toBe(-100);
      expect(local.y).toBe(-100);
    });
  });
});

describe("Position Utility", () => {
  // Container with x, y as top-left corner (origin-based system)
  const container = { x: 200, y: 150, width: 400, height: 300 };
  const object = { width: 80, height: 40 };

  it("calculates TOP_LEFT correctly (origin-based)", () => {
    const pos = Position.calculate(Position.TOP_LEFT, object, container, 10);

    // With origin-based system:
    // x = containerX + margin = 200 + 10 = 210
    // y = containerY + margin = 150 + 10 = 160
    expect(pos.x).toBe(210);
    expect(pos.y).toBe(160);
  });

  it("calculates CENTER correctly (origin-based)", () => {
    const pos = Position.calculate(Position.CENTER, object, container, 10);

    // With origin-based system:
    // x = containerX + containerWidth/2 - objectWidth/2 = 200 + 200 - 40 = 360
    // y = containerY + containerHeight/2 - objectHeight/2 = 150 + 150 - 20 = 280
    expect(pos.x).toBe(360);
    expect(pos.y).toBe(280);
  });

  it("calculates BOTTOM_RIGHT correctly (origin-based)", () => {
    const pos = Position.calculate(Position.BOTTOM_RIGHT, object, container, 10);

    // With origin-based system:
    // x = containerX + containerWidth - margin - objectWidth = 200 + 400 - 10 - 80 = 510
    // y = containerY + containerHeight - margin - objectHeight = 150 + 300 - 10 - 40 = 400
    expect(pos.x).toBe(510);
    expect(pos.y).toBe(400);
  });
});

describe("ORIGIN_MAP Constants", () => {
  it("exports correct mapping for all Position constants", () => {
    expect(ORIGIN_MAP[Position.TOP_LEFT]).toEqual({ x: 0, y: 0 });
    expect(ORIGIN_MAP[Position.TOP_CENTER]).toEqual({ x: 0.5, y: 0 });
    expect(ORIGIN_MAP[Position.TOP_RIGHT]).toEqual({ x: 1, y: 0 });
    expect(ORIGIN_MAP[Position.CENTER_LEFT]).toEqual({ x: 0, y: 0.5 });
    expect(ORIGIN_MAP[Position.CENTER]).toEqual({ x: 0.5, y: 0.5 });
    expect(ORIGIN_MAP[Position.CENTER_RIGHT]).toEqual({ x: 1, y: 0.5 });
    expect(ORIGIN_MAP[Position.BOTTOM_LEFT]).toEqual({ x: 0, y: 1 });
    expect(ORIGIN_MAP[Position.BOTTOM_CENTER]).toEqual({ x: 0.5, y: 1 });
    expect(ORIGIN_MAP[Position.BOTTOM_RIGHT]).toEqual({ x: 1, y: 1 });
  });
});
