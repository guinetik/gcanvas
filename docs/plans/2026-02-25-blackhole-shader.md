# Black Hole WebGL Shader Renderer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Canvas 2D black hole (flat gradients) with a raymarched WebGL shader featuring gravitational lensing, FBM-textured accretion disk, Doppler beaming, and photon ring — rendered into a small region at galaxy center.

**Architecture:** A new `WebGLBlackHoleRenderer` owns an offscreen square canvas, renders the adapted black-hole shader as a fullscreen quad, and composites onto the main 2D canvas at the projected galaxy center. Camera tilt/rotation syncs with the galaxy's Camera3D. Jets remain Canvas 2D (they extend far beyond the shader region). Falls back to existing `_drawBlackHole` if WebGL unavailable.

**Tech Stack:** WebGL 1.0 (GLSL ES 1.0), fullscreen quad, raymarching with gravitational lensing.

**Reference files:**
- `D:\Developer\shaders\src\shaders\black-hole\image.glsl` — Source shader to adapt
- `src/webgl/webgl-nebula-renderer.js` — Renderer class pattern to follow
- `src/webgl/shaders/nebula-shaders.js` — Shader export pattern
- `demos/js/galaxy-playground.js:495-604` — Current Canvas 2D black hole to replace

---

### Task 1: Create black hole shader sources

**Files:**
- Create: `src/webgl/shaders/blackhole-shaders.js`

**What to build:**

A vertex shader (passthrough fullscreen quad) and a fragment shader adapted from `black-hole/image.glsl`.

**Vertex shader** — identical to nebula vertex shader:
```glsl
attribute vec2 aPosition;
attribute vec2 aUV;
varying vec2 vUV;

void main() {
  vUV = aUV;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
```

**Fragment shader** — adapt `image.glsl` with these changes:

1. **Replace Shadertoy globals** with uniforms:
   - `iResolution` → `uniform vec2 uResolution`
   - `iTime` → `uniform float uTime`
   - Remove `mainImage(out vec4, in vec2)` wrapper → use `void main()`
   - `fragCoord` → `vUV * uResolution`

2. **Replace camera** with uniforms synced to Camera3D:
   - Remove `CAMERA_DIST`, `CAMERA_ANGLE_V`, `ORBIT_SPEED` constants
   - Add `uniform float uTiltX` (camera.rotationX) and `uniform float uRotY` (camera.rotationY)
   - Compute `cameraPos` from `uTiltX`/`uRotY` at fixed distance (2.0):
     ```glsl
     float cameraAngleH = PI * 0.5 + uRotY;
     float cameraAngleV = PI * 0.48 + uTiltX * 0.3; // dampen tilt influence
     vec3 cameraPos = vec3(
       CAMERA_DIST * cos(cameraAngleH) * sin(cameraAngleV),
       CAMERA_DIST * cos(cameraAngleV),
       CAMERA_DIST * sin(cameraAngleH) * sin(cameraAngleV)
     );
     ```

3. **Transparent background** for escaped rays (instead of starfield):
   - Remove the entire `starfield()` function and `STAR_*` constants
   - Replace the starfield sampling block at the end:
     ```glsl
     // Escaped rays → transparent (galaxy shows through)
     // notCaptured > threshold means ray escaped
     // finalColor already has disk/glow/ring contributions
     ```
   - Final output: premultiplied alpha. Alpha = 1.0 inside event horizon (opaque black), fades based on disk/glow contribution, 0.0 for escaped rays with no contribution:
     ```glsl
     float alpha = min(1.0, length(finalColor) * 2.0 + (1.0 - notCaptured));
     finalColor = pow(max(finalColor, vec3(0.0)), GAMMA);
     gl_FragColor = vec4(finalColor * alpha, alpha);
     ```

4. **Keep everything else verbatim** from the original shader:
   - All SDF functions (`sdfSphere`, `sdfTorus`)
   - All noise functions (`hash`, `valueNoise`, `fbmNoise`)
   - Raymarching loop with gravitational lensing
   - Accretion disk (FBM texture, Doppler beaming, heat gradient, torus SDF)
   - Photon ring (Einstein ring)
   - Ambient glow
   - All `#define` constants (except camera/star ones)

**Export pattern** (matching `nebula-shaders.js`):
```javascript
export const BLACKHOLE_VERTEX = `...`;
export const BLACKHOLE_FRAGMENT = `...`;
```

**Step 1:** Create the file with both shader sources adapted as described above. Copy the original shader verbatim first, then make the 3 adaptations (camera, transparency, Shadertoy→WebGL).

**Step 2:** Verify the file exports correctly:
```bash
node -e "import('./src/webgl/shaders/blackhole-shaders.js').then(m => console.log('vertex:', m.BLACKHOLE_VERTEX.length, 'chars, fragment:', m.BLACKHOLE_FRAGMENT.length, 'chars'))"
```
Expected: Both exports exist with reasonable lengths (vertex ~150 chars, fragment ~4000+ chars).

