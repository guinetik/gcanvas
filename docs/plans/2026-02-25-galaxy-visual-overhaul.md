# Galaxy Visual Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the galaxy demo from cartoonish dots into a rich, realistic galaxy visualization using WebGL particle rendering, multi-layer star populations, and nebular glow effects.

**Architecture:** Replace Canvas 2D `ctx.arc()` star rendering with `WebGLParticleRenderer` (GPU point sprites, glow shape, additive blending). Generator produces 3 density layers (dust/stars/bright). Nebular arm glow is drawn as Canvas 2D radial gradients before the WebGL composite. Color palette expanded with HII regions and spectral variety.

**Tech Stack:** GCanvas WebGLParticleRenderer, Painter.colors.hslToRgb, Canvas 2D radial gradients, existing Camera3D projection.

---

### Task 1: Update config — star counts, visual params, color palette

**Files:**
- Modify: `demos/js/galaxy/galaxy.config.js`

**Step 1: Update GALAXY_PRESETS star counts**

Replace the `starCount` values in each preset:

```javascript
spiral: {
    ...
    starCount: 15000,
    ...
},
grandDesign: {
    ...
    starCount: 18000,
    ...
},
flocculent: {
    ...
    starCount: 16000,
    ...
},
barred: {
    ...
    starCount: 16000,
    ...
},
elliptical: {
    ...
    starCount: 12000,
    ...
},
irregular: {
    ...
    starCount: 10000,
    ...
},
```

**Step 2: Expand CONFIG.visual with new params**

Replace the existing `visual` block:

```javascript
visual: {
    armHue: 210,
    coreStarHue: 50,
    diskThickness: 8,
    // Layer distribution (fractions of total starCount)
    dustFraction: 0.65,
    brightFraction: 0.03,
    // starFraction is implicitly 1 - dustFraction - brightFraction
    // Color ranges per region
    coreHueRange: [40, 60],       // warm gold/amber
    armHueRange: [200, 240],      // blue-white young stars
    hiiHueRange: [320, 340],      // pink/magenta HII regions
    fieldHueRange: [10, 30],      // cool red-orange old stars
    dustHueRange: [240, 280],     // faint blue-violet nebular
    // HII region clustering
    hiiRegionChance: 0.15,        // chance per arm segment
    hiiClusterSize: 30,           // scatter radius for HII cluster
    // Nebular glow
    nebulaGlowSamples: 20,       // points per arm for glow pass
    nebulaGlowRadius: 60,        // radius of each glow sample
    nebulaGlowAlpha: 0.04,       // alpha per glow sample
},
```

**Step 3: Commit**

```bash
git add demos/js/galaxy/galaxy.config.js
git commit -m "feat(galaxy): update config with higher star counts, multi-layer visual params"
```

---

### Task 2: Update star count slider range in UI

**Files:**
- Modify: `demos/js/galaxy/galaxy.ui.js`

**Step 1: Update the Stepper max and step**

In `createControlPanel`, find the `controls.starCount` Stepper (around line 206) and update:

```javascript
controls.starCount = new Stepper(game, {
    label: "STAR COUNT",
    value: galaxyParams.starCount || 15000,
    min: 2000,
    max: 30000,
    step: 1000,
    buttonSize: 32,
    valueWidth: 60,
    onChange: (v) => {
        if (callbacks.getUpdatingSliders?.()) return;
        galaxyParams.starCount = v;
        regenerate();
    },
});
```

**Step 2: Commit**

```bash
git add demos/js/galaxy/galaxy.ui.js
git commit -m "feat(galaxy): update star count slider range for higher particle counts"
```

---

### Task 3: Rewrite star generator with 3-layer population and color variety

**Files:**
- Modify: `demos/js/galaxy/galaxy.generator.js`

**Step 1: Add layer assignment and color helpers at the top**

After the existing imports and `const TAU`, add:

