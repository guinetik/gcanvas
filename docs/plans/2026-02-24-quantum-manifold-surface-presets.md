# Surface Geometry Presets Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add base manifold geometry presets (Flat, Saddle, Torus Ridge) so the quantum wave rides on a sculpted surface instead of a flat plane.

**Architecture:** New `SURFACE_PRESETS` and `SURFACE_PARAMS` config objects parallel the existing wave preset system. A `_computeSurface(x, z, t)` method in the main class returns base geometry height. The height formula becomes `surfaceHeight + probDensity * amplitude - gravityDip`. A second Dropdown in the UI lets users pick surface shape independently of wave function. Color mapping normalizes against total Y range.

**Tech Stack:** GCanvas (Game, AccordionGroup, Dropdown, Slider), existing quantum manifold codebase.

---

### Task 1: Add surface preset config

**Files:**
- Modify: `demos/js/quantum/quantuman.config.js`

**Step 1: Add SURFACE_PRESETS after MANIFOLD_PRESETS (line 69)**

```javascript
/** Surface geometry presets with default parameters. */
export const SURFACE_PRESETS = {
  flat: {
    label: "Flat",
  },
  saddle: {
    label: "Saddle",
    curvature: 2.0,
  },
  torusRidge: {
    label: "Torus Ridge",
    ringRadius: 5.0,
    ringWidth: 1.5,
    ringAmplitude: 3.0,
  },
};
```

**Step 2: Add SURFACE_PARAMS after PRESET_PARAMS (line 109)**

```javascript
/** Per-surface-preset parameter definitions for dynamic sliders. */
export const SURFACE_PARAMS = {
  flat: [],
  saddle: [
    { key: "curvature", label: "CURVATURE", default: 2.0, min: 0.5, max: 5.0, step: 0.1 },
  ],
  torusRidge: [
    { key: "ringRadius", label: "RING RADIUS", default: 5.0, min: 2.0, max: 8.0, step: 0.5 },
    { key: "ringWidth", label: "RING WIDTH", default: 1.5, min: 0.5, max: 3.0, step: 0.1 },
    { key: "ringAmplitude", label: "RING AMP", default: 3.0, min: 0.5, max: 6.0, step: 0.5 },
  ],
};
```

**Step 3: Commit**

```bash
git add demos/js/quantum/quantuman.config.js
git commit -m "feat(quantum): add surface geometry preset config (flat, saddle, torus ridge)"
```

---

### Task 2: Add surface computation to main class

**Files:**
- Modify: `demos/js/quantum-manifold.js`

**Step 1: Add import for SURFACE_PRESETS**

In the imports block (line 28-31), add `SURFACE_PRESETS` to the existing import:

```javascript
import {
  CONFIG,
  MANIFOLD_PRESETS,
  SURFACE_PRESETS,
} from "./quantum/quantuman.config.js";
```

**Step 2: Initialize surface state in `init()` (after line 62)**

Add these lines after `this._waveParams = { ...MANIFOLD_PRESETS.superposition };`:

```javascript
this._activeSurface = "flat";
this._surfaceParams = { ...SURFACE_PRESETS.flat };
```

**Step 3: Add `_computeSurface(x, z, t)` method**

Place it after the `_computeGravityAt` method (after line 260):

```javascript
// ─── Surface Geometry ─────────────────────────────────────────────────

_computeSurface(x, z, t) {
  switch (this._activeSurface) {
    case "saddle":
      return this._saddleSurface(x, z);
    case "torusRidge":
      return this._torusRidgeSurface(x, z);
    default:
      return 0;
  }
}

_saddleSurface(x, z) {
  const c = this._surfaceParams.curvature || 2.0;
  const L = CONFIG.grid.size;
  return c * (x * x - z * z) / (L * L);
}

_torusRidgeSurface(x, z) {
  const R = this._surfaceParams.ringRadius || 5.0;
  const w = this._surfaceParams.ringWidth || 1.5;
  const amp = this._surfaceParams.ringAmplitude || 3.0;
  const r = Math.sqrt(x * x + z * z);
  const dr = r - R;
  return amp * Math.exp(-(dr * dr) / (2 * w * w));
}
```

**Step 4: Update `_evolveWaveFunction` to include surface height**

In `_evolveWaveFunction` (around line 693-721), update the inner loop. Change:

