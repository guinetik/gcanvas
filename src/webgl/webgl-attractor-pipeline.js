/**
 * WebGLAttractorPipeline — GPU-accelerated rendering pipeline for 3D attractors.
 *
 * Provides:
 *   - GPU-driven color math (HSL→RGB, speed mapping, blink, age alpha)
 *   - Energy flow animation (sinusoidal brightness modulation + sparks)
 *   - Animated FBM noise background with vignette
 *   - Multi-pass bloom post-processing (extract → blur H → blur V → composite)
 *   - Depth fog, iridescence, chromatic aberration, ACES tonemapping, color grading
 *
 * Self-contained: owns its own WebGL context and canvas.
 * Does NOT modify or depend on WebGLLineRenderer.
 */

import { WebGLFBO } from "./webgl-fbo.js";
import {
  ATTRACTOR_LINE_VERTEX,
  ATTRACTOR_LINE_FRAGMENT,
  BACKGROUND_VERTEX,
  BACKGROUND_FRAGMENT,
  BRIGHT_EXTRACT_VERTEX,
  BRIGHT_EXTRACT_FRAGMENT,
  BLUR_VERTEX,
  BLUR_FRAGMENT,
  COMPOSITE_VERTEX,
  COMPOSITE_FRAGMENT,
  POST_PROCESS_VERTEX,
  POST_PROCESS_FRAGMENT,
} from "./shaders/attractor-shaders.js";

export class WebGLAttractorPipeline {
  /**
   * @param {number} width
   * @param {number} height
   * @param {number} maxSegments
   * @param {Object} options
   * @param {Object} [options.bloom]                - { enabled, threshold, strength, radius }
   * @param {Object} [options.background]           - { baseColor, fogDensity, noiseScale, animSpeed }
   * @param {Object} [options.visual]               - { minHue, maxHue, saturation, lightness, maxAlpha }
   * @param {Object} [options.blink]                - { intensityBoost, saturationBoost, alphaBoost }
   * @param {Object} [options.energyFlow]           - { intensity, speed, sparkThreshold }
   * @param {Object} [options.depthFog]             - { enabled, density, energyFalloff }
   * @param {Object} [options.iridescence]          - { enabled, intensity, speed, scale }
   * @param {Object} [options.chromaticAberration]  - { enabled, strength, falloff }
   * @param {Object} [options.colorGrading]         - { enabled, exposure, vignetteStrength, vignetteRadius, grainIntensity, warmth }
   */
  constructor(width, height, maxSegments, options = {}) {
    this.width = width;
    this.height = height;
    this.maxSegments = maxSegments;

    this.bloomConfig = {
      enabled: true,
      threshold: 0.25,
      strength: 0.35,
      radius: 0.6,
      passes: 1,
      ...options.bloom,
    };

    this.glowConfig = {
      enabled: true,
      radius: 25,
      intensity: 0.6,
      ...options.glow,
    };

    this.backgroundConfig = {
      baseColor: [0.05, 0.02, 0.08],
      fogDensity: 0.15,
      noiseScale: 3.0,
      animSpeed: 0.08,
      ...options.background,
    };

    this.visualConfig = {
      minHue: 30,
      maxHue: 200,
      saturation: 85,
      lightness: 55,
      maxAlpha: 0.85,
      ...options.visual,
    };

    this.blinkConfig = {
      intensityBoost: 1.8,
      saturationBoost: 1.5,
      alphaBoost: 1.5,
      ...options.blink,
    };

    this.energyConfig = {
      intensity: 0.4,
      speed: 1.0,
      sparkThreshold: 0.98,
      ...options.energyFlow,
    };

    this.depthFogConfig = {
      enabled: true,
      density: 0.5,
      energyFalloff: 0.7,
      ...options.depthFog,
    };

    this.iridescenceConfig = {
      enabled: true,
      intensity: 0.3,
      speed: 0.5,
      scale: 2.0,
      ...options.iridescence,
    };

    this.chromaticAberrationConfig = {
      enabled: false,
      strength: 0.002,
      falloff: 2.0,
      ...options.chromaticAberration,
    };

    this.colorGradingConfig = {
      enabled: false,
      exposure: 1.4,
      vignetteStrength: 0.15,
      vignetteRadius: 0.85,
      grainIntensity: 0.02,
      warmth: 0.15,
      ...options.colorGrading,
    };

    // Pre-allocate typed arrays: 2 vertices per segment
    // Position: vec2 * 2 = 4 floats per segment
    this._positions = new Float32Array(maxSegments * 4);
    // Metadata: (speedNorm, age, blink, segIdx) * 2 = 8 floats per segment
    this._meta = new Float32Array(maxSegments * 8);
    // Depth: 1 float per vertex, 2 vertices per segment
    this._depths = new Float32Array(maxSegments * 2);

    this._currentTime = 0;
    this.available = false;
    this.canvas = null;
    this.gl = null;
    this.programs = {};
  }

