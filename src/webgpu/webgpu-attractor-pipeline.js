/**
 * WebGPUAttractorPipeline — GPU-accelerated rendering pipeline for 3D attractors.
 *
 * Feature-parity port of WebGLAttractorPipeline using the WebGPU API.
 * Same public interface: init, beginFrame, updateLines, renderLines, endFrame, compositeOnto.
 * Self-contained: owns its own GPUDevice, offscreen canvas, and render targets.
 */

import { WebGPURenderTarget } from "./webgpu-render-target.js";
import FULLSCREEN_QUAD_VERTEX from "./shaders/fullscreen-quad.wgsl?raw";
import BACKGROUND_FRAGMENT from "./shaders/background.wgsl?raw";
import ATTRACTOR_LINES_VERTEX from "./shaders/attractor-lines-vertex.wgsl?raw";
import ATTRACTOR_LINES_FRAGMENT from "./shaders/attractor-lines-fragment.wgsl?raw";
import BRIGHT_EXTRACT_FRAGMENT from "./shaders/bright-extract.wgsl?raw";
import BLUR_FRAGMENT from "./shaders/blur.wgsl?raw";
import COMPOSITE_FRAGMENT from "./shaders/composite.wgsl?raw";
import POST_PROCESS_FRAGMENT from "./shaders/post-process.wgsl?raw";

export class WebGPUAttractorPipeline {
  /**
   * @param {number} width
   * @param {number} height
   * @param {number} maxSegments
   * @param {Object} options — same shape as WebGLAttractorPipeline options
   */
  constructor(width, height, maxSegments, options = {}) {
    this.width = width;
    this.height = height;
    this.maxSegments = maxSegments;

    // Config objects — identical to WebGL pipeline
    this.bloomConfig = {
      enabled: true, threshold: 0.25, strength: 0.35, radius: 0.6, passes: 1,
      ...options.bloom,
    };
    this.glowConfig = {
      enabled: true, radius: 25, intensity: 0.6,
      ...options.glow,
    };
    this.backgroundConfig = {
      baseColor: [0.05, 0.02, 0.08], fogDensity: 0.15, noiseScale: 3.0, animSpeed: 0.08,
      ...options.background,
    };
    this.visualConfig = {
      minHue: 30, maxHue: 200, saturation: 85, lightness: 55, maxAlpha: 0.85, hueJitter: 18,
      ...options.visual,
    };
    this.blinkConfig = {
      intensityBoost: 1.8, saturationBoost: 1.5, alphaBoost: 1.5,
      ...options.blink,
    };
    this.energyConfig = {
      intensity: 0.4, speed: 1.0, sparkThreshold: 0.98,
      ...options.energyFlow,
    };
    this.depthFogConfig = {
      enabled: true, density: 0.5, energyFalloff: 0.7,
      ...options.depthFog,
    };
    this.iridescenceConfig = {
      enabled: true, intensity: 0.38, speed: 0.5, scale: 2.5,
      ...options.iridescence,
    };
    this.chromaticAberrationConfig = {
      enabled: false, strength: 0.002, falloff: 2.0,
      ...options.chromaticAberration,
    };
    this.colorGradingConfig = {
      enabled: true, exposure: 0.9, vignetteStrength: 0.15,
      vignetteRadius: 0.85, grainIntensity: 0.02, warmth: 0.15, bleach: 0.6,
      ...options.colorGrading,
    };

    this.lineWidth = options.lineWidth ?? 3.0;

    // Per-instance data: 1 entry per segment (expanded to quads on the GPU)
    // Segment endpoints: (x1, y1, x2, y2) = 4 floats per instance
    this._positions = new Float32Array(maxSegments * 4);
    // Metadata: (speedNorm, age, blink, segIdx) = 4 floats per instance (no duplication)
    this._meta = new Float32Array(maxSegments * 4);
    // Depth pair: (depth1, depth2) = 2 floats per instance
    this._depths = new Float32Array(maxSegments * 2);

    this._currentTime = 0;
    this.available = false;
    this.canvas = null;
    this.device = null;
    this.context = null;
    this.pipelines = {};
    this.bindGroupLayouts = {};
  }

