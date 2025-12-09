import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Transform } from '../../src/shapes/transform.js';
import { Rectangle } from '../../src/shapes/rect.js';
import { Group } from '../../src/shapes/group.js';

describe('Transform', () => {
  let rect;
  let transform;

  beforeEach(() => {
    rect = new Rectangle({ x: 0, y: 0, width: 100, height: 50 });
    transform = rect.transform;
  });

  describe('initialization', () => {
    it('should be created with owner reference', () => {
      expect(transform).toBeInstanceOf(Transform);
      expect(transform.owner).toBe(rect);
    });

    it('should have strictMode disabled by default', () => {
      expect(Transform.strictMode).toBe(false);
    });
  });

  describe('position methods', () => {
    it('should set x position', () => {
      const result = transform.x(100);
      expect(rect.x).toBe(100);
      expect(result).toBe(transform); // chainable
    });

    it('should set y position', () => {
      const result = transform.y(200);
      expect(rect.y).toBe(200);
      expect(result).toBe(transform); // chainable
    });

    it('should set position with position()', () => {
      const result = transform.position(50, 75);
      expect(rect.x).toBe(50);
      expect(rect.y).toBe(75);
      expect(result).toBe(transform);
    });

    it('should translate by offset with translateBy()', () => {
      transform.position(100, 100);
      const result = transform.translateBy(25, -10);
      expect(rect.x).toBe(125);
      expect(rect.y).toBe(90);
      expect(result).toBe(transform);
    });
  });

  describe('dimension methods', () => {
    it('should set width', () => {
      const result = transform.width(200);
      expect(rect.width).toBe(200);
      expect(result).toBe(transform);
    });

    it('should set height', () => {
      const result = transform.height(150);
      expect(rect.height).toBe(150);
      expect(result).toBe(transform);
    });

    it('should clamp negative width to 0', () => {
      transform.width(-50);
      expect(rect.width).toBe(0);
    });

    it('should clamp negative height to 0', () => {
      transform.height(-50);
      expect(rect.height).toBe(0);
    });

    it('should set size with size()', () => {
      const result = transform.size(300, 200);
      expect(rect.width).toBe(300);
      expect(rect.height).toBe(200);
      expect(result).toBe(transform);
    });
  });

  describe('rotation methods', () => {
    it('should set rotation in degrees', () => {
      const result = transform.rotation(45);
      expect(rect._rotation).toBeCloseTo(Math.PI / 4);
      expect(result).toBe(transform);
    });

    it('should set rotation in radians', () => {
      const result = transform.rotationRad(Math.PI);
      expect(rect._rotation).toBeCloseTo(Math.PI);
      expect(result).toBe(transform);
    });

    it('should rotate by offset with rotateBy()', () => {
      transform.rotation(45);
      const result = transform.rotateBy(45);
      expect(rect._rotation).toBeCloseTo(Math.PI / 2);
      expect(result).toBe(transform);
    });
  });

  describe('scale methods', () => {
    it('should set scaleX', () => {
      const result = transform.scaleX(2);
      expect(rect.scaleX).toBe(2);
      expect(result).toBe(transform);
    });

    it('should set scaleY', () => {
      const result = transform.scaleY(0.5);
      expect(rect.scaleY).toBe(0.5);
      expect(result).toBe(transform);
    });

    it('should set uniform scale with scale()', () => {
      const result = transform.scale(1.5);
      expect(rect.scaleX).toBe(1.5);
      expect(rect.scaleY).toBe(1.5);
      expect(result).toBe(transform);
    });

    it('should multiply scale with scaleBy()', () => {
      transform.scale(2);
      const result = transform.scaleBy(0.5);
      expect(rect.scaleX).toBe(1);
      expect(rect.scaleY).toBe(1);
      expect(result).toBe(transform);
    });
  });

  describe('batch operations', () => {
    it('should set multiple properties with set()', () => {
      const result = transform.set({
        x: 100,
        y: 200,
        width: 150,
        height: 75,
        rotation: 90,
        scaleX: 2,
        scaleY: 0.5
      });

      expect(rect.x).toBe(100);
      expect(rect.y).toBe(200);
      expect(rect.width).toBe(150);
      expect(rect.height).toBe(75);
      expect(rect._rotation).toBeCloseTo(Math.PI / 2);
      expect(rect.scaleX).toBe(2);
      expect(rect.scaleY).toBe(0.5);
      expect(result).toBe(transform);
    });

    it('should only set provided properties in set()', () => {
      transform.position(10, 20);
      transform.set({ x: 100 }); // only set x
      expect(rect.x).toBe(100);
      expect(rect.y).toBe(20); // unchanged
    });

    it('should reset transforms with reset()', () => {
      transform.set({
        rotation: 45,
        scaleX: 2,
        scaleY: 2
      });

      const result = transform.reset();
      expect(rect._rotation).toBe(0);
      expect(rect.scaleX).toBe(1);
      expect(rect.scaleY).toBe(1);
      expect(result).toBe(transform);
    });

    it('should reset all with resetAll()', () => {
      transform.set({
        x: 100,
        y: 200,
        width: 300,
        height: 400,
        rotation: 45,
        scaleX: 2,
        scaleY: 2
      });

      const result = transform.resetAll();
      expect(rect.x).toBe(0);
      expect(rect.y).toBe(0);
      expect(rect.width).toBe(0);
      expect(rect.height).toBe(0);
      expect(rect._rotation).toBe(0);
      expect(rect.scaleX).toBe(1);
      expect(rect.scaleY).toBe(1);
      expect(result).toBe(transform);
    });
  });

  describe('utility methods', () => {
    it('should export to object with toObject()', () => {
      transform.set({
        x: 100,
        y: 200,
        width: 150,
        height: 75,
        rotation: 90,
        scaleX: 2,
        scaleY: 0.5
      });

      const obj = transform.toObject();
      expect(obj.x).toBe(100);
      expect(obj.y).toBe(200);
      expect(obj.width).toBe(150);
      expect(obj.height).toBe(75);
      expect(obj.rotation).toBeCloseTo(90); // converted back to degrees
      expect(obj.scaleX).toBe(2);
      expect(obj.scaleY).toBe(0.5);
    });

    it('should copy from another transform with copyFrom()', () => {
      const rect2 = new Rectangle({ x: 50, y: 60, width: 200, height: 100 });
      rect2.transform.set({
        rotation: 30,
        scaleX: 1.5,
        scaleY: 1.5
      });

      const result = transform.copyFrom(rect2.transform);
      expect(rect.x).toBe(50);
      expect(rect.y).toBe(60);
      expect(rect._rotation).toBeCloseTo(Math.PI / 6);
      expect(result).toBe(transform);
    });

    it('should copy from plain object with copyFrom()', () => {
      const result = transform.copyFrom({
        x: 300,
        y: 400,
        rotation: 180
      });

      expect(rect.x).toBe(300);
      expect(rect.y).toBe(400);
      expect(rect._rotation).toBeCloseTo(Math.PI);
      expect(result).toBe(transform);
    });
  });

  describe('chaining', () => {
    it('should support full chaining', () => {
      transform
        .position(100, 200)
        .size(300, 150)
        .rotation(45)
        .scale(1.5)
        .translateBy(10, 20)
        .rotateBy(15);

      expect(rect.x).toBe(110);
      expect(rect.y).toBe(220);
      expect(rect.width).toBe(300);
      expect(rect.height).toBe(150);
      expect(rect._rotation).toBeCloseTo((45 + 15) * Math.PI / 180);
      expect(rect.scaleX).toBe(1.5);
      expect(rect.scaleY).toBe(1.5);
    });
  });

  describe('bounds dirty marking', () => {
    it('should mark bounds dirty when position changes', () => {
      rect._boundsDirty = false;
      transform.x(100);
      expect(rect.boundsDirty).toBe(true);
    });

    it('should mark bounds dirty when dimensions change', () => {
      rect._boundsDirty = false;
      transform.width(200);
      expect(rect.boundsDirty).toBe(true);
    });

    it('should mark bounds dirty when rotation changes', () => {
      rect._boundsDirty = false;
      transform.rotation(45);
      expect(rect.boundsDirty).toBe(true);
    });

    it('should mark bounds dirty when scale changes', () => {
      rect._boundsDirty = false;
      transform.scale(2);
      expect(rect.boundsDirty).toBe(true);
    });
  });
});

