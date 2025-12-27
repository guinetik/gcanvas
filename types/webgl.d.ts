/**
 * GCanvas WebGL Module
 * Optional WebGL rendering capabilities for enhanced visual effects.
 * @module webgl
 */

// ==========================================================================
// WebGL Renderer
// ==========================================================================

/** WebGL renderer options */
export interface WebGLRendererOptions {
  /** Canvas element */
  canvas: HTMLCanvasElement;
  /** Whether to preserve drawing buffer */
  preserveDrawingBuffer?: boolean;
  /** Enable antialiasing */
  antialias?: boolean;
  /** Enable alpha blending */
  alpha?: boolean;
  /** Enable depth testing */
  depth?: boolean;
  /** Enable stencil buffer */
  stencil?: boolean;
  /** Premultiplied alpha */
  premultipliedAlpha?: boolean;
}

/**
 * WebGL renderer for enhanced visual effects.
 * Provides shader-based rendering for complex effects.
 */
export class WebGLRenderer {
  /** WebGL rendering context */
  readonly gl: WebGLRenderingContext | WebGL2RenderingContext;
  /** Canvas element */
  readonly canvas: HTMLCanvasElement;
  /** Whether WebGL is available */
  readonly isAvailable: boolean;

  constructor(options: WebGLRendererOptions);

  /**
   * Create and compile a shader program.
   * @param vertexSource - Vertex shader GLSL source
   * @param fragmentSource - Fragment shader GLSL source
   * @returns Compiled shader program
   */
  createProgram(vertexSource: string, fragmentSource: string): WebGLProgram;

  /**
   * Set uniform value.
   * @param program - Shader program
   * @param name - Uniform name
   * @param value - Uniform value
   */
  setUniform(program: WebGLProgram, name: string, value: number | number[] | Float32Array): void;

  /**
   * Create a texture from an image or canvas.
   * @param source - Image or canvas source
   * @returns WebGL texture
   */
  createTexture(source: HTMLImageElement | HTMLCanvasElement | ImageData): WebGLTexture;

  /**
   * Render a full-screen quad with a shader.
   * @param program - Shader program to use
   */
  renderFullscreenQuad(program: WebGLProgram): void;

  /**
   * Clear the canvas.
   * @param r - Red (0-1)
   * @param g - Green (0-1)
   * @param b - Blue (0-1)
   * @param a - Alpha (0-1)
   */
  clear(r?: number, g?: number, b?: number, a?: number): void;

  /**
   * Resize the renderer to match canvas size.
   */
  resize(): void;

  /**
   * Dispose of WebGL resources.
   */
  dispose(): void;
}

// ==========================================================================
// Shader Collections
// ==========================================================================

/**
 * Pre-built shaders for 3D sphere rendering.
 */
export namespace SPHERE_SHADERS {
  /** Basic sphere vertex shader */
  const vertex: string;
  /** Basic sphere fragment shader with lighting */
  const fragment: string;
  /** Glow effect fragment shader */
  const glowFragment: string;
  /** Atmosphere effect fragment shader */
  const atmosphereFragment: string;
}