  /**
   * Initialize the pipeline: create context, compile shaders, create buffers and FBOs.
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
      console.warn("WebGLAttractorPipeline: WebGL not available");
      this.available = false;
      return false;
    }

    const gl = this.gl;
    gl.enable(gl.BLEND);

    // Compile all shader programs
    this.programs.lines = this._createProgram(
      ATTRACTOR_LINE_VERTEX, ATTRACTOR_LINE_FRAGMENT, "attractor-lines"
    );
    this.programs.background = this._createProgram(
      BACKGROUND_VERTEX, BACKGROUND_FRAGMENT, "background"
    );
    this.programs.brightExtract = this._createProgram(
      BRIGHT_EXTRACT_VERTEX, BRIGHT_EXTRACT_FRAGMENT, "bright-extract"
    );
    this.programs.blur = this._createProgram(
      BLUR_VERTEX, BLUR_FRAGMENT, "blur"
    );
    this.programs.composite = this._createProgram(
      COMPOSITE_VERTEX, COMPOSITE_FRAGMENT, "composite"
    );
    this.programs.postProcess = this._createProgram(
      POST_PROCESS_VERTEX, POST_PROCESS_FRAGMENT, "post-process"
    );

    // Verify all programs compiled
    for (const [name, prog] of Object.entries(this.programs)) {
      if (!prog) {
        console.error(`WebGLAttractorPipeline: failed to compile ${name}`);
        this.available = false;
        return false;
      }
    }

    // Cache uniform and attribute locations
    this._cacheLocations();

    // Create line buffers
    this._createLineBuffers();

    // Create fullscreen quad buffers
    this._createQuadBuffers();

    // Create FBOs
    this._createFBOs();

    this.available = true;
    return true;
  }

  /** @returns {boolean} */
  isAvailable() {
    return this.available;
  }