**Step 3:** Commit.
```bash
git add src/webgl/shaders/blackhole-shaders.js
git commit -m "feat(galaxy): add black hole raymarching shader sources"
```

---

### Task 2: Create WebGLBlackHoleRenderer class

**Files:**
- Create: `src/webgl/webgl-blackhole-renderer.js`

**What to build:**

Follow `webgl-nebula-renderer.js` exactly for structure. The renderer manages a **square** offscreen canvas (the black hole region).

```javascript
import { BLACKHOLE_VERTEX, BLACKHOLE_FRAGMENT } from "./shaders/blackhole-shaders.js";

export class WebGLBlackHoleRenderer {
  constructor(options = {}) {
    this.size = options.size || 256; // square canvas
    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.available = false;
    this.uniforms = {};
  }

  init() { /* same pattern as nebula renderer */ }
  isAvailable() { return this.available; }
  resize(size) { /* update square canvas + viewport */ }
  render(params) { /* set uniforms, draw quad */ }
  compositeOnto(ctx, centerX, centerY) { /* draw centered at position */ }
  destroy() { /* cleanup */ }

  // Private methods: _compileShader, _createProgram, _cacheUniforms, _createQuadBuffers, _bindQuad
}
```

**Key differences from nebula renderer:**
- Canvas is **square** (`size × size`), not fullscreen
- `resize(size)` takes a single number
- `compositeOnto(ctx, cx, cy)` draws the canvas **centered** at (cx, cy):
  ```javascript
  ctx.drawImage(this.canvas, centerX - this.size / 2, centerY - this.size / 2);
  ```
- Blending: `gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)` (premultiplied alpha, NOT additive — we want the black center to occlude)
- No density texture

**Uniforms to cache:**
```javascript
const names = [
  "uResolution", "uTime",
  "uTiltX", "uRotY",
];
```

**render(params):**
```javascript
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
```

**Step 1:** Create the file following the pattern above. Copy private methods (`_compileShader`, `_createProgram`, `_cacheUniforms`, `_createQuadBuffers`, `_bindQuad`) verbatim from `webgl-nebula-renderer.js`.

**Step 2:** Verify import works:
```bash
node -e "import('./src/webgl/webgl-blackhole-renderer.js').then(m => console.log('Class:', typeof m.WebGLBlackHoleRenderer))"
```
Expected: `Class: function`

**Step 3:** Commit.
```bash
git add src/webgl/webgl-blackhole-renderer.js
git commit -m "feat(galaxy): add WebGLBlackHoleRenderer class"
```

---

### Task 3: Export and config

**Files:**
- Modify: `src/webgl/index.js` — add export line
- Modify: `demos/js/galaxy/galaxy.config.js` — add `shaderSize` to blackHole config

**Step 1:** Add export to `src/webgl/index.js` after the nebula export (line 15):
```javascript
export { WebGLBlackHoleRenderer } from "./webgl-blackhole-renderer.js";
```

**Step 2:** Add `shaderSize` to `CONFIG.blackHole` in `demos/js/galaxy/galaxy.config.js`:
```javascript
blackHole: {
    radius: 12,
    accretionDiskRadius: 70,
    accretionHue: 30,
    jetLength: 120,
    jetWidth: 8,
    jetAlpha: 0.15,
    shaderSize: 280,        // WebGL render region size in pixels (before zoom)
},
```

**Step 3:** Verify:
```bash
node -e "import('./demos/js/galaxy/galaxy.config.js').then(m => console.log('shaderSize:', m.CONFIG.blackHole.shaderSize))"
```
Expected: `shaderSize: 280`

**Step 4:** Commit.
```bash
git add src/webgl/index.js demos/js/galaxy/galaxy.config.js
git commit -m "feat(galaxy): export black hole renderer and add config"
```

---

### Task 4: Integrate into galaxy-playground.js

**Files:**
- Modify: `demos/js/galaxy-playground.js`

**What to change:**

1. **Import** (after the nebula import, ~line 31):
   ```javascript
   import { WebGLBlackHoleRenderer } from "../../src/webgl/webgl-blackhole-renderer.js";
   ```

2. **Initialize** in `_initWebGL()` (~line 143, after nebula renderer init):
   ```javascript
   this.blackHoleRenderer = new WebGLBlackHoleRenderer({
     size: CONFIG.blackHole.shaderSize,
   });
   this.blackHoleRenderer.init();
   ```

3. **Replace `_drawBlackHole`** — rename existing to `_drawBlackHoleCanvas2D` (keep as fallback), create new `_drawBlackHole`:
   ```javascript
   _drawBlackHole(ctx, cx, cy) {
     if (this.blackHoleRenderer && this.blackHoleRenderer.isAvailable()) {
       this._drawBlackHoleWebGL(ctx, cx, cy);
     } else {
       this._drawBlackHoleCanvas2D(ctx, cx, cy);
     }
     // Jets always drawn with Canvas 2D (they extend far beyond shader region)
     this._drawJets(ctx, cx, cy);
   }
   ```

