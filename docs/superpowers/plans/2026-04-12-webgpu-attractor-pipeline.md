# WebGPU Attractor Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a feature-parity WebGPU rendering backend for the CAOS Playground with a runtime toggle, keeping all existing WebGL code untouched.

**Architecture:** New `WebGPUAttractorPipeline` class in `src/webgpu/` implements the same public API as `WebGLAttractorPipeline`. WGSL shaders live in native `.wgsl` files imported as raw strings via Vite config. The CAOS Playground gets a top-level "RENDERER" dropdown that swaps pipeline instances at runtime.

**Tech Stack:** WebGPU API, WGSL shaders (native `.wgsl` files), Vite raw imports, existing GCanvas Game/Pipeline/UI framework

**Spec:** `docs/superpowers/specs/2026-04-12-webgpu-attractor-pipeline-design.md`

---

### Task 1: Vite Config — WGSL Raw Import Support

**Files:**
- Modify: `vite.config.js`

Enable Vite to import `.wgsl` files as raw strings via the `?raw` query suffix. This is a one-line addition to `assetsInclude` that makes `.wgsl` files available to `import shaderSource from './foo.wgsl?raw'`.

- [ ] **Step 1: Add WGSL to Vite assetsInclude**

In `vite.config.js`, add `assetsInclude` to the returned config object (inside the `return { ... }` block, after `server:`):

```js
    // Enable ?raw imports for WGSL shader files
    assetsInclude: ["**/*.wgsl"],
```

Note: Vite already supports `?raw` on any file by default. The `assetsInclude` ensures `.wgsl` files are recognized as assets and not processed as JS. The import pattern will be:
```js
import backgroundWGSL from "./shaders/background.wgsl?raw";
```

- [ ] **Step 2: Verify raw import works**

Create a temporary test file and verify Vite serves it:

```bash
echo "// test" > src/webgpu/shaders/_test.wgsl
```

Then in the browser console or a temp JS file, confirm the import resolves to a string. Delete the test file afterward.

- [ ] **Step 3: Commit**

```bash
git add vite.config.js
git commit -m "feat(vite): add WGSL raw import support for WebGPU shaders"
```

---

### Task 2: WebGPU Render Target Wrapper (`WebGPURenderTarget`)

**Files:**
- Create: `src/webgpu/webgpu-render-target.js`
- Create: `src/webgpu/index.js`

This is the equivalent of `WebGLFBO` — wraps a `GPUTexture` + `GPUTextureView` for off-screen rendering.

- [ ] **Step 1: Create the render target class**

```js
// src/webgpu/webgpu-render-target.js

/**
 * WebGPURenderTarget — wraps a GPUTexture for off-screen rendering.
 * Equivalent to WebGLFBO for the WebGL pipeline.
 */
export class WebGPURenderTarget {
  /**
   * @param {GPUDevice} device
   * @param {number} width
   * @param {number} height
   * @param {GPUTextureFormat} format
   */
  constructor(device, width, height, format = "rgba8unorm") {
    this.device = device;
    this.width = width;
    this.height = height;
    this.format = format;
    this.texture = null;
    this.view = null;
    this._create();
  }

  /** @private */
  _create() {
    this.texture = this.device.createTexture({
      size: [this.width, this.height],
      format: this.format,
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_SRC,
    });
    this.view = this.texture.createView();
  }

  /**
   * Returns a color attachment descriptor for use in a render pass.
   * @param {GPULoadOp} loadOp - "clear" or "load"
   * @param {GPUColor} [clearValue] - Clear color (used when loadOp is "clear")
   * @returns {GPURenderPassColorAttachment}
   */
  colorAttachment(loadOp = "clear", clearValue = { r: 0, g: 0, b: 0, a: 0 }) {
    return {
      view: this.view,
      loadOp,
      storeOp: "store",
      clearValue,
    };
  }

  /**
   * Resize — destroys and recreates at new dimensions.
   * @param {number} w
   * @param {number} h
   */
  resize(w, h) {
    this.destroy();
    this.width = w;
    this.height = h;
    this._create();
  }

  /** Release GPU resources. */
  destroy() {
    if (this.texture) {
      this.texture.destroy();
      this.texture = null;
      this.view = null;
    }
  }
}
```

- [ ] **Step 2: Create the index.js barrel export**

```js
// src/webgpu/index.js

/**
 * WebGPU Module for gcanvas
 *
 * Provides optional WebGPU rendering capabilities.
 * This is an opt-in feature — requires browser WebGPU support.
 */

export { WebGPURenderTarget } from "./webgpu-render-target.js";
```

- [ ] **Step 3: Commit**

```bash
git add src/webgpu/webgpu-render-target.js src/webgpu/index.js
git commit -m "feat(webgpu): add WebGPURenderTarget wrapper"
```

---

### Task 3: WGSL Shaders — Background & Fullscreen Quad

