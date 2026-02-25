/**
 * WebGLNebulaRenderer — GPU-accelerated procedural nebula clouds for galaxy demos.
 *
 * Renders a fullscreen quad with simplex noise, FBM, and spiral noise masked
 * to spiral arm structure. Composites additively onto the 2D canvas.
 *
 * Self-contained: owns its own offscreen canvas and WebGL context.
 */

import { NEBULA_VERTEX, NEBULA_FRAGMENT } from "./shaders/nebula-shaders.js";

export class WebGLNebulaRenderer {
  /**
   * @param {Object} options
   * @param {number} [options.width=800]
   * @param {number} [options.height=600]
   * @param {number} [options.nebulaIntensity=0.4]
   */
  constructor(options = {}) {
    this.width = options.width || 800;
    this.height = options.height || 600;
    this.nebulaIntensity = options.nebulaIntensity ?? 0.4;

    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.available = false;
    this.uniforms = {};
    this.densityTexture = null;
    this._densitySize = 64;
  }

  /**
   * Initialize the renderer: create offscreen canvas, compile shaders, create buffers.
   * @returns {boolean} true if initialization succeeded
   */
  init() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.gl = this.canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
    });

    if (!this.gl) {
      console.warn("WebGLNebulaRenderer: WebGL not available");
      this.available = false;
      return false;
    }

    const gl = this.gl;

    // Compile shaders
    this.program = this._createProgram(NEBULA_VERTEX, NEBULA_FRAGMENT);
    if (!this.program) {
      this.available = false;
      return false;
    }

    // Cache uniform locations
    this._cacheUniforms();

    // Create fullscreen quad buffers
    this._createQuadBuffers();

    // Create density texture (starts as uniform white = no masking)
    this._createDensityTexture();

    // Enable blending (premultiplied alpha, additive)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    this.available = true;
    return true;
  }

  /** @returns {boolean} */
  isAvailable() {
    return this.available;
  }

  /**
   * Resize the renderer canvas and viewport.
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
   * Render the nebula fullscreen with inverse-perspective projection.
   * @param {Object} params
   * @param {number} params.time - Elapsed time in seconds
   * @param {number} params.centerX - Galaxy center X in canvas pixels
   * @param {number} params.centerY - Galaxy center Y in canvas pixels (Y-down)
   * @param {number} params.perspective - Camera3D perspective distance
   * @param {number} params.sinTilt - sin(camera.rotationX)
   * @param {number} params.cosTilt - cos(camera.rotationX)
   * @param {number} params.galaxyRadius - World-space galaxy radius
   * @param {number} params.zoom - Zoom factor
   * @param {number} params.seed - Random seed (0..1)
   * @param {number} params.galaxyRotation - Current galaxy rotation angle
   */
  render(params) {
    if (!this.available) return;

    const gl = this.gl;

    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);

    const u = this.uniforms;
    gl.uniform2f(u.uResolution, this.width, this.height);
    gl.uniform1f(u.uTime, params.time || 0);
    gl.uniform2f(u.uCenter, params.centerX || 0, params.centerY || 0);
    gl.uniform1f(u.uPerspective, params.perspective || 600);
    gl.uniform1f(u.uSinTilt, params.sinTilt || 0);
    gl.uniform1f(u.uCosTilt, params.cosTilt || 1);
    gl.uniform1f(u.uSinRotY, params.sinRotY || 0);
    gl.uniform1f(u.uCosRotY, params.cosRotY || 1);
    gl.uniform1f(u.uGalaxyRadius, params.galaxyRadius || 350);
    gl.uniform1f(u.uZoom, params.zoom || 1);
    gl.uniform1f(u.uSeed, params.seed || 0);
    gl.uniform1f(u.uNebulaIntensity, this.nebulaIntensity);
    gl.uniform1f(u.uGalaxyRotation, params.galaxyRotation || 0);
    gl.uniform1f(u.uAxisRatio, params.axisRatio ?? 1.0);

    // Bind density texture to unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.densityTexture);
    gl.uniform1i(u.uDensityMap, 0);

    this._bindQuad();
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /**
   * Composite the nebula onto a 2D canvas context.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} [x=0]
   * @param {number} [y=0]
   */
  compositeOnto(ctx, x = 0, y = 0) {
    if (!this.available) return;
    ctx.drawImage(this.canvas, x, y);
  }

  /** Release all GPU resources. */
  destroy() {
    if (!this.available) return;
    const gl = this.gl;

    if (this.program) gl.deleteProgram(this.program);
    if (this.quadPositionBuffer) gl.deleteBuffer(this.quadPositionBuffer);
    if (this.quadUvBuffer) gl.deleteBuffer(this.quadUvBuffer);
    if (this.densityTexture) gl.deleteTexture(this.densityTexture);

    this.program = null;
    this.available = false;
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  /** @private */
  _compileShader(source, type) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("WebGLNebulaRenderer shader error:", gl.getShaderInfoLog(shader));
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
      console.error("WebGLNebulaRenderer link error:", gl.getProgramInfoLog(program));
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
    const names = [
      "uResolution", "uTime", "uCenter", "uPerspective",
      "uSinTilt", "uCosTilt", "uSinRotY", "uCosRotY",
      "uGalaxyRadius", "uZoom",
      "uSeed", "uNebulaIntensity", "uGalaxyRotation",
      "uAxisRatio", "uDensityMap",
    ];
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
  _createDensityTexture() {
    const gl = this.gl;
    const size = this._densitySize;

    this.densityTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.densityTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Initialize with uniform white (no masking until stars are loaded)
    const white = new Uint8Array(size * size).fill(255);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, size, size, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, white);
  }

  /**
   * Build a density map from star positions and upload as a texture.
   * Stars are in cylindrical coords: { radius, angle }.
   * @param {Array} stars - Array of star objects with radius and angle
   * @param {number} galaxyRadius - World-space galaxy radius
   */
  updateDensityMap(stars, galaxyRadius) {
    if (!this.available || !stars || stars.length === 0) return;

    const size = this._densitySize;
    const grid = new Float32Array(size * size);
    const extent = galaxyRadius * 1.3; // match shader's UV mapping

    // Rasterize star positions into grid
    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      const wx = Math.cos(star.angle) * star.radius;
      const wz = Math.sin(star.angle) * star.radius;

      // Map to grid cell: [-extent, +extent] → [0, size-1]
      const gx = Math.floor((wx / extent * 0.5 + 0.5) * (size - 1));
      const gz = Math.floor((wz / extent * 0.5 + 0.5) * (size - 1));

      if (gx >= 0 && gx < size && gz >= 0 && gz < size) {
        grid[gz * size + gx] += 1.0;
      }
    }

    // Box blur (3 passes with 5x5 kernel for smooth falloff)
    const tmp = new Float32Array(size * size);
    for (let pass = 0; pass < 3; pass++) {
      const src = pass % 2 === 0 ? grid : tmp;
      const dst = pass % 2 === 0 ? tmp : grid;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          let sum = 0;
          let count = 0;
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                sum += src[ny * size + nx];
                count++;
              }
            }
          }
          dst[y * size + x] = sum / count;
        }
      }
    }
    // After 3 passes (even count starting from grid), result is in tmp
    grid.set(tmp);

    // Find max for normalization
    let max = 0;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] > max) max = grid[i];
    }

    // Normalize to 0-255 and upload
    const pixels = new Uint8Array(size * size);
    if (max > 0) {
      for (let i = 0; i < grid.length; i++) {
        pixels[i] = Math.min(255, Math.floor((grid[i] / max) * 255));
      }
    }

    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.densityTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, size, size, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, pixels);
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