```javascript
/**
 * Assigns a star to a layer (dust, star, bright) based on config fractions.
 * @param {number} roll - Random value 0-1
 * @returns {string} "dust" | "star" | "bright"
 */
function assignLayer(roll) {
    const dustF = CONFIG.visual.dustFraction;
    const brightF = CONFIG.visual.brightFraction;
    if (roll < dustF) return "dust";
    if (roll > 1 - brightF) return "bright";
    return "star";
}

/**
 * Returns size range and alpha range for a layer.
 */
function layerProperties(layer, distFactor) {
    switch (layer) {
        case "dust":
            return {
                size: 0.3 + Math.random() * 1.0,
                brightness: 0.03 + Math.random() * 0.12,
                alpha: 0.05 + Math.random() * 0.15,
            };
        case "bright":
            return {
                size: 3 + Math.random() * 5,
                brightness: 0.7 + Math.random() * 0.3,
                alpha: 0.6 + Math.random() * 0.4,
            };
        default: // "star"
            return {
                size: 0.8 + Math.random() * 2.0,
                brightness: 0.3 + Math.random() * 0.5,
                alpha: 0.3 + Math.random() * 0.5,
            };
    }
}

/**
 * Picks a hue based on layer, position, and optional HII region flag.
 */
function pickHue(layer, distFactor, isHII) {
    const v = CONFIG.visual;
    if (isHII) {
        // Pink/magenta HII region
        return v.hiiHueRange[0] + Math.random() * (v.hiiHueRange[1] - v.hiiHueRange[0]);
    }
    if (layer === "dust") {
        return v.dustHueRange[0] + Math.random() * (v.dustHueRange[1] - v.dustHueRange[0]);
    }
    // Blend from core hue to arm hue based on distance
    const coreHue = v.coreHueRange[0] + Math.random() * (v.coreHueRange[1] - v.coreHueRange[0]);
    const armHue = v.armHueRange[0] + Math.random() * (v.armHueRange[1] - v.armHueRange[0]);
    return coreHue + (armHue - coreHue) * Math.pow(distFactor, 0.6);
}
```

**Step 2: Update `generateSpiral` to use layers and HII regions**

Replace the existing `generateSpiral` function body. Key changes:
- Each star gets `assignLayer(Math.random())`
- Size/brightness/alpha come from `layerProperties`
- Hue comes from `pickHue`
- Every N-th arm segment rolls for HII region (`hiiRegionChance`)
- HII regions add a cluster of pink stars at that arm position
- Each star object now includes `layer` and `alpha` fields