**Files:**
- Create: `src/webgpu/shaders/background.wgsl`
- Create: `src/webgpu/shaders/fullscreen-quad.wgsl`

Ports the background FBM noise shader and shared fullscreen quad vertex shader to WGSL. Native `.wgsl` files imported via Vite `?raw`.

The fullscreen quad vertex shader is shared by all post-processing passes (bright extract, blur, composite, post-process). In WebGL each pass duplicated the same vertex shader; here we define it once.

- [ ] **Step 1: Create the fullscreen quad vertex shader**

```wgsl
// src/webgpu/shaders/fullscreen-quad.wgsl

// Fullscreen quad vertex shader — shared by all post-processing passes.
// Generates a full-screen triangle pair from 6 vertices (no vertex buffer needed).

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    // Generate fullscreen quad from vertex index (2 triangles, 6 vertices)
    // No vertex buffer needed — positions derived from index
    var positions = array<vec2f, 6>(
        vec2f(-1.0, -1.0), vec2f( 1.0, -1.0), vec2f(-1.0,  1.0),
        vec2f(-1.0,  1.0), vec2f( 1.0, -1.0), vec2f( 1.0,  1.0),
    );
    var uvs = array<vec2f, 6>(
        vec2f(0.0, 1.0), vec2f(1.0, 1.0), vec2f(0.0, 0.0),
        vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(1.0, 0.0),
    );

    var output: VertexOutput;
    output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
    output.uv = uvs[vertexIndex];
    return output;
}
```

Note: WebGPU UV y-axis is flipped vs WebGL. In WebGL, UV (0,0) is bottom-left; in WebGPU it's top-left. The UV array above maps so that `uv.y = 0` corresponds to the top of the screen (clip y = +1) and `uv.y = 1` to the bottom (clip y = -1), matching WebGPU's texture coordinate convention.

- [ ] **Step 2: Create the background fragment shader**

```wgsl
// src/webgpu/shaders/background.wgsl

// Background shader — animated FBM noise with vignette.
// Port of BACKGROUND_FRAGMENT from attractor-shaders.js.

struct Uniforms {
    time: f32,
    fogDensity: f32,
    noiseScale: f32,
    animSpeed: f32,
    baseColor: vec3f,
    _pad: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

// Hash-based value noise
fn hash(p: vec2f) -> f32 {
    var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
    p3 += dot(p3, vec3f(p3.y, p3.z, p3.x) + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

fn noise(p: vec2f) -> f32 {
    let i = floor(p);
    var f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    let a = hash(i);
    let b = hash(i + vec2f(1.0, 0.0));
    let c = hash(i + vec2f(0.0, 1.0));
    let d = hash(i + vec2f(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

fn fbm(p_in: vec2f) -> f32 {
    var value = 0.0;
    var amplitude = 0.5;
    var p = p_in;
    for (var i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
    let t = u.time * u.animSpeed;
    let n1 = fbm(uv * u.noiseScale + vec2f(t * 0.3, t * 0.1));
    let n2 = fbm(uv * u.noiseScale * 1.5 + vec2f(-t * 0.2, t * 0.25));
    let n = (n1 + n2) * 0.5;

    let center = uv - 0.5;
    let vignette = clamp(1.0 - dot(center, center) * 2.0, 0.0, 1.0);

    let color = u.baseColor * (0.5 + n * 0.5) * vignette;
    let alpha = u.fogDensity * vignette;

    // Premultiplied alpha output
    return vec4f(color * alpha, alpha);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/webgpu/shaders/fullscreen-quad.wgsl src/webgpu/shaders/background.wgsl
git commit -m "feat(webgpu): add fullscreen quad vertex and background WGSL shaders"
```

---

### Task 4: WGSL Shaders — Attractor Lines

**Files:**
- Create: `src/webgpu/shaders/attractor-lines-vertex.wgsl`
- Create: `src/webgpu/shaders/attractor-lines-fragment.wgsl`

Ports the attractor line vertex + fragment shaders. This is the most complex shader — HSL-to-RGB, energy flow, sparks, depth fog, iridescence. All math is identical to the GLSL version. Vertex and fragment are separate `.wgsl` files because the vertex shader uses a different vertex input layout from the fullscreen quad (it reads from vertex buffers instead of generating positions from vertex index).

- [ ] **Step 1: Create the attractor lines vertex shader**

