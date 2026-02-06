/**
 * @module webgl/webgl-dejong-renderer
 * @description WebGLDeJongRenderer - procedural De Jong attractor renderer.
 *
 * This renderer draws the De Jong attractor using GL_POINTS and performs
 * the iterative map directly in the vertex shader (GPU).
 *
 * It renders into an offscreen WebGL canvas which can be composited onto
 * the main 2D canvas using `compositeOnto()`.
 *
 * Design goals:
 * - No CPU point streaming (static seed buffer)
 * - Uniform-driven parameters (a,b,c,d), iteration count, zoom, transform
 * - Compatible with existing point sprite fragment shapes (circle/glow/etc.)
 *
 * @example
 * import { WebGLDeJongRenderer } from "@guinetik/gcanvas";
 *
 * const r = new WebGLDeJongRenderer(1 << 18, { width: 800, height: 600, shape: "glow" });
 * r.setParams({ a: -2.0, b: -2.0, c: -1.2, d: 2.0 });
 * r.setIterations(100);
 * r.setZoom(1);
 * r.setPointSize(1.0);
 * r.render();
 * r.compositeOnto(ctx, 0, 0);
 */

import { DEJONG_POINT_FRAGMENTS, DEJONG_POINT_VERTEX, DEJONG_MAX_ITERATIONS } from "./shaders/dejong-point-shaders.js";

/**
 * @typedef {"alpha"|"additive"} WebGLBlendMode
 * @typedef {"circle"|"glow"|"square"|"softSquare"} PointSpriteShape
 */