```javascript
v.height = probDensity;
v.y = probDensity * amplitude - gravityDip;
```

To:

```javascript
const surfaceH = this._computeSurface(v.x, v.z, t);
v.surfaceH = surfaceH;
v.height = probDensity;
v.y = surfaceH + probDensity * amplitude - gravityDip;
```

**Step 5: Commit**

```bash
git add demos/js/quantum-manifold.js
git commit -m "feat(quantum): add surface geometry computation (saddle, torus ridge)"
```

---

### Task 3: Update color mapping for total height range

**Files:**
- Modify: `demos/js/quantum-manifold.js`

**Step 1: Update `_renderSurface` color normalization**

In `_renderSurface` (around line 757), the projected array already stores `height` (wave probability). Add `surfaceH` to the projected data:

In the projection loop (around line 772-778), add `surfaceH`:

```javascript
projected[i][j] = {
  x: cx + p.x,
  y: cy + p.y,
  z: p.z,
  height: v.height,
  gravityDip: v.gravityDip,
  surfaceH: v.surfaceH || 0,
};
```

In the quads loop (around line 791), add `avgSurfaceH`:

```javascript
const avgSurfaceH = (p00.surfaceH + p10.surfaceH + p11.surfaceH + p01.surfaceH) * 0.25;
quads.push({ p00, p10, p11, p01, avgZ, avgH, avgDip, avgSurfaceH });
```

**Step 2: Update color calculation to use total height**

After computing `maxH` and `maxDip` (around line 798-805), add max surface height tracking:

```javascript
let maxSurface = 0;
let minSurface = 0;
for (const q of quads) {
  if (q.avgSurfaceH > maxSurface) maxSurface = q.avgSurfaceH;
  if (q.avgSurfaceH < minSurface) minSurface = q.avgSurfaceH;
}
const surfaceRange = maxSurface - minSurface;
```

In the quad rendering loop, update the color `t` value to blend wave probability with surface height:

```javascript
const t = Math.min(1, q.avgH / maxH);
```

Becomes:

```javascript
let t = Math.min(1, q.avgH / maxH);
if (surfaceRange > 0.01) {
  const surfaceT = (q.avgSurfaceH - minSurface) / surfaceRange;
  t = Math.min(1, t * 0.4 + surfaceT * 0.6);
}
```

This makes the surface geometry dominant in coloring (60%) with wave probability adding detail (40%), giving the deep-dark-valley / bright-peak gradient from the reference image.

**Step 3: Commit**

```bash
git add demos/js/quantum-manifold.js
git commit -m "feat(quantum): color mapping uses total height range for surface gradients"
```

---

### Task 4: Add surface dropdown and sliders to UI

**Files:**
- Modify: `demos/js/quantum/quantuman.ui.js`
- Modify: `demos/js/quantum-manifold.js`

**Step 1: Update imports in quantuman.ui.js**

Add `SURFACE_PRESETS` and `SURFACE_PARAMS` to the config import (line 28):

```javascript
import { CONFIG, MANIFOLD_PRESETS, PRESET_PARAMS, SURFACE_PRESETS, SURFACE_PARAMS } from "./quantuman.config.js";
```

**Step 2: Add `buildSurfaceSliders` function**

Add after the `buildParamSliders` function (after line 781). Pattern mirrors `buildParamSliders`:

```javascript
/**
 * Builds surface geometry sliders for a given surface preset.
 */
export function buildSurfaceSliders(game, panel, surfaceSection, surfaceKey, surfaceParams, callbacks = {}) {
  const panelWidth = Screen.isMobile ? game.width - 20 : CONFIG.panel.width;
  const padding = Screen.isMobile ? CONFIG.panel.mobilePadding : CONFIG.panel.padding;
  const sw = panelWidth - padding * 2;

  panel.clearSection(surfaceSection);
  const paramDefs = SURFACE_PARAMS[surfaceKey];
  if (!paramDefs || paramDefs.length === 0) {
    panel.commitSection(surfaceSection);
    panel.layout();
    return [];
  }

  const items = [];
  for (const def of paramDefs) {
    const decimals = def.step >= 1 ? 0 : def.step >= 0.1 ? 1 : 2;
    const slider = new Slider(game, {
      label: def.label,
      width: sw,
      min: def.min,
      max: def.max,
      value: def.default,
      step: def.step,
      formatValue: (v) => v.toFixed(decimals),
      onChange: (v) => {
        if (callbacks.getUpdatingSliders?.()) return;
        surfaceParams[def.key] = v;
      },
    });
    surfaceSection.addItem(slider);
    items.push(slider);
  }

  panel.commitSection(surfaceSection);
  panel.layout();
  return items;
}
```