```wgsl
// src/webgpu/shaders/attractor-lines-vertex.wgsl

// Attractor line vertex shader — transforms screen-space positions to clip space.
// Port of ATTRACTOR_LINE_VERTEX from attractor-shaders.js.

struct Uniforms {
    resolution: vec2f,
    time: f32,
    minHue: f32,
    maxHue: f32,
    saturation: f32,
    lightness: f32,
    maxAlpha: f32,
    hueOffset: f32,
    intensityBoost: f32,
    saturationBoost: f32,
    alphaBoost: f32,
    energyIntensity: f32,
    energySpeed: f32,
    sparkThreshold: f32,
    depthFogEnabled: f32,
    depthFogDensity: f32,
    depthFogEnergyFalloff: f32,
    iridescenceEnabled: f32,
    iridescenceIntensity: f32,
    iridescenceSpeed: f32,
    iridescenceScale: f32,
    _pad: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexInput {
    @location(0) position: vec2f,
    @location(1) speedNorm: f32,
    @location(2) age: f32,
    @location(3) blink: f32,
    @location(4) segIdx: f32,
    @location(5) depth: f32,
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) speedNorm: f32,
    @location(1) age: f32,
    @location(2) blink: f32,
    @location(3) segIdx: f32,
    @location(4) depth: f32,
};

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var clipPos = (input.position / u.resolution) * 2.0 - 1.0;
    clipPos.y = -clipPos.y;

    var output: VertexOutput;
    output.position = vec4f(clipPos, 0.0, 1.0);
    output.speedNorm = input.speedNorm;
    output.age = input.age;
    output.blink = input.blink;
    output.segIdx = input.segIdx;
    output.depth = input.depth;
    return output;
}
```

- [ ] **Step 2: Create the attractor lines fragment shader**

```wgsl
// src/webgpu/shaders/attractor-lines-fragment.wgsl

// Attractor line fragment shader — GPU color math, energy flow, sparks, depth fog, iridescence.
// Port of ATTRACTOR_LINE_FRAGMENT from attractor-shaders.js.

struct Uniforms {
    resolution: vec2f,
    time: f32,
    minHue: f32,
    maxHue: f32,
    saturation: f32,
    lightness: f32,
    maxAlpha: f32,
    hueOffset: f32,
    intensityBoost: f32,
    saturationBoost: f32,
    alphaBoost: f32,
    energyIntensity: f32,
    energySpeed: f32,
    sparkThreshold: f32,
    depthFogEnabled: f32,
    depthFogDensity: f32,
    depthFogEnergyFalloff: f32,
    iridescenceEnabled: f32,
    iridescenceIntensity: f32,
    iridescenceSpeed: f32,
    iridescenceScale: f32,
    _pad: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

// HSL to RGB conversion
fn hsl2rgb(h_in: f32, s_in: f32, l_in: f32) -> vec3f {
    let h = (h_in % 360.0) / 360.0;
    let s = clamp(s_in, 0.0, 1.0);
    let l = clamp(l_in, 0.0, 1.0);

    let c = (1.0 - abs(2.0 * l - 1.0)) * s;
    let x = c * (1.0 - abs((h * 6.0) % 2.0 - 1.0));
    let m = l - c * 0.5;

    let hSeg = h * 6.0;
    var rgb: vec3f;
    if (hSeg < 1.0) { rgb = vec3f(c, x, 0.0); }
    else if (hSeg < 2.0) { rgb = vec3f(x, c, 0.0); }
    else if (hSeg < 3.0) { rgb = vec3f(0.0, c, x); }
    else if (hSeg < 4.0) { rgb = vec3f(0.0, x, c); }
    else if (hSeg < 5.0) { rgb = vec3f(x, 0.0, c); }
    else { rgb = vec3f(c, 0.0, x); }

    return rgb + m;
}

// Iridescence: cos-based rainbow shift
fn iridescence(idx: f32, time: f32, scale: f32, speed: f32) -> vec3f {
    let phase = idx * scale + time * speed;
    return vec3f(
        cos(phase) * 0.5 + 0.5,
        cos(phase + 2.094) * 0.5 + 0.5,
        cos(phase + 4.189) * 0.5 + 0.5,
    );
}

struct FragmentInput {
    @location(0) speedNorm: f32,
    @location(1) age: f32,
    @location(2) blink: f32,
    @location(3) segIdx: f32,
    @location(4) depth: f32,
};

@fragment
fn fs_main(input: FragmentInput) -> @location(0) vec4f {
    // Speed -> hue
    let baseHue = u.maxHue - input.speedNorm * (u.maxHue - u.minHue);
    let hue = (baseHue + u.hueOffset) % 360.0;

    // Blink modulation
    let sat = min(1.0, (u.saturation / 100.0) * (1.0 + input.blink * (u.saturationBoost - 1.0)));
    let lit = min(1.0, (u.lightness / 100.0) * (1.0 + input.blink * (u.intensityBoost - 1.0)));

    var color = hsl2rgb(hue, sat, lit);

    // Iridescence
    if (u.iridescenceEnabled > 0.5) {
        let iri = iridescence(input.segIdx, u.time, u.iridescenceScale, u.iridescenceSpeed);
        color = mix(color, color * iri * 2.0, u.iridescenceIntensity);
    }

    // Depth-based energy falloff
    var depthFactor = 1.0;
    if (u.depthFogEnabled > 0.5) {
        depthFactor = clamp(mix(1.0, 1.0 - input.depth, u.depthFogEnergyFalloff), 0.0, 1.0);
    }

    // Energy flow: layered sinusoids
    let TAU = 6.2832;
    let energy1 = sin(input.segIdx * TAU * 2.0 - u.time * u.energySpeed * 1.0) * 0.5 + 0.5;
    let energy2 = sin(input.segIdx * TAU * 5.0 - u.time * u.energySpeed * 1.7) * 0.5 + 0.5;
    let energy3 = sin(input.segIdx * TAU * 11.0 - u.time * u.energySpeed * 2.3) * 0.5 + 0.5;
    let energy4 = sin(input.segIdx * TAU * 17.0 - u.time * u.energySpeed * 3.1) * 0.5 + 0.5;
    let energy = energy1 * 0.4 + energy2 * 0.25 + energy3 * 0.2 + energy4 * 0.15;
    color *= 1.0 + energy * u.energyIntensity * 3.5 * depthFactor;

    // Sparks
    let sparkWave1 = sin(input.segIdx * 150.0 - u.time * 8.0);
    let sparkWave2 = cos(input.segIdx * 200.0 + u.time * 6.0);
    let spark = step(u.sparkThreshold, sparkWave1) + step(u.sparkThreshold + 0.005, sparkWave2) * 0.7;
    color += color * spark * u.energyIntensity * 4.0 * depthFactor;

    // Fresnel-like rim glow
    if (u.depthFogEnabled > 0.5) {
        let rim = clamp(1.0 - abs(input.depth - 0.4) * 2.0, 0.0, 1.0) * 0.3;
        color *= 1.0 + rim;
    }

    // Age -> alpha decay
    var alpha = (1.0 - input.age) * u.maxAlpha * (1.0 + input.blink * (u.alphaBoost - 1.0));
    alpha = clamp(alpha, 0.0, 1.0);

    // Depth fog
    if (u.depthFogEnabled > 0.5) {
        let fogFade = 1.0 - smoothstep(0.3, 1.0, input.depth * u.depthFogDensity);
        alpha *= fogFade;
    }

    // Premultiplied alpha output
    return vec4f(color * alpha, alpha);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/webgpu/shaders/attractor-lines-vertex.wgsl src/webgpu/shaders/attractor-lines-fragment.wgsl
git commit -m "feat(webgpu): add attractor lines WGSL shaders"
```

