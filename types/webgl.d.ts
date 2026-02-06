/**
 * GCanvas WebGL Module
 * Optional WebGL rendering capabilities for enhanced visual effects.
 * @module webgl
 */

/**
 * WebGL renderer for enhanced visual effects.
 * Provides shader-based rendering for complex effects.
 */
export class WebGLRenderer {
  constructor(width: number, height: number);

  isAvailable(): boolean;
  resize(width: number, height: number): void;
  useProgram(name: string, vertexSource: string, fragmentSource: string): WebGLProgram | null;
  setUniforms(uniforms: Record<string, number | number[] | Float32Array>): void;
  setColorUniform(name: string, color: string): void;
  clear(r?: number, g?: number, b?: number, a?: number): void;
  render(): void;
  compositeOnto(ctx: CanvasRenderingContext2D, x: number, y: number, width?: number, height?: number): void;
  getCanvas(): HTMLCanvasElement;
  destroy(): void;
}

export type WebGLBlendMode = "alpha" | "additive";
export type PointSpriteShape = "circle" | "glow" | "square" | "softSquare";

export class WebGLParticleRenderer {
  constructor(
    maxParticles?: number,
    options?: {
      width?: number;
      height?: number;
      shape?: PointSpriteShape;
      blendMode?: WebGLBlendMode;
    }
  );

  isAvailable(): boolean;
  setBlendMode(mode: WebGLBlendMode): void;
  setShape(shape: PointSpriteShape): void;
  resize(width: number, height: number): void;
  updateParticles(particles: Array<{ x: number; y: number; size: number; color: { r: number; g: number; b: number; a: number } }>): number;
  clear(r?: number, g?: number, b?: number, a?: number): void;
  render(count: number): void;
  compositeOnto(ctx: CanvasRenderingContext2D, x?: number, y?: number, width?: number, height?: number): void;
  destroy(): void;
}

export class WebGLLineRenderer {
  constructor(
    maxSegments?: number,
    options?: {
      width?: number;
      height?: number;
      blendMode?: WebGLBlendMode;
    }
  );

  isAvailable(): boolean;
  setBlendMode(mode: WebGLBlendMode): void;
  resize(width: number, height: number): void;
  updateLines(segments: any[]): number;
  clear(r?: number, g?: number, b?: number, a?: number): void;
  render(count: number): void;
  compositeOnto(ctx: CanvasRenderingContext2D, x?: number, y?: number): void;
  destroy(): void;
}

export const DEJONG_MAX_ITERATIONS: number;
export const DEJONG_POINT_VERTEX: string;
export const DEJONG_POINT_FRAGMENTS: Record<PointSpriteShape, string>;

export const CLIFFORD_MAX_ITERATIONS: number;
export const CLIFFORD_POINT_VERTEX: string;
export const CLIFFORD_POINT_FRAGMENTS: Record<PointSpriteShape, string>;

export class WebGLDeJongRenderer {
  constructor(
    seedCount?: number,
    options?: {
      width?: number;
      height?: number;
      shape?: PointSpriteShape;
      blendMode?: WebGLBlendMode;
      pointSize?: number;
      pointScale?: number;
      iterations?: number;
      params?: { a: number; b: number; c: number; d: number };
      color?: { r: number; g: number; b: number; a: number };
      colorMode?: 0 | 1;
      hueRange?: { minHue: number; maxHue: number };
      maxSpeed?: number;
      saturation?: number; // 0..1
      lightness?: number; // 0..1
      alpha?: number; // 0..1
      hueShiftSpeed?: number; // degrees/sec
    }
  );

  static identityMat3(): Float32Array;
  static rotationMat3(angle: number): Float32Array;

  isAvailable(): boolean;
  resize(width: number, height: number): void;
  setSeedCount(seedCount: number): void;
  regenerateSeeds(): void;
  setShape(shape: PointSpriteShape): void;
  setBlendMode(mode: WebGLBlendMode): void;
  setParams(params: { a?: number; b?: number; c?: number; d?: number }): void;
  setIterations(iterations: number): void;
  setZoom(zoom: number): void;
  setTransform(mat3: Float32Array): void;
  setPointSize(size: number): void;
  setColor(color: { r?: number; g?: number; b?: number; a?: number }): void;
  setColorMode(mode: 0 | 1): void;
  setColorRamp(options: {
    minHue?: number;
    maxHue?: number;
    maxSpeed?: number;
    saturation?: number;
    lightness?: number;
    alpha?: number;
    hueShiftSpeed?: number;
  }): void;
  clear(r?: number, g?: number, b?: number, a?: number): void;
  render(timeSeconds?: number): void;
  compositeOnto(ctx: CanvasRenderingContext2D, x?: number, y?: number, width?: number, height?: number): void;
  destroy(): void;
}

export class WebGLCliffordRenderer {
  constructor(
    seedCount?: number,
    options?: {
      width?: number;
      height?: number;
      shape?: PointSpriteShape;
      blendMode?: WebGLBlendMode;
      pointSize?: number;
      pointScale?: number;
      iterations?: number;
      params?: { a: number; b: number; c: number; d: number };
      color?: { r: number; g: number; b: number; a: number };
      colorMode?: 0 | 1;
      hueRange?: { minHue: number; maxHue: number };
      maxSpeed?: number;
      saturation?: number; // 0..1
      lightness?: number; // 0..1
      alpha?: number; // 0..1
      hueShiftSpeed?: number; // degrees/sec
    }
  );

  static identityMat3(): Float32Array;
  static rotationMat3(angle: number): Float32Array;

  isAvailable(): boolean;
  resize(width: number, height: number): void;
  setSeedCount(seedCount: number): void;
  regenerateSeeds(): void;
  setShape(shape: PointSpriteShape): void;
  setBlendMode(mode: WebGLBlendMode): void;
  setParams(params: { a?: number; b?: number; c?: number; d?: number }): void;
  setIterations(iterations: number): void;
  setZoom(zoom: number): void;
  setTransform(mat3: Float32Array): void;
  setPointSize(size: number): void;
  setColor(color: { r?: number; g?: number; b?: number; a?: number }): void;
  setColorMode(mode: 0 | 1): void;
  setColorRamp(options: {
    minHue?: number;
    maxHue?: number;
    maxSpeed?: number;
    saturation?: number;
    lightness?: number;
    alpha?: number;
    hueShiftSpeed?: number;
  }): void;
  clear(r?: number, g?: number, b?: number, a?: number): void;
  render(timeSeconds?: number): void;
  compositeOnto(ctx: CanvasRenderingContext2D, x?: number, y?: number, width?: number, height?: number): void;
  destroy(): void;
}

export const SPHERE_SHADERS: any;