describe('Group transform methods', () => {
  let group;

  beforeEach(() => {
    group = new Group();
    for (let i = 0; i < 3; i++) {
      const rect = new Rectangle({ x: i * 50, y: 0, width: 30, height: 30 });
      group.add(rect);
    }
  });

  it('should apply forEachTransform to all children', () => {
    group.forEachTransform((t) => t.rotation(45));

    group.children.forEach((child) => {
      expect(child._rotation).toBeCloseTo(Math.PI / 4);
    });
  });

  it('should provide index to forEachTransform callback', () => {
    group.forEachTransform((t, child, i) => t.rotation(i * 30));

    expect(group.children[0]._rotation).toBeCloseTo(0);
    expect(group.children[1]._rotation).toBeCloseTo(Math.PI / 6);
    expect(group.children[2]._rotation).toBeCloseTo(Math.PI / 3);
  });

  it('should translate all children with translateChildren', () => {
    group.translateChildren(10, 20);

    expect(group.children[0].x).toBe(10);
    expect(group.children[0].y).toBe(20);
    expect(group.children[1].x).toBe(60);
    expect(group.children[1].y).toBe(20);
    expect(group.children[2].x).toBe(110);
    expect(group.children[2].y).toBe(20);
  });

  it('should scale all children with scaleChildren', () => {
    group.children.forEach((c) => c.transform.scale(2));
    group.scaleChildren(0.5);

    group.children.forEach((child) => {
      expect(child.scaleX).toBe(1);
      expect(child.scaleY).toBe(1);
    });
  });

  it('should rotate all children with rotateChildren', () => {
    group.children.forEach((c) => c.transform.rotation(0));
    group.rotateChildren(90);

    group.children.forEach((child) => {
      expect(child._rotation).toBeCloseTo(Math.PI / 2);
    });
  });

  it('should reset all children transforms with resetChildTransforms', () => {
    group.children.forEach((c) => {
      c.transform.rotation(45).scale(2);
    });

    group.resetChildTransforms();

    group.children.forEach((child) => {
      expect(child._rotation).toBe(0);
      expect(child.scaleX).toBe(1);
      expect(child.scaleY).toBe(1);
    });
  });

  it('should be chainable', () => {
    const result = group
      .translateChildren(10, 10)
      .scaleChildren(1.5)
      .rotateChildren(15);

    expect(result).toBe(group);
  });
});
