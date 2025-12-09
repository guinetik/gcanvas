import { describe, it, expect, vi } from 'vitest';
import { Euclidian } from '../../src/shapes/euclidian';

describe('Euclidian', () => {
  it('should initialize with default values', () => {
    const euclidian = new Euclidian();
    expect(euclidian.x).toBe(0);
    expect(euclidian.y).toBe(0);
    expect(euclidian.width).toBe(0);
    expect(euclidian.height).toBe(0);
  });

  it('should initialize with custom values', () => {
    const options = {
      x: 10,
      y: 20,
      width: 100,
      height: 200
    };
    const euclidian = new Euclidian(options);
    expect(euclidian.x).toBe(10);
    expect(euclidian.y).toBe(20);
    expect(euclidian.width).toBe(100);
    expect(euclidian.height).toBe(200);
  });

  it('should validate properties', () => {
    const euclidian = new Euclidian();
    expect(() => {
      euclidian.x = null;
    }).toThrow('Invalid property value: x null');
    expect(() => {
      euclidian.y = undefined;
    }).toThrow('Invalid property value: y undefined');
  });

  it('should not allow negative width or height', () => {
    const euclidian = new Euclidian();
    euclidian.width = -10;
    euclidian.height = -20;
    expect(euclidian.width).toBe(0);
    expect(euclidian.height).toBe(0);
  });
}); 