```javascript
function generateSpiral(p) {
    const stars = [];
    const numArms = p.numArms || 2;
    const totalStars = p.starCount || 15000;
    const armStars = Math.floor(totalStars * (1 - (p.fieldStarFraction || 0.15)));
    const starsPerArm = Math.floor(armStars / numArms);
    const galaxyRadius = p.galaxyRadius || 350;
    const armWidth = p.armWidth || 40;
    const spiralTightness = p.spiralTightness || 0.25;
    const spiralStart = p.spiralStart || 30;
    const irregularity = p.irregularity || 0;
    const hiiChance = CONFIG.visual.hiiRegionChance;
    const hiiSize = CONFIG.visual.hiiClusterSize;

    // Track arm sample points for nebular glow (exported on stars array)
    const armPoints = [];

    for (let arm = 0; arm < numArms; arm++) {
        const armOffset = (arm / numArms) * TAU;
        const armSamples = [];

        // Pre-determine HII regions for this arm
        const hiiSegments = new Set();
        const numSegments = 10;
        for (let seg = 0; seg < numSegments; seg++) {
            if (Math.random() < hiiChance) hiiSegments.add(seg);
        }

        for (let i = 0; i < starsPerArm; i++) {
            const t = i / starsPerArm;
            const theta = t * TAU * 2.5;
            const r = spiralStart * Math.exp(spiralTightness * theta);

            if (r > galaxyRadius) continue;

            const baseAngle = theta + armOffset;
            const scatter = (Math.random() - 0.5 + Math.random() - 0.5) * armWidth;
            const scatterAngle = baseAngle + Math.PI / 2;
            const alongScatter = (Math.random() - 0.5) * 20;
            const irr = irregularity * (Math.random() - 0.5) * 30;

            const x = Math.cos(baseAngle) * (r + alongScatter + irr) + Math.cos(scatterAngle) * scatter;
            const z = Math.sin(baseAngle) * (r + alongScatter + irr) + Math.sin(scatterAngle) * scatter;

            const thickness = CONFIG.visual.diskThickness * (1 - t * 0.7);
            const y = (Math.random() - 0.5) * thickness;

            const actualRadius = Math.sqrt(x * x + z * z);
            const actualAngle = Math.atan2(z, x);
            const distFactor = actualRadius / galaxyRadius;
            const rotationSpeed = computeRotationSpeed(actualRadius);

            const layer = assignLayer(Math.random());
            const segment = Math.floor(t * numSegments);
            const isHII = hiiSegments.has(segment) && Math.random() < 0.4;

            const props = layerProperties(layer, distFactor);
            const hue = pickHue(layer, distFactor, isHII);

            stars.push({
                radius: actualRadius,
                angle: actualAngle,
                y,
                rotationSpeed,
                hue,
                brightness: props.brightness,
                size: props.size,
                alpha: props.alpha,
                layer,
                twinklePhase: Math.random() * TAU,
            });

            // Sample arm center points (every ~5% of arm)
            if (i % Math.floor(starsPerArm / CONFIG.visual.nebulaGlowSamples) === 0 && layer === "star") {
                armSamples.push({ x: Math.cos(baseAngle) * r, z: Math.sin(baseAngle) * r, r, isHII: hiiSegments.has(segment) });
            }
        }
        armPoints.push(armSamples);
    }

    // Field stars
    const fieldCount = Math.floor(totalStars * (p.fieldStarFraction || 0.15));
    for (let i = 0; i < fieldCount; i++) {
        stars.push(generateFieldStar(galaxyRadius));
    }

    // Attach arm points for nebular glow (non-enumerable so it doesn't interfere)
    stars._armPoints = armPoints;
    return stars;
}
```

**Step 3: Update `generateBarredSpiral` similarly**

Apply the same pattern: `assignLayer`, `layerProperties`, `pickHue`, `alpha` field, `layer` field. Bar stars get core colors. Arm stars get the same treatment as spiral arms. Add `_armPoints` for nebula glow.

**Step 4: Update `generateElliptical` and `generateIrregular`**

Elliptical: all layers, core-to-arm color gradient, no HII regions (ellipticals are old). Irregular: layers + random HII clusters at clump centers.

**Step 5: Update `generateFieldStar`**

```javascript
function generateFieldStar(galaxyRadius) {
    const angle = Math.random() * TAU;
    const radius = Math.sqrt(Math.random()) * galaxyRadius;
    const y = (Math.random() - 0.5) * 15;
    const layer = assignLayer(Math.random());
    const distFactor = radius / galaxyRadius;
    const props = layerProperties(layer, distFactor);

    return {
        radius,
        angle,
        y,
        rotationSpeed: computeRotationSpeed(radius),
        hue: CONFIG.visual.fieldHueRange[0] + Math.random() * (CONFIG.visual.fieldHueRange[1] - CONFIG.visual.fieldHueRange[0]),
        brightness: props.brightness,
        size: props.size,
        alpha: props.alpha,
        layer,
        twinklePhase: Math.random() * TAU,
    };
}
```

**Step 6: Commit**

```bash
git add demos/js/galaxy/galaxy.generator.js
git commit -m "feat(galaxy): 3-layer star generator with dust, HII regions, spectral colors"
```

---

### Task 4: Integrate WebGLParticleRenderer in galaxy-playground.js

**Files:**
- Modify: `demos/js/galaxy-playground.js`

