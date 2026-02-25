/**
 * WebGLBlackHoleRenderer — GPU-accelerated raymarched black hole for galaxy demos.
 *
 * Renders a fullscreen quad with gravitational lensing, accretion disk, and
 * relativistic jets into a small square offscreen canvas. Composites centered
 * onto the main 2D canvas via premultiplied alpha blending.
 *
 * Self-contained: owns its own offscreen canvas and WebGL context.
 */

import { BLACKHOLE_VERTEX, BLACKHOLE_FRAGMENT } from "./shaders/blackhole-shaders.js";

export class WebGLBlackHoleRenderer {
  /**
   * @param {Object} options
   * @param {number} [options.size=256] - Square canvas size in pixels
   */
  constructor(options = {}) {
    this.size = options.size || 256;

    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.available = false;
    this.uniforms = {};
  }

  /**
   * Initialize the renderer: create offscreen canvas, compile shaders, create buffers.
   * @returns {boolean} true if initialization succeeded
   */
  init() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.size;
    this.canvas.height = this.size;

    this.gl = this.canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
    });

    if (!this.gl) {
      console.warn("WebGLBlackHoleRenderer: WebGL not available");
      this.available = false;
      return false;
    }

    const gl = this.gl;

    // Compile shaders
    this.program = this._createProgram(BLACKHOLE_VERTEX, BLACKHOLE_FRAGMENT);
    if (!this.program) {
      this.available = false;
      return false;
    }

    // Cache uniform locations
    this._cacheUniforms();

    // Create fullscreen quad buffers
    this._createQuadBuffers();

    // Enable blending (premultiplied alpha)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    this.available = true;
    return true;
  }

  /** @returns {boolean} */
  isAvailable() {
    return this.available;
  }

  /**
   * Resize the renderer canvas and viewport.
   * @param {number} size - New square canvas size in pixels
   */
  resize(size) {
    this.size = size;
    this.canvas.width = size;
    this.canvas.height = size;

    if (this.available) {
      this.gl.viewport(0, 0, size, size);
    }
  }

  /**
   * Render the black hole.
   * @param {Object} params
   * @param {number} params.time - Elapsed time in seconds
   * @param {number} params.tiltX - Camera tilt around X axis
   * @param {number} params.rotY - Camera rotation around Y axis
   */
  render(params) {
    if (!this.available) return;

    const gl = this.gl;

    gl.viewport(0, 0, this.size, this.size);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);

    const u = this.uniforms;
    gl.uniform2f(u.uResolution, this.size, this.size);
    gl.uniform1f(u.uTime, params.time || 0);
    gl.uniform1f(u.uTiltX, params.tiltX || 0);
    gl.uniform1f(u.uRotY, params.rotY || 0);

    this._bindQuad();
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /**
   * Composite the black hole onto a 2D canvas context, centered at the given position.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} centerX - Center X position on the target canvas
   * @param {number} centerY - Center Y position on the target canvas
   */
  compositeOnto(ctx, centerX, centerY) {
    if (!this.available) return;
    ctx.drawImage(this.canvas, centerX - this.size / 2, centerY - this.size / 2);
  }

  /** Release all GPU resources. */
  destroy() {
    if (!this.available) return;
    const gl = this.gl;

    if (this.program) gl.deleteProgram(this.program);
    if (this.quadPositionBuffer) gl.deleteBuffer(this.quadPositionBuffer);
    if (this.quadUvBuffer) gl.deleteBuffer(this.quadUvBuffer);

    this.program = null;
    this.available = false;
  }

  // --- Private ----------------------------------------------------------------

  /** @private */
  _compileShader(source, type) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("WebGLBlackHoleRenderer shader error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  /** @private */
  _createProgram(vertSrc, fragSrc) {
    const gl = this.gl;
    const vert = this._compileShader(vertSrc, gl.VERTEX_SHADER);
    const frag = this._compileShader(fragSrc, gl.FRAGMENT_SHADER);
    if (!vert || !frag) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("WebGLBlackHoleRenderer link error:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    gl.deleteShader(vert);
    gl.deleteShader(frag);
    return program;
  }

  /** @private */
  _cacheUniforms() {
    const gl = this.gl;
    const p = this.program;
    const names = ["uResolution", "uTime", "uTiltX", "uRotY"];
    for (const name of names) {
      this.uniforms[name] = gl.getUniformLocation(p, name);
    }

    this._aPosition = gl.getAttribLocation(p, "aPosition");
    this._aUV = gl.getAttribLocation(p, "aUV");
  }

  /** @private */
  _createQuadBuffers() {
    const gl = this.gl;

    const positions = new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1,
    ]);
    this.quadPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const uvs = new Float32Array([
      0, 0,  1, 0,  0, 1,
      0, 1,  1, 0,  1, 1,
    ]);
    this.quadUvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadUvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
  }

  /** @private */
  _bindQuad() {
    const gl = this.gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadPositionBuffer);
    gl.enableVertexAttribArray(this._aPosition);
    gl.vertexAttribPointer(this._aPosition, 2, gl.FLOAT, false, 0, 0);

    if (this._aUV >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadUvBuffer);
      gl.enableVertexAttribArray(this._aUV);
      gl.vertexAttribPointer(this._aUV, 2, gl.FLOAT, false, 0, 0);
    }
  }
}