---

### Task 5: WGSL Shaders — Bloom (Bright Extract, Blur, Composite)

**Files:**
- Create: `src/webgpu/shaders/bright-extract.wgsl`
- Create: `src/webgpu/shaders/blur.wgsl`
- Create: `src/webgpu/shaders/composite.wgsl`

Three post-processing shaders. All use the fullscreen quad vertex shader from Task 3.

- [ ] **Step 1: Create bright extract shader**

```wgsl
// src/webgpu/shaders/bright-extract.wgsl

// Bloom bright extract — threshold pass.
// Port of BRIGHT_EXTRACT_FRAGMENT from attractor-shaders.js.

struct Uniforms {
    threshold: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var texSampler: sampler;
@group(0) @binding(2) var tex: texture_2d<f32>;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
    let color = textureSample(tex, texSampler, uv);
    let luminance = dot(color.rgb, vec3f(0.2126, 0.7152, 0.0722));
    let brightness = smoothstep(u.threshold, u.threshold + 0.15, luminance);
    return color * brightness;
}
```

- [ ] **Step 2: Create blur shader**

```wgsl
// src/webgpu/shaders/blur.wgsl

// Separable Gaussian blur — used for horizontal and vertical passes.
// Port of BLUR_FRAGMENT from attractor-shaders.js.

struct Uniforms {
    direction: vec2f,
    radius: f32,
    _pad: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var texSampler: sampler;
@group(0) @binding(2) var tex: texture_2d<f32>;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
    // 9-tap Gaussian (sigma ~2.5)
    let weights = array<f32, 5>(0.2270270, 0.1945946, 0.1216216, 0.0540541, 0.0162162);

    var color = textureSample(tex, texSampler, uv) * weights[0];

    for (var i = 1; i < 5; i++) {
        let offset = u.direction * f32(i) * u.radius;
        color += textureSample(tex, texSampler, uv + offset) * weights[i];
        color += textureSample(tex, texSampler, uv - offset) * weights[i];
    }

    return color;
}
```

- [ ] **Step 3: Create composite shader**

```wgsl
// src/webgpu/shaders/composite.wgsl

// Bloom composite — merges scene + bloom textures.
// Port of COMPOSITE_FRAGMENT from attractor-shaders.js.

struct Uniforms {
    bloomStrength: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var texSampler: sampler;
@group(0) @binding(2) var sceneTex: texture_2d<f32>;
@group(0) @binding(3) var bloomTex: texture_2d<f32>;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
    let scene = textureSample(sceneTex, texSampler, uv);
    let bloom = textureSample(bloomTex, texSampler, uv);

    let color = scene.rgb + bloom.rgb * u.bloomStrength;
    let alpha = clamp(scene.a + bloom.a * u.bloomStrength, 0.0, 1.0);
    return vec4f(color, alpha);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/webgpu/shaders/bright-extract.wgsl src/webgpu/shaders/blur.wgsl src/webgpu/shaders/composite.wgsl
git commit -m "feat(webgpu): add bloom WGSL shaders (bright extract, blur, composite)"
```

