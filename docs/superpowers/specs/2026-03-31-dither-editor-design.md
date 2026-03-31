# Dither Editor — Design Spec

**Date:** 2026-03-31
**Status:** Approved

## Overview

A dither editor demo with image loading (file picker + drag-and-drop), real-time image adjustments, comprehensive dithering algorithms, zoom/pan navigation, compare toggle, and PNG export. Backed by two library additions: a functional `ImageProcessor` module for pixel-level adjustments and expanded `Dither` algorithms including a generic error diffusion engine with named kernel presets. The UI theme system is extended to support named themes, with a monochrome theme for this demo.

## Library Additions

### 1. ImageProcessor (`src/math/image-processor.js`)

Pure functions for pixel-level image adjustments. Each takes an ImageData and parameters, returns a new ImageData. No mutation.

| Function | Signature | Description |
|----------|-----------|-------------|
| `adjustContrast` | `(imageData, amount)` | amount in [-1, 1] |
| `adjustBrightness` | `(imageData, amount)` | amount in [-1, 1] |
| `adjustHighlights` | `(imageData, amount)` | targets bright pixels (luminance > 0.5) |
| `adjustShadows` | `(imageData, amount)` | targets dark pixels (luminance <= 0.5) |
| `adjustGamma` | `(imageData, gamma)` | gamma curve, 1.0 = neutral |
| `addGrain` | `(imageData, amount, seed?)` | film grain noise overlay |
| `desaturate` | `(imageData)` | convert to grayscale via luminance weights |
| `scalePixels` | `(imageData, width, height, pixelSize)` | downscale then upscale for pixelated look |

**Design decisions:**
- Pure functions, not a class — maximum composability
- Each function clones the input ImageData — no side effects
- Composable via simple chaining: `addGrain(adjustContrast(desaturate(img), 0.5), 20)`
- Exported from `src/math/index.js` and main `src/index.js`

### 2. Dither Expansion (`src/math/dither.js`)

#### Generic Error Diffusion Engine

New static method:

```
Dither.errorDiffusion(source, width, height, kernel)
```

`kernel` is an object: `{ matrix: [...], divisor: number, offset: [dx, dy] }` describing the diffusion pattern. The existing `floydSteinberg()` is refactored to use this internally.

#### Named Kernel Presets

| Preset | Kernel Size | Character |
|--------|-------------|-----------|
| `FLOYD_STEINBERG` | 2x3 | Classic, smooth gradients |
| `STUCKI` | 3x5 | Sharper, less banding |
| `JARVIS` | 3x5 | Smooth, wider diffusion |
| `ATKINSON` | 2x4 | High contrast, only diffuses 3/4 of error |
| `SIERRA` | 3x5 | Good balance |
| `SIERRA_TWO_ROW` | 2x5 | Faster Sierra variant |
| `SIERRA_LITE` | 2x3 | Fast approximation |
| `BURKES` | 2x5 | Similar to Stucki, faster |

Each preset is a static property on `Dither` (e.g., `Dither.STUCKI`).

#### Convenience Methods

Each preset gets a convenience method:
- `Dither.stucki(source, width, height)`
- `Dither.atkinson(source, width, height)`
- `Dither.jarvis(source, width, height)`
- `Dither.sierra(source, width, height)`
- `Dither.sierraTwoRow(source, width, height)`
- `Dither.sierraLite(source, width, height)`
- `Dither.burkes(source, width, height)`

#### Backward Compatibility

- Existing `Dither.floydSteinberg()` signature unchanged (refactored internally to use `errorDiffusion`)
- Existing `Dither.bayer()`, `Dither.blueNoise()`, `Dither.stipple()`, `Dither.colorQuantize()` unchanged
- All existing exports preserved

### 3. UI Theme System (`src/game/ui/theme.js`)

#### Current State

- `UI_THEME` object with hardcoded green terminal aesthetic
- `createTheme(accent)` factory that generates a theme from a single accent color

#### Additions

- `THEMES` — Registry of named theme objects:
  - `"default"` — Current green terminal theme
  - `"monochrome"` — Grays and white, no color accent