4. **New `_drawBlackHoleWebGL`**:
   ```javascript
   _drawBlackHoleWebGL(ctx, cx, cy) {
     const p = this.camera.project(0, 0, 0);
     const screenX = cx + p.x * this.zoom;
     const screenY = cy + p.y * this.zoom;

     // Scale shader region with zoom and perspective
     const regionSize = Math.round(CONFIG.blackHole.shaderSize * p.scale * this.zoom);
     this.blackHoleRenderer.resize(regionSize);

     this.blackHoleRenderer.render({
       time: this.time,
       tiltX: this.camera.rotationX,
       rotY: this.camera.rotationY,
     });

     ctx.save();
     ctx.globalCompositeOperation = "lighter";
     this.blackHoleRenderer.compositeOnto(ctx, screenX, screenY);
     ctx.restore();

     // Draw opaque black center over the additive composite
     ctx.save();
     ctx.globalCompositeOperation = "source-over";
     ctx.translate(screenX, screenY);
     const holeRadius = CONFIG.blackHole.radius * p.scale * this.zoom;
     ctx.beginPath();
     ctx.arc(0, 0, holeRadius, 0, Math.PI * 2);
     ctx.fillStyle = "#000";
     ctx.fill();
     ctx.restore();
   }
   ```

5. **Extract `_drawJets`** from the current `_drawBlackHole` method (lines 567-602 approximately — the relativistic jets code). This code stays Canvas 2D.

6. **Rename current `_drawBlackHole`** to `_drawBlackHoleCanvas2D` — remove the jets section from it (now in `_drawJets`).

7. **Resize** in `onResize()` (~line 611, after nebula resize):
   ```javascript
   if (this.blackHoleRenderer) {
     this.blackHoleRenderer.resize(CONFIG.blackHole.shaderSize);
   }
   ```

**Step 1:** Make all changes described above.

**Step 2:** Test in browser:
```bash
npm run dev
```
Open galaxy demo. Verify:
- Black hole renders with raymarched shader (FBM disk texture visible, not flat gradients)
- Tilting (drag) syncs the shader camera — disk tilts with galaxy
- Jets still render (Canvas 2D triangles above/below)
- Zoom in/out scales the shader region
- No console errors

**Step 3:** Commit.
```bash
git add demos/js/galaxy-playground.js
git commit -m "feat(galaxy): integrate WebGL black hole shader renderer"
```

---

### Task 5: Visual tuning

**Files:**
- Modify: `src/webgl/shaders/blackhole-shaders.js` — tune constants
- Modify: `demos/js/galaxy/galaxy.config.js` — tune shaderSize if needed

**Tuning checklist:**
- [ ] Disk rotation speed feels right with galaxy rotation
- [ ] Doppler beaming visible (one side brighter)
- [ ] Photon ring visible as bright band around event horizon
- [ ] Glow doesn't overpower surrounding stars
- [ ] Tilt response feels natural (not too sensitive, not too sluggish)
- [ ] Region size (`shaderSize`) large enough to show full disk but not wasteful
- [ ] Transparent edges blend cleanly with galaxy (no hard square cutoff visible)
- [ ] Jets align with the shader's glow direction
- [ ] Test all 10 galaxy presets — black hole looks good in all of them
- [ ] Performance: smooth 60fps with shader + nebula + 30k particles

**Likely tuning targets:**
- `CAMERA_DIST` (in shader) — how close/far the raymarched view appears
- `DISK_INTENSITY`, `DISK_FALLOFF` — brightness of accretion disk
- `GLOW_INTENSITY` — ambient glow strength
- `uTiltX` damping factor — how much galaxy tilt affects shader camera
- `CONFIG.blackHole.shaderSize` — pixel size of render region

**Step 1:** Test and adjust each item. Small changes, test each in browser.

**Step 2:** Commit.
```bash
git add src/webgl/shaders/blackhole-shaders.js demos/js/galaxy/galaxy.config.js
git commit -m "fix(galaxy): tune black hole shader visual parameters"
```

---

## Verification

1. `npm run dev` → open galaxy demo
2. Black hole shows raymarched accretion disk with FBM texture and Doppler shift
3. Drag to tilt: shader camera syncs, disk tilts with galaxy
4. Zoom: shader region scales proportionally
5. Photon ring visible as bright band near event horizon
6. Jets render above/below (Canvas 2D, unaffected)
7. Transparent edges: no visible square cutoff around shader region
8. Fallback: if WebGL disabled, Canvas 2D black hole still works
9. All 10 galaxy presets: black hole renders correctly
10. Performance: 60fps maintained
