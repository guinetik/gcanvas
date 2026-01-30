/**
 * WebGLLineRenderer - GPU-accelerated line rendering
 *
 * Renders line segments using WebGL GL_LINES for high performance.
 * Designed for particle trails, attractor visualizations, and similar
 * effects that require many line segments.
 *
 * Features:
 * - Pre-allocated buffers for zero-allocation rendering
 * - Additive or alpha blending modes
 * - Per-vertex colors for gradient trails
 * - Compositing onto Canvas 2D
 *
 * @example
 * const renderer = new WebGLLineRenderer(50000); // 50k line segments
 * renderer.updateLines(lineData);
 * renderer.render(segmentCount);
 * renderer.compositeOnto(ctx, 0, 0);
 */

// Line vertex shader
const LINE_VERTEX_SHADER = `
precision highp float;

attribute vec2 aPosition;   // Screen position (pixels)
attribute vec4 aColor;      // RGBA color (0-1 range, premultiplied)

varying vec4 vColor;

uniform vec2 uResolution;   // Canvas dimensions

void main() {
    // Convert from pixel coords to clip space (-1 to 1)
    vec2 clipPos = (aPosition / uResolution) * 2.0 - 1.0;
    clipPos.y = -clipPos.y;  // Flip Y (canvas Y is down, GL Y is up)

    gl_Position = vec4(clipPos, 0.0, 1.0);
    vColor = aColor;
}
`;

// Line fragment shader
const LINE_FRAGMENT_SHADER = `
precision mediump float;

varying vec4 vColor;

void main() {
    gl_FragColor = vColor;
}
`;

