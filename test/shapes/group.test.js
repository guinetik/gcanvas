import { describe, it, expect, vi } from "vitest";
import { Group, Rectangle } from "../../src/shapes";

describe("Group", () => {
  it("should initialize with default values", () => {
    const group = new Group();
    expect(group.x).toBe(0);
    expect(group.y).toBe(0);
    expect(group.width).toBe(0);
    expect(group.height).toBe(0);
  });

  it("should initialize with custom values", () => {
    const options = {
      x: 10,
      y: 20,
      width: 100,
      height: 200,
    };
    const group = new Group(options);
    expect(group.x).toBe(10);
    expect(group.y).toBe(20);
    expect(group.width).toBe(100);
    expect(group.height).toBe(200);
  });

  it("should validate properties", () => {
    const group = new Group();
    expect(() => {
      group.x = null;
    }).toThrow("Invalid property value: x null");
    expect(() => {
      group.y = undefined;
    }).toThrow("Invalid property value: y undefined");
  });

  it("should not allow negative width or height", () => {
    const group = new Group();
    group.width = -10;
    group.height = -20;
    expect(group.width).toBe(0);
    expect(group.height).toBe(0);
  });

  it("should add children", () => {
    const group = new Group();
    const child = new Rectangle({ width: 100, height: 100 });
    group.add(child);
    expect(group.children.length).toBe(1);
  });

  it("should remove children", () => {
    const group = new Group();
    const child = new Rectangle({ width: 100, height: 100 });
    group.add(child);
    group.remove(child);
    expect(group.children.length).toBe(0);
  });

  it("should clear children", () => {
    const group = new Group();  
    const child = new Rectangle({ width: 100, height: 100 });
    group.add(child);
    group.clear();
    expect(group.children.length).toBe(0);
  });

  it("should calculate bounds based on children", () => {
    const group = new Group();
    const child1 = new Rectangle({ width: 100, height: 100 });
    const child2 = new Rectangle({ width: 100, height: 100 });
    group.add(child1);
    group.add(child2);
    expect(group.width).toBe(100);
    expect(group.height).toBe(100);
  });

  it("should calculate bounds based on children considering the children's position", () => {
    const group = new Group();
    group.add(new Rectangle({ width: 400, height: 300, color: "#323232" }));
    group.add(new Rectangle({ width: 100, height: 100, color: "#0f0", x: -50 }));
    group.add(new Rectangle({ width: 100, height: 100, color: "#0f0", x: 150 }));
    expect(group.width).toBe(550);
    expect(group.height).toBe(300);
  });
});
