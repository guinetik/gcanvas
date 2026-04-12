# WebGPU Attractor Pipeline for CAOS Playground

**Date:** 2026-04-12
**Status:** Approved
**Scope:** Feature-parity WebGPU renderer for the CAOS Playground with a UI toggle

---

## Goal

Port the existing `WebGLAttractorPipeline` to WebGPU as a study. The WebGPU version produces the same visual output using the same segment data contract. A top-level dropdown in the CAOS Playground lets the user switch between WebGL and WebGPU at runtime. Individual attractor demos stay on WebGL unchanged.

## Constraints

- Zero changes to `src/webgl/*`, `demos/js/attractor-3d-demo.js`, or individual attractor demos
- CPU-side particle physics, Camera3D projection, and `collectSegments` are unchanged
- The WebGPU toggle is only in the CAOS Playground
- Auto-fallback: if `navigator.gpu` is unavailable, the toggle shows WebGL only (WebGPU option disabled)

## New Files

```
src/webgpu/
  webgpu-attractor-pipeline.js   -- Main pipeline class
  webgpu-fbo.js                  -- GPUTexture render target wrapper
  shaders/
    attractor-lines.wgsl         -- Line vertex + fragment
    background.wgsl              -- FBM noise background + vignette
    bright-extract.wgsl          -- Bloom threshold pass
    blur.wgsl                    -- Separable Gaussian blur
    composite.wgsl               -- Additive bloom merge
    post-process.wgsl            -- Chromatic aberration, ACES tonemapping, grading, grain
  index.js                       -- Exports
```

## Public API

`WebGPUAttractorPipeline` implements the same public interface as `WebGLAttractorPipeline`:

| Method | Description |
|--------|-------------|
| `constructor(width, height, maxSegments, options)` | Same options shape as WebGL version |
| `async init()` | Request adapter/device, create pipelines, buffers, textures. Returns boolean. **Async** (unlike WebGL's sync `init`). |
| `isAvailable()` | Returns boolean |
| `resize(width, height)` | Recreate render targets at new size |
| `beginFrame(time)` | Clear scene texture, render background quad |
| `updateLines(segments)` | Upload segment data to GPU buffers |
| `renderLines(count, time, hueOffset)` | Render lines into scene texture with additive blending |
| `endFrame()` | Run bloom + post-process passes |
| `compositeOnto(ctx, x, y)` | `ctx.drawImage(offscreenCanvas, x, y)` with optional glow blur |
| `destroy()` | Release GPU resources |
| `setVisualConfig(config)` | Update visual uniforms |
| `setBloomConfig(config)` | Update bloom uniforms |
| `setGlowConfig(config)` | Update glow config |

**Key difference:** `init()` is `async` because `navigator.gpu.requestAdapter()` and `adapter.requestDevice()` are promise-based. The playground must `await` it.

## Segment Data Contract (unchanged)

```js
{
  x1, y1, x2, y2,      // screen-space line endpoints (pixels)
  speedNorm,            // normalized speed [0, 1]
  age,                  // trail age [0, 1] (0 = newest)
  blink,                // blink intensity [0, 1]
  segIdx,               // segment index within trail
  depth1, depth2        // per-vertex depth for fog
}
```

## Pipeline Architecture (6 render passes)

Same multi-pass structure as WebGL. All algorithms are identical, only the shader language and API calls differ.

### Pass 1: Background
- Fullscreen quad
- FBM noise (5 octaves) + vignette
- Renders into scene texture
- Alpha blending

### Pass 2: Lines
- Vertex buffer with position + metadata (speed, age, blink, segIdx, depth)
- GPU-side HSL-to-RGB, speed-to-hue mapping, energy flow sinusoids, spark flashes
- Depth fog, iridescence
- **Additive blending** (separate render pipeline from background)
- Renders into scene texture

### Pass 3: Bright Extract
- Fullscreen quad reading scene texture
- Threshold filter, outputs to half-res bright texture

### Pass 4: Blur
- Two sub-passes: horizontal then vertical
- Separable Gaussian blur on half-res textures
- Ping-pong between two half-res textures

### Pass 5: Composite
- Fullscreen quad
- Additively merges bloom texture onto scene texture
- Output to post-process texture (or screen if post-process is disabled)

### Pass 6: Post-Process (optional)
- Chromatic aberration, ACES tonemapping, exposure, vignette, film grain, warmth
- Only runs if chromatic aberration or color grading is enabled

### Compositing onto 2D Canvas
- WebGPU renders to an offscreen canvas via `context.configure({ device, format, alphaMode: 'premultiplied' })`
- `compositeOnto` uses `ctx.drawImage(offscreenCanvas)` — same as WebGL version
- Optional glow: `ctx.filter = 'blur(Npx)'` pre-pass — same as WebGL

## WebGPU-Specific Implementation Details

### GPU Resources
- **Render pipelines:** At least 2 — one with additive blending (lines), one with standard alpha blending (background, post-process passes). Possibly share the alpha-blend pipeline across quad passes via different bind groups.
- **Bind groups:** One per pass containing its uniforms buffer + sampler + texture(s)
- **Uniform buffers:** One shared `GPUBuffer` for visual/bloom/energy config, updated per-frame via `device.queue.writeBuffer`
- **Vertex buffers:** Pre-allocated `Float32Array` backed by `GPUBuffer` with `MAP_WRITE` or updated via `writeBuffer`. Same layout as WebGL (position, metadata, depth).
- **Render targets:** `GPUTexture` objects with `RENDER_ATTACHMENT | TEXTURE_BINDING` usage. Scene at full res, bright/blurPing/blurPong at half res, post at full res.

### WebGPUFBO Wrapper
Thin wrapper around a `GPUTexture` + `GPUTextureView` + optional depth:
```
constructor(device, width, height, format)
bind(renderPassEncoder)   -- Returns GPURenderPassDescriptor loadOp/storeOp config
resize(width, height)
destroy()
```

### Shader Porting (GLSL to WGSL)
- `attribute` / `varying` become `@location(N)` in vertex input/output structs
- `uniform float` becomes members of a `struct Uniforms` bound via `@group(0) @binding(0)`
- `texture2D()` becomes `textureSample()`
- `gl_Position` becomes the return value with `@builtin(position)`
- Math functions are largely the same (`mix`, `clamp`, `sin`, `cos`, `pow`, etc.)
- WGSL requires explicit types (`f32`, `vec2f`, `vec4f`)

## Playground Integration

### UI Changes (`caos-playground.js`)
- Add a `Dropdown` control **immediately after the attractor dropdown** labeled "RENDERER"
- Options: `[{ label: "WebGL", value: "webgl" }, { label: "WebGPU", value: "webgpu" }]`
- If `!navigator.gpu`, the WebGPU option is omitted entirely
- Default: `"webgl"` (current behavior)

### Pipeline Swap Logic
On renderer change:
1. Destroy current `this.attractorPipeline`
2. Construct the new pipeline class with same `(width, height, maxSegments, options)`
3. `await init()` (for WebGPU) or `init()` (for WebGL)
4. If init fails, revert to the other renderer and show a console warning
5. Resume rendering — `_renderAttractor()` already uses `this.attractorPipeline` polymorphically

### Async Handling
Since WebGPU `init()` is async, the swap needs to handle the brief gap:
- Set a `this._switchingRenderer = true` flag
- Skip attractor rendering while switching (show just the background clear)
- After `await init()`, clear the flag and resume

## Testing Strategy

- **Visual comparison:** Side-by-side WebGL vs WebGPU in the playground — toggle back and forth, same attractor, same parameters, confirm output looks equivalent
- **Unit tests:** Test `WebGPUAttractorPipeline` construction and config setters (no GPU needed for config logic)
- **Fallback:** Verify that on browsers without WebGPU, the toggle doesn't appear and WebGL works as before
- **Resize:** Verify render targets are recreated correctly on window resize
- **Attractor switching:** Verify pipeline survives attractor changes without leaking GPU resources

## Out of Scope

- Moving particle physics to compute shaders (future phase)
- Changing any existing WebGL code
- Adding WebGPU to individual attractor demos
- Performance benchmarking (this is a feasibility study)