**Step 3: Add surface dropdown in `createControlPanel`**

In `createControlPanel`, after the wave preset dropdown (after line 475 `panel.addItem(controls.preset)`), add:

```javascript
// Surface geometry dropdown
const surfaceOptions = Object.entries(SURFACE_PRESETS).map(
  ([key, preset]) => ({ label: preset.label, value: key })
);
controls.surface = new Dropdown(game, {
  label: "SURFACE SHAPE",
  width: sw,
  options: surfaceOptions,
  value: callbacks.activeSurface || "flat",
  onChange: (v) => callbacks.onSurfaceChange?.(v),
});
panel.addItem(controls.surface);
```

**Step 4: Add surface sliders section in `createControlPanel`**

After the Parameters section (after line 479), add:

```javascript
// Surface geometry section
const surfaceGeom = panel.addSection("Surface Shape", { expanded: false });
buildSurfaceSliders(game, panel, surfaceGeom, callbacks.activeSurface || "flat", callbacks.surfaceParams || {}, callbacks);
```

Update the `sections` array (around line 655) to include `surfaceGeom`:

```javascript
const sections = [paramsSection, surfaceGeom, surface, gravity, view];
```

Update the return to include `surfaceGeomSection`:

```javascript
return {
  panel,
  controls,
  paramsSection,
  surfaceGeomSection: surfaceGeom,
  sections,
};
```

**Step 5: Wire up surface callbacks in quantum-manifold.js**

In `_buildUI()`, add to the callbacks object passed to `createControlPanel`:

```javascript
onSurfaceChange: (key) => this._onSurfaceChange(key),
activeSurface: this._activeSurface,
surfaceParams: this._surfaceParams,
```

Update the destructured return to capture `surfaceGeomSection`:

```javascript
const { panel, controls, paramsSection, surfaceGeomSection, sections } = createControlPanel(game, { ... });
this._surfaceGeomSection = surfaceGeomSection;
```

**Step 6: Add `_onSurfaceChange` method in quantum-manifold.js**

Add after `_onPresetChange` (after line 447):

```javascript
_onSurfaceChange(key) {
  const preset = SURFACE_PRESETS[key];
  if (!preset) return;

  this._controls.surface.close();
  this._activeSurface = key;
  this._surfaceParams = { ...preset };

  this._surfaceSliders = buildSurfaceSliders(
    this,
    this.panel,
    this._surfaceGeomSection,
    key,
    this._surfaceParams,
    {
      getUpdatingSliders: () => this._updatingSliders,
    }
  );
}
```

Also add `buildSurfaceSliders` to the import from `quantuman.ui.js`.

**Step 7: Commit**

```bash
git add demos/js/quantum/quantuman.ui.js demos/js/quantum-manifold.js
git commit -m "feat(quantum): add surface geometry dropdown and dynamic sliders in UI"
```

---

### Task 5: Update cross-section to include surface geometry

**Files:**
- Modify: `demos/js/quantum-manifold.js`

**Step 1: Update `_renderCrossSection`**

In the sampling loop (around line 924-941), add surface height to the samples:

After `const grav = this._computeGravityAt(x, sliceZ);`, add:

```javascript
const surfH = this._computeSurface(x, sliceZ, this.time);
samples.push({ x, prob, re, grav, surfH });
```

(Replace the existing `samples.push` line.)

**Step 2: Draw surface baseline in cross-section**

After the gravity fill section (around line 985) and before the envelope fill, add a surface geometry line:

```javascript
// Surface geometry baseline
let maxSurfH = 0;
let minSurfH = 0;
for (const s of samples) {
  if (s.surfH > maxSurfH) maxSurfH = s.surfH;
  if (s.surfH < minSurfH) minSurfH = s.surfH;
}
const surfRange = maxSurfH - minSurfH;

if (surfRange > 0.01) {
  Painter.useCtx((ctx) => {
    ctx.strokeStyle = "rgba(180, 120, 255, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let i = 0; i < numSamples; i++) {
      const sx = plotX + (i / (numSamples - 1)) * plotW;
      const normSurf = (surfRange > 0) ? (samples[i].surfH - minSurfH) / surfRange : 0.5;
      const sy = plotY + plotH - normSurf * plotH * 0.5 - plotH * 0.1;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  });
}
```