---

### Task 6: WGSL Shaders — Post-Process

**Files:**
- Create: `src/webgpu/shaders/post-process.wgsl`

Chromatic aberration, ACES tonemapping, color grading, film grain.

- [ ] **Step 1: Create post-process shader**

```wgsl
// src/webgpu/shaders/post-process.wgsl

// Post-process shader — chromatic aberration, ACES tonemapping, color grading, film grain.
// Port of POST_PROCESS_FRAGMENT from attractor-shaders.js.

struct Uniforms {
    resolution: vec2f,
    time: f32,
    chromAbEnabled: f32,
    chromAbStrength: f32,
    chromAbFalloff: f32,
    colorGradingEnabled: f32,
    exposure: f32,
    vignetteStrength: f32,
    vignetteRadius: f32,
    grainIntensity: f32,
    warmth: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var texSampler: sampler;
@group(0) @binding(2) var tex: texture_2d<f32>;

fn hash(p: vec2f) -> f32 {
    var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
    p3 += dot(p3, vec3f(p3.y, p3.z, p3.x) + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

fn acesTonemap(x: vec3f) -> vec3f {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), vec3f(0.0), vec3f(1.0));
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
    let center = uv - 0.5;
    let dist = length(center);

    let centerSample = textureSample(tex, texSampler, uv);
    let alpha = centerSample.a;
    var color: vec3f;

    if (u.chromAbEnabled > 0.5) {
        let aberration = u.chromAbStrength * pow(dist, u.chromAbFalloff);
        let dir = normalize(center + 0.0001);

        let uvR = uv - dir * aberration;
        let uvB = uv + dir * aberration;

        color.r = textureSample(tex, texSampler, uvR).r;
        color.g = centerSample.g;
        color.b = textureSample(tex, texSampler, uvB).b;
    } else {
        color = centerSample.rgb;
    }

    if (u.colorGradingEnabled > 0.5) {
        color *= u.exposure;
        color = acesTonemap(color);

        let luminance = dot(color, vec3f(0.2126, 0.7152, 0.0722));
        let shadowMask = 1.0 - smoothstep(0.0, 0.4, luminance);
        color += vec3f(0.1, 0.05, 0.0) * shadowMask * u.warmth;

        let vignette = smoothstep(u.vignetteRadius, u.vignetteRadius - u.vignetteStrength, dist);
        color *= vignette;

        let grain = hash(uv * u.resolution + fract(u.time * 7.0)) - 0.5;
        color += grain * u.grainIntensity;
    }

    color = clamp(color, vec3f(0.0), vec3f(1.0));
    return vec4f(color, alpha);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/webgpu/shaders/post-process.wgsl
git commit -m "feat(webgpu): add post-process WGSL shader"
```

---

### Task 7: `WebGPUAttractorPipeline` — Constructor, Init, and Resource Setup

**Files:**
- Create: `src/webgpu/webgpu-attractor-pipeline.js`
- Modify: `src/webgpu/index.js`

Builds the main pipeline class with constructor, async init (adapter/device/context, pipeline creation, buffer allocation, render target creation), and destroy/resize.

This is the largest task. The constructor mirrors `WebGLAttractorPipeline`'s config setup. `init()` is async because WebGPU device request is promise-based.

- [ ] **Step 1: Create the pipeline class with constructor, init, resource management, config setters, and destroy/resize**