**Step 1: Add WebGLParticleRenderer import**

At the top imports, add:

```javascript
import { WebGLParticleRenderer } from "../../src/webgl/webgl-particle-renderer.js";
```

Also add `Painter` colors helper import if not already imported (it's already imported from the index).

**Step 2: Initialize the renderer in `init()`**

After `this._initStars()` (around line 60), add:

```javascript
this._initWebGL();
```

Add the method:

```javascript
_initWebGL() {
    const maxParticles = 30000; // headroom above max slider
    this.glRenderer = new WebGLParticleRenderer(maxParticles, {
        width: this.width,
        height: this.height,
        shape: "glow",
        blendMode: "additive",
    });
}
```

**Step 3: Replace `_drawStars` with WebGL rendering**

Replace the entire `_drawStars` method:

```javascript
_drawStars(ctx, cx, cy) {
    if (!this.glRenderer || !this.glRenderer.isAvailable()) {
        this._drawStarsCanvas2D(ctx, cx, cy);
        return;
    }

    this.glRenderer.resize(this.width, this.height);
    this.glRenderer.clear();

    const projected = [];

    for (const star of this.stars) {
        const x = Math.cos(star.angle) * star.radius;
        const z = Math.sin(star.angle) * star.radius;

        const p = this.camera.project(x, star.y, z);
        if (p.scale < 0.02) continue;

        const screenX = cx + p.x * this.zoom;
        const screenY = cy + p.y * this.zoom;
        const scale = p.scale * this.zoom;

        const twinkle = star.layer === "dust" ? 1.0 :
            0.7 + 0.3 * Math.sin(this.time * 2.5 + star.twinklePhase);
        const alpha = (star.alpha || star.brightness) * twinkle * Math.min(1, scale * 1.5);
        const size = Math.max(0.3, star.size * scale);

        // Convert hue to RGB
        const lightness = 50 + star.brightness * 40;
        const saturation = star.layer === "dust" ? 40 : 60;
        const [r, g, b] = Painter.colors.hslToRgb(star.hue, saturation, lightness);

        projected.push({
            x: screenX,
            y: screenY,
            size,
            color: { r, g, b, a: alpha },
            depth: p.z,
        });
    }

    // Sort back-to-front
    projected.sort((a, b) => b.depth - a.depth);

    const count = this.glRenderer.updateParticles(projected);
    this.glRenderer.render(count);
    this.glRenderer.compositeOnto(ctx, 0, 0);
}
```

**Step 4: Keep Canvas 2D fallback**

Rename the old `_drawStars` to `_drawStarsCanvas2D` — copy the current implementation unchanged. This is the fallback if WebGL isn't available.

```javascript
_drawStarsCanvas2D(ctx, cx, cy) {
    // ... (existing _drawStars code, unchanged)
}
```

**Step 5: Resize the WebGL renderer on window resize**

In `onResize()`, add:

```javascript
if (this.glRenderer) {
    this.glRenderer.resize(this.width, this.height);
}
```

**Step 6: Commit**

```bash
git add demos/js/galaxy-playground.js
git commit -m "feat(galaxy): WebGL particle rendering with glow sprites and additive blending"
```

---

### Task 5: Add nebular arm glow

**Files:**
- Modify: `demos/js/galaxy-playground.js`

**Step 1: Add `_drawNebulaGlow` method**

This draws soft radial gradients along the spiral arm paths, BEFORE the WebGL star composite. Add this method:

```javascript
_drawNebulaGlow(ctx, cx, cy) {
    const armPoints = this.stars._armPoints;
    if (!armPoints || armPoints.length === 0) return;

    const v = CONFIG.visual;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (let a = 0; a < armPoints.length; a++) {
        const samples = armPoints[a];
        for (const sample of samples) {
            const x3d = Math.cos(this.stars[0]?.angle || 0) !== undefined
                ? sample.x : 0;
            const z3d = sample.z;

            // Rotate with galaxy
            const cosR = Math.cos(this.galaxyRotation);
            const sinR = Math.sin(this.galaxyRotation);
            const rx = x3d * cosR - z3d * sinR;
            const rz = x3d * sinR + z3d * cosR;

            const p = this.camera.project(rx, 0, rz);
            if (p.scale < 0.05) continue;

            const sx = cx + p.x * this.zoom;
            const sy = cy + p.y * this.zoom;
            const radius = v.nebulaGlowRadius * p.scale * this.zoom;

            const hue = sample.isHII
                ? v.hiiHueRange[0] + Math.random() * 20
                : v.dustHueRange[0] + (a * 30) % 40;
            const alpha = v.nebulaGlowAlpha * Math.min(1, p.scale * this.zoom);

            const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
            gradient.addColorStop(0, `hsla(${hue}, 60%, 50%, ${alpha})`);
            gradient.addColorStop(0.4, `hsla(${hue}, 50%, 40%, ${alpha * 0.5})`);
            gradient.addColorStop(1, "transparent");

            ctx.beginPath();
            ctx.arc(sx, sy, radius, 0, TAU);
            ctx.fillStyle = gradient;
            ctx.fill();
        }
    }

    ctx.restore();
}
```

**Step 2: Integrate nebula glow into render pipeline**

In `render()`, add the nebula glow call BEFORE `_drawStars`:

```javascript
render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    this._drawGalacticHaze(ctx, cx, cy);
    this._drawNebulaGlow(ctx, cx, cy);   // NEW — arm glow before stars
    this._drawStars(ctx, cx, cy);
    this._drawBlackHole(ctx, cx, cy);

    this._updateStatsText();
    this.pipeline.render();
}
```

**Step 3: Fix arm points rotation**

The arm sample points are generated in the initial frame coordinates. Stars rotate via `star.angle += star.rotationSpeed * dt`, but the arm glow samples need to rotate with the galaxy too. Update the nebula glow to use `this.galaxyRotation` or a representative star's current angle offset. The simplest approach: arm sample points store the initial arm angle, and we add `galaxyRotation` at render time. Refactor `_drawNebulaGlow` to add rotation:

In the generator, store `angle` on each arm sample:
```javascript
armSamples.push({
    angle: baseAngle,  // initial angle on arm
    r,                 // distance from center
    isHII: hiiSegments.has(segment),
});
```

In `_drawNebulaGlow`, compute x/z from angle + galaxyRotation:
```javascript
const angle = sample.angle + this.galaxyRotation;
const rx = Math.cos(angle) * sample.r;
const rz = Math.sin(angle) * sample.r;
```

Remove the earlier manual cosR/sinR rotation since the angle already includes it.

**Step 4: Commit**

```bash
git add demos/js/galaxy-playground.js demos/js/galaxy/galaxy.generator.js
git commit -m "feat(galaxy): nebular arm glow with HII region tinting"
```

---

### Task 6: Enhance the black hole

**Files:**
- Modify: `demos/js/galaxy-playground.js`
- Modify: `demos/js/galaxy/galaxy.config.js`

**Step 1: Update black hole config**

In `CONFIG.blackHole`, increase the accretion disk and add jet params:

```javascript
blackHole: {
    radius: 12,
    accretionDiskRadius: 70,   // was 50
    accretionHue: 30,
    jetLength: 120,
    jetWidth: 8,
    jetAlpha: 0.15,
},
```

**Step 2: Add jet rendering to `_drawBlackHole`**

After the existing lens ring rendering (before the final `ctx.globalCompositeOperation = "source-over"`), add jets:

```javascript
// Relativistic jets
const jetLen = CONFIG.blackHole.jetLength * p.scale * this.zoom;
const jetW = CONFIG.blackHole.jetWidth * p.scale * this.zoom;
const jetAlpha = CONFIG.blackHole.jetAlpha;

ctx.save();
ctx.translate(screenX, screenY);
ctx.globalCompositeOperation = "lighter";

// Top jet
const topGrad = ctx.createLinearGradient(0, 0, 0, -jetLen);
topGrad.addColorStop(0, `hsla(${CONFIG.blackHole.accretionHue + 10}, 100%, 80%, ${jetAlpha})`);
topGrad.addColorStop(0.3, `hsla(${CONFIG.blackHole.accretionHue}, 80%, 60%, ${jetAlpha * 0.5})`);
topGrad.addColorStop(1, "transparent");
ctx.beginPath();
ctx.moveTo(-jetW, 0);
ctx.lineTo(0, -jetLen);
ctx.lineTo(jetW, 0);
ctx.closePath();
ctx.fillStyle = topGrad;
ctx.fill();

// Bottom jet
const botGrad = ctx.createLinearGradient(0, 0, 0, jetLen);
botGrad.addColorStop(0, `hsla(${CONFIG.blackHole.accretionHue + 10}, 100%, 80%, ${jetAlpha})`);
botGrad.addColorStop(0.3, `hsla(${CONFIG.blackHole.accretionHue}, 80%, 60%, ${jetAlpha * 0.5})`);
botGrad.addColorStop(1, "transparent");
ctx.beginPath();
ctx.moveTo(-jetW, 0);
ctx.lineTo(0, jetLen);
ctx.lineTo(jetW, 0);
ctx.closePath();
ctx.fillStyle = botGrad;
ctx.fill();

ctx.restore();
```

**Step 3: Add more color bands to the accretion disk**

In the existing accretion disk gradient, add more stops for richer look:

```javascript
const diskGradient = ctx.createRadialGradient(0, 0, holeRadius, 0, 0, diskRadius);
diskGradient.addColorStop(0, `hsla(${CONFIG.blackHole.accretionHue + 30}, 100%, 80%, 0.9)`);
diskGradient.addColorStop(0.15, `hsla(${CONFIG.blackHole.accretionHue + 20}, 100%, 70%, 0.8)`);
diskGradient.addColorStop(0.3, `hsla(${CONFIG.blackHole.accretionHue}, 100%, 60%, 0.6)`);
diskGradient.addColorStop(0.5, `hsla(${CONFIG.blackHole.accretionHue - 10}, 90%, 50%, 0.3)`);
diskGradient.addColorStop(0.75, `hsla(${CONFIG.blackHole.accretionHue - 20}, 80%, 40%, 0.15)`);
diskGradient.addColorStop(1, "transparent");
```

**Step 4: Commit**

```bash
git add demos/js/galaxy-playground.js demos/js/galaxy/galaxy.config.js
git commit -m "feat(galaxy): enhanced black hole with jets and richer accretion disk"
```

---

### Task 7: Visual testing and polish

**Step 1: Run dev server**

```bash
npm run dev
```

Open the galaxy demo. Verify:
- WebGL renders stars as soft glowing points (not hard circles)
- Dust layer creates a subtle diffuse haze in the arms
- Bright stars are prominent but not cartoonishly large
- HII pink/magenta regions appear in some arm segments
- Nebular glow follows the spiral arm paths
- Core is warm gold, outer arms are blue-white
- Black hole jets are visible as faint cones
- Accretion disk has rich color banding
- Toggling galaxy types regenerates correctly
- Star count slider works up to 30k
- Canvas 2D fallback works (test by temporarily blocking WebGL)
- Performance is smooth at 15-20k particles
- Panel interaction works (the `interactive = true` fix from earlier)

**Step 2: Tune values if needed**

Common adjustments:
- If dust is too visible: reduce `dustFraction` or `alpha` range in `layerProperties`
- If arms aren't defined enough: reduce `armWidth` defaults
- If nebula glow is too heavy: reduce `nebulaGlowAlpha`
- If HII regions are too pink: reduce `hiiRegionChance`

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(galaxy): visual overhaul with WebGL particles, dust lanes, and nebular glow"
```
