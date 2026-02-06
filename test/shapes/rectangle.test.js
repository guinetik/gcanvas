import { describe, it, expect, vi } from "vitest";
import { Rectangle } from "../../src/shapes";
import { Painter } from "../../src/painter/painter";

describe("Rectangle", () => {
  it("should initialize with default values", () => {
    const rectangle = new Rectangle();
    expect(rectangle.x).toBe(0);
    expect(rectangle.y).toBe(0);
    expect(rectangle.width).toBe(0);
    expect(rectangle.height).toBe(0);
  });

  it("should initialize with custom values", () => {
    const rectangle = new Rectangle({ x: 10, y: 20, width: 100, height: 200 });
    expect(rectangle.x).toBe(10);
    expect(rectangle.y).toBe(20);
    expect(rectangle.width).toBe(100);
    expect(rectangle.height).toBe(200);
  });

  it("should draw a filled rectangle correctly using Painter.", () => {
    Painter.shapes = {
      rect: vi.fn(),
    };
    const rectangle = new Rectangle({
      x: 10,
      y: 20,
      width: 100,
      height: 200,
      color: "red",
    });
    rectangle.drawRect();
    // With origin-based coordinates, rectangle draws at (0, 0)
    expect(Painter.shapes.rect).toHaveBeenCalledWith(0, 0, 100, 200, "red");
  });

  it("should draw an outlined rectangle correctly using Painter.", () => {
    Painter.shapes = {
      outlineRect: vi.fn(),
      rect: vi.fn(),
    };
    const rectangle = new Rectangle({
      x: 10,
      y: 20,
      width: 100,
      height: 200,
      color: "red",
      stroke: "blue",
      lineWidth: 2,
    });
    rectangle.drawRect();
    // With origin-based coordinates, rectangle draws at (0, 0)
    expect(Painter.shapes.outlineRect).toHaveBeenCalledWith(
      0,
      0,
      100,
      200,
      "blue",
      2
    );
    expect(Painter.shapes.rect).toHaveBeenCalledWith(0, 0, 100, 200, "red");
  });
});