```js
// src/webgpu/webgpu-attractor-pipeline.js

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
      minHue: 30, maxHue: 200, saturation: 85, lightness: 55, maxAlpha: 0.85,
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
      enabled: true, intensity: 0.3, speed: 0.5, scale: 2.0,
      ...options.iridescence,
    };
    this.chromaticAberrationConfig = {
      enabled: false, strength: 0.002, falloff: 2.0,
      ...options.chromaticAberration,
    };
    this.colorGradingConfig = {
      enabled: false, exposure: 1.4, vignetteStrength: 0.15,
      vignetteRadius: 0.85, grainIntensity: 0.02, warmth: 0.15,
      ...options.colorGrading,
    };

    // Pre-allocate typed arrays: same layout as WebGL pipeline
    // Position: vec2 * 2 = 4 floats per segment
    this._positions = new Float32Array(maxSegments * 4);
    // Metadata: (speedNorm, age, blink, segIdx) * 2 = 8 floats per segment
    this._meta = new Float32Array(maxSegments * 8);
    // Depth: 1 float per vertex, 2 vertices per segment
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

    // Create sampler (shared by all texture-reading passes)
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
    const fmt = "rgba8unorm";

    this.sceneRT = new WebGPURenderTarget(this.device, w, h, fmt);
    this.brightRT = new WebGPURenderTarget(this.device, hw, hh, fmt);
    this.blurPingRT = new WebGPURenderTarget(this.device, hw, hh, fmt);
    this.blurPongRT = new WebGPURenderTarget(this.device, hw, hh, fmt);
    this.postRT = new WebGPURenderTarget(this.device, w, h, fmt);
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

    // Line vertex buffers
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
    const targetFormat = "rgba8unorm";

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
          format: targetFormat,
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
          // Position: vec2f
          { arrayStride: 8, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }] },
          // Metadata: interleaved (speedNorm, age, blink, segIdx) = 4 floats per vertex
          {
            arrayStride: 16,
            attributes: [
              { shaderLocation: 1, offset: 0, format: "float32" },  // speedNorm
              { shaderLocation: 2, offset: 4, format: "float32" },  // age
              { shaderLocation: 3, offset: 8, format: "float32" },  // blink
              { shaderLocation: 4, offset: 12, format: "float32" }, // segIdx
            ],
          },
          // Depth: f32
          { arrayStride: 4, attributes: [{ shaderLocation: 5, offset: 0, format: "float32" }] },
        ],
      },
      fragment: {
        module: lineFragModule,
        entryPoint: "fs_main",
        targets: [{
          format: targetFormat,
          blend: {
            color: { srcFactor: "one", dstFactor: "one", operation: "add" },
            alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
          },
        }],
      },
      primitive: { topology: "line-list" },
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
        targets: [{ format: targetFormat }], // No blending — replace
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
        targets: [{ format: targetFormat }],
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
          format: targetFormat,
          blend: {
            color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
          },
        }],
      },
      primitive: { topology: "triangle-list" },
    });

    // ── Post-process pipeline ─────────────────────────────────────────
    // Same layout as single-texture passes but renders to the swap chain format
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
          format: targetFormat,
          blend: {
            color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
          },
        }],
      },
      primitive: { topology: "triangle-list" },
    });

    // Also need a "blit" pipeline for writing to the swap chain (presentFormat)
    // Used in endFrame to copy the final result to the canvas
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
```

- [ ] **Step 2: Update the barrel export**

Add to `src/webgpu/index.js`:

```js
export { WebGPUAttractorPipeline } from "./webgpu-attractor-pipeline.js";
```

- [ ] **Step 3: Commit**

```bash
git add src/webgpu/webgpu-attractor-pipeline.js src/webgpu/index.js
git commit -m "feat(webgpu): add WebGPUAttractorPipeline class with init, config, resize, destroy"
```

---

### Task 8: `WebGPUAttractorPipeline` — Per-Frame Rendering Methods

**Files:**
- Modify: `src/webgpu/webgpu-attractor-pipeline.js`

Adds `beginFrame`, `updateLines`, `renderLines`, `endFrame`, and `compositeOnto` — the per-frame rendering loop. These methods record GPU commands into a single `GPUCommandEncoder` per frame.

- [ ] **Step 1: Add the per-frame rendering methods**

Add these methods to the `WebGPUAttractorPipeline` class, after the config setters and before the resize/destroy section:

```js
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

    for (let i = 0; i < count; i++) {
      const s = segments[i];
      const pi = i * 4;
      const mi = i * 8;
      const di = i * 2;

      this._positions[pi] = s.x1;
      this._positions[pi + 1] = s.y1;
      this._positions[pi + 2] = s.x2;
      this._positions[pi + 3] = s.y2;

      this._meta[mi] = s.speedNorm;
      this._meta[mi + 1] = s.age;
      this._meta[mi + 2] = s.blink;
      this._meta[mi + 3] = s.segIdx;
      this._meta[mi + 4] = s.speedNorm;
      this._meta[mi + 5] = s.age;
      this._meta[mi + 6] = s.blink;
      this._meta[mi + 7] = s.segIdx;

      this._depths[di] = s.depth1 ?? 0;
      this._depths[di + 1] = s.depth2 ?? 0;
    }

    this.device.queue.writeBuffer(this.positionBuffer, 0, this._positions, 0, count * 4);
    this.device.queue.writeBuffer(this.metaBuffer, 0, this._meta, 0, count * 8);
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
    pass.setVertexBuffer(0, this.positionBuffer);
    pass.setVertexBuffer(1, this.metaBuffer);
    pass.setVertexBuffer(2, this.depthBuffer);
    pass.draw(count * 2); // 2 vertices per line segment
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
        this._renderCompositeToRT(this.postRT, this.sceneRT, this.sceneRT, 0.0);
        this._renderPostProcess(this.postRT);
      } else {
        this._blitToScreen(this.sceneRT);
      }
    } else {
      // Bloom pipeline
      this._renderBrightExtract();
      this._renderBlur();

      if (postEnabled) {
        this._renderCompositeToRT(this.postRT, this.sceneRT, this.blurPongRT, this.bloomConfig.strength);
        this._renderPostProcess(this.postRT);
      } else {
        this._renderCompositeToRT(this.sceneRT, this.sceneRT, this.blurPongRT, this.bloomConfig.strength);
        this._blitToScreen(this.sceneRT);
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

    if (this.glowConfig.enabled && this.glowConfig.radius > 0) {
      ctx.save();
      ctx.filter = `blur(${this.glowConfig.radius}px)`;
      ctx.globalAlpha = this.glowConfig.intensity;
      ctx.drawImage(this.canvas, x, y);
      ctx.restore();
    }

    ctx.drawImage(this.canvas, x, y);
  }

  // ── Private Render Pass Helpers ─────────────────────────────────────

  /** @private Bright extract: scene → brightRT */
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

  /** @private Blur: brightRT → blurPingRT (H) → blurPongRT (V), repeated for passes */
  _renderBlur() {
    const hw = this.brightRT.width;
    const hh = this.brightRT.height;
    const passes = Math.max(1, this.bloomConfig.passes || 1);

    for (let p = 0; p < passes; p++) {
      const srcView = p === 0 ? this.brightRT.view : this.blurPongRT.view;

      // Horizontal blur → blurPingRT
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

      // Vertical blur → blurPongRT
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

  /** @private Composite: scene + bloom → target RT */
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

  /** @private Post-process: sourceRT → screen-format RT, then blit */
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
      cg.grainIntensity, cg.warmth,
    ]);
    this.device.queue.writeBuffer(this.postProcessUniformBuffer, 0, data);

    // Render post-process into a temporary target (reuse postRT or sceneRT)
    // Since sourceRT IS postRT in all call paths, we can't read and write the same RT.
    // Use sceneRT as scratch (it's done being read at this point in the non-bloom path,
    // and in the bloom path the composite already wrote to postRT from sceneRT).
    // Actually, in the bloom path: composite writes to postRT from sceneRT+blurPong,
    // then post-process reads postRT. So we write post-process output to sceneRT (scratch).
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
```

- [ ] **Step 2: Verify the file loads without syntax errors**

Run: `node -e "import('./src/webgpu/webgpu-attractor-pipeline.js').catch(e => console.error(e.message))"`

This will fail at runtime (no WebGPU in Node) but should parse without syntax errors. If you get a syntax error, fix it before committing.

- [ ] **Step 3: Commit**

```bash
git add src/webgpu/webgpu-attractor-pipeline.js
git commit -m "feat(webgpu): add per-frame rendering methods (beginFrame, updateLines, renderLines, endFrame, compositeOnto)"
```

---

### Task 9: CAOS Playground — Renderer Toggle

**Files:**
- Modify: `demos/js/caos-playground.js`

Add a "RENDERER" dropdown next to the attractor dropdown. On change, swap between `WebGLAttractorPipeline` and `WebGPUAttractorPipeline`. Skip rendering during the async WebGPU init.

- [ ] **Step 1: Add the WebGPU import**

At the top of `demos/js/caos-playground.js`, after the existing imports, add:

```js
import { WebGPUAttractorPipeline } from "../../src/webgpu/webgpu-attractor-pipeline.js";
```

- [ ] **Step 2: Add the renderer dropdown in `_buildPanel`**

In the `_buildPanel` method, immediately after the attractor dropdown block (after `this.panel.addItem(this._controls.attractor);`), add the renderer dropdown:

```js
    // ── Renderer Dropdown (top-level, not in a section) ──────────
    const rendererOptions = [{ label: "WebGL", value: "webgl" }];
    if (navigator.gpu) {
      rendererOptions.push({ label: "WebGPU", value: "webgpu" });
    }

    this._activeRenderer = "webgl";
    this._switchingRenderer = false;

    this._controls.renderer = new Dropdown(this, {
      label: "RENDERER",
      width: sw,
      options: rendererOptions,
      value: "webgl",
      onChange: (v) => this._onRendererChange(v),
    });
    this.panel.addItem(this._controls.renderer);
```

- [ ] **Step 3: Add the renderer swap method**

Add this method to the `CaosPlayground` class:

