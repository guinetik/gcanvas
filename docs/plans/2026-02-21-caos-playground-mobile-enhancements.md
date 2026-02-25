# Caos Playground — Mobile Enhancements

**Date:** 2026-02-21
**Files changed:** `demos/js/caos-playground.js`, `src/io/input.js`
**Design doc:** `docs/plans/2026-02-21-caos-playground-mobile-design.md`

## Summary

Made the Caos Playground interactive attractor explorer fully mobile-friendly. The desktop right-sidebar panel becomes a toggleable bottom sheet on mobile, with a StateMachine controlling visibility, exclusive accordion sections, and bottom-anchored repositioning on section expand/collapse.

Also fixed a framework-level bug in `src/io/input.js` where touch `inputup` events had no coordinates, breaking all Button taps on mobile.

---

## What Was Added

### 1. Screen Detection & Responsive CONFIG

**Imports added:** `Screen` (from `src/index`), `StateMachine` (from `src/state/state-machine.js`)

CONFIG was expanded with mobile-specific values:

```javascript
const CONFIG = {
  panel: {
    width: 300,          // desktop sidebar width
    padding: 18,         // desktop vertical padding (was 14)
    mobilePadding: 16,   // mobile vertical padding
    mobileMaxHeight: 0.85, // 85% of screen height cap
    backgroundColor: "rgba(0, 0, 0, 0.5)", // semi-transparent black
    // ... marginRight, marginTop, debugColor, spacing unchanged
  },
  toggle: {
    margin: 12,
    width: 44,           // minimum touch target
    height: 44,
  },
  maxSegments: 250000,   // extracted from magic number
};
```

`Screen.init(this)` is called in `init()` **before** `_buildPanel()` so that `Screen.isMobile` is available during panel construction.

### 2. Toggle Button (Mobile Only)

`_buildToggleButton()` creates a 44x44 `Button` with a gear icon (`⚙`), positioned top-left. Only visible/interactive when `Screen.isMobile`.

- Uses `origin: "center"` (Button default), positioned at `margin + width/2`
- Added to the pipeline directly (not inside the panel Scene)

### 3. StateMachine for Panel Visibility

`_initPanelStateMachine()` creates a two-state FSM:

| State | Panel | Toggle Button |
|-------|-------|---------------|
| `panel-hidden` | `visible=false, interactive=false` | Shows `⚙` |
| `panel-visible` | `visible=true, interactive=true` | Shows `✖` |

- Initial state: `panel-hidden` on mobile, `panel-visible` on desktop
- State `enter()` callbacks use regular functions (not arrows) because `context: this` binds them to the CaosPlayground instance
- `_togglePanel()` toggles between states

### 4. Responsive Panel Layout

`_buildPanel()` calculates dimensions responsively:

```javascript
const panelWidth = Screen.responsive(this.width - 20, this.width - 20, CONFIG.panel.width);
// mobile: full width - 20px, tablet: same, desktop: 300px

const padding = isMobile ? CONFIG.panel.mobilePadding : CONFIG.panel.padding;
const sw = panelWidth - padding * 2; // usable slider/control width
```

All sliders, dropdowns, steppers, and buttons use `sw` for width so they scale with the panel.

### 5. Panel Background

The panel's `draw()` is patched to render a filled black 50% opacity rectangle before drawing children:

```javascript
const originalDraw = this.panel.draw.bind(this.panel);
this.panel.draw = () => {
  Painter.shapes.rect(0, 0, this.panel._width, this.panel._height, CONFIG.panel.backgroundColor);
  originalDraw();
};
```

Uses `Painter.shapes.rect` (not raw `ctx` calls) per project conventions. Coordinates `(0, 0)` are correct because AccordionGroup uses `origin: "top-left"`.

### 6. Bottom-Anchored Panel Positioning

`_layoutPanel()` positions the panel differently per device:

**Mobile (bottom sheet):**
```javascript
this.panel.x = 10;                              // 10px left margin
this.panel.y = this.height - panelH - 10;       // bottom-anchored, 10px margin
```

**Desktop (right sidebar):**
```javascript
this.panel.x = this.width - CONFIG.panel.width - CONFIG.panel.marginRight;
this.panel.y = CONFIG.panel.marginTop;
```

**Key detail:** AccordionGroup defaults to `origin: "top-left"`, so `x` and `y` represent the top-left corner. An earlier bug used `this.width / 2` assuming center origin, which placed the panel half off-screen.

### 7. Bottom-Anchor on Section Toggle

The panel's `layout()` is patched so that every time a section expands/collapses (which changes `_height`), the panel Y is recalculated:

```javascript
const originalLayout = this.panel.layout.bind(this.panel);
this.panel.layout = () => {
  originalLayout();
  this._layoutPanel(); // reposition Y based on new _height
};
```

Without this, expanding a section would push the Reset/Restart buttons off the bottom of the screen.

### 8. Exclusive Accordion Sections (Mobile)