- `setTheme(nameOrConfig)` — Swap the active `UI_THEME` globally
  - Accepts a string (named theme) or a full theme config object
  - Updates `UI_THEME` in place so existing component references stay valid
- `getTheme()` — Returns current active theme
- `registerTheme(name, config)` — Add custom themes to the registry

#### Monochrome Theme

```
accent: "#ffffff"
background: "rgba(30, 30, 30, 0.85)"
surface: "rgba(50, 50, 50, 0.9)"
text: "#e0e0e0"
textSecondary: "#999999"
border: "rgba(255, 255, 255, 0.15)"
```

All existing UI components (Slider, Button, Dropdown, etc.) already read from `UI_THEME` — no component changes needed, just swapping the theme object.

## Demo: Dither Editor

### Files

- `demos/dither-editor.html` — HTML entry point
- `demos/js/dither-editor.js` — Demo implementation (extends Game)

### Layout

Same overlay pattern as caos-playground: full canvas with AccordionGroup floating on the right. Monochrome theme applied via `setTheme("monochrome")` at startup.

### Canvas Interaction

- **Mouse wheel / pinch** — Zoom in/out on the image
- **Click-drag / touch-drag** — Pan around the image
- Zoom/pan reset when a new image is loaded
- Uses existing zoom/pan patterns from the codebase

### AccordionGroup Sections

#### 1. Image
- Drop zone + "Load Image" button
- Drag-and-drop support (dragover/drop events on canvas)
- File picker (hidden input, triggered by button)
- Displays filename when loaded
- Default: procedural gradient (like existing dither demo) until user loads an image

#### 2. Adjustments
| Control | Type | Range | Default |
|---------|------|-------|---------|
| Contrast | Slider | [-100, 100] | 0 |
| Highlights | Slider | [-100, 100] | 0 |
| Shadows | Slider | [-100, 100] | 0 |
| Gamma | Slider | [0.1, 3.0] | 1.0 |
| Grain | Slider | [0, 100] | 0 |

#### 3. Dither
| Control | Type | Options | Default |
|---------|------|---------|---------|
| Algorithm | Dropdown | None, Floyd-Steinberg, Bayer, Blue Noise, Stucki, Atkinson, Jarvis, Sierra, Sierra Two-Row, Sierra Lite, Burkes, Stipple | Floyd-Steinberg |
| Pixel Size | Slider | [1, 16] | 1 |

#### 4. Output
| Control | Type | Action |
|---------|------|--------|
| Compare | ToggleButton | Toggles between original and processed image |
| Export PNG | Button | Downloads processed image as PNG |
| Reset | Button | Returns all controls to defaults |

### Processing Pipeline

On any control change:

```
source image
  → desaturate (if grayscale dither algorithm selected)
  → adjustContrast
  → adjustHighlights
  → adjustShadows
  → adjustGamma
  → addGrain
  → scalePixels (if pixelSize > 1)
  → dither (selected algorithm)
  → display on canvas
```

Processing runs on the source ImageData each time (stateless). For large images, debounce slider changes (~50ms) to avoid jank.

### Compare Mode

ToggleButton labeled "Compare". When active, the canvas shows the original image (with zoom/pan preserved). When inactive, shows the processed image. Simple toggle, no split view.

### Export

"Export PNG" button creates a temporary canvas at processed resolution, renders the current output, calls `canvas.toBlob('image/png')`, and triggers a download with filename `dither-export.png`.

## Integration

### Exports

- `ImageProcessor` functions: `adjustContrast`, `adjustBrightness`, `adjustHighlights`, `adjustShadows`, `adjustGamma`, `addGrain`, `desaturate`, `scalePixels` — from `src/math/index.js`
- New Dither methods and kernel presets — from existing `src/math/dither.js`
- `THEMES`, `setTheme`, `getTheme`, `registerTheme` — from `src/game/ui/theme.js`
- All available from main `src/index.js`

### Demo Navigation

- Add "Dither Editor" to `demos/index.html` under the **Image** section
- Keep existing `dither.html` demo as-is (different purpose: algorithm showcase)

### No Breaking Changes

- Existing Dither API fully backward compatible
- Existing UI component APIs unchanged
- Existing `UI_THEME` object reference preserved (mutated in place by `setTheme`)
- Existing demos unaffected