  /**
   * Initialize the pipeline — async because WebGPU adapter/device requests are promises.
   * @returns {Promise<boolean>} true if initialization succeeded
   */
  async init() {
    if (!navigator.gpu) {
      console.warn("WebGPUAttractorPipeline: WebGPU not available");
      return false;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.warn("WebGPUAttractorPipeline: no adapter found");
      return false;
    }

    this.device = await adapter.requestDevice();
    if (!this.device) {
      console.warn("WebGPUAttractorPipeline: device request failed");
      return false;
    }

    // Handle device loss
    this.device.lost.then((info) => {
      console.error("WebGPU device lost:", info.message);
      this.available = false;
    });

    // Create offscreen canvas and configure WebGPU context
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.context = this.canvas.getContext("webgpu");
    this.presentFormat = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format: this.presentFormat,
      alphaMode: "premultiplied",
    });

    // Create samplers (shared by all texture-reading passes)
    this.linearSampler = this.device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
    });
    this.nearestSampler = this.device.createSampler({
      magFilter: "nearest",
      minFilter: "nearest",
    });

    // Create render targets
    this._createRenderTargets();

    // Create GPU buffers
    this._createBuffers();

    // Create all render pipelines
    this._createPipelines();

    this.available = true;
    return true;
  }

  /** @returns {boolean} */
  isAvailable() {
    return this.available;
  }

  /** @private */
  _isPostProcessEnabled() {
    return this.chromaticAberrationConfig.enabled || this.colorGradingConfig.enabled;
  }

  // ── Render Targets ──────────────────────────────────────────────────────

  /** @private */
  _createRenderTargets() {
    const w = this.width;
    const h = this.height;
    const hw = Math.max(1, Math.floor(w / 2));
    const hh = Math.max(1, Math.floor(h / 2));
    const hdrFormat = "rgba16float"; // HDR: preserves >1.0 additive values for tone mapping
    const ldrFormat = "rgba8unorm";  // LDR: bloom is lossy anyway

    this.sceneRT = new WebGPURenderTarget(this.device, w, h, hdrFormat);
    this.brightRT = new WebGPURenderTarget(this.device, hw, hh, ldrFormat);
    this.blurPingRT = new WebGPURenderTarget(this.device, hw, hh, ldrFormat);
    this.blurPongRT = new WebGPURenderTarget(this.device, hw, hh, ldrFormat);
    this.postRT = new WebGPURenderTarget(this.device, w, h, hdrFormat);
  }

  /** @private */
  _destroyRenderTargets() {
    this.sceneRT?.destroy();
    this.brightRT?.destroy();
    this.blurPingRT?.destroy();
    this.blurPongRT?.destroy();
    this.postRT?.destroy();
  }

  // ── GPU Buffers ─────────────────────────────────────────────────────────

  /** @private */
  _createBuffers() {
    const device = this.device;

    // Static quad template: 6 vertices, each (side, end) = vec2f
    const quadTemplate = new Float32Array([
      +1, 0,  -1, 0,  +1, 1,   // tri 1
      -1, 0,  -1, 1,  +1, 1,   // tri 2
    ]);
    this.quadTemplateBuffer = device.createBuffer({
      size: quadTemplate.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.quadTemplateBuffer.getMappedRange()).set(quadTemplate);
    this.quadTemplateBuffer.unmap();

    // Per-instance buffers
    this.positionBuffer = device.createBuffer({
      size: this._positions.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.metaBuffer = device.createBuffer({
      size: this._meta.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.depthBuffer = device.createBuffer({
      size: this._depths.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    // Uniform buffers — one per pass (sized to fit each Uniforms struct, 256-byte aligned)
    this.lineUniformBuffer = device.createBuffer({
      size: 256, // 22 f32s = 88 bytes, padded to 256 for alignment
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.backgroundUniformBuffer = device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.brightExtractUniformBuffer = device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.blurUniformBuffer = device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.compositeUniformBuffer = device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.postProcessUniformBuffer = device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  // ── Pipeline Creation ───────────────────────────────────────────────────

  /** @private */
  _createPipelines() {
    const device = this.device;
    const hdrFormat = "rgba16float"; // sceneRT, postRT
    const ldrFormat = "rgba8unorm";  // brightRT, blurPing/Pong

    // ── Background pipeline (alpha blend) ─────────────────────────────
    const bgBindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      ],
    });
    this.bindGroupLayouts.background = bgBindGroupLayout;

    const bgModule = device.createShaderModule({
      code: FULLSCREEN_QUAD_VERTEX + BACKGROUND_FRAGMENT,
    });
    this.pipelines.background = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [bgBindGroupLayout] }),
      vertex: { module: bgModule, entryPoint: "vs_main" },
      fragment: {
        module: bgModule,
        entryPoint: "fs_main",
        targets: [{
          format: hdrFormat,
          blend: {
            color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
          },
        }],
      },
      primitive: { topology: "triangle-list" },
    });

    // ── Lines pipeline (additive blend) ───────────────────────────────
    const lineBindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      ],
    });
    this.bindGroupLayouts.lines = lineBindGroupLayout;

    const lineVertModule = device.createShaderModule({ code: ATTRACTOR_LINES_VERTEX });
    const lineFragModule = device.createShaderModule({ code: ATTRACTOR_LINES_FRAGMENT });
    this.pipelines.lines = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [lineBindGroupLayout] }),
      vertex: {
        module: lineVertModule,
        entryPoint: "vs_main",
        buffers: [
          // Per-vertex: quad template (side, end) = vec2f
          { arrayStride: 8, stepMode: "vertex",
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }] },
          // Per-instance: segment endpoints (x1, y1, x2, y2) = vec4f
          { arrayStride: 16, stepMode: "instance",
            attributes: [{ shaderLocation: 1, offset: 0, format: "float32x4" }] },
          // Per-instance: metadata (speedNorm, age, blink, segIdx) = vec4f
          { arrayStride: 16, stepMode: "instance",
            attributes: [{ shaderLocation: 2, offset: 0, format: "float32x4" }] },
          // Per-instance: depth pair (depth1, depth2) = vec2f
          { arrayStride: 8, stepMode: "instance",
            attributes: [{ shaderLocation: 3, offset: 0, format: "float32x2" }] },
        ],
      },
      fragment: {
        module: lineFragModule,
        entryPoint: "fs_main",
        targets: [{
          format: hdrFormat,
          blend: {
            color: { srcFactor: "one", dstFactor: "one", operation: "add" },
            alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
          },
        }],
      },
      primitive: { topology: "triangle-list" },
    });

    // ── Bright extract pipeline ───────────────────────────────────────
    const texturePassLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      ],
    });
    this.bindGroupLayouts.texturePass = texturePassLayout;

    const brightModule = device.createShaderModule({
      code: FULLSCREEN_QUAD_VERTEX + BRIGHT_EXTRACT_FRAGMENT,
    });
    this.pipelines.brightExtract = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [texturePassLayout] }),
      vertex: { module: brightModule, entryPoint: "vs_main" },
      fragment: {
        module: brightModule,
        entryPoint: "fs_main",
        targets: [{ format: ldrFormat }], // No blending — replace
      },
      primitive: { topology: "triangle-list" },
    });

    // ── Blur pipeline ─────────────────────────────────────────────────
    const blurModule = device.createShaderModule({
      code: FULLSCREEN_QUAD_VERTEX + BLUR_FRAGMENT,
    });
    this.pipelines.blur = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [texturePassLayout] }),
      vertex: { module: blurModule, entryPoint: "vs_main" },
      fragment: {
        module: blurModule,
        entryPoint: "fs_main",
        targets: [{ format: ldrFormat }],
      },
      primitive: { topology: "triangle-list" },
    });

    // ── Composite pipeline (2 textures) ───────────────────────────────
    const compositeLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      ],
    });
    this.bindGroupLayouts.composite = compositeLayout;

    const compositeModule = device.createShaderModule({
      code: FULLSCREEN_QUAD_VERTEX + COMPOSITE_FRAGMENT,
    });
    this.pipelines.composite = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [compositeLayout] }),
      vertex: { module: compositeModule, entryPoint: "vs_main" },
      fragment: {
        module: compositeModule,
        entryPoint: "fs_main",
        targets: [{
          format: hdrFormat,
          blend: {
            color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
          },
        }],
      },
      primitive: { topology: "triangle-list" },
    });

    // ── Post-process pipeline ─────────────────────────────────────────
    // Writes to sceneRT (reused as scratch) — HDR format.
    const postModule = device.createShaderModule({
      code: FULLSCREEN_QUAD_VERTEX + POST_PROCESS_FRAGMENT,
    });
    this.pipelines.postProcess = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [texturePassLayout] }),
      vertex: { module: postModule, entryPoint: "vs_main" },
      fragment: {
        module: postModule,
        entryPoint: "fs_main",
        targets: [{
          format: hdrFormat,
          blend: {
            color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
          },
        }],
      },
      primitive: { topology: "triangle-list" },
    });

    // ── Blit pipeline (copy final RT to swap chain) ───────────────────
    // Exists because swap chain format (presentFormat) may differ from RT format (rgba8unorm)
    const blitModule = device.createShaderModule({
      code: FULLSCREEN_QUAD_VERTEX + /* wgsl */`
@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var tex: texture_2d<f32>;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
    return textureSample(tex, texSampler, uv);
}
`,
    });
    const blitLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      ],
    });
    this.bindGroupLayouts.blit = blitLayout;
    this.pipelines.blit = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [blitLayout] }),
      vertex: { module: blitModule, entryPoint: "vs_main" },
      fragment: {
        module: blitModule,
        entryPoint: "fs_main",
        targets: [{
          format: this.presentFormat,
          blend: {
            color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
          },
        }],
      },
      primitive: { topology: "triangle-list" },
    });
  }

  // ── Config Setters (same API as WebGL) ──────────────────────────────

  setVisualConfig(config) { Object.assign(this.visualConfig, config); }
  setBloomConfig(config) { Object.assign(this.bloomConfig, config); }
  setEnergyConfig(config) { Object.assign(this.energyConfig, config); }
  setBackgroundConfig(config) { Object.assign(this.backgroundConfig, config); }
  setDepthFogConfig(config) { Object.assign(this.depthFogConfig, config); }
  setIridescenceConfig(config) { Object.assign(this.iridescenceConfig, config); }
  setChromaticAberrationConfig(config) { Object.assign(this.chromaticAberrationConfig, config); }
  setColorGradingConfig(config) { Object.assign(this.colorGradingConfig, config); }
  setGlowConfig(config) { Object.assign(this.glowConfig, config); }

  // ── Per-Frame Rendering ─────────────────────────────────────────────

  /**
   * Begin a new frame: store time, create command encoder, render background.
   * @param {number} time - Elapsed time in seconds
   */
  beginFrame(time) {
    if (!this.available) return;

    this._currentTime = time;
    this._encoder = this.device.createCommandEncoder();

    // Upload background uniforms
    // Struct layout: time(f32), fogDensity(f32), noiseScale(f32), animSpeed(f32), baseColor(vec3f), _pad(f32)
    const bgData = new Float32Array([
      time,
      this.backgroundConfig.fogDensity,
      this.backgroundConfig.noiseScale,
      this.backgroundConfig.animSpeed,
      ...this.backgroundConfig.baseColor,
      0, // _pad
    ]);
    this.device.queue.writeBuffer(this.backgroundUniformBuffer, 0, bgData);

    // Create bind group for background
    const bgBindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayouts.background,
      entries: [
        { binding: 0, resource: { buffer: this.backgroundUniformBuffer } },
      ],
    });

    // Render background into scene RT
    const pass = this._encoder.beginRenderPass({
      colorAttachments: [this.sceneRT.colorAttachment("clear")],
    });
    pass.setPipeline(this.pipelines.background);
    pass.setBindGroup(0, bgBindGroup);
    pass.draw(6); // Fullscreen quad
    pass.end();
  }

  /**
   * Upload line segment data to GPU buffers.
   * @param {Array} segments - Array of { x1, y1, x2, y2, speedNorm, age, blink, segIdx, depth1, depth2 }
   */
  updateLines(segments) {
    if (!this.available) return;

    const count = Math.min(segments.length, this.maxSegments);

    // Pack per-instance data (no quad expansion — GPU handles that)
    for (let i = 0; i < count; i++) {
      const s = segments[i];
      const pi = i * 4;

      // Segment endpoints: vec4
      this._positions[pi]     = s.x1;
      this._positions[pi + 1] = s.y1;
      this._positions[pi + 2] = s.x2;
      this._positions[pi + 3] = s.y2;

      // Metadata: vec4 (one copy per instance, not duplicated)
      this._meta[pi]     = s.speedNorm;
      this._meta[pi + 1] = s.age;
      this._meta[pi + 2] = s.blink;
      this._meta[pi + 3] = s.segIdx;

      // Depth pair: vec2
      const di = i * 2;
      this._depths[di]     = s.depth1 ?? 0;
      this._depths[di + 1] = s.depth2 ?? 0;
    }

    this.device.queue.writeBuffer(this.positionBuffer, 0, this._positions, 0, count * 4);
    this.device.queue.writeBuffer(this.metaBuffer, 0, this._meta, 0, count * 4);
    this.device.queue.writeBuffer(this.depthBuffer, 0, this._depths, 0, count * 2);
  }

  /**
   * Render line segments into the scene RT.
   * @param {number} count     - Number of segments
   * @param {number} time      - Elapsed time in seconds
   * @param {number} hueOffset - Current hue shift offset in degrees
   */
  renderLines(count, time, hueOffset) {
    if (!this.available || count === 0 || !this._encoder) return;

    // Upload line uniforms
    // Struct layout matches the Uniforms struct in attractor-lines-vertex.wgsl
    const v = this.visualConfig;
    const b = this.blinkConfig;
    const e = this.energyConfig;
    const df = this.depthFogConfig;
    const ir = this.iridescenceConfig;
    const lineData = new Float32Array([
      this.width, this.height,        // resolution: vec2f
      time,                            // time: f32
      v.minHue,                        // minHue: f32
      v.maxHue,                        // maxHue: f32
      v.saturation,                    // saturation: f32
      v.lightness,                     // lightness: f32
      v.maxAlpha,                      // maxAlpha: f32
      hueOffset,                       // hueOffset: f32
      b.intensityBoost,                // intensityBoost: f32
      b.saturationBoost,               // saturationBoost: f32
      b.alphaBoost,                    // alphaBoost: f32
      e.intensity,                     // energyIntensity: f32
      e.speed,                         // energySpeed: f32
      e.sparkThreshold,                // sparkThreshold: f32
      df.enabled ? 1.0 : 0.0,         // depthFogEnabled: f32
      df.density,                      // depthFogDensity: f32
      df.energyFalloff,                // depthFogEnergyFalloff: f32
      ir.enabled ? 1.0 : 0.0,         // iridescenceEnabled: f32
      ir.intensity,                    // iridescenceIntensity: f32
      ir.speed,                        // iridescenceSpeed: f32
      ir.scale,                        // iridescenceScale: f32
      this.lineWidth * 0.5,            // halfWidth: f32
      v.hueJitter,                     // hueJitter: f32
    ]);
    this.device.queue.writeBuffer(this.lineUniformBuffer, 0, lineData);

    const lineBindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayouts.lines,
      entries: [
        { binding: 0, resource: { buffer: this.lineUniformBuffer } },
      ],
    });

    // Render lines into scene RT (load existing background)
    const pass = this._encoder.beginRenderPass({
      colorAttachments: [this.sceneRT.colorAttachment("load")],
    });
    pass.setPipeline(this.pipelines.lines);
    pass.setBindGroup(0, lineBindGroup);
    pass.setVertexBuffer(0, this.quadTemplateBuffer);
    pass.setVertexBuffer(1, this.positionBuffer);
    pass.setVertexBuffer(2, this.metaBuffer);
    pass.setVertexBuffer(3, this.depthBuffer);
    pass.draw(6, count); // 6 vertices per instance, count instances
    pass.end();
  }

  /**
   * End the frame: run bloom, post-process, and blit to swap chain canvas.
   */
  endFrame() {
    if (!this.available || !this._encoder) return;

    const postEnabled = this._isPostProcessEnabled();

    if (!this.bloomConfig.enabled) {
      if (postEnabled) {
        // No bloom, but post-process: scene → postRT (composite with zero bloom), then post → screen
        this._renderCompositeToRT(this.postRT, this.sceneRT, this.sceneRT, 0.0);
        this._renderPostProcess(this.postRT);
      } else {
        // No bloom, no post-process: blit scene directly
        this._blitToScreen(this.sceneRT);
      }
    } else {
      // Bloom pipeline
      this._renderBrightExtract();
      this._renderBlur();

      if (postEnabled) {
        // Bloom + post-process: composite → postRT, then post → screen
        this._renderCompositeToRT(this.postRT, this.sceneRT, this.blurPongRT, this.bloomConfig.strength);
        this._renderPostProcess(this.postRT);
      } else {
        // Bloom, no post-process: composite → postRT (not sceneRT! can't read+write same texture), then blit
        this._renderCompositeToRT(this.postRT, this.sceneRT, this.blurPongRT, this.bloomConfig.strength);
        this._blitToScreen(this.postRT);
      }
    }

    // Submit all commands
    this.device.queue.submit([this._encoder.finish()]);
    this._encoder = null;
  }

  /**
   * Composite the pipeline output onto a 2D canvas context.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   */
  compositeOnto(ctx, x = 0, y = 0) {
    if (!this.available) return;

    // Neon glow: multiple additive-blended blur layers at increasing radii
    if (this.glowConfig.enabled && this.glowConfig.radius > 0) {
      const r = this.glowConfig.radius;
      const a = this.glowConfig.intensity;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      // Tight bright core
      ctx.filter = `blur(${r * 0.5}px)`;
      ctx.globalAlpha = a;
      ctx.drawImage(this.canvas, x, y);
      // Mid spread
      ctx.filter = `blur(${r}px)`;
      ctx.globalAlpha = a * 0.7;
      ctx.drawImage(this.canvas, x, y);
      // Wide soft halo
      ctx.filter = `blur(${r * 2.5}px)`;
      ctx.globalAlpha = a * 0.4;
      ctx.drawImage(this.canvas, x, y);
      ctx.restore();
    }

    ctx.drawImage(this.canvas, x, y);
  }

  // ── Private Render Pass Helpers ─────────────────────────────────────

  /** @private Bright extract: scene -> brightRT */
  _renderBrightExtract() {
    const data = new Float32Array([this.bloomConfig.threshold]);
    this.device.queue.writeBuffer(this.brightExtractUniformBuffer, 0, data);

    const bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayouts.texturePass,
      entries: [
        { binding: 0, resource: { buffer: this.brightExtractUniformBuffer } },
        { binding: 1, resource: this.linearSampler },
        { binding: 2, resource: this.sceneRT.view },
      ],
    });

    const pass = this._encoder.beginRenderPass({
      colorAttachments: [this.brightRT.colorAttachment("clear")],
    });
    pass.setPipeline(this.pipelines.brightExtract);
    pass.setBindGroup(0, bindGroup);
    pass.draw(6);
    pass.end();
  }

  /** @private Blur: brightRT -> blurPingRT (H) -> blurPongRT (V), repeated for passes */
  _renderBlur() {
    const hw = this.brightRT.width;
    const hh = this.brightRT.height;
    const passes = Math.max(1, this.bloomConfig.passes || 1);

    for (let p = 0; p < passes; p++) {
      const srcView = p === 0 ? this.brightRT.view : this.blurPongRT.view;

      // Horizontal blur -> blurPingRT
      const hData = new Float32Array([1.0 / hw, 0.0, this.bloomConfig.radius, 0]);
      this.device.queue.writeBuffer(this.blurUniformBuffer, 0, hData);

      const hBindGroup = this.device.createBindGroup({
        layout: this.bindGroupLayouts.texturePass,
        entries: [
          { binding: 0, resource: { buffer: this.blurUniformBuffer } },
          { binding: 1, resource: this.linearSampler },
          { binding: 2, resource: srcView },
        ],
      });

      const hPass = this._encoder.beginRenderPass({
        colorAttachments: [this.blurPingRT.colorAttachment("clear")],
      });
      hPass.setPipeline(this.pipelines.blur);
      hPass.setBindGroup(0, hBindGroup);
      hPass.draw(6);
      hPass.end();

      // Vertical blur -> blurPongRT
      const vData = new Float32Array([0.0, 1.0 / hh, this.bloomConfig.radius, 0]);
      this.device.queue.writeBuffer(this.blurUniformBuffer, 0, vData);

      const vBindGroup = this.device.createBindGroup({
        layout: this.bindGroupLayouts.texturePass,
        entries: [
          { binding: 0, resource: { buffer: this.blurUniformBuffer } },
          { binding: 1, resource: this.linearSampler },
          { binding: 2, resource: this.blurPingRT.view },
        ],
      });

      const vPass = this._encoder.beginRenderPass({
        colorAttachments: [this.blurPongRT.colorAttachment("clear")],
      });
      vPass.setPipeline(this.pipelines.blur);
      vPass.setBindGroup(0, vBindGroup);
      vPass.draw(6);
      vPass.end();
    }
  }

  /** @private Composite: scene + bloom -> target RT */
  _renderCompositeToRT(targetRT, sceneRT, bloomRT, bloomStrength) {
    const data = new Float32Array([bloomStrength]);
    this.device.queue.writeBuffer(this.compositeUniformBuffer, 0, data);

    const bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayouts.composite,
      entries: [
        { binding: 0, resource: { buffer: this.compositeUniformBuffer } },
        { binding: 1, resource: this.linearSampler },
        { binding: 2, resource: sceneRT.view },
        { binding: 3, resource: bloomRT.view },
      ],
    });

    const pass = this._encoder.beginRenderPass({
      colorAttachments: [targetRT.colorAttachment("clear")],
    });
    pass.setPipeline(this.pipelines.composite);
    pass.setBindGroup(0, bindGroup);
    pass.draw(6);
    pass.end();
  }

  /** @private Post-process: sourceRT -> scratch RT, then blit to screen */
  _renderPostProcess(sourceRT) {
    const pp = this.chromaticAberrationConfig;
    const cg = this.colorGradingConfig;
    const data = new Float32Array([
      this.width, this.height,
      this._currentTime,
      pp.enabled ? 1.0 : 0.0,
      pp.strength, pp.falloff,
      cg.enabled ? 1.0 : 0.0,
      cg.exposure,
      cg.vignetteStrength, cg.vignetteRadius,
      cg.grainIntensity, cg.warmth, cg.bleach,
    ]);
    this.device.queue.writeBuffer(this.postProcessUniformBuffer, 0, data);

    // Can't read and write the same RT. Since sourceRT is postRT in all call paths,
    // use sceneRT as scratch (it's already been fully consumed by this point).
    const scratchRT = this.sceneRT;

    const bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayouts.texturePass,
      entries: [
        { binding: 0, resource: { buffer: this.postProcessUniformBuffer } },
        { binding: 1, resource: this.linearSampler },
        { binding: 2, resource: sourceRT.view },
      ],
    });

    const pass = this._encoder.beginRenderPass({
      colorAttachments: [scratchRT.colorAttachment("clear")],
    });
    pass.setPipeline(this.pipelines.postProcess);
    pass.setBindGroup(0, bindGroup);
    pass.draw(6);
    pass.end();

    this._blitToScreen(scratchRT);
  }

  /** @private Blit a render target to the swap chain canvas */
  _blitToScreen(sourceRT) {
    const swapChainView = this.context.getCurrentTexture().createView();

    const bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayouts.blit,
      entries: [
        { binding: 0, resource: this.linearSampler },
        { binding: 1, resource: sourceRT.view },
      ],
    });

    const pass = this._encoder.beginRenderPass({
      colorAttachments: [{
        view: swapChainView,
        loadOp: "clear",
        storeOp: "store",
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
      }],
    });
    pass.setPipeline(this.pipelines.blit);
    pass.setBindGroup(0, bindGroup);
    pass.draw(6);
    pass.end();
  }

  // ── Resize / Destroy ────────────────────────────────────────────────

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;

    if (!this.available) return;

    this.context.configure({
      device: this.device,
      format: this.presentFormat,
      alphaMode: "premultiplied",
    });

    this._destroyRenderTargets();
    this._createRenderTargets();
  }

  destroy() {
    if (!this.available) return;

    this._destroyRenderTargets();

    // Buffers
    this.quadTemplateBuffer?.destroy();
    this.positionBuffer?.destroy();
    this.metaBuffer?.destroy();
    this.depthBuffer?.destroy();
    this.lineUniformBuffer?.destroy();
    this.backgroundUniformBuffer?.destroy();
    this.brightExtractUniformBuffer?.destroy();
    this.blurUniformBuffer?.destroy();
    this.compositeUniformBuffer?.destroy();
    this.postProcessUniformBuffer?.destroy();

    this._positions = null;
    this._meta = null;
    this._depths = null;

    // Device — don't destroy, it will be garbage collected.
    // Destroying device invalidates everything immediately which can cause errors.
    this.available = false;
  }
}