export class WebGLDeJongRenderer {
  /**
   * @param {number} seedCount - Number of seeds (points) to render.
   * @param {Object} [options]
   * @param {number} [options.width=800] - Initial canvas width
   * @param {number} [options.height=600] - Initial canvas height
   * @param {PointSpriteShape} [options.shape="glow"] - Point sprite fragment shape
   * @param {WebGLBlendMode} [options.blendMode="additive"] - WebGL blending mode
   * @param {number} [options.pointSize=1] - gl_PointSize in pixels
   * @param {number} [options.pointScale=0.5] - Mapping from attractor space to clip space
   * @param {number} [options.iterations=100] - Iteration count (0..DEJONG_MAX_ITERATIONS)
   * @param {{a:number,b:number,c:number,d:number}} [options.params] - De Jong parameters
   * @param {{r:number,g:number,b:number,a:number}} [options.color] - RGBA (0..1)
   */
  constructor(seedCount = 1 << 18, options = {}) {
    this.seedCount = seedCount;

    this.width = options.width ?? 800;
    this.height = options.height ?? 600;

    this.shape = options.shape ?? "glow";
    this.blendMode = options.blendMode ?? "additive";

    this.pointSize = options.pointSize ?? 1.0;
    this.pointScale = options.pointScale ?? 0.5;

    this.iterations = Math.max(0, Math.min(DEJONG_MAX_ITERATIONS, options.iterations ?? 100));
    this.params = {
      a: options.params?.a ?? -2.0,
      b: options.params?.b ?? -2.0,
      c: options.params?.c ?? -1.2,
      d: options.params?.d ?? 2.0,
    };

    this.zoom = 1.0;
    this.transform = WebGLDeJongRenderer.identityMat3();

    this.color = options.color ?? { r: 1, g: 1, b: 1, a: 0.12 };

    // Color mode + ramp settings (Lorenz-like)
    // 0 = flat color, 1 = speed→hue ramp
    this.colorMode = options.colorMode ?? 0;
    this.hueRange = options.hueRange ?? { minHue: 30, maxHue: 200 };
    this.maxSpeed = options.maxSpeed ?? 1.0;
    this.saturation = options.saturation ?? 0.85; // 0..1
    this.lightness = options.lightness ?? 0.55; // 0..1
    this.alpha = options.alpha ?? this.color.a ?? 0.12; // 0..1
    this.hueShiftSpeed = options.hueShiftSpeed ?? 0; // degrees per second

    // Offscreen canvas
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Premultiplied alpha for correct compositing to Canvas 2D
    this.gl = this.canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
    });

    if (!this.gl) {
      console.warn("WebGL not available for DeJong renderer");
      this.available = false;
      return;
    }

    this.available = true;

    this._initGL();
    this._createSeedBuffer(seedCount);
    this._compileProgram();
    this._setupBlending();
    this._applyStaticUniforms();
  }

  /**
   * @returns {boolean}
   */
  isAvailable() {
    return Boolean(this.available);
  }

  /**
   * Identity 3x3 matrix (column-major).
   * @returns {Float32Array}
   */
  static identityMat3() {
    return new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  }

  /**
   * 2D rotation matrix (column-major mat3).
   * @param {number} angle - Radians
   * @returns {Float32Array}
   */
  static rotationMat3(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([c, s, 0, -s, c, 0, 0, 0, 1]);
  }

  /**
   * @private
   */
  _initGL() {
    const gl = this.gl;
    gl.viewport(0, 0, this.width, this.height);
    gl.enable(gl.BLEND);
  }

  /**
   * @private
   * @param {number} seedCount
   */
  _createSeedBuffer(seedCount) {
    const gl = this.gl;

    this._seeds = new Float32Array(seedCount * 2);
    for (let i = 0; i < this._seeds.length; i++) {
      this._seeds[i] = Math.random() * 2 - 1;
    }

    this.seedBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.seedBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._seeds, gl.STATIC_DRAW);
  }

  /**
   * Re-generate random seeds.
   */
  regenerateSeeds() {
    if (!this.available) return;
    for (let i = 0; i < this._seeds.length; i++) {
      this._seeds[i] = Math.random() * 2 - 1;
    }
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.seedBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._seeds, gl.STATIC_DRAW);
  }

  /**
   * Change seed count (recreates buffers).
   * @param {number} seedCount
   */
  setSeedCount(seedCount) {
    if (!this.available) return;
    if (seedCount === this.seedCount) return;

    this.seedCount = seedCount;

    const gl = this.gl;
    if (this.seedBuffer) gl.deleteBuffer(this.seedBuffer);

    this._createSeedBuffer(seedCount);
  }

  /**
   * @private
   */
  _compileProgram() {
    const gl = this.gl;

    const fragmentSource = DEJONG_POINT_FRAGMENTS[this.shape] ?? DEJONG_POINT_FRAGMENTS.glow;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, DEJONG_POINT_VERTEX);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error("DeJong vertex shader error:", gl.getShaderInfoLog(vertexShader));
      this.available = false;
      return;
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error("DeJong fragment shader error:", gl.getShaderInfoLog(fragmentShader));
      this.available = false;
      return;
    }

    this.program = gl.createProgram();
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error("DeJong program link error:", gl.getProgramInfoLog(this.program));
      this.available = false;
      return;
    }

    gl.useProgram(this.program);

    // Locations
    this.aPosition = gl.getAttribLocation(this.program, "aPosition");

    this.uTime = gl.getUniformLocation(this.program, "uTime");
    this.uParams = gl.getUniformLocation(this.program, "uParams");
    this.uIterations = gl.getUniformLocation(this.program, "uIterations");
    this.uTransform = gl.getUniformLocation(this.program, "uTransform");
    this.uZoom = gl.getUniformLocation(this.program, "uZoom");
    this.uPointScale = gl.getUniformLocation(this.program, "uPointScale");
    this.uPointSize = gl.getUniformLocation(this.program, "uPointSize");
    this.uColorMode = gl.getUniformLocation(this.program, "uColorMode");
    this.uColor = gl.getUniformLocation(this.program, "uColor");
    this.uHueRange = gl.getUniformLocation(this.program, "uHueRange");
    this.uMaxSpeed = gl.getUniformLocation(this.program, "uMaxSpeed");
    this.uSaturation = gl.getUniformLocation(this.program, "uSaturation");
    this.uLightness = gl.getUniformLocation(this.program, "uLightness");
    this.uAlpha = gl.getUniformLocation(this.program, "uAlpha");
    this.uHueOffset = gl.getUniformLocation(this.program, "uHueOffset");

    // Cleanup shader objects
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
  }

  /**
   * @private
   */
  _setupBlending() {
    const gl = this.gl;
    if (this.blendMode === "additive") {
      gl.blendFunc(gl.ONE, gl.ONE);
    } else {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }
  }

  /**
   * Set WebGL blend mode.
   * @param {WebGLBlendMode} mode
   */
  setBlendMode(mode) {
    this.blendMode = mode;
    if (this.available) this._setupBlending();
  }

  /**
   * Set point sprite shape (recompiles fragment shader).
   * @param {PointSpriteShape} shape
   */
  setShape(shape) {
    if (shape === this.shape) return;
    this.shape = shape;

    if (!this.available) return;
    const gl = this.gl;
    if (this.program) gl.deleteProgram(this.program);
    this._compileProgram();
    this._setupBlending();
    this._applyStaticUniforms();
  }

  /**
   * @private
   */
  _applyStaticUniforms() {
    if (!this.available) return;
    const gl = this.gl;
    gl.useProgram(this.program);
    if (this.uPointScale) gl.uniform1f(this.uPointScale, this.pointScale);
    if (this.uPointSize) gl.uniform1f(this.uPointSize, this.pointSize);
  }

  /**
   * Set color mode.
   * @param {0|1} mode - 0=flat, 1=speed→hue
   */
  setColorMode(mode) {
    this.colorMode = mode === 1 ? 1 : 0;
  }

  /**
   * Set Lorenz-like color ramp settings.
   * @param {Object} options
   * @param {number} options.minHue - degrees (fast)
   * @param {number} options.maxHue - degrees (slow)
   * @param {number} options.maxSpeed - speed normalization threshold
   * @param {number} options.saturation - 0..1
   * @param {number} options.lightness - 0..1
   * @param {number} options.alpha - 0..1
   * @param {number} options.hueShiftSpeed - degrees per second
   */
  setColorRamp(options = {}) {
    if (options.minHue !== undefined) this.hueRange.minHue = options.minHue;
    if (options.maxHue !== undefined) this.hueRange.maxHue = options.maxHue;
    if (options.maxSpeed !== undefined) this.maxSpeed = options.maxSpeed;
    if (options.saturation !== undefined) this.saturation = options.saturation;
    if (options.lightness !== undefined) this.lightness = options.lightness;
    if (options.alpha !== undefined) this.alpha = options.alpha;
    if (options.hueShiftSpeed !== undefined) this.hueShiftSpeed = options.hueShiftSpeed;
  }

  /**
   * Set De Jong parameters.
   * @param {{a:number,b:number,c:number,d:number}} params
   */
  setParams(params) {
    this.params = { ...this.params, ...params };
  }

  /**
   * Set iteration count (clamped to shader max).
   * @param {number} iterations
   */
  setIterations(iterations) {
    this.iterations = Math.max(0, Math.min(DEJONG_MAX_ITERATIONS, Math.floor(iterations)));
  }

  /**
   * Set zoom factor.
   * @param {number} zoom
   */
  setZoom(zoom) {
    this.zoom = zoom;
  }

  /**
   * Set transform matrix (mat3, column-major).
   * @param {Float32Array} mat3
   */
  setTransform(mat3) {
    this.transform = mat3;
  }

  /**
   * Set point size in pixels.
   * @param {number} size
   */
  setPointSize(size) {
    this.pointSize = size;
    if (this.available && this.uPointSize) {
      this.gl.useProgram(this.program);
      this.gl.uniform1f(this.uPointSize, size);
    }
  }

  /**
   * Set color (0..1 RGBA).
   * @param {{r:number,g:number,b:number,a:number}} color
   */
  setColor(color) {
    this.color = { ...this.color, ...color };
  }

  /**
   * Resize the renderer.
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    if (this.available) {
      this.gl.viewport(0, 0, width, height);
    }
  }

  /**
   * Clear the WebGL canvas.
   * @param {number} r - 0..1
   * @param {number} g - 0..1
   * @param {number} b - 0..1
   * @param {number} a - 0..1
   */
  clear(r = 0, g = 0, b = 0, a = 0) {
    if (!this.available) return;
    const gl = this.gl;
    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  /**
   * Render one frame.
   * @param {number} timeSeconds - Time in seconds (uTime)
   */
  render(timeSeconds = 0) {
    if (!this.available) return;

    const gl = this.gl;
    gl.useProgram(this.program);

    // Update uniforms
    if (this.uTime) gl.uniform1f(this.uTime, timeSeconds);
    if (this.uParams) gl.uniform4f(this.uParams, this.params.a, this.params.b, this.params.c, this.params.d);
    if (this.uIterations) gl.uniform1i(this.uIterations, this.iterations);
    if (this.uTransform) gl.uniformMatrix3fv(this.uTransform, false, this.transform);
    if (this.uZoom) gl.uniform1f(this.uZoom, this.zoom);
    if (this.uPointScale) gl.uniform1f(this.uPointScale, this.pointScale);
    if (this.uPointSize) gl.uniform1f(this.uPointSize, this.pointSize);
    if (this.uColor) gl.uniform4f(this.uColor, this.color.r, this.color.g, this.color.b, this.color.a);
    if (this.uColorMode) gl.uniform1i(this.uColorMode, this.colorMode);
    if (this.uHueRange) gl.uniform2f(this.uHueRange, this.hueRange.minHue, this.hueRange.maxHue);
    if (this.uMaxSpeed) gl.uniform1f(this.uMaxSpeed, this.maxSpeed);
    if (this.uSaturation) gl.uniform1f(this.uSaturation, this.saturation);
    if (this.uLightness) gl.uniform1f(this.uLightness, this.lightness);
    if (this.uAlpha) gl.uniform1f(this.uAlpha, this.alpha);
    if (this.uHueOffset) gl.uniform1f(this.uHueOffset, (timeSeconds * this.hueShiftSpeed) % 360);

    // Bind seeds
    gl.bindBuffer(gl.ARRAY_BUFFER, this.seedBuffer);
    gl.enableVertexAttribArray(this.aPosition);
    gl.vertexAttribPointer(this.aPosition, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.POINTS, 0, this.seedCount);
  }

  /**
   * Composite WebGL canvas onto a 2D canvas context.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} [x=0]
   * @param {number} [y=0]
   * @param {number} [width]
   * @param {number} [height]
   */
  compositeOnto(ctx, x = 0, y = 0, width, height) {
    if (!this.available) return;
    ctx.drawImage(this.canvas, x, y, width ?? this.canvas.width, height ?? this.canvas.height);
  }

  /**
   * Destroy and free resources.
   */
  destroy() {
    if (!this.available) return;
    const gl = this.gl;
    if (this.program) gl.deleteProgram(this.program);
    if (this.seedBuffer) gl.deleteBuffer(this.seedBuffer);
    this._seeds = null;
  }
}