**Step 3: Add surface label in the labels section**

After the gravity label check (around line 1031), add:

```javascript
if (surfRange > 0.01) {
  ctx.fillStyle = "rgba(180, 120, 255, 0.6)";
  ctx.fillText("S(r)", plotX + plotW - 200, plotY - 10);
}
```

**Step 4: Commit**

```bash
git add demos/js/quantum-manifold.js
git commit -m "feat(quantum): cross-section plot shows surface geometry baseline"
```

---

### Task 6: Update stats text and info overlay for surface

**Files:**
- Modify: `demos/js/quantum-manifold.js`
- Modify: `demos/js/quantum/quantuman.ui.js`

**Step 1: Update `_updateStatsText` in quantum-manifold.js**

In `_buildInfoPanel` (around line 268-278), update the stats text function to include surface info:

```javascript
this._updateStatsText = () => {
  const preset = MANIFOLD_PRESETS[this._activePreset];
  const wellCount = this._gravityWells.length;
  const wellStr = wellCount > 0 ? ` | ${wellCount} well${wellCount > 1 ? "s" : ""}` : "";
  const surfaceLabel = this._activeSurface !== "flat"
    ? ` | ${SURFACE_PRESETS[this._activeSurface]?.label || ""}`
    : "";
  if (this._activePreset === "superposition") {
    statsText.text = `${preset.label} | ${this._waveParams.numPackets || 3} packets${surfaceLabel}${wellStr}`;
  } else {
    statsText.text = `${preset.label} | t=${this.time.toFixed(1)}s${surfaceLabel}${wellStr}`;
  }
};
```

**Step 2: Update `getPresetExplanation` in quantuman.ui.js**

Add a `surfaceKey` parameter. After the gravity well section (around line 188), add:

```javascript
export function getPresetExplanation(activePreset, waveParams, wellCount = 0, surfaceKey = "flat") {
```

Before the `return info;` line, add:

```javascript
if (surfaceKey && surfaceKey !== "flat") {
  const surfLabel = SURFACE_PRESETS[surfaceKey]?.label || surfaceKey;
  info.lines.push("");
  info.lines.push(`Surface: ${surfLabel}`);
}
```

**Step 3: Update `_drawInfoOverlay` call in quantum-manifold.js**

In `_drawInfoOverlay` (around line 456-466), pass surface key:

```javascript
_drawInfoOverlay() {
  drawInfoOverlay({
    visible: this._infoOverlayVisible,
    info: getPresetExplanation(
      this._activePreset,
      this._waveParams,
      this._gravityWells.length,
      this._activeSurface
    ),
    width: this.width,
    height: this.height,
  });
}
```

**Step 4: Update reset to include surface**

In `_resetToDefaults` (line 449-451), also reset surface:

```javascript
_resetToDefaults() {
  this._onPresetChange(this._activePreset);
  this._onSurfaceChange(this._activeSurface);
}
```

**Step 5: Commit**

```bash
git add demos/js/quantum-manifold.js demos/js/quantum/quantuman.ui.js
git commit -m "feat(quantum): stats text and info overlay show active surface geometry"
```

---

### Task 7: Manual testing and polish

**Step 1: Run dev server and test**

```bash
npm run dev
```

Open the quantum manifold demo. Verify:
- Flat preset behaves exactly as before (no regression)
- Saddle preset creates visible hyperbolic curvature
- Torus Ridge creates a visible ring shape
- Switching wave presets while on a non-flat surface works
- Gravity wells compose correctly on shaped surfaces
- Cross-section shows the purple dashed surface line
- Surface sliders appear/disappear when switching surface presets
- Color gradient shows dark valleys and bright peaks
- Stats text shows surface name
- Info overlay shows surface info
- Reset defaults restores both wave and surface

**Step 2: Final commit**

```bash
git add -A
git commit -m "feat(quantum): surface geometry presets with saddle and torus ridge manifolds"
```