  /** @returns {boolean} Whether post-processing is enabled (any of chromatic aberration or color grading) */
  _isPostProcessEnabled() {
    return this.chromaticAberrationConfig.enabled || this.colorGradingConfig.enabled;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SHADER COMPILATION
  // ─────────────────────────────────────────────────────────────────────────

  /** @private */
  _compileShader(source, type) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  /** @private */
  _createProgram(vertSrc, fragSrc, name) {
    const gl = this.gl;
    const vert = this._compileShader(vertSrc, gl.VERTEX_SHADER);
    const frag = this._compileShader(fragSrc, gl.FRAGMENT_SHADER);
    if (!vert || !frag) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(`Program "${name}" link error:`, gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    gl.deleteShader(vert);
    gl.deleteShader(frag);
    return program;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOCATION CACHING
  // ─────────────────────────────────────────────────────────────────────────

  /** @private */
  _cacheLocations() {
    const gl = this.gl;
    this.loc = {};

    // Lines program
    const lp = this.programs.lines;
    this.loc.lines = {
      aPosition: gl.getAttribLocation(lp, "aPosition"),
      aSpeedNorm: gl.getAttribLocation(lp, "aSpeedNorm"),
      aAge: gl.getAttribLocation(lp, "aAge"),
      aBlink: gl.getAttribLocation(lp, "aBlink"),
      aSegIdx: gl.getAttribLocation(lp, "aSegIdx"),
      aDepth: gl.getAttribLocation(lp, "aDepth"),
      uResolution: gl.getUniformLocation(lp, "uResolution"),
      uTime: gl.getUniformLocation(lp, "uTime"),
      uMinHue: gl.getUniformLocation(lp, "uMinHue"),
      uMaxHue: gl.getUniformLocation(lp, "uMaxHue"),
      uSaturation: gl.getUniformLocation(lp, "uSaturation"),
      uLightness: gl.getUniformLocation(lp, "uLightness"),
      uMaxAlpha: gl.getUniformLocation(lp, "uMaxAlpha"),
      uHueOffset: gl.getUniformLocation(lp, "uHueOffset"),
      uIntensityBoost: gl.getUniformLocation(lp, "uIntensityBoost"),
      uSaturationBoost: gl.getUniformLocation(lp, "uSaturationBoost"),
      uAlphaBoost: gl.getUniformLocation(lp, "uAlphaBoost"),
      uEnergyIntensity: gl.getUniformLocation(lp, "uEnergyIntensity"),
      uEnergySpeed: gl.getUniformLocation(lp, "uEnergySpeed"),
      uSparkThreshold: gl.getUniformLocation(lp, "uSparkThreshold"),
      // Depth fog
      uDepthFogEnabled: gl.getUniformLocation(lp, "uDepthFogEnabled"),
      uDepthFogDensity: gl.getUniformLocation(lp, "uDepthFogDensity"),
      uDepthFogEnergyFalloff: gl.getUniformLocation(lp, "uDepthFogEnergyFalloff"),
      // Iridescence
      uIridescenceEnabled: gl.getUniformLocation(lp, "uIridescenceEnabled"),
      uIridescenceIntensity: gl.getUniformLocation(lp, "uIridescenceIntensity"),
      uIridescenceSpeed: gl.getUniformLocation(lp, "uIridescenceSpeed"),
      uIridescenceScale: gl.getUniformLocation(lp, "uIridescenceScale"),
    };

    // Background program
    const bp = this.programs.background;
    this.loc.background = {
      aPosition: gl.getAttribLocation(bp, "aPosition"),
      aUV: gl.getAttribLocation(bp, "aUV"),
      uTime: gl.getUniformLocation(bp, "uTime"),
      uBaseColor: gl.getUniformLocation(bp, "uBaseColor"),
      uFogDensity: gl.getUniformLocation(bp, "uFogDensity"),
      uNoiseScale: gl.getUniformLocation(bp, "uNoiseScale"),
      uAnimSpeed: gl.getUniformLocation(bp, "uAnimSpeed"),
    };

    // Bright extract program
    const bep = this.programs.brightExtract;
    this.loc.brightExtract = {
      aPosition: gl.getAttribLocation(bep, "aPosition"),
      aUV: gl.getAttribLocation(bep, "aUV"),
      uTexture: gl.getUniformLocation(bep, "uTexture"),
      uThreshold: gl.getUniformLocation(bep, "uThreshold"),
    };

    // Blur program
    const blp = this.programs.blur;
    this.loc.blur = {
      aPosition: gl.getAttribLocation(blp, "aPosition"),
      aUV: gl.getAttribLocation(blp, "aUV"),
      uTexture: gl.getUniformLocation(blp, "uTexture"),
      uDirection: gl.getUniformLocation(blp, "uDirection"),
      uRadius: gl.getUniformLocation(blp, "uRadius"),
    };

    // Composite program
    const cp = this.programs.composite;
    this.loc.composite = {
      aPosition: gl.getAttribLocation(cp, "aPosition"),
      aUV: gl.getAttribLocation(cp, "aUV"),
      uSceneTexture: gl.getUniformLocation(cp, "uSceneTexture"),
      uBloomTexture: gl.getUniformLocation(cp, "uBloomTexture"),
      uBloomStrength: gl.getUniformLocation(cp, "uBloomStrength"),
    };

    // Post-process program
    const pp = this.programs.postProcess;
    this.loc.postProcess = {
      aPosition: gl.getAttribLocation(pp, "aPosition"),
      aUV: gl.getAttribLocation(pp, "aUV"),
      uTexture: gl.getUniformLocation(pp, "uTexture"),
      uResolution: gl.getUniformLocation(pp, "uResolution"),
      uTime: gl.getUniformLocation(pp, "uTime"),
      uChromAbEnabled: gl.getUniformLocation(pp, "uChromAbEnabled"),
      uChromAbStrength: gl.getUniformLocation(pp, "uChromAbStrength"),
      uChromAbFalloff: gl.getUniformLocation(pp, "uChromAbFalloff"),
      uColorGradingEnabled: gl.getUniformLocation(pp, "uColorGradingEnabled"),
      uExposure: gl.getUniformLocation(pp, "uExposure"),
      uVignetteStrength: gl.getUniformLocation(pp, "uVignetteStrength"),
      uVignetteRadius: gl.getUniformLocation(pp, "uVignetteRadius"),
      uGrainIntensity: gl.getUniformLocation(pp, "uGrainIntensity"),
      uWarmth: gl.getUniformLocation(pp, "uWarmth"),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BUFFER CREATION
  // ─────────────────────────────────────────────────────────────────────────

  /** @private */
  _createLineBuffers() {
    const gl = this.gl;

    // Position buffer: vec2 per vertex, 2 vertices per segment
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._positions, gl.DYNAMIC_DRAW);

    // Metadata buffer: (speedNorm, age, blink, segIdx) per vertex, 2 vertices per segment
    this.metaBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.metaBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._meta, gl.DYNAMIC_DRAW);

    // Depth buffer: 1 float per vertex, 2 vertices per segment
    this.depthBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.depthBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._depths, gl.DYNAMIC_DRAW);
  }

  /** @private */
  _createQuadBuffers() {
    const gl = this.gl;

    // Fullscreen quad: 2 triangles covering clip space
    const quadPositions = new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1,
    ]);
    this.quadPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadPositions, gl.STATIC_DRAW);