`_setupExclusiveSections()` wraps each section's `toggle()` so only one can be expanded at a time on mobile:

```javascript
_setupExclusiveSections() {
  const origToggles = new Map();
  for (const section of this._sections) {
    origToggles.set(section, section.toggle.bind(section));
  }
  for (const section of this._sections) {
    section.toggle = (force) => {
      const willExpand = force !== undefined ? force : !section.expanded;
      if (willExpand) {
        for (const other of this._sections) {
          if (other !== section && other.expanded) {
            origToggles.get(other)(false);
          }
        }
      }
      origToggles.get(section)(force);
    };
  }
}
```

Each section's original `toggle` is stored in a Map **before** any wrapping, avoiding circular references. Desktop behavior is unchanged.

### 9. Sections Default Collapsed on Mobile

Parameters and Physics sections use `expanded: !isMobile` so they start collapsed on mobile, saving vertical space. Color, Effects, and Particles were already `expanded: false`.

### 10. Responsive `_buildParamSliders()`

When rebuilding per-attractor parameter sliders, the width calculation is now responsive:

```javascript
const panelWidth = Screen.isMobile ? this.width - 20 : CONFIG.panel.width;
const padding = Screen.isMobile ? CONFIG.panel.mobilePadding : CONFIG.panel.padding;
const sw = panelWidth - padding * 2;
```

### 11. FPS Counter Repositioning

```javascript
this.fpsCounter = new FPSCounter(this, {
  anchor: Screen.isMobile ? "bottom-left" : "bottom-right",
});
```

Moved to bottom-left on mobile so it doesn't overlap the panel.

### 12. Responsive `onResize()`

On window resize:
- Calls `_layoutPanel()` to reposition
- Updates toggle button visibility based on new `Screen.isMobile`
- Transitions FSM: desktop → `panel-visible`, mobile → `panel-hidden`

### 13. Reset Defaults Button

Two buttons at the bottom of the panel:

- **Reset Defaults** — Calls `_resetToDefaults()` which re-applies `ATTRACTOR_PRESETS[activePreset]` via `_onAttractorChange()`, reverting all sliders to defaults
- **Restart** — Calls `switchAttractor()` with **current** `this.config`, preserving slider modifications

### 14. Magic Number Extraction

`250000` (maxSegments) extracted to `CONFIG.maxSegments` and used in constructor, Restart button, and `_onAttractorChange()`.

---

## Framework Bug Fix: `src/io/input.js`

### Problem

`Input._onTouchEnd` emitted `inputup` without setting `e.x` / `e.y` on the event:

```javascript
// BEFORE (broken)
static _onTouchEnd(e, game) {
  Input.down = false;
  game.events.emit("inputup", e); // e.x and e.y are undefined!
}
```

On `touchend`, `e.touches` is empty (all fingers lifted). The Button's click handler checks `this._hitTest(e.x, e.y)` on `inputup` — with `undefined` coordinates, hit test fails and `onClick` never fires.

This is why buttons worked on desktop (mouse `_onUp` uses `e.offsetX/offsetY`) but failed on mobile touch.

### Fix

Use `e.changedTouches[0]` which contains the touch that just ended:

```javascript
static _onTouchEnd(e, game) {
  Input.down = false;
  const touch = e.changedTouches[0];
  if (touch) {
    const rect = game.canvas.getBoundingClientRect();
    const cssX = touch.clientX - rect.left;
    const cssY = touch.clientY - rect.top;
    const scaled = Input._scaleToCanvas(game, cssX, cssY);
    Input._setPosition(scaled.x, scaled.y);
    Object.defineProperty(e, "x", { value: scaled.x, configurable: true });
    Object.defineProperty(e, "y", { value: scaled.y, configurable: true });
  }
  game.events.emit("inputup", e);
}
```

**This fix affects ALL touch-based interactions framework-wide**, not just the Caos Playground.

---

## Lessons Learned

### Origin Mismatch
AccordionGroup defaults to `origin: "top-left"` while Button defaults to `origin: "center"`. When positioning, always check the component's origin. With top-left origin, `x/y` is the top-left corner; with center origin, `x/y` is the center point.

### Touch Event Coordinates
On `touchend`, `e.touches` is empty. Always use `e.changedTouches` for the ended touch. This is a standard DOM behavior but easy to miss.

### Bottom-Anchored Panels Need Relayout Hooks
A panel anchored to the bottom of the screen must reposition after any height change (section expand/collapse). Patching `layout()` on the AccordionGroup is the cleanest way to hook into this without modifying the framework.

### Exclusive Sections Need Pre-Stored References
When wrapping multiple objects' methods to create exclusive behavior, store all original methods **before** wrapping any of them. Otherwise the first wrapped method calls other already-wrapped methods, causing infinite recursion or incorrect behavior.

### Use Painter API, Not Raw Context
Even for simple background fills, use `Painter.shapes.rect()` instead of `ctx.fillRect()`. The project convention exists because Painter handles state management correctly.
