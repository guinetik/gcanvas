import { describe, it, expect, vi } from "vitest";
import { Geometry2d } from "../../src/shapes";

describe("Geometry2d", () => {
  it("should initialize with default values", () => {
    const geometry = new Geometry2d();
    expect(geometry.x).toBe(0);
    expect(geometry.y).toBe(0);
    expect(geometry.width).toBe(0);
    expect(geometry.height).toBe(0);
  });

  it("should initialize with custom values", () => {
    const geometry = new Geometry2d({ x: 10, y: 20, width: 100, height: 200 });
    expect(geometry.x).toBe(10);
    expect(geometry.y).toBe(20);
    expect(geometry.width).toBe(100);
    expect(geometry.height).toBe(200);
  });

  it("should validate properties", () => {
    const geometry = new Geometry2d();
    expect(() => {
      geometry.x = null;
    }).toThrow("Invalid property value: x null");
  });

  it("should not allow negative width or height", () => {
    const geometry = new Geometry2d();
    geometry.width = -10;
    geometry.height = -20;
    expect(geometry.width).toBe(0);
    expect(geometry.height).toBe(0);
  });

  it("should update bounds when properties change", () => {
    const geometry = new Geometry2d({ x: 10, y: 20, width: 100, height: 200 });
    geometry.x = 30;
    geometry.y = 40;
    expect(geometry.boundsDirty).toBe(true);
  });

  it("should calculate bounds correctly", () => {
    const geometry = new Geometry2d({ x: 10, y: 20, width: 100, height: 200 });
    expect(geometry.getBounds()).toEqual({
      width: 100,
      height: 200,
      x: 10,
      y: 20,
    });
  });

  it("should apply constraints correctly", () => {
    const geometry = new Geometry2d({ x: 10, y: 20, width: 100, height: 200 });
    geometry.minX = 50;
    geometry.minY = 60;
    geometry.maxX = 150;
    geometry.maxY = 160;
    geometry.applyConstraints();
    expect(geometry.x).toBe(50);
    expect(geometry.y).toBe(60);
  });

  it("should update bounds when constraints are applied", () => {
    const geometry = new Geometry2d({ x: 10, y: 20, width: 100, height: 200 });
    geometry.minX = 50;
    geometry.minY = 60;
    geometry.maxX = 150;
    geometry.maxY = 160;
    geometry.applyConstraints();
    expect(geometry.getBounds()).toEqual({
      width: 100,
      height: 200,
      x: 50,
      y: 60,
    });
  });

  it("should return correctly local position", () => {
    const geometry = new Geometry2d({ x: 10, y: 20, width: 100, height: 200 });
    expect(geometry.getLocalPosition()).toEqual({
      x: -40,
      y: -80,
    });
  });   
});