```js
  // ─── Renderer Swap ──────────────────────────────────────────────────

  async _onRendererChange(rendererType) {
    if (rendererType === this._activeRenderer) return;
    if (this._switchingRenderer) return;

    this._switchingRenderer = true;

    // Close dropdown before async work
    this._controls.renderer.close();

    // Destroy old pipeline
    this.attractorPipeline?.destroy();

    const cfg = this.config;
    const maxSegments = cfg.maxSegments || cfg.particles.count * cfg.particles.trailLength;
    const pipelineOptions = {
      bloom: cfg.bloom,
      background: {
        ...cfg.background,
        baseColor: cfg.background.baseColor || this._computeBackgroundColor(),
      },
      visual: cfg.visual,
      blink: cfg.blink,
      energyFlow: cfg.energyFlow,
      depthFog: cfg.depthFog,
      iridescence: cfg.iridescence,
      chromaticAberration: cfg.chromaticAberration,
      colorGrading: cfg.colorGrading,
      glow: cfg.glow,
    };

    if (rendererType === "webgpu") {
      const pipeline = new WebGPUAttractorPipeline(
        this.width, this.height, maxSegments, pipelineOptions
      );
      const ok = await pipeline.init();
      if (ok) {
        this.attractorPipeline = pipeline;
        this.useWebGL = true; // Flag used by base class to decide WebGL vs Canvas2D path
        this._activeRenderer = "webgpu";
        console.log("Switched to WebGPU renderer");
      } else {
        console.warn("WebGPU init failed, reverting to WebGL");
        this._revertToWebGL(maxSegments, pipelineOptions);
      }
    } else {
      this._revertToWebGL(maxSegments, pipelineOptions);
    }

    this._switchingRenderer = false;
  }

  /** @private Rebuild WebGL pipeline (uses static import from top of file) */
  _revertToWebGL(maxSegments, pipelineOptions) {
    const pipeline = new WebGLAttractorPipeline(
      this.width, this.height, maxSegments, pipelineOptions
    );
    const ok = pipeline.init();
    this.attractorPipeline = pipeline;
    this.useWebGL = ok;
    this._activeRenderer = "webgl";
    if (ok) {
      console.log("Switched to WebGL renderer");
    } else {
      console.warn("WebGL init also failed, using Canvas 2D fallback");
    }
  }
```

- [ ] **Step 4: Override `_renderAttractor` to skip during pipeline swap**

Add this override to the `CaosPlayground` class:

```js
  /** @override — skip attractor rendering while switching renderer */
  _renderAttractor() {
    if (this._switchingRenderer) return;
    super._renderAttractor();
  }
```

- [ ] **Step 5: Verify the dev server loads without errors**

Run: `npm run dev`

Open `http://localhost:9195/demos/caos-playground.html` in a WebGPU-capable browser (Chrome 113+). Verify:
1. The "RENDERER" dropdown appears after the "ATTRACTOR" dropdown
2. Default is "WebGL" and the attractor renders normally
3. Switching to "WebGPU" initializes without console errors and renders the attractor
4. Switching back to "WebGL" restores the original rendering
5. If the browser doesn't support WebGPU, only "WebGL" appears in the dropdown

- [ ] **Step 6: Commit**

```bash
git add demos/js/caos-playground.js
git commit -m "feat(caos-playground): add WebGPU/WebGL renderer toggle"
```

---

### Task 10: Integration Testing and Visual Verification

**Files:**
- No new files

This task is manual verification. No code to write — just testing.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Test WebGL baseline**

Open `http://localhost:9195/demos/caos-playground.html`. Verify the playground works as before with WebGL selected. Try:
- Switch between all 10 attractors
- Adjust sliders in all sections (Physics, Particles, Color, Effects)
- Resize the window
- Reset defaults

- [ ] **Step 3: Test WebGPU toggle**

Switch the RENDERER dropdown to "WebGPU". For each attractor, verify:
- Lines render with similar colors and shapes to WebGL
- Background noise is visible
- Bloom effect works (toggle in Effects section)
- Glow works
- Auto-rotation works
- Particle count and trail length changes take effect
- Color sliders (hue, saturation, lightness) update in real-time

- [ ] **Step 4: Test toggle round-trip**

- Switch WebGL → WebGPU → WebGL → WebGPU
- Switch attractor while on WebGPU
- Resize the browser window while on WebGPU
- Reset defaults while on WebGPU

- [ ] **Step 5: Test fallback**

Open in a browser without WebGPU (Firefox as of April 2026 unless flag-enabled). Verify:
- Only "WebGL" appears in the dropdown
- Everything works normally

- [ ] **Step 6: Fix any issues found during testing**

If visual differences exist between WebGL and WebGPU, debug by:
1. Check UV orientation — WebGPU textures have y=0 at top
2. Check uniform buffer alignment — WGSL structs may have padding requirements
3. Check blend modes — WebGPU blend state is per-pipeline, not per-draw-call
4. Compare using a single solid-color shader to isolate whether the issue is in the line shader or post-processing

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix(webgpu): integration fixes from visual testing"
```

---

### Task 11: Cleanup and Final Commit

**Files:**
- Modify: `src/webgpu/index.js`

- [ ] **Step 1: Ensure all exports are present in the barrel file**

Read `src/webgpu/index.js` and verify it exports:
- `WebGPURenderTarget`
- `WebGPUAttractorPipeline`

- [ ] **Step 2: Run existing tests to check for regressions**

Run: `npm test`

All existing tests should pass — we made no changes to existing code.

Expected: All tests pass (the WebGPU code has no unit tests; it's verified visually).

- [ ] **Step 3: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore(webgpu): finalize exports and verify no regressions"
```