    // UV coordinates (0,0 bottom-left → 1,1 top-right)
    const quadUVs = new Float32Array([
      0, 0,  1, 0,  0, 1,
      0, 1,  1, 0,  1, 1,
    ]);
    this.quadUvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadUvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadUVs, gl.STATIC_DRAW);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FBO MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  /** @private */
  _createFBOs() {
    const gl = this.gl;
    const w = this.width;
    const h = this.height;
    const hw = Math.max(1, Math.floor(w / 2));
    const hh = Math.max(1, Math.floor(h / 2));

    this.sceneFBO = new WebGLFBO(gl, w, h, gl.NEAREST);
    this.brightFBO = new WebGLFBO(gl, hw, hh, gl.LINEAR);
    this.blurPingFBO = new WebGLFBO(gl, hw, hh, gl.LINEAR);
    this.blurPongFBO = new WebGLFBO(gl, hw, hh, gl.LINEAR);
    this.postFBO = new WebGLFBO(gl, w, h, gl.LINEAR);
  }

  /** @private */
  _destroyFBOs() {
    this.sceneFBO?.destroy();
    this.brightFBO?.destroy();
    this.blurPingFBO?.destroy();
    this.blurPongFBO?.destroy();
    this.postFBO?.destroy();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FULLSCREEN QUAD HELPER
  // ─────────────────────────────────────────────────────────────────────────

  /** @private */
  _bindQuad(locPosition, locUV) {
    const gl = this.gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadPositionBuffer);
    gl.enableVertexAttribArray(locPosition);
    gl.vertexAttribPointer(locPosition, 2, gl.FLOAT, false, 0, 0);

    if (locUV >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadUvBuffer);
      gl.enableVertexAttribArray(locUV);
      gl.vertexAttribPointer(locUV, 2, gl.FLOAT, false, 0, 0);
    }
  }

  /** @private */
  _drawQuad() {
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PER-FRAME RENDERING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Begin a new frame: bind scene FBO, clear, draw background.
   * @param {number} time - Elapsed time in seconds
   */
  beginFrame(time) {
    if (!this.available) return;
    const gl = this.gl;

    this._currentTime = time;

    // Bind scene FBO and clear
    this.sceneFBO.bind();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Draw animated background
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.programs.background);

    const bg = this.loc.background;
    gl.uniform1f(bg.uTime, time);
    gl.uniform3fv(bg.uBaseColor, this.backgroundConfig.baseColor);
    gl.uniform1f(bg.uFogDensity, this.backgroundConfig.fogDensity);
    gl.uniform1f(bg.uNoiseScale, this.backgroundConfig.noiseScale);
    gl.uniform1f(bg.uAnimSpeed, this.backgroundConfig.animSpeed);

    // Disable line-specific attributes if they were left enabled
    this._disableLineAttribs();

    this._bindQuad(bg.aPosition, bg.aUV);
    this._drawQuad();
  }

  /**
   * Upload line segment data to GPU buffers.
   * @param {Array} segments - Array of { x1, y1, x2, y2, speedNorm, age, blink, segIdx, depth1, depth2 }
   */
  updateLines(segments) {
    if (!this.available) return;

    const count = Math.min(segments.length, this.maxSegments);
    const gl = this.gl;

    for (let i = 0; i < count; i++) {
      const s = segments[i];
      const pi = i * 4;
      const mi = i * 8;
      const di = i * 2;

      // Position: 2 vertices
      this._positions[pi] = s.x1;
      this._positions[pi + 1] = s.y1;
      this._positions[pi + 2] = s.x2;
      this._positions[pi + 3] = s.y2;

      // Metadata: same values for both vertices of each segment
      this._meta[mi] = s.speedNorm;
      this._meta[mi + 1] = s.age;
      this._meta[mi + 2] = s.blink;
      this._meta[mi + 3] = s.segIdx;

      this._meta[mi + 4] = s.speedNorm;
      this._meta[mi + 5] = s.age;
      this._meta[mi + 6] = s.blink;
      this._meta[mi + 7] = s.segIdx;

      // Depth: per-vertex (backward compat: default 0 = near = no fog)
      this._depths[di] = s.depth1 ?? 0;
      this._depths[di + 1] = s.depth2 ?? 0;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._positions.subarray(0, count * 4));

    gl.bindBuffer(gl.ARRAY_BUFFER, this.metaBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._meta.subarray(0, count * 8));

    gl.bindBuffer(gl.ARRAY_BUFFER, this.depthBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._depths.subarray(0, count * 2));
  }

  /**
   * Render line segments into the scene FBO.
   * @param {number} count     - Number of segments
   * @param {number} time      - Elapsed time in seconds
   * @param {number} hueOffset - Current hue shift offset in degrees
   */
  renderLines(count, time, hueOffset) {
    if (!this.available || count === 0) return;
    const gl = this.gl;

    // Additive blending for lines
    gl.blendFunc(gl.ONE, gl.ONE);

    gl.useProgram(this.programs.lines);
    const ll = this.loc.lines;

    // Resolution
    gl.uniform2f(ll.uResolution, this.width, this.height);
    gl.uniform1f(ll.uTime, time);

    // Visual config
    gl.uniform1f(ll.uMinHue, this.visualConfig.minHue);
    gl.uniform1f(ll.uMaxHue, this.visualConfig.maxHue);
    gl.uniform1f(ll.uSaturation, this.visualConfig.saturation);
    gl.uniform1f(ll.uLightness, this.visualConfig.lightness);
    gl.uniform1f(ll.uMaxAlpha, this.visualConfig.maxAlpha);
    gl.uniform1f(ll.uHueOffset, hueOffset);

    // Blink config
    gl.uniform1f(ll.uIntensityBoost, this.blinkConfig.intensityBoost);
    gl.uniform1f(ll.uSaturationBoost, this.blinkConfig.saturationBoost);
    gl.uniform1f(ll.uAlphaBoost, this.blinkConfig.alphaBoost);

    // Energy flow config
    gl.uniform1f(ll.uEnergyIntensity, this.energyConfig.intensity);
    gl.uniform1f(ll.uEnergySpeed, this.energyConfig.speed);
    gl.uniform1f(ll.uSparkThreshold, this.energyConfig.sparkThreshold);

    // Depth fog config
    gl.uniform1f(ll.uDepthFogEnabled, this.depthFogConfig.enabled ? 1.0 : 0.0);
    gl.uniform1f(ll.uDepthFogDensity, this.depthFogConfig.density);
    gl.uniform1f(ll.uDepthFogEnergyFalloff, this.depthFogConfig.energyFalloff);

    // Iridescence config
    gl.uniform1f(ll.uIridescenceEnabled, this.iridescenceConfig.enabled ? 1.0 : 0.0);
    gl.uniform1f(ll.uIridescenceIntensity, this.iridescenceConfig.intensity);
    gl.uniform1f(ll.uIridescenceSpeed, this.iridescenceConfig.speed);
    gl.uniform1f(ll.uIridescenceScale, this.iridescenceConfig.scale);

    // Disable quad attribs that might be left enabled
    const bg = this.loc.background;
    if (bg.aUV >= 0) gl.disableVertexAttribArray(bg.aUV);
    if (bg.aPosition >= 0) gl.disableVertexAttribArray(bg.aPosition);

    // Bind position attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(ll.aPosition);
    gl.vertexAttribPointer(ll.aPosition, 2, gl.FLOAT, false, 0, 0);

    // Bind metadata attributes (interleaved in a single buffer)
    // Each vertex has 4 floats: speedNorm, age, blink, segIdx
    const STRIDE = 4 * 4; // 4 floats * 4 bytes
    gl.bindBuffer(gl.ARRAY_BUFFER, this.metaBuffer);

    if (ll.aSpeedNorm >= 0) {
      gl.enableVertexAttribArray(ll.aSpeedNorm);
      gl.vertexAttribPointer(ll.aSpeedNorm, 1, gl.FLOAT, false, STRIDE, 0);
    }
    if (ll.aAge >= 0) {
      gl.enableVertexAttribArray(ll.aAge);
      gl.vertexAttribPointer(ll.aAge, 1, gl.FLOAT, false, STRIDE, 4);
    }
    if (ll.aBlink >= 0) {
      gl.enableVertexAttribArray(ll.aBlink);
      gl.vertexAttribPointer(ll.aBlink, 1, gl.FLOAT, false, STRIDE, 8);
    }
    if (ll.aSegIdx >= 0) {
      gl.enableVertexAttribArray(ll.aSegIdx);
      gl.vertexAttribPointer(ll.aSegIdx, 1, gl.FLOAT, false, STRIDE, 12);
    }

    // Bind depth attribute
    if (ll.aDepth >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.depthBuffer);
      gl.enableVertexAttribArray(ll.aDepth);
      gl.vertexAttribPointer(ll.aDepth, 1, gl.FLOAT, false, 0, 0);
    }

    gl.drawArrays(gl.LINES, 0, count * 2);
  }

  /**
   * End the frame: run bloom passes (if enabled), post-processing, and composite to screen.
   */
  endFrame() {
    if (!this.available) return;
    const gl = this.gl;

    // Disable line-specific attribs before quad rendering
    this._disableLineAttribs();

    const postEnabled = this._isPostProcessEnabled();

    if (!this.bloomConfig.enabled) {
      // No bloom path
      if (postEnabled) {
        // Route scene → postFBO → screen via post-process
        this._renderCompositeToFBO(this.postFBO, this.sceneFBO.texture, this.sceneFBO.texture, 0.0);
        this._renderPostProcess();
      } else {
        // Simple blit scene → screen
        this._renderCompositeToScreen(this.sceneFBO.texture, this.sceneFBO.texture, 0.0);
      }
      return;
    }

    // ── Bloom pipeline ─────────────────────────────────────────────────

    const hw = this.brightFBO.width;
    const hh = this.brightFBO.height;

    // Pass 1: Bright extract (scene → brightFBO at half res)
    this.brightFBO.bind();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.ONE, gl.ZERO); // Replace, don't blend

    gl.useProgram(this.programs.brightExtract);
    const bel = this.loc.brightExtract;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneFBO.texture);
    gl.uniform1i(bel.uTexture, 0);
    gl.uniform1f(bel.uThreshold, this.bloomConfig.threshold);

    this._bindQuad(bel.aPosition, bel.aUV);
    this._drawQuad();

    // Multi-pass blur: each H+V iteration spreads the glow wider
    gl.useProgram(this.programs.blur);
    const bll = this.loc.blur;
    const passes = Math.max(1, this.bloomConfig.passes || 1);

    for (let p = 0; p < passes; p++) {
      // Source texture: first pass reads from brightFBO, subsequent from blurPongFBO
      const srcTexture = p === 0 ? this.brightFBO.texture : this.blurPongFBO.texture;

      // Horizontal blur → blurPingFBO
      this.blurPingFBO.bind();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, srcTexture);
      gl.uniform1i(bll.uTexture, 0);
      gl.uniform2f(bll.uDirection, 1.0 / hw, 0.0);
      gl.uniform1f(bll.uRadius, this.bloomConfig.radius);

      this._bindQuad(bll.aPosition, bll.aUV);
      this._drawQuad();

      // Vertical blur → blurPongFBO
      this.blurPongFBO.bind();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.blurPingFBO.texture);
      gl.uniform1i(bll.uTexture, 0);
      gl.uniform2f(bll.uDirection, 0.0, 1.0 / hh);
      gl.uniform1f(bll.uRadius, this.bloomConfig.radius);

      this._bindQuad(bll.aPosition, bll.aUV);
      this._drawQuad();
    }

    // Pass 4: Composite (scene + bloom)
    if (postEnabled) {
      // Route bloom composite → postFBO, then post-process → screen
      this._renderCompositeToFBO(this.postFBO, this.sceneFBO.texture, this.blurPongFBO.texture, this.bloomConfig.strength);
      this._renderPostProcess();
    } else {
      // Direct to screen (no post-processing)
      this._renderCompositeToScreen(this.sceneFBO.texture, this.blurPongFBO.texture, this.bloomConfig.strength);
    }
  }

  /**
   * Render the composite pass (scene + bloom) to a target FBO.
   * @private
   */
  _renderCompositeToFBO(targetFBO, sceneTexture, bloomTexture, bloomStrength) {
    const gl = this.gl;

    targetFBO.bind();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(this.programs.composite);
    const cl = this.loc.composite;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.uniform1i(cl.uSceneTexture, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, bloomTexture);
    gl.uniform1i(cl.uBloomTexture, 1);
    gl.uniform1f(cl.uBloomStrength, bloomStrength);

    this._bindQuad(cl.aPosition, cl.aUV);
    this._drawQuad();
  }

  /**
   * Render the composite pass (scene + bloom) directly to screen.
   * @private
   */
  _renderCompositeToScreen(sceneTexture, bloomTexture, bloomStrength) {
    const gl = this.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(this.programs.composite);
    const cl = this.loc.composite;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.uniform1i(cl.uSceneTexture, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, bloomTexture);
    gl.uniform1i(cl.uBloomTexture, 1);
    gl.uniform1f(cl.uBloomStrength, bloomStrength);

    this._bindQuad(cl.aPosition, cl.aUV);
    this._drawQuad();
  }

  /**
   * Render the post-process pass: reads postFBO, writes to screen.
   * Applies chromatic aberration, ACES tonemapping, color grading, film grain.
   * @private
   */
  _renderPostProcess() {
    const gl = this.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(this.programs.postProcess);
    const pl = this.loc.postProcess;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.postFBO.texture);
    gl.uniform1i(pl.uTexture, 0);

    gl.uniform2f(pl.uResolution, this.width, this.height);
    gl.uniform1f(pl.uTime, this._currentTime);

    // Chromatic aberration
    gl.uniform1f(pl.uChromAbEnabled, this.chromaticAberrationConfig.enabled ? 1.0 : 0.0);
    gl.uniform1f(pl.uChromAbStrength, this.chromaticAberrationConfig.strength);
    gl.uniform1f(pl.uChromAbFalloff, this.chromaticAberrationConfig.falloff);

    // Color grading
    gl.uniform1f(pl.uColorGradingEnabled, this.colorGradingConfig.enabled ? 1.0 : 0.0);
    gl.uniform1f(pl.uExposure, this.colorGradingConfig.exposure);
    gl.uniform1f(pl.uVignetteStrength, this.colorGradingConfig.vignetteStrength);
    gl.uniform1f(pl.uVignetteRadius, this.colorGradingConfig.vignetteRadius);
    gl.uniform1f(pl.uGrainIntensity, this.colorGradingConfig.grainIntensity);
    gl.uniform1f(pl.uWarmth, this.colorGradingConfig.warmth);

    this._bindQuad(pl.aPosition, pl.aUV);
    this._drawQuad();
  }

  /**
   * Composite the pipeline output onto a 2D canvas context.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   */
  compositeOnto(ctx, x = 0, y = 0) {
    if (!this.available) return;

    // Outer glow: draw a blurred copy behind the sharp image
    if (this.glowConfig.enabled && this.glowConfig.radius > 0) {
      ctx.save();
      ctx.filter = `blur(${this.glowConfig.radius}px)`;
      ctx.globalAlpha = this.glowConfig.intensity;
      ctx.drawImage(this.canvas, x, y);
      ctx.restore();
    }

    ctx.drawImage(this.canvas, x, y);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIG SETTERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Update visual configuration at runtime.
   * @param {Object} config
   */
  setVisualConfig(config) {
    Object.assign(this.visualConfig, config);
  }

  /**
   * Update bloom configuration at runtime.
   * @param {Object} config
   */
  setBloomConfig(config) {
    Object.assign(this.bloomConfig, config);
  }

  /**
   * Update energy flow configuration at runtime.
   * @param {Object} config
   */
  setEnergyConfig(config) {
    Object.assign(this.energyConfig, config);
  }

  /**
   * Update background configuration at runtime.
   * @param {Object} config
   */
  setBackgroundConfig(config) {
    Object.assign(this.backgroundConfig, config);
  }

  /**
   * Update depth fog configuration at runtime.
   * @param {Object} config
   */
  setDepthFogConfig(config) {
    Object.assign(this.depthFogConfig, config);
  }

  /**
   * Update iridescence configuration at runtime.
   * @param {Object} config
   */
  setIridescenceConfig(config) {
    Object.assign(this.iridescenceConfig, config);
  }

  /**
   * Update chromatic aberration configuration at runtime.
   * @param {Object} config
   */
  setChromaticAberrationConfig(config) {
    Object.assign(this.chromaticAberrationConfig, config);
  }

  /**
   * Update color grading configuration at runtime.
   * @param {Object} config
   */
  setColorGradingConfig(config) {
    Object.assign(this.colorGradingConfig, config);
  }

  /**
   * Update outer glow configuration at runtime.
   * @param {Object} config
   */
  setGlowConfig(config) {
    Object.assign(this.glowConfig, config);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RESIZE / CLEANUP
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Resize the pipeline canvas and all FBOs.
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;

    if (!this.available) return;

    const gl = this.gl;
    gl.viewport(0, 0, width, height);

    // Recreate FBOs at new size
    this._destroyFBOs();
    this._createFBOs();
  }

  /** Release all GPU resources. */
  destroy() {
    if (!this.available) return;
    const gl = this.gl;

    this._destroyFBOs();

    for (const prog of Object.values(this.programs)) {
      if (prog) gl.deleteProgram(prog);
    }
    this.programs = {};

    if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
    if (this.metaBuffer) gl.deleteBuffer(this.metaBuffer);
    if (this.depthBuffer) gl.deleteBuffer(this.depthBuffer);
    if (this.quadPositionBuffer) gl.deleteBuffer(this.quadPositionBuffer);
    if (this.quadUvBuffer) gl.deleteBuffer(this.quadUvBuffer);

    this._positions = null;
    this._meta = null;
    this._depths = null;
    this.available = false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /** @private - Disable line-specific vertex attributes */
  _disableLineAttribs() {
    const gl = this.gl;
    const ll = this.loc.lines;
    if (ll.aPosition >= 0) gl.disableVertexAttribArray(ll.aPosition);
    if (ll.aSpeedNorm >= 0) gl.disableVertexAttribArray(ll.aSpeedNorm);
    if (ll.aAge >= 0) gl.disableVertexAttribArray(ll.aAge);
    if (ll.aBlink >= 0) gl.disableVertexAttribArray(ll.aBlink);
    if (ll.aSegIdx >= 0) gl.disableVertexAttribArray(ll.aSegIdx);
    if (ll.aDepth >= 0) gl.disableVertexAttribArray(ll.aDepth);
  }
}