export class WebGLLineRenderer {
  /**
   * Create a WebGL line renderer
   * @param {number} maxSegments - Maximum number of line segments (pre-allocated)
   * @param {Object} options - Configuration options
   * @param {number} options.width - Initial canvas width
   * @param {number} options.height - Initial canvas height
   * @param {string} options.blendMode - Blend mode: 'additive' or 'alpha'
   */
  constructor(maxSegments = 10000, options = {}) {
    this.maxSegments = maxSegments;
    this.width = options.width || 800;
    this.height = options.height || 600;
    this.blendMode = options.blendMode || 'additive';

    // Create offscreen canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Get WebGL context
    this.gl = this.canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });

    if (!this.gl) {
      console.warn('WebGL not available for line rendering');
      this.available = false;
      return;
    }

    this.available = true;

    // Pre-allocate typed arrays (2 vertices per segment)
    // Each vertex: x, y (position) + r, g, b, a (color)
    this._positions = new Float32Array(maxSegments * 4); // 2 vertices * 2 coords
    this._colors = new Float32Array(maxSegments * 8);    // 2 vertices * 4 color components

    // Setup WebGL
    this._initGL();
    this._createBuffers();
    this._compileShaders();
    this._setupBlending();
  }

  /**
   * Check if WebGL is available
   * @returns {boolean}
   */
  isAvailable() {
    return this.available;
  }

  /**
   * Initialize WebGL state
   * @private
   */
  _initGL() {
    const gl = this.gl;
    gl.viewport(0, 0, this.width, this.height);
    gl.enable(gl.BLEND);
  }

  /**
   * Setup blending mode
   * @private
   */
  _setupBlending() {
    const gl = this.gl;

    if (this.blendMode === 'additive') {
      // Additive blending (screen/lighter mode)
      gl.blendFunc(gl.ONE, gl.ONE);
    } else {
      // Standard alpha blending with premultiplied alpha
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }
  }

  /**
   * Set blend mode
   * @param {string} mode - 'additive' or 'alpha'
   */
  setBlendMode(mode) {
    this.blendMode = mode;
    if (this.available) {
      this._setupBlending();
    }
  }

  /**
   * Create GPU buffers
   * @private
   */
  _createBuffers() {
    const gl = this.gl;

    // Position buffer (vec2 per vertex, 2 vertices per segment)
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._positions, gl.DYNAMIC_DRAW);

    // Color buffer (vec4 per vertex, 2 vertices per segment)
    this.colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._colors, gl.DYNAMIC_DRAW);
  }

  /**
   * Compile shaders
   * @private
   */
  _compileShaders() {
    const gl = this.gl;

    // Compile vertex shader
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, LINE_VERTEX_SHADER);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error('Line vertex shader error:', gl.getShaderInfoLog(vertexShader));
      this.available = false;
      return;
    }

    // Compile fragment shader
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, LINE_FRAGMENT_SHADER);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error('Line fragment shader error:', gl.getShaderInfoLog(fragmentShader));
      this.available = false;
      return;
    }

    // Link program
    this.program = gl.createProgram();
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Line program link error:', gl.getProgramInfoLog(this.program));
      this.available = false;
      return;
    }

    gl.useProgram(this.program);

    // Get attribute locations
    this.aPosition = gl.getAttribLocation(this.program, 'aPosition');
    this.aColor = gl.getAttribLocation(this.program, 'aColor');

    // Get uniform locations
    this.uResolution = gl.getUniformLocation(this.program, 'uResolution');

    // Set initial resolution
    gl.uniform2f(this.uResolution, this.width, this.height);

    // Clean up shader objects
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
  }

  /**
   * Resize the renderer
   * @param {number} width - New width
   * @param {number} height - New height
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;

    if (this.available) {
      const gl = this.gl;
      gl.viewport(0, 0, width, height);
      gl.useProgram(this.program);
      gl.uniform2f(this.uResolution, width, height);
    }
  }

  /**
   * Update line segment data in GPU buffers
   *
   * @param {Array} segments - Array of line segments
   *   Each segment: { x1, y1, x2, y2, r, g, b, a } or
   *                 { x1, y1, x2, y2, r1, g1, b1, a1, r2, g2, b2, a2 } for gradient
   *   Colors should be 0-255 for RGB, 0-1 for alpha
   * @returns {number} Number of segments updated
   */
  updateLines(segments) {
    if (!this.available) return 0;

    const count = Math.min(segments.length, this.maxSegments);
    const gl = this.gl;

    // Fill typed arrays
    for (let i = 0; i < count; i++) {
      const s = segments[i];
      const pi = i * 4; // position index (2 vertices * 2 coords)
      const ci = i * 8; // color index (2 vertices * 4 components)

      // Positions
      this._positions[pi] = s.x1;
      this._positions[pi + 1] = s.y1;
      this._positions[pi + 2] = s.x2;
      this._positions[pi + 3] = s.y2;

      // Colors (check for gradient or single color)
      const hasGradient = s.r1 !== undefined;

      if (hasGradient) {
        // Gradient: different colors at each end
        const a1 = s.a1 !== undefined ? s.a1 : 1;
        const a2 = s.a2 !== undefined ? s.a2 : 1;

        // Premultiplied alpha
        this._colors[ci] = (s.r1 / 255) * a1;
        this._colors[ci + 1] = (s.g1 / 255) * a1;
        this._colors[ci + 2] = (s.b1 / 255) * a1;
        this._colors[ci + 3] = a1;

        this._colors[ci + 4] = (s.r2 / 255) * a2;
        this._colors[ci + 5] = (s.g2 / 255) * a2;
        this._colors[ci + 6] = (s.b2 / 255) * a2;
        this._colors[ci + 7] = a2;
      } else {
        // Single color for both vertices
        const a = s.a !== undefined ? s.a : 1;
        const r = (s.r / 255) * a;
        const g = (s.g / 255) * a;
        const b = (s.b / 255) * a;

        this._colors[ci] = r;
        this._colors[ci + 1] = g;
        this._colors[ci + 2] = b;
        this._colors[ci + 3] = a;

        this._colors[ci + 4] = r;
        this._colors[ci + 5] = g;
        this._colors[ci + 6] = b;
        this._colors[ci + 7] = a;
      }
    }

    // Upload to GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._positions.subarray(0, count * 4));

    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._colors.subarray(0, count * 8));

    return count;
  }

  /**
   * Clear the canvas
   * @param {number} r - Red (0-1)
   * @param {number} g - Green (0-1)
   * @param {number} b - Blue (0-1)
   * @param {number} a - Alpha (0-1)
   */
  clear(r = 0, g = 0, b = 0, a = 0) {
    if (!this.available) return;
    const gl = this.gl;
    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  /**
   * Render lines to the WebGL canvas
   * @param {number} count - Number of line segments to render
   */
  render(count) {
    if (!this.available || count === 0) return;

    const gl = this.gl;

    gl.useProgram(this.program);

    // Bind position attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(this.aPosition);
    gl.vertexAttribPointer(this.aPosition, 2, gl.FLOAT, false, 0, 0);

    // Bind color attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.enableVertexAttribArray(this.aColor);
    gl.vertexAttribPointer(this.aColor, 4, gl.FLOAT, false, 0, 0);

    // Draw all lines in a single call (2 vertices per segment)
    gl.drawArrays(gl.LINES, 0, count * 2);
  }

  /**
   * Composite the WebGL canvas onto a 2D canvas context
   * @param {CanvasRenderingContext2D} ctx - Target 2D context
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  compositeOnto(ctx, x = 0, y = 0) {
    if (!this.available) return;
    ctx.drawImage(this.canvas, x, y);
  }

  /**
   * Get the WebGL canvas element
   * @returns {HTMLCanvasElement}
   */
  getCanvas() {
    return this.canvas;
  }

  /**
   * Destroy the renderer and free resources
   */
  destroy() {
    if (!this.available) return;

    const gl = this.gl;

    if (this.program) {
      gl.deleteProgram(this.program);
    }

    gl.deleteBuffer(this.positionBuffer);
    gl.deleteBuffer(this.colorBuffer);

    this._positions = null;
    this._colors = null;
  }
}